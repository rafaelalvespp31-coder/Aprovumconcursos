import "server-only";
import { z } from "zod";
import { createAdminClient } from "../supabase";
import { isAdmin } from "../auth";
import { aiIsConfigured, AIError } from "@/ai";
import { UserFacingError, enforceRateLimit } from "./trails";
import { brDay } from "@/domain/plans/limits";
import { MODALIDADES, rubricaDaModalidade } from "@/domain/redacao/rubricas";
import { MAX_CHARS, contar, validarParaEnvio } from "@/domain/redacao/texto";
import { classificar } from "@/domain/redacao/consistencia";
import { compararErros, compararNotas, insights, serieNotas, type AvaliacaoResumo } from "@/domain/redacao/progresso";
import { ComparacaoSchema, CorrecaoExercicioSchema, ExercicioSchema, TemaSchema } from "@/domain/redacao/schemas";
import { PROFESSOR_CHAT, promptComparacao, promptCorrecaoExercicio, promptExercicio, promptTema } from "@/domain/redacao/prompts";
import { chamarIA, limiteDiario, USER_FACING_AI } from "./redacao-ia";

const db = () => createAdminClient();
const uuid = z.uuid();
const MODALIDADE_IDS = MODALIDADES.map((m) => m.id) as [string, ...string[]];

function iaMsg(e: unknown): never {
  if (e instanceof UserFacingError) throw e;
  if (e instanceof AIError) throw new UserFacingError(e.kind === "not_configured" || e.kind === "budget_exceeded" ? e.message : USER_FACING_AI, "ia");
  throw e;
}
function exigirIA() {
  if (!aiIsConfigured("estudos")) throw new UserFacingError("O professor de redação ainda não está ativado neste ambiente (a IA precisa estar configurada).", "ia_off");
}

/* ───────────── rascunho e envio ───────────── */

const draftSchema = z.object({
  id: uuid.optional(),
  themeId: uuid.nullish(),
  themeTitle: z.string().trim().max(300).nullish(),
  themeText: z.string().trim().max(6000).nullish(),
  title: z.string().trim().max(200).default(""),
  body: z.string().max(MAX_CHARS + 2000),
  modality: z.enum(MODALIDADE_IDS).default("enem"),
  board: z.string().trim().max(60).nullish(),
  contest: z.string().trim().max(160).nullish(),
  criteriaText: z.string().trim().max(8000).nullish(),
  lineLimit: z.number().int().min(1).max(200).nullish(),
});
export type DraftInput = z.input<typeof draftSchema>;

/** Salva (cria ou atualiza) um rascunho do próprio aluno. Redações enviadas não são editadas: a reescrita cria nova versão. */
export async function saveDraft(userId: string, input: DraftInput): Promise<{ id: string }> {
  const d = draftSchema.parse(input);
  if (d.body.length > MAX_CHARS) throw new UserFacingError(`O texto passou do limite de ${MAX_CHARS.toLocaleString("pt-BR")} caracteres.`, "invalid");
  const c = contar(d.body);
  const row = {
    theme_id: d.themeId ?? null,
    theme_title: d.themeTitle ?? null,
    theme_text: d.themeText ?? null,
    title: d.title,
    body: d.body,
    modality: d.modality,
    board: d.board ?? null,
    contest: d.contest ?? null,
    criteria_text: d.criteriaText ?? null,
    line_limit: d.lineLimit ?? null,
    word_count: c.words,
    char_count: c.chars,
    updated_at: new Date().toISOString(),
  };
  const admin = db();
  if (d.id) {
    const cur = await admin.from("writing_submissions").select("id, status").eq("id", d.id).eq("user_id", userId).maybeSingle();
    if (!cur.data) throw new UserFacingError("Redação não encontrada.", "not_found");
    if (!["rascunho", "falhou"].includes(cur.data.status as string)) throw new UserFacingError("Esta redação já foi enviada. Use “Reescrever” para criar uma nova versão.", "locked");
    const up = await admin.from("writing_submissions").update({ ...row, status: "rascunho" }).eq("id", d.id).eq("user_id", userId);
    if (up.error) throw new Error(up.error.message);
    return { id: d.id };
  }
  const ins = await admin.from("writing_submissions").insert({ ...row, user_id: userId }).select("id").single();
  if (ins.error) throw new Error(ins.error.message);
  return { id: ins.data.id as string };
}

