import "server-only";
import { createAdminClient } from "../supabase";
import { auditLog } from "../observability";
import { UserFacingError } from "./trails";
import { parseStrategicText } from "@/domain/strategic/text";
import { checkImport, examKey, importSchema, repairImport, type ImportIssue, type StrategicImport } from "@/domain/strategic/import";
import { compareLastTwo, heatmap, subjectIncidence, type Edition } from "@/domain/strategic/analysis";
import { modeOfDiscipline } from "@/domain/edital/disciplines";
import { buildIndex, matchTopic } from "@/domain/edital/match";
import { fold, titleKey } from "@/domain/edital/text";
import { loadCatalog } from "./edital";
import { loadStudy } from "./edital-view";

/**
 * Catálogo Estratégico de Concursos (RAIO-X). Dados cadastrados pela equipe; o aluno só vê o que está PUBLICADO.
 * Nada aqui usa IA externa: as análises são cálculos sobre os registros cadastrados.
 */

type Row = Record<string, unknown>;
export type ExamStatus = "rascunho" | "em_revisao" | "aprovado" | "publicado" | "arquivado";
export const STATUS_LABEL: Record<ExamStatus, string> = { rascunho: "Rascunho", em_revisao: "Em revisão", aprovado: "Aprovado", publicado: "Publicado", arquivado: "Arquivado" };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ---------------------------------------------------------------------------
// Importação (admin): prévia → aplicar
// ---------------------------------------------------------------------------

export interface ImportPreview {
  ok: boolean;
  issues: ImportIssue[];
  data: StrategicImport | null;
  summary: { editions: number; cutoffs: number; subjects: number; topics: number; recommendations: number; sources: number } | null;
  existing: { id: string; status: ExamStatus; name: string } | null;
}