/** Envia o rascunho para correção: valida conteúdo, limites e IA; cria a avaliação "processando". A execução é disparada pela ação. */
export async function submitForCorrection(userId: string, id: string): Promise<{ evaluationId: string; created: boolean }> {
  uuid.parse(id);
  const admin = db();
  const s = await admin.from("writing_submissions").select("id, body, modality, status").eq("id", id).eq("user_id", userId).maybeSingle();
  if (!s.data) throw new UserFacingError("Redação não encontrada.", "not_found");
  if (s.data.status === "processando") {
    const e = await admin.from("writing_evaluations").select("id").eq("submission_id", id).eq("status", "processando").order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (e.data) return { evaluationId: e.data.id as string, created: false };
  }
  if (!["rascunho", "falhou"].includes(s.data.status as string)) throw new UserFacingError("Esta redação já foi corrigida.", "locked");
  const v = validarParaEnvio(s.data.body as string);
  if (!v.ok) throw new UserFacingError(v.error, "invalid");
  exigirIA();
  await enforceRateLimit(userId, "redacao:enviar", 6, 60);
  if (!(await isAdmin().catch(() => false))) {
    const { start } = brDay();
    const q = await admin.from("writing_submissions").select("id", { count: "exact", head: true }).eq("user_id", userId).gte("submitted_at", start).in("status", ["processando", "concluida"]);
    if ((q.count ?? 0) >= limiteDiario()) throw new UserFacingError(`Você atingiu o limite de ${limiteDiario()} correções por dia. Volte amanhã ou reescreva depois.`, "limit");
  }
  const rub = rubricaDaModalidade(s.data.modality as string);
  const ins = await admin.from("writing_evaluations").insert({ submission_id: id, user_id: userId, status: "processando", stage: "Na fila", rubric_key: rub.key, rubric_version: rub.version, modality: s.data.modality, estimated: rub.estimated, max_score: rub.max }).select("id").single();
  if (ins.error) throw new Error(ins.error.message);
  await admin.from("writing_submissions").update({ status: "processando", submitted_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", id).eq("user_id", userId);
  return { evaluationId: ins.data.id as string, created: true };
}

export async function discardDraft(userId: string, id: string): Promise<void> {
  uuid.parse(id);
  await db().from("writing_submissions").delete().eq("id", id).eq("user_id", userId).in("status", ["rascunho", "falhou"]);
}

/* ───────────── leitura ───────────── */

const STALE_MS = 12 * 60_000;

export interface SubmissionView {
  id: string; title: string; body: string; modality: string; board: string | null; contest: string | null; criteriaText: string | null; lineLimit: number | null;
  themeId: string | null; themeTitle: string | null; themeText: string | null; status: string; parentId: string | null; wordCount: number; createdAt: string; submittedAt: string | null;
}
const subView = (r: Record<string, unknown>): SubmissionView => ({
  id: r.id as string, title: r.title as string, body: r.body as string, modality: r.modality as string, board: (r.board as string | null) ?? null, contest: (r.contest as string | null) ?? null, criteriaText: (r.criteria_text as string | null) ?? null, lineLimit: (r.line_limit as number | null) ?? null,
  themeId: (r.theme_id as string | null) ?? null, themeTitle: (r.theme_title as string | null) ?? null, themeText: (r.theme_text as string | null) ?? null, status: r.status as string, parentId: (r.parent_id as string | null) ?? null, wordCount: r.word_count as number, createdAt: r.created_at as string, submittedAt: (r.submitted_at as string | null) ?? null,
});
const SUB_COLS = "id, title, body, modality, board, contest, criteria_text, line_limit, theme_id, theme_title, theme_text, status, parent_id, word_count, created_at, submitted_at";

export async function getSubmission(userId: string, id: string): Promise<SubmissionView | null> {
  if (!uuid.safeParse(id).success) return null;
  const r = await db().from("writing_submissions").select(SUB_COLS).eq("id", id).eq("user_id", userId).maybeSingle();
  return r.data ? subView(r.data) : null;
}

export interface ErroView { id: string; category: string; kind: string; severity: string; start: number; end: number; paragraph: number | null; excerpt: string; issue: string; explanation: string; rule: string | null; suggestion: string | null; example: string | null }
export interface CompetenciaView { key: string; label: string; score: number; max: number; level: number | null; justification: string }
export interface EvaluationView {
  id: string; status: string; stage: string | null; error: string | null; rubricKey: string; rubricVersion: number; modality: string; estimated: boolean; model: string | null;
  score: number | null; max: number | null; zeroReason: string | null; classification: string | null; analysis: unknown; diagnostic: unknown; notes: string[]; createdAt: string; finishedAt: string | null;
  competencies: CompetenciaView[]; errors: ErroView[];
}

/** Avaliação mais recente da redação (do próprio aluno). Processamentos travados viram "falhou" para nunca ficarem "concluídos" em falso. */
export async function getEvaluation(userId: string, submissionId: string): Promise<EvaluationView | null> {
  if (!uuid.safeParse(submissionId).success) return null;
  const admin = db();
  const e = await admin.from("writing_evaluations").select("*").eq("submission_id", submissionId).eq("user_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (!e.data) return null;
  let r = e.data as Record<string, unknown>;
  if (r.status === "processando" && Date.now() - new Date(r.created_at as string).getTime() > STALE_MS) {
    const msg = "A correção demorou mais que o esperado e foi interrompida. Reenvie para tentar de novo.";
    await admin.from("writing_evaluations").update({ status: "falhou", stage: null, error: msg, finished_at: new Date().toISOString() }).eq("id", r.id as string);
    await admin.from("writing_submissions").update({ status: "falhou" }).eq("id", submissionId).eq("user_id", userId);
    r = { ...r, status: "falhou", stage: null, error: msg };
  }
  const [c, x] = r.status === "concluida"
    ? await Promise.all([
        admin.from("writing_competencies").select("key, label, score, max_score, level, justification").eq("evaluation_id", r.id as string).eq("user_id", userId).order("position"),
        admin.from("writing_errors").select("id, category, kind, severity, start_offset, end_offset, paragraph, excerpt, issue, explanation, rule, suggestion, example").eq("evaluation_id", r.id as string).eq("user_id", userId).order("start_offset"),
      ])
    : [null, null];
  const score = r.score === null ? null : Number(r.score);
  const max = r.max_score === null ? null : Number(r.max_score);
  return {
    id: r.id as string, status: r.status as string, stage: (r.stage as string | null) ?? null, error: (r.error as string | null) ?? null, rubricKey: r.rubric_key as string, rubricVersion: r.rubric_version as number, modality: r.modality as string, estimated: r.estimated as boolean, model: (r.model as string | null) ?? null,
    score, max, zeroReason: (r.zero_reason as string | null) ?? null, classification: score !== null && max ? classificar(score, max) : null, analysis: r.analysis ?? null, diagnostic: r.diagnostic ?? null, notes: ((r.consistency_notes as string[] | null) ?? []).filter((n) => !n.startsWith("técnico:")), createdAt: r.created_at as string, finishedAt: (r.finished_at as string | null) ?? null,
    competencies: ((c?.data ?? []) as Record<string, unknown>[]).map((k) => ({ key: k.key as string, label: k.label as string, score: Number(k.score), max: Number(k.max_score), level: (k.level as number | null) ?? null, justification: k.justification as string })),
    errors: ((x?.data ?? []) as Record<string, unknown>[]).map((k) => ({ id: k.id as string, category: k.category as string, kind: k.kind as string, severity: k.severity as string, start: k.start_offset as number, end: k.end_offset as number, paragraph: (k.paragraph as number | null) ?? null, excerpt: k.excerpt as string, issue: k.issue as string, explanation: k.explanation as string, rule: (k.rule as string | null) ?? null, suggestion: (k.suggestion as string | null) ?? null, example: (k.example as string | null) ?? null })),
  };
}

export interface HistoryItem { id: string; title: string; themeTitle: string | null; modality: string; status: string; score: number | null; max: number | null; createdAt: string; parentId: string | null; wordCount: number }

export async function listHistory(userId: string, limit = 60): Promise<HistoryItem[]> {
  const admin = db();
  const s = await admin.from("writing_submissions").select("id, title, theme_title, modality, status, parent_id, word_count, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(limit);
  const rows = (s.data ?? []) as Record<string, unknown>[];
  if (!rows.length) return [];
  const ev = await admin.from("writing_evaluations").select("submission_id, score, max_score, created_at").eq("user_id", userId).eq("status", "concluida").in("submission_id", rows.map((r) => r.id as string)).order("created_at", { ascending: false });
  const best = new Map<string, { score: number; max: number }>();
  for (const e of (ev.data ?? []) as Record<string, unknown>[]) if (!best.has(e.submission_id as string)) best.set(e.submission_id as string, { score: Number(e.score), max: Number(e.max_score) });
  return rows.map((r) => ({ id: r.id as string, title: (r.title as string) || (r.theme_title as string) || "Sem título", themeTitle: (r.theme_title as string | null) ?? null, modality: r.modality as string, status: r.status as string, score: best.get(r.id as string)?.score ?? null, max: best.get(r.id as string)?.max ?? null, createdAt: r.created_at as string, parentId: (r.parent_id as string | null) ?? null, wordCount: r.word_count as number }));
}

/* ───────────── reescrita e comparação ───────────── */

/** Cria uma nova versão (rascunho) a partir de uma redação já corrigida; o texto original nunca é alterado. */
export async function createRevision(userId: string, fromId: string): Promise<{ id: string }> {
  uuid.parse(fromId);
  const admin = db();
  const o = await admin.from("writing_submissions").select("*").eq("id", fromId).eq("user_id", userId).maybeSingle();
  if (!o.data) throw new UserFacingError("Redação não encontrada.", "not_found");
  if (o.data.status !== "concluida") throw new UserFacingError("Só é possível reescrever uma redação já corrigida.", "locked");
  const exist = await admin.from("writing_submissions").select("id").eq("user_id", userId).eq("parent_id", fromId).in("status", ["rascunho", "falhou"]).limit(1).maybeSingle();
  if (exist.data) return { id: exist.data.id as string };
  const ins = await admin.from("writing_submissions").insert({ user_id: userId, theme_id: o.data.theme_id, theme_title: o.data.theme_title, theme_text: o.data.theme_text, title: o.data.title, body: o.data.body, modality: o.data.modality, board: o.data.board, contest: o.data.contest, criteria_text: o.data.criteria_text, line_limit: o.data.line_limit, parent_id: fromId, status: "rascunho", word_count: o.data.word_count, char_count: o.data.char_count }).select("id").single();
  if (ins.error) throw new Error(ins.error.message);
  return { id: ins.data.id as string };
}

async function resumoDe(userId: string, submissionId: string): Promise<(Omit<AvaliacaoResumo, "erros"> & { texto: string; erros: { id: string; categoria: string; tipo: string; trecho: string }[] }) | null> {
  const [s, ev] = await Promise.all([getSubmission(userId, submissionId), getEvaluation(userId, submissionId)]);
  if (!s || !ev || ev.status !== "concluida" || ev.score === null || ev.max === null) return null;
  return { id: ev.id, createdAt: ev.createdAt, modality: ev.modality, score: ev.score, max: ev.max, texto: s.body, competencias: ev.competencies.map((c) => ({ key: c.key, label: c.label, score: c.score, max: c.max })), erros: ev.errors.map((e) => ({ id: e.id, categoria: e.category, tipo: e.kind, trecho: e.excerpt })) };
}

export interface ComparisonView {
  fromId: string; toId: string; mesmaEscala: boolean; antes: number; depois: number; max: number; delta: number | null;
  competencias: ReturnType<typeof compararNotas>["competencias"];
  corrigidos: number; permaneceram: number; novos: number;
  detalhe: { corrigidos: { categoria: string; trecho: string }[]; permaneceram: { categoria: string; trecho: string }[]; novos: { categoria: string; trecho: string }[] };
  narrativa: z.infer<typeof ComparacaoSchema> | null;
}

/** Comparação entre uma versão e a anterior: números calculados em código; a explicação em texto vem da IA (quando gerada). */
export async function getComparison(userId: string, toId: string): Promise<ComparisonView | null> {
  const s = await getSubmission(userId, toId);
  if (!s?.parentId) return null;
  const [a, b] = await Promise.all([resumoDe(userId, s.parentId), resumoDe(userId, toId)]);
  if (!a || !b) return null;
  const n = compararNotas(a, b);
  const er = compararErros({ texto: a.texto, erros: a.erros.map((e) => ({ id: e.id, categoria: e.categoria, trecho: e.trecho })) }, { texto: b.texto, erros: b.erros.map((e) => ({ id: e.id, categoria: e.categoria, trecho: e.trecho })) });
  const rev = await db().from("writing_revisions").select("comparison, status").eq("user_id", userId).eq("from_submission_id", s.parentId).eq("to_submission_id", toId).maybeSingle();
  const parsed = rev.data?.status === "concluida" ? ComparacaoSchema.safeParse(rev.data.comparison) : null;
  const slim = (l: { categoria: string; trecho: string }[]) => l.slice(0, 20).map((e) => ({ categoria: e.categoria, trecho: e.trecho }));
  return { fromId: s.parentId, toId, mesmaEscala: n.mesmaEscala, antes: n.antes, depois: n.depois, max: n.max, delta: n.delta, competencias: n.competencias, corrigidos: er.corrigidos.length, permaneceram: er.permaneceram.length, novos: er.novos.length, detalhe: { corrigidos: slim(er.corrigidos), permaneceram: slim(er.permaneceram), novos: slim(er.novos) }, narrativa: parsed?.success ? parsed.data : null };
}

export async function explainComparison(userId: string, toId: string): Promise<void> {
  const cmp = await getComparison(userId, toId);
  if (!cmp) throw new UserFacingError("Corrija as duas versões antes de comparar.", "invalid");
  exigirIA();
  await enforceRateLimit(userId, "redacao:comparar", 6, 60);
  const [a, b] = await Promise.all([getSubmission(userId, cmp.fromId), getSubmission(userId, toId)]);
  if (!a || !b) throw new UserFacingError("Redação não encontrada.", "not_found");
  const dados = JSON.stringify({ notaAnterior: cmp.antes, notaAtual: cmp.depois, maximo: cmp.max, diferenca: cmp.delta, competencias: cmp.competencias.map((c) => ({ c: c.label, antes: c.antes, depois: c.depois, max: c.max })), errosCorrigidos: cmp.corrigidos, errosQuePermaneceram: cmp.permaneceram, errosNovos: cmp.novos });
  try {
    const r = await chamarIA(userId, "redacao.comparacao", { task: "writing_correction", schema: ComparacaoSchema, schemaName: "comparacao_versoes", prompt: promptComparacao({ antes: a.body, depois: b.body, dados }), maxOutputTokens: 3000 });
    const up = await db().from("writing_revisions").upsert({ user_id: userId, from_submission_id: cmp.fromId, to_submission_id: toId, comparison: r.data, status: "concluida" }, { onConflict: "from_submission_id,to_submission_id" });
    if (up.error) throw new Error(up.error.message);
  } catch (e) {
    iaMsg(e);
  }
}

/* ───────────── evolução ───────────── */

const GRUPOS: Record<string, string[]> = { gramatical: ["c1", "norma_culta"], argumentativa: ["c3", "argumentacao"], estrutural: ["c2", "tema_genero", "organizacao", "genero_formato"], coesao: ["c4", "coesao_coerencia", "coesao"] };

export interface ProgressView {
  total: number;
  serie: ReturnType<typeof serieNotas>;
  grupos: Record<string, { data: string; pct: number }[]>;
  errosPorRedacao: { data: string; total: number; objetivos: number }[];
  porModalidade: { modality: string; n: number; media: number }[];
  insights: ReturnType<typeof insights>;
}

export async function getProgress(userId: string): Promise<ProgressView> {
  const admin = db();
  const ev = await admin.from("writing_evaluations").select("id, created_at, modality, score, max_score").eq("user_id", userId).eq("status", "concluida").not("score", "is", null).order("created_at", { ascending: true }).limit(100);
  const rows = (ev.data ?? []) as Record<string, unknown>[];
  const ids = rows.map((r) => r.id as string);
  const [comp, err] = ids.length
    ? await Promise.all([
        admin.from("writing_competencies").select("evaluation_id, key, label, score, max_score").eq("user_id", userId).in("evaluation_id", ids),
        admin.from("writing_errors").select("evaluation_id, category, kind").eq("user_id", userId).in("evaluation_id", ids).limit(20000),
      ])
    : [{ data: [] }, { data: [] }];
  const comps = (comp.data ?? []) as Record<string, unknown>[];
  const errs = (err.data ?? []) as Record<string, unknown>[];
  const av: AvaliacaoResumo[] = rows.map((r) => ({
    id: r.id as string, createdAt: r.created_at as string, modality: r.modality as string, score: Number(r.score), max: Number(r.max_score),
    competencias: comps.filter((c) => c.evaluation_id === r.id).map((c) => ({ key: c.key as string, label: c.label as string, score: Number(c.score), max: Number(c.max_score) })),
    erros: errs.filter((x) => x.evaluation_id === r.id).map((x) => ({ categoria: x.category as string, tipo: x.kind as string })),
  }));
  const grupos: ProgressView["grupos"] = {};
  for (const [g, keys] of Object.entries(GRUPOS)) {
    const pts = av.map((a) => {
      const c = a.competencias.find((k) => keys.includes(k.key));
      return c && c.max ? { data: a.createdAt, pct: Math.round((c.score / c.max) * 100) } : null;
    }).filter((x): x is { data: string; pct: number } => !!x);
    if (pts.length) grupos[g] = pts;
  }
  const mod = new Map<string, number[]>();
  for (const a of av) mod.set(a.modality, [...(mod.get(a.modality) ?? []), a.max ? (a.score / a.max) * 100 : 0]);
  return {
    total: av.length,
    serie: serieNotas(av),
    grupos,
    errosPorRedacao: av.map((a) => ({ data: a.createdAt, total: a.erros.length, objetivos: a.erros.filter((e) => e.tipo === "erro_objetivo").length })),
    porModalidade: [...mod.entries()].map(([modality, v]) => ({ modality, n: v.length, media: Math.round(v.reduce((s, x) => s + x, 0) / v.length) })),
    insights: insights(av),
  };
}

/* ───────────── temas ───────────── */

export interface ThemeView {
  id: string; title: string; category: string | null; mode: string; difficulty: string; context: string; problem: string; motivators: { texto: string; referencia: string }[];
  command: string; genre: string; linesMin: number | null; linesMax: number | null; guidance: string | null; board: string | null; verified: boolean; team: boolean; createdAt: string;
}
const themeView = (r: Record<string, unknown>): ThemeView => ({
  id: r.id as string, title: r.title as string, category: (r.category_slug as string | null) ?? null, mode: r.mode as string, difficulty: r.difficulty as string, context: r.context as string, problem: r.problem as string,
  motivators: (r.motivators as { texto: string; referencia: string }[]) ?? [], command: r.command as string, genre: r.genre as string, linesMin: (r.lines_min as number | null) ?? null, linesMax: (r.lines_max as number | null) ?? null,
  guidance: (r.guidance as string | null) ?? null, board: (r.board as string | null) ?? null, verified: r.verified === true, team: r.user_id === null, createdAt: r.created_at as string,
});

export async function listCategories(): Promise<{ slug: string; name: string }[]> {
  const r = await db().from("writing_categories").select("slug, name").eq("active", true).order("sort").order("name");
  return (r.data ?? []) as { slug: string; name: string }[];
}

export async function getTheme(userId: string, id: string): Promise<ThemeView | null> {
  if (!uuid.safeParse(id).success) return null;
  const r = await db().from("writing_themes").select("*").eq("id", id).or(`user_id.is.null,user_id.eq.${userId}`).maybeSingle();
  return r.data ? themeView(r.data) : null;
}

export async function listThemes(userId: string, limit = 30): Promise<ThemeView[]> {
  const r = await db().from("writing_themes").select("*").or(`user_id.is.null,user_id.eq.${userId}`).order("created_at", { ascending: false }).limit(limit);
  return ((r.data ?? []) as Record<string, unknown>[]).map(themeView);
}

const temaInput = z.object({ modo: z.enum(["surpreenda", "categoria", "atualidades", "simulado"]), categoria: z.string().trim().max(60).nullish(), dificuldade: z.enum(["basico", "intermediario", "avancado", "especialista"]).default("intermediario"), board: z.string().trim().max(60).nullish() });

/** Gera uma proposta inédita (evitando os temas recentes do aluno). Atualidades: sem pesquisa de fontes, o tema é marcado como NÃO verificado. */
export async function generateTheme(userId: string, input: z.input<typeof temaInput>): Promise<{ id: string }> {
  const i = temaInput.parse(input);
  exigirIA();
  await enforceRateLimit(userId, "redacao:tema", 8, 60);
  const admin = db();
  let cat: { slug: string; name: string } | null = null;
  const cats = await listCategories();
  if (i.modo === "categoria") {
    cat = cats.find((c) => c.slug === i.categoria) ?? null;
    if (!cat) throw new UserFacingError("Escolha uma categoria válida.", "invalid");
  } else if (i.modo === "surpreenda" && cats.length) cat = null;
  const recentes = await admin.from("writing_themes").select("title").or(`user_id.eq.${userId},user_id.is.null`).order("created_at", { ascending: false }).limit(25);
  const agora = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "long" }).format(new Date());
  try {
    const r = await chamarIA(userId, "redacao.tema", { task: "writing_theme", schema: TemaSchema, schemaName: "proposta_redacao", prompt: promptTema({ modo: i.modo, categoria: cat?.name ?? null, dificuldade: i.dificuldade, recentes: ((recentes.data ?? []) as { title: string }[]).map((t) => t.title), board: i.board, agora }), maxOutputTokens: 4500, temperature: 0.9 });
    const t = r.data;
    const slug = cat?.slug ?? cats.find((c) => c.name.toLowerCase() === t.categoria.toLowerCase())?.slug ?? null;
    const ins = await admin.from("writing_themes").insert({ user_id: userId, category_slug: slug, mode: i.modo, difficulty: i.dificuldade, title: t.titulo, context: t.contextualizacao, problem: t.problema, motivators: t.motivadores, command: t.comando, genre: t.genero, lines_min: t.linhasMin || null, lines_max: t.linhasMax || null, guidance: t.orientacoes, board: i.board ?? null, verified: false, sources: i.modo === "atualidades" ? [] : t.fontes, created_by: userId }).select("id").single();
    if (ins.error) throw new Error(ins.error.message);
    return { id: ins.data.id as string };
  } catch (e) {
    return iaMsg(e);
  }
}

/** Texto único da proposta, usado como tema da redação. */
export function temaComoTexto(t: ThemeView): string {
  return [t.context, t.problem, ...t.motivators.map((m, n) => `Texto motivador ${n + 1}: ${m.texto} (${m.referencia})`), `Comando: ${t.command}`, `Gênero: ${t.genre}${t.linesMin || t.linesMax ? ` · ${t.linesMin ?? ""}${t.linesMin && t.linesMax ? " a " : ""}${t.linesMax ?? ""} linhas` : ""}`, t.guidance ? `Orientações: ${t.guidance}` : ""].filter(Boolean).join("\n\n");
}

/* ───────────── exercícios ───────────── */

export interface ExerciseView { id: string; topic: string; category: string; explanation: string | null; questions: { id: string; enunciado: string; tipo: string; alternativas: string[] | null }[]; status: string; answers: Record<string, string> | null; feedback: { itens: { id: string; correta: boolean; pontos: number; comentario: string; gabarito: string; explicacao: string }[]; resumo: string } | null; score: number | null; max: number | null; createdAt: string }

function exView(r: Record<string, unknown>): ExerciseView {
  return { id: r.id as string, topic: r.topic as string, category: r.category as string, explanation: (r.explanation as string | null) ?? null, questions: (r.questions as ExerciseView["questions"]) ?? [], status: r.status as string, answers: (r.answers as Record<string, string> | null) ?? null, feedback: r.status === "corrigido" ? ((r.feedback as ExerciseView["feedback"]) ?? null) : null, score: r.score === null ? null : Number(r.score), max: r.max_score === null ? null : Number(r.max_score), createdAt: r.created_at as string };
}

export async function listExercises(userId: string): Promise<ExerciseView[]> {
  const r = await db().from("writing_exercises").select("id, topic, category, explanation, questions, status, answers, feedback, score, max_score, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(30);
  return ((r.data ?? []) as Record<string, unknown>[]).map(exView);
}

export async function getExercise(userId: string, id: string): Promise<ExerciseView | null> {
  if (!uuid.safeParse(id).success) return null;
  const r = await db().from("writing_exercises").select("id, topic, category, explanation, questions, status, answers, feedback, score, max_score, created_at").eq("id", id).eq("user_id", userId).maybeSingle();
  return r.data ? exView(r.data) : null;
}

/** Categorias de erro mais frequentes do aluno (erros objetivos primeiro). */
export async function weakCategories(userId: string): Promise<{ category: string; n: number }[]> {
  const r = await db().from("writing_errors").select("category, kind").eq("user_id", userId).in("kind", ["erro_objetivo", "problema_construcao", "fragilidade_argumentativa"]).order("id", { ascending: false }).limit(400);
  const m = new Map<string, number>();
  for (const x of (r.data ?? []) as { category: string }[]) m.set(x.category, (m.get(x.category) ?? 0) + 1);
  return [...m.entries()].map(([category, n]) => ({ category, n })).sort((a, b) => b.n - a.n).slice(0, 6);
}

/** Gera um exercício sobre a dificuldade REAL do aluno; sem erros registrados na categoria, não gera. */
export async function generateExercise(userId: string, category: string): Promise<{ id: string }> {
  const cat = z.string().trim().min(2).max(40).parse(category);
  exigirIA();
  await enforceRateLimit(userId, "redacao:exercicio", 5, 60);
  const admin = db();
  const er = await admin.from("writing_errors").select("excerpt, explanation, rule, evaluation_id").eq("user_id", userId).eq("category", cat).order("id", { ascending: false }).limit(8);
  const ex = (er.data ?? []) as { excerpt: string; explanation: string; rule: string | null; evaluation_id: string }[];
  if (!ex.length) throw new UserFacingError("Você ainda não tem apontamentos nessa categoria. Envie uma redação para receber exercícios personalizados.", "invalid");
  const topico = ex[0]?.rule?.slice(0, 120) || cat;
  try {
    const r = await chamarIA(userId, "redacao.exercicio", { task: "writing_exercise", schema: ExercicioSchema, schemaName: "exercicio", prompt: promptExercicio({ categoria: cat, topico, exemplos: ex.map((e) => ({ trecho: e.excerpt, explicacao: e.explanation })), nivel: "intermediário" }), maxOutputTokens: 5000, temperature: 0.5 });
    const qs = r.data.questoes.map((q, n) => ({ id: q.id || `q${n + 1}`, enunciado: q.enunciado, tipo: q.tipo, alternativas: q.tipo === "multipla_escolha" ? q.alternativas ?? [] : null }));
    const key = Object.fromEntries(r.data.questoes.map((q, n) => [q.id || `q${n + 1}`, { gabarito: q.gabarito, explicacao: q.explicacao }]));
    const ins = await admin.from("writing_exercises").insert({ user_id: userId, evaluation_id: ex[0]?.evaluation_id ?? null, topic: topico, category: cat, explanation: r.data.explicacao, questions: qs, answer_key: key, max_score: qs.length }).select("id").single();
    if (ins.error) throw new Error(ins.error.message);
    return { id: ins.data.id as string };
  } catch (e) {
    return iaMsg(e);
  }
}

const nrm = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();

/** Corrige o exercício (múltipla escolha no código; reescrita pela IA), registra no histórico e só então revela o gabarito. */
export async function submitExercise(userId: string, id: string, answers: Record<string, string>): Promise<void> {
  uuid.parse(id);
  const admin = db();
  const r = await admin.from("writing_exercises").select("*").eq("id", id).eq("user_id", userId).maybeSingle();
  if (!r.data) throw new UserFacingError("Exercício não encontrado.", "not_found");
  if (r.data.status === "corrigido") return;
  const qs = r.data.questions as ExerciseView["questions"];
  const key = (r.data.answer_key ?? {}) as Record<string, { gabarito: string; explicacao: string }>;
  const clean: Record<string, string> = {};
  for (const q of qs) clean[q.id] = String(answers[q.id] ?? "").slice(0, 1500);
  if (qs.some((q) => !clean[q.id]?.trim())) throw new UserFacingError("Responda todas as questões antes de enviar.", "invalid");
  await enforceRateLimit(userId, "redacao:exercicio_corrigir", 6, 60);
  const itens: { id: string; correta: boolean; pontos: number; comentario: string; gabarito: string; explicacao: string }[] = [];
  const reescritas = qs.filter((q) => q.tipo === "reescrita");
  for (const q of qs.filter((x) => x.tipo !== "reescrita")) {
    const g = key[q.id]?.gabarito ?? "";
    const ok = nrm(clean[q.id] ?? "") === nrm(g);
    itens.push({ id: q.id, correta: ok, pontos: ok ? 1 : 0, comentario: ok ? "Correto." : "Resposta diferente do gabarito.", gabarito: g, explicacao: key[q.id]?.explicacao ?? "" });
  }
  if (reescritas.length) {
    exigirIA();
    try {
      const c = await chamarIA(userId, "redacao.exercicio_correcao", { task: "writing_exercise", schema: CorrecaoExercicioSchema, schemaName: "correcao_exercicio", prompt: promptCorrecaoExercicio({ topico: r.data.topic as string, itens: reescritas.map((q) => ({ id: q.id, enunciado: q.enunciado, tipo: q.tipo, gabarito: key[q.id]?.gabarito ?? "", resposta: clean[q.id] ?? "" })) }), maxOutputTokens: 2500 });
      for (const q of reescritas) {
        const it = c.data.itens.find((x) => x.id === q.id);
        itens.push({ id: q.id, correta: it?.correta ?? false, pontos: it ? Math.min(1, it.pontos) : 0, comentario: it?.comentario ?? "Não foi possível avaliar esta resposta.", gabarito: key[q.id]?.gabarito ?? "", explicacao: key[q.id]?.explicacao ?? "" });
      }
    } catch (e) {
      iaMsg(e);
    }
  }
  const score = Math.round(itens.reduce((s, x) => s + x.pontos, 0) * 10) / 10;
  const ordenado = qs.map((q) => itens.find((i) => i.id === q.id)!).filter(Boolean);
  const up = await admin.from("writing_exercises").update({ answers: clean, feedback: { itens: ordenado, resumo: `Você fez ${score} de ${qs.length} pontos.` }, score, status: "corrigido", corrected_at: new Date().toISOString() }).eq("id", id).eq("user_id", userId);
  if (up.error) throw new Error(up.error.message);
}

/* ───────────── professor (conversa) ───────────── */

const chatSchema = z.object({ evaluationId: uuid.nullish(), messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().trim().min(1).max(1500) })).min(1).max(12) });