function parseRaw(raw: unknown): { data: StrategicImport | null; issues: ImportIssue[] } {
  let obj: unknown = raw;
  if (typeof raw === "string") {
    if (/^\s*[{[]/.test(raw)) {
      try {
        obj = JSON.parse(raw);
      } catch (e) {
        return { data: null, issues: [{ level: "erro", path: "json", message: `JSON inválido: ${(e as Error).message}` }] };
      }
    } else {
      // Texto colado do ChatGPT (formato de linhas CONCURSO / PROVA / NOTA / DISCIPLINA / ASSUNTO / FOCO).
      const t = parseStrategicText(raw);
      const textIssues: ImportIssue[] = t.issues.map((i) => ({ level: i.level ?? "erro", path: i.line ? `linha ${i.line}` : "texto", message: i.message }));
      if (!t.data) return { data: null, issues: textIssues };
      const r = importSchema.safeParse(t.data);
      if (!r.success) return { data: null, issues: [...textIssues, ...r.error.issues.slice(0, 40).map((i) => ({ level: "erro" as const, path: i.path.join(".") || "raiz", message: i.message }))] };
      return { data: r.data, issues: [...textIssues, ...repairImport(r.data), ...checkImport(r.data)] };
    }
  }
  const r = importSchema.safeParse(obj);
  if (!r.success) return { data: null, issues: r.error.issues.slice(0, 40).map((i) => ({ level: "erro" as const, path: i.path.join(".") || "raiz", message: i.message })) };
  return { data: r.data, issues: [...repairImport(r.data), ...checkImport(r.data)] };
}

/** targetId: grava a análise no concurso aberto pelo admin (vindo do edital do aluno), mesmo que o ChatGPT escreva o nome diferente. */
export async function previewImport(raw: unknown, targetId?: string | null): Promise<ImportPreview> {
  const { data, issues } = parseRaw(raw);
  if (!data) return { ok: false, issues, data: null, summary: null, existing: null };
  const db = createAdminClient();
  const ex = targetId && UUID.test(targetId)
    ? await db.from("strategic_exams").select("id, name, status").eq("id", targetId).maybeSingle()
    : await db.from("strategic_exams").select("id, name, status").eq("name_key", examKey(data.exam.name)).maybeSingle();
  const existing = ex.data ? { id: ex.data.id as string, status: ex.data.status as ExamStatus, name: ex.data.name as string } : null;
  if (existing && targetId) issues.push({ level: "aviso", path: "exam", message: `A análise será gravada em "${existing.name}" (o concurso do edital dos alunos).` });
  else if (existing) issues.push({ level: "aviso", path: "exam", message: `Já existe "${existing.name}" (${STATUS_LABEL[existing.status]}). Aplicar vai ATUALIZAR os dados e devolver o concurso para "Em revisão".` });
  const subjects = data.editions.flatMap((e) => e.subjects);
  return {
    ok: !issues.some((i) => i.level === "erro"),
    issues,
    data,
    summary: { editions: data.editions.length, cutoffs: data.editions.reduce((n, e) => n + e.cutoffs.length, 0), subjects: subjects.length, topics: subjects.reduce((n, s) => n + s.topics.length, 0), recommendations: data.recommendations.length, sources: data.sources.length },
    existing,
  };
}

/** Grava a análise importada. Nunca publica: novo = Rascunho; existente = Em revisão. */
export async function applyImport(adminId: string, raw: unknown, targetId?: string | null): Promise<{ examId: string; updated: boolean }> {
  const pv = await previewImport(raw, targetId);
  if (!pv.ok || !pv.data) throw new UserFacingError("A importação tem erros. Corrija o JSON e confira a prévia.", "invalid_import");
  const d = pv.data;
  const db = createAdminClient();
  const key = examKey(d.exam.name);
  let examId = pv.existing?.id;
  if (examId) {
    // Concurso-alvo (do edital dos alunos): o nome fica o do edital, para os alunos continuarem ligados a ele.
    const naming = targetId ? {} : { name: d.exam.name };
    const up = await db.from("strategic_exams").update({ ...naming, organ: d.exam.organ, limitations: d.limitations, status: "em_revisao", published_at: null, updated_at: new Date().toISOString() }).eq("id", examId);
    if (up.error) throw new Error(up.error.message);
    for (const t of ["strategic_recommendations", "strategic_cutoffs", "strategic_topics", "strategic_subjects", "strategic_editions", "strategic_sources", "strategic_positions"]) {
      const del = await db.from(t).delete().eq("exam_id", examId);
      if (del.error) throw new Error(del.error.message);
    }
  } else {
    const ins = await db.from("strategic_exams").insert({ name: d.exam.name, name_key: key, organ: d.exam.organ, limitations: d.limitations, status: "rascunho", created_by: adminId }).select("id").single();
    if (ins.error || !ins.data) throw new Error(ins.error?.message ?? "concurso");
    examId = ins.data.id as string;
  }
  const id = examId;
  if (d.positions.length) await db.from("strategic_positions").insert(d.positions.map((name) => ({ exam_id: id, name })));
  const srcIds = new Map<string, string>();
  for (const s of d.sources) {
    const r = await db.from("strategic_sources").insert({ exam_id: id, key: s.key, kind: s.kind, name: s.name, url: s.url, page: s.page ?? null, organ: s.organ, published_at: s.publishedAt, consulted_at: s.consultedAt, reviewer: s.reviewer, notes: s.notes }).select("id").single();
    if (r.error || !r.data) throw new Error(r.error?.message ?? "fonte");
    srcIds.set(s.key, r.data.id as string);
  }
  for (const e of d.editions) {
    const ed = await db.from("strategic_editions").insert({ exam_id: id, year: e.year, board: e.board, total_questions: e.totalQuestions ?? null, counting_rule: e.countingRule, notes: e.notes }).select("id").single();
    if (ed.error || !ed.data) throw new Error(ed.error?.message ?? "edição");
    const edId = ed.data.id as string;
    if (e.cutoffs.length) {
      const c = await db.from("strategic_cutoffs").insert(e.cutoffs.map((x) => ({ exam_id: id, edition_id: edId, position_name: x.position, modality: x.modality, stage: x.stage, kind: x.kind, score: x.score, max_score: x.maxScore ?? null, candidates: x.candidates ?? null, criterion: x.criterion, source_id: x.sourceKey ? srcIds.get(x.sourceKey) ?? null : null, source_page: x.sourcePage ?? null, verified_at: x.verifiedAt })));
      if (c.error) throw new Error(c.error.message);
    }
    for (const s of e.subjects) {
      const sj = await db.from("strategic_subjects").insert({ exam_id: id, edition_id: edId, name: s.name, mode: modeOfDiscipline(s.name), questions: s.questions, annulled: s.annulled }).select("id").single();
      if (sj.error || !sj.data) throw new Error(sj.error?.message ?? "disciplina");
      if (s.topics.length) {
        const t = await db.from("strategic_topics").insert(s.topics.map((x) => ({ exam_id: id, subject_id: sj.data.id as string, edition_id: edId, title: x.title, title_key: titleKey(x.title), questions: x.questions, annulled: x.annulled })));
        if (t.error) throw new Error(t.error.message);
      }
    }
  }
  if (d.recommendations.length) {
    const r = await db.from("strategic_recommendations").insert(d.recommendations.map((x, i) => ({ exam_id: id, priority: x.priority, subject: x.subject, topic: x.topic, justification: x.justification, position: i })));
    if (r.error) throw new Error(r.error.message);
  }
  await db.from("strategic_imports").insert({ admin_id: adminId, exam_id: id, status: "aplicada", summary: pv.summary, payload: d });
  await auditLog(db, { actorId: adminId, userId: null, action: "strategic.import", entity: "strategic_exams", entityId: id, meta: { updated: !!pv.existing, ...(pv.summary ?? {}) } }).catch(() => {});
  return { examId: id, updated: !!pv.existing };
}

// ---------------------------------------------------------------------------
// Administração
// ---------------------------------------------------------------------------

export interface ExamListItem { id: string; name: string; organ: string | null; status: ExamStatus; editions: number; years: number[]; updatedAt: string; requests: number }

export async function listExams(): Promise<ExamListItem[]> {
  const db = createAdminClient();
  const [ex, eds] = await Promise.all([
    db.from("strategic_exams").select("id, name, organ, status, updated_at").order("updated_at", { ascending: false }).limit(300),
    db.from("strategic_editions").select("exam_id, year").limit(3000),
  ]);
  const reqs = await db.from("edital_preparations").select("strategic_exam_id").not("strategic_exam_id", "is", null).limit(20000);
  const req = new Map<string, number>();
  for (const r of (reqs.data ?? []) as Row[]) req.set(r.strategic_exam_id as string, (req.get(r.strategic_exam_id as string) ?? 0) + 1);
  if (ex.error) throw new Error(ex.error.message);
  const years = new Map<string, number[]>();
  for (const e of (eds.data ?? []) as Row[]) years.set(e.exam_id as string, [...(years.get(e.exam_id as string) ?? []), e.year as number]);
  return ((ex.data ?? []) as Row[]).map((r) => ({ id: r.id as string, name: r.name as string, organ: (r.organ as string | null) ?? null, status: r.status as ExamStatus, editions: (years.get(r.id as string) ?? []).length, years: (years.get(r.id as string) ?? []).sort((a, b) => b - a), updatedAt: r.updated_at as string, requests: req.get(r.id as string) ?? 0 }));
}

/** Editais concluídos antes da ligação automática: liga ao abrir o catálogo do admin (lote pequeno). */
export async function backfillExamLinks(limit = 100): Promise<number> {
  const db = createAdminClient();
  const r = await db.from("edital_preparations").select("id").eq("status", "concluido").is("strategic_exam_id", null).not("contest_name", "is", null).limit(limit);
  let n = 0;
  for (const p of (r.data ?? []) as Row[]) if (await linkPreparationToExam(p.id as string).catch(() => null)) n++;
  return n;
}

/** Concurso aguardando análise: criado pelo edital de um aluno e ainda sem nenhuma prova catalogada. */
export const isAwaiting = (e: { editions: number | unknown[] }) => (typeof e.editions === "number" ? e.editions : e.editions.length) === 0;

/** Pedido do aluno visto pelo admin: dados do edital extraído e o conteúdo programático (para o comando do ChatGPT). */
export interface ExamRequestInfo { requests: number; contest: string | null; role: string | null; board: string | null; year: number | null; program: string }
export async function examRequestInfo(examId: string): Promise<ExamRequestInfo | null> {
  if (!UUID.test(examId)) return null;
  const db = createAdminClient();
  const preps = await db.from("edital_preparations").select("id, contest_name, role_name, board, contest_year, status, updated_at").eq("strategic_exam_id", examId).order("updated_at", { ascending: false }).limit(200);
  const rows = (preps.data ?? []) as Row[];
  if (!rows.length) return null;
  const best = rows.find((r) => r.status === "concluido") ?? rows[0]!;
  const [disc, top] = await Promise.all([
    db.from("edital_disciplines").select("id, name, position").eq("preparation_id", best.id as string).order("position"),
    db.from("edital_topics").select("discipline_id, title, depth, position").eq("preparation_id", best.id as string).order("position").limit(3000),
  ]);
  const byDisc = new Map<string, string[]>();
  for (const t of (top.data ?? []) as Row[]) if ((t.depth as number) <= 1) byDisc.set(t.discipline_id as string, [...(byDisc.get(t.discipline_id as string) ?? []), t.title as string]);
  let program = ((disc.data ?? []) as Row[]).map((d) => `${d.name as string}: ${(byDisc.get(d.id as string) ?? []).join("; ")}`).join("\n");
  if (program.length > 14000) program = `${program.slice(0, 14000)}\n(...)`;
  return { requests: rows.length, contest: (best.contest_name as string | null) ?? null, role: (best.role_name as string | null) ?? null, board: (best.board as string | null) ?? null, year: (best.contest_year as number | null) ?? null, program };
}

/**
 * Liga o edital extraído do aluno ao concurso do catálogo estratégico — automático, sem o aluno escolher.
 * Procura um concurso já cadastrado com o mesmo nome (ou cujos termos aparecem todos no edital);
 * se não houver, cria um "aguardando análise" para o admin catalogar o Raio-X dele.
 */
export async function linkPreparationToExam(prepId: string, opts: { force?: boolean } = {}): Promise<string | null> {
  const db = createAdminClient();
  const prep = await db.from("edital_preparations").select("id, contest_name, role_name, board, contest_year, strategic_exam_id").eq("id", prepId).maybeSingle();
  if (!prep.data) return null;
  const cur = (prep.data.strategic_exam_id as string | null) ?? null;
  if (cur && !opts.force) return cur;
  const contest = ((prep.data.contest_name as string | null) ?? "").replace(/\s+/g, " ").trim();
  if (!contest) return null;
  const year = (prep.data.contest_year as number | null) ?? null;
  const name = (year && !contest.includes(String(year)) ? `${contest} ${year}` : contest).slice(0, 200);
  const key = examKey(name);
  const all = await db.from("strategic_exams").select("id, name, name_key, status").neq("status", "arquivado").limit(1000);
  const exams = (all.data ?? []) as Row[];
  const text = `${contest} ${year ?? ""} ${(prep.data.role_name as string | null) ?? ""} ${(prep.data.board as string | null) ?? ""}`;
  const rank = (r: Row) => (r.status === "publicado" ? 1000 : 0) + toks(r.name as string).length;
  let found = exams.find((r) => r.name_key === key) ?? exams.filter((r) => matchesExam(text, r.name as string)).sort((a, b) => rank(b) - rank(a))[0];
  if (!found) {
    const ins = await db.from("strategic_exams").insert({ name, name_key: key, status: "rascunho" }).select("id, name").single();
    if (ins.data) found = ins.data as Row;
    else {
      const again = await db.from("strategic_exams").select("id, name").eq("name_key", key).maybeSingle(); // criado ao mesmo tempo por outro aluno
      if (!again.data) return null;
      found = again.data as Row;
    }
  }
  const id = found.id as string;
  if (id !== cur) await db.from("edital_preparations").update({ strategic_exam_id: id }).eq("id", prepId);
  return id;
}

// "Publicado" sai direto de qualquer estado: o admin publica a análise sem passar pela revisão.
const FLOW: Record<ExamStatus, ExamStatus[]> = {
  rascunho: ["publicado", "em_revisao", "arquivado"],
  em_revisao: ["publicado", "rascunho", "aprovado", "arquivado"],
  aprovado: ["publicado", "em_revisao", "arquivado"],
  publicado: ["em_revisao", "arquivado"],
  arquivado: ["publicado", "rascunho"],
};
export const nextStatuses = (s: ExamStatus) => FLOW[s];

export async function setExamStatus(adminId: string, id: string, to: ExamStatus) {
  if (!UUID.test(id)) throw new UserFacingError("Concurso não encontrado.", "not_found");
  const db = createAdminClient();
  const cur = await db.from("strategic_exams").select("status").eq("id", id).maybeSingle();
  if (!cur.data) throw new UserFacingError("Concurso não encontrado.", "not_found");
  const from = cur.data.status as ExamStatus;
  if (!FLOW[from].includes(to)) throw new UserFacingError(`Não é possível ir de "${STATUS_LABEL[from]}" para "${STATUS_LABEL[to]}". Siga o fluxo de revisão.`, "bad_transition");
  const up = await db.from("strategic_exams").update({ status: to, published_at: to === "publicado" ? new Date().toISOString() : null, updated_at: new Date().toISOString() }).eq("id", id);
  if (up.error) throw new Error(up.error.message);
  await auditLog(db, { actorId: adminId, userId: null, action: "strategic.status", entity: "strategic_exams", entityId: id, meta: { from, to } }).catch(() => {});
}

export async function deleteExam(adminId: string, id: string) {
  if (!UUID.test(id)) return;
  const db = createAdminClient();
  await db.from("strategic_exams").delete().eq("id", id);
  await auditLog(db, { actorId: adminId, userId: null, action: "strategic.delete", entity: "strategic_exams", entityId: id }).catch(() => {});
}

// ---------------------------------------------------------------------------
// Leitura (admin vê tudo; aluno só publicado)
// ---------------------------------------------------------------------------

export interface CutoffView { id: string; editionYear: number; board: string | null; position: string | null; modality: string; stage: string | null; kind: string; score: number; maxScore: number | null; candidates: number | null; criterion: string | null; source: { name: string; url: string | null; kind: string; organ: string | null; reviewer: string | null } | null; sourcePage: number | null; verifiedAt: string | null }
export interface SourceView { id: string; kind: string; name: string; url: string | null; page: number | null; organ: string | null; publishedAt: string | null; consultedAt: string | null; reviewer: string | null; notes: string | null }
export interface RecoView { priority: "maxima" | "alta" | "complementar"; subject: string | null; topic: string; justification: string }
export interface ExamData {
  id: string; name: string; organ: string | null; status: ExamStatus; limitations: string | null;
  positions: string[]; editions: Edition[]; cutoffs: CutoffView[]; sources: SourceView[]; recommendations: RecoView[];
}

export async function loadExam(id: string, opts: { onlyPublished: boolean }): Promise<ExamData | null> {
  if (!UUID.test(id)) return null;
  const db = createAdminClient();
  let q = db.from("strategic_exams").select("id, name, organ, status, limitations").eq("id", id);
  if (opts.onlyPublished) q = q.eq("status", "publicado");
  const ex = await q.maybeSingle();
  if (!ex.data) return null;
  const [pos, eds, src, cut, sub, top, rec] = await Promise.all([
    db.from("strategic_positions").select("name").eq("exam_id", id),
    db.from("strategic_editions").select("id, year, board, total_questions, counting_rule").eq("exam_id", id).order("year", { ascending: false }),
    db.from("strategic_sources").select("*").eq("exam_id", id),
    db.from("strategic_cutoffs").select("*").eq("exam_id", id),
    db.from("strategic_subjects").select("id, edition_id, name, mode, questions, annulled").eq("exam_id", id),
    db.from("strategic_topics").select("subject_id, title, questions, annulled").eq("exam_id", id).limit(10000),
    db.from("strategic_recommendations").select("priority, subject, topic, justification, position").eq("exam_id", id).order("position"),
  ]);
  const topicsBy = new Map<string, Row[]>();
  for (const t of (top.data ?? []) as Row[]) topicsBy.set(t.subject_id as string, [...(topicsBy.get(t.subject_id as string) ?? []), t]);
  const editions: Edition[] = ((eds.data ?? []) as Row[]).map((e) => ({
    id: e.id as string, year: e.year as number, board: (e.board as string | null) ?? null, totalQuestions: (e.total_questions as number | null) ?? null, countingRule: (e.counting_rule as string | null) ?? null,
    subjects: ((sub.data ?? []) as Row[]).filter((s) => s.edition_id === e.id).map((s) => ({
      name: s.name as string, mode: (s.mode as string | null) ?? null, questions: s.questions as number, annulled: s.annulled as number,
      topics: (topicsBy.get(s.id as string) ?? []).map((t) => ({ title: t.title as string, questions: t.questions as number, annulled: t.annulled as number })),
    })),
  }));
  const sources: SourceView[] = ((src.data ?? []) as Row[]).map((s) => ({ id: s.id as string, kind: s.kind as string, name: s.name as string, url: (s.url as string | null) ?? null, page: (s.page as number | null) ?? null, organ: (s.organ as string | null) ?? null, publishedAt: (s.published_at as string | null) ?? null, consultedAt: (s.consulted_at as string | null) ?? null, reviewer: (s.reviewer as string | null) ?? null, notes: (s.notes as string | null) ?? null }));
  const srcById = new Map(sources.map((s) => [s.id, s]));
  const edById = new Map(editions.map((e) => [e.id, e]));
  const cutoffs: CutoffView[] = ((cut.data ?? []) as Row[]).map((c) => {
    const e = edById.get(c.edition_id as string);
    const s = c.source_id ? srcById.get(c.source_id as string) : undefined;
    return { id: c.id as string, editionYear: e?.year ?? 0, board: e?.board ?? null, position: (c.position_name as string | null) ?? null, modality: c.modality as string, stage: (c.stage as string | null) ?? null, kind: c.kind as string, score: Number(c.score), maxScore: c.max_score === null ? null : Number(c.max_score), candidates: (c.candidates as number | null) ?? null, criterion: (c.criterion as string | null) ?? null, source: s ? { name: s.name, url: s.url, kind: s.kind, organ: s.organ, reviewer: s.reviewer } : null, sourcePage: (c.source_page as number | null) ?? null, verifiedAt: (c.verified_at as string | null) ?? null };
  }).sort((a, b) => b.editionYear - a.editionYear);
  return {
    id, name: ex.data.name as string, organ: (ex.data.organ as string | null) ?? null, status: ex.data.status as ExamStatus, limitations: (ex.data.limitations as string | null) ?? null,
    positions: ((pos.data ?? []) as Row[]).map((p) => p.name as string), editions, cutoffs, sources,
    recommendations: ((rec.data ?? []) as Row[]).map((r) => ({ priority: r.priority as RecoView["priority"], subject: (r.subject as string | null) ?? null, topic: r.topic as string, justification: r.justification as string })),
  };
}

// ---------------------------------------------------------------------------
// RAIO-X do aluno (dentro da preparação por edital)
// ---------------------------------------------------------------------------

const STOP = new Set(["de", "da", "do", "das", "dos", "e", "estado", "concurso", "publico", "edital"]);
const toks = (s: string) => fold(s).split(/[^a-z0-9]+/).filter((t) => t.length > 1 && !STOP.has(t));

/** O concurso do aluno corresponde a um concurso publicado? Todos os termos do nome estratégico precisam aparecer no nome da preparação. */
export function matchesExam(prepText: string, examName: string): boolean {
  const have = new Set(toks(prepText));
  const need = toks(examName);
  return need.length > 0 && need.every((t) => have.has(t));
}

export interface LessonRef { catalogId: string; title: string; pct: number; done: boolean; coverage: string }
export interface RaioXTopic { subject: string; title: string; lessons: LessonRef[] }
export interface RaioX {
  exam: ExamData;
  incidence: Array<{ year: number; board: string | null; denominator: number; countingRule: string | null; rows: ReturnType<typeof subjectIncidence>["rows"] }>;
  comparison: ReturnType<typeof compareLastTwo>;
  heat: ReturnType<typeof heatmap>;
  /** título do assunto (chave) → aulas do catálogo */
  lessons: Record<string, LessonRef[]>;
}
export interface RaioXResult { status: "ok" | "aguardando" | "sem_nome"; raiox: RaioX | null; examName: string | null }

/** Raio-X só do concurso do edital extraído (ligação automática; o aluno não escolhe). */
export async function getRaioX(userId: string, prepId: string): Promise<RaioXResult> {
  const db = createAdminClient();
  const prep = await db.from("edital_preparations").select("id").eq("id", prepId).eq("user_id", userId).maybeSingle();
  if (!prep.data) throw new UserFacingError("Preparação não encontrada.", "not_found");
  const examId = await linkPreparationToExam(prepId);
  if (!examId) return { status: "sem_nome", raiox: null, examName: null };
  const exam = await loadExam(examId, { onlyPublished: true });
  if (!exam) {
    const n = await db.from("strategic_exams").select("name").eq("id", examId).maybeSingle();
    return { status: "aguardando", raiox: null, examName: (n.data?.name as string | undefined) ?? null };
  }

  const incidence = [...exam.editions].sort((a, b) => b.year - a.year).map((e) => ({ year: e.year, board: e.board, countingRule: e.countingRule, ...subjectIncidence(e) }));
  const comparison = compareLastTwo(exam.editions);
  const heat = heatmap(exam.editions);

  // Conexão com as aulas: mesmo motor do edital, só sobre o catálogo existente.
  const idx = buildIndex(await loadCatalog());
  const wanted = new Map<string, { title: string; mode: string | null }>();
  for (const c of heat.cells) wanted.set(c.key, { title: c.title, mode: modeOfDiscipline(c.subject) });
  for (const r of exam.recommendations) wanted.set(`${titleKey(r.subject ?? "")}|${titleKey(r.topic)}`, { title: r.topic, mode: r.subject ? modeOfDiscipline(r.subject) : null });
  const links = new Map<string, Array<{ catalogId: string; coverage: string }>>();
  for (const [key, w] of wanted) {
    const m = matchTopic(idx, w.title, w.mode);
    if (m.status === "completa" || m.status === "parcial") links.set(key, m.links.map((l) => ({ catalogId: l.catalogId, coverage: l.coverage })));
  }
  const ids = [...new Set([...links.values()].flat().map((l) => l.catalogId))];
  const { titles, studied } = await loadStudy(userId, ids);
  const lessons: Record<string, LessonRef[]> = {};
  for (const [key, ls] of links) lessons[key] = ls.map((l) => ({ catalogId: l.catalogId, title: titles.get(l.catalogId) ?? "Aula", pct: studied.get(l.catalogId) ?? 0, done: (studied.get(l.catalogId) ?? 0) >= 100, coverage: l.coverage }));

  // Lacuna registrada (assunto do Raio-X sem aula), sem duplicar linhas.
  return { status: "ok", raiox: { exam, incidence, comparison, heat, lessons }, examName: exam.name };
}