/** Responde usando a redação corrigida e o diagnóstico do próprio aluno. A resposta é sempre texto; o histórico vive no navegador. */
export async function askTeacher(userId: string, input: z.input<typeof chatSchema>): Promise<string> {
  const i = chatSchema.parse(input);
  if (i.messages[i.messages.length - 1]?.role !== "user") throw new UserFacingError("Mensagem inválida.", "invalid");
  exigirIA();
  await enforceRateLimit(userId, "redacao:chat", 15, 60);
  const admin = db();
  let ctx = "O aluno ainda não escolheu uma redação corrigida: responda de forma geral e sugira enviar uma redação para análise personalizada.";
  if (i.evaluationId) {
    const e = await admin.from("writing_evaluations").select("id, submission_id, score, max_score, modality, diagnostic, estimated").eq("id", i.evaluationId).eq("user_id", userId).eq("status", "concluida").maybeSingle();
    if (!e.data) throw new UserFacingError("Redação não encontrada.", "not_found");
    const [s, c, x] = await Promise.all([
      getSubmission(userId, e.data.submission_id as string),
      admin.from("writing_competencies").select("label, score, max_score, justification").eq("evaluation_id", i.evaluationId).eq("user_id", userId).order("position"),
      admin.from("writing_errors").select("category, kind, severity, excerpt, issue, explanation").eq("evaluation_id", i.evaluationId).eq("user_id", userId).order("start_offset").limit(25),
    ]);
    ctx = `REDAÇÃO CORRIGIDA DO ALUNO (dados):\nTema: ${s?.themeTitle ?? "não informado"}\nNota: ${e.data.score}/${e.data.max_score}${e.data.estimated ? " (estimada)" : ""}\nCompetências: ${JSON.stringify(c.data ?? [])}\nPrincipais apontamentos: ${JSON.stringify(x.data ?? [])}\nDiagnóstico: ${JSON.stringify(e.data.diagnostic ?? {}).slice(0, 6000)}\nTexto do aluno:\n${(s?.body ?? "").slice(0, 8000)}`;
  }
  const conversa = i.messages.map((m) => `${m.role === "user" ? "ALUNO" : "PROFESSOR"}: ${m.content}`).join("\n");
  try {
    const r = await chamarIA(userId, "redacao.chat", { task: "writing_chat", schema: z.object({ resposta: z.string().trim().min(1).max(4000) }), schemaName: "resposta_professor", system: PROFESSOR_CHAT, prompt: `${ctx}\n\nCONVERSA:\n${conversa}\n\nResponda à última mensagem do ALUNO.`, maxOutputTokens: 1800, temperature: 0.4 });
    return r.data.resposta;
  } catch (e) {
    return iaMsg(e);
  }
}

/** Resumo curto do desempenho de redação do aluno, para o Mentor (somente leitura, só do próprio aluno). */
export async function resumoParaMentor(userId: string): Promise<{ total: number; ultimaNota: string | null; competenciaFraca: string | null; erroFrequente: string | null }> {
  const p = await getProgress(userId);
  const ult = p.serie[p.serie.length - 1];
  const fracas = await weakCategories(userId);
  return { total: p.total, ultimaNota: ult ? `${ult.nota}/${ult.max}` : null, competenciaFraca: null, erroFrequente: fracas[0]?.category ?? null };
}

/* ───────────── administração (sem acesso ao conteúdo privado das redações) ───────────── */

export async function adminStats() {
  const admin = db();
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const [subs, evs, usage, falhas, cats, themes] = await Promise.all([
    admin.from("writing_submissions").select("id", { count: "exact", head: true }),
    admin.from("writing_evaluations").select("status, score, max_score, modality, tokens_in, tokens_out, cost_usd, created_at").gte("created_at", since).limit(5000),
    admin.from("writing_usage").select("kind, ok, tokens_in, tokens_out, cost_usd, created_at").gte("created_at", since).limit(20000),
    admin.from("writing_evaluations").select("id, created_at, modality, error, attempts").eq("status", "falhou").order("created_at", { ascending: false }).limit(25),
    admin.from("writing_categories").select("id, slug, name, active, sort").order("sort"),
    admin.from("writing_themes").select("id, title, category_slug, mode, user_id, created_at").is("user_id", null).order("created_at", { ascending: false }).limit(30),
  ]);
  const e = (evs.data ?? []) as Record<string, unknown>[];
  const u = (usage.data ?? []) as Record<string, unknown>[];
  const concl = e.filter((x) => x.status === "concluida");
  return {
    totalRedacoes: subs.count ?? 0,
    ultimos30: { avaliacoes: e.length, concluidas: concl.length, falhas: e.filter((x) => x.status === "falhou").length, mediaPct: concl.length ? Math.round(concl.reduce((s, x) => s + (Number(x.max_score) ? (Number(x.score) / Number(x.max_score)) * 100 : 0), 0) / concl.length) : null },
    ia: { chamadas: u.length, falhas: u.filter((x) => !x.ok).length, tokensIn: u.reduce((s, x) => s + Number(x.tokens_in ?? 0), 0), tokensOut: u.reduce((s, x) => s + Number(x.tokens_out ?? 0), 0), custoUsd: u.reduce((s, x) => s + Number(x.cost_usd ?? 0), 0) },
    falhas: (falhas.data ?? []) as { id: string; created_at: string; modality: string; error: string | null; attempts: number }[],
    categorias: (cats.data ?? []) as { id: string; slug: string; name: string; active: boolean; sort: number }[],
    temasEquipe: (themes.data ?? []) as { id: string; title: string; category_slug: string | null; mode: string; created_at: string }[],
    limiteDiario: limiteDiario(),
    orcamentoDia: process.env.REDACAO_ORCAMENTO_DIA_USD ? Number(process.env.REDACAO_ORCAMENTO_DIA_USD) : null,
  };
}

const slugify = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);

export async function adminSaveCategory(name: string): Promise<void> {
  const n = z.string().trim().min(3).max(80).parse(name);
  const slug = slugify(n);
  if (!slug) throw new UserFacingError("Nome inválido.", "invalid");
  const mx = await db().from("writing_categories").select("sort").order("sort", { ascending: false }).limit(1).maybeSingle();
  const r = await db().from("writing_categories").upsert({ slug, name: n, active: true, sort: ((mx.data?.sort as number | undefined) ?? 0) + 10 }, { onConflict: "slug" });
  if (r.error) throw new Error(r.error.message);
}

export async function adminToggleCategory(id: string, active: boolean): Promise<void> {
  uuid.parse(id);
  const r = await db().from("writing_categories").update({ active }).eq("id", id);
  if (r.error) throw new Error(r.error.message);
}

const teamTheme = z.object({ title: z.string().trim().min(5).max(200), categorySlug: z.string().trim().max(60).nullish(), context: z.string().trim().min(10).max(3000), command: z.string().trim().min(10).max(1500), genre: z.string().trim().min(3).max(80).default("dissertativo-argumentativo"), difficulty: z.enum(["basico", "intermediario", "avancado", "especialista"]).default("intermediario"), board: z.string().trim().max(60).nullish(), linesMax: z.number().int().min(1).max(60).nullish() });
export async function adminSaveTheme(adminId: string, input: z.input<typeof teamTheme>): Promise<void> {
  const t = teamTheme.parse(input);
  const r = await db().from("writing_themes").insert({ user_id: null, mode: "equipe", category_slug: t.categorySlug ?? null, difficulty: t.difficulty, title: t.title, context: t.context, command: t.command, genre: t.genre, board: t.board ?? null, lines_max: t.linesMax ?? null, verified: false, created_by: adminId });
  if (r.error) throw new Error(r.error.message);
}
