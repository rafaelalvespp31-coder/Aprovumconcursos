import "server-only";
import { createAdminClient } from "../supabase";
import { auditLog } from "../observability";
import { UserFacingError } from "./trails";
import { checkImport, examKey, importSchema, type ImportIssue, type StrategicImport } from "@/domain/strategic/import";
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
    try {
      obj = JSON.parse(raw);
    } catch (e) {
      return { data: null, issues: [{ level: "erro", path: "json", message: `JSON inválido: ${(e as Error).message}` }] };
    }
  }
  const r = importSchema.safeParse(obj);
  if (!r.success) return { data: null, issues: r.error.issues.slice(0, 40).map((i) => ({ level: "erro" as const, path: i.path.join(".") || "raiz", message: i.message })) };
  return { data: r.data, issues: checkImport(r.data) };
}

export async function previewImport(raw: unknown): Promise<ImportPreview> {
  const { data, issues } = parseRaw(raw);
  if (!data) return { ok: false, issues, data: null, summary: null, existing: null };
  const ex = await createAdminClient().from("strategic_exams").select("id, name, status").eq("name_key", examKey(data.exam.name)).maybeSingle();
  const existing = ex.data ? { id: ex.data.id as string, status: ex.data.status as ExamStatus, name: ex.data.name as string } : null;
  if (existing) issues.push({ level: "aviso", path: "exam", message: `Já existe "${existing.name}" (${STATUS_LABEL[existing.status]}). Aplicar vai ATUALIZAR os dados e devolver o concurso para "Em revisão".` });
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
export async function applyImport(adminId: string, raw: unknown): Promise<{ examId: string; updated: boolean }> {
  const pv = await previewImport(raw);
  if (!pv.ok || !pv.data) throw new UserFacingError("A importação tem erros. Corrija o JSON e confira a prévia.", "invalid_import");
  const d = pv.data;
  const db = createAdminClient();
  const key = examKey(d.exam.name);
  let examId = pv.existing?.id;
  if (examId) {
    const up = await db.from("strategic_exams").update({ name: d.exam.name, organ: d.exam.organ, limitations: d.limitations, status: "em_revisao", published_at: null, updated_at: new Date().toISOString() }).eq("id", examId);
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

export interface ExamListItem { id: string; name: string; organ: string | null; status: ExamStatus; editions: number; years: number[]; updatedAt: string }

export async function listExams(): Promise<ExamListItem[]> {
  const db = createAdminClient();
  const [ex, eds] = await Promise.all([
    db.from("strategic_exams").select("id, name, organ, status, updated_at").order("updated_at", { ascending: false }).limit(300),
    db.from("strategic_editions").select("exam_id, year").limit(3000),
  ]);
  if (ex.error) throw new Error(ex.error.message);
  const years = new Map<string, number[]>();
  for (const e of (eds.data ?? []) as Row[]) years.set(e.exam_id as string, [...(years.get(e.exam_id as string) ?? []), e.year as number]);
  return ((ex.data ?? []) as Row[]).map((r) => ({ id: r.id as string, name: r.name as string, organ: (r.organ as string | null) ?? null, status: r.status as ExamStatus, editions: (years.get(r.id as string) ?? []).length, years: (years.get(r.id as string) ?? []).sort((a, b) => b - a), updatedAt: r.updated_at as string }));
}

const FLOW: Record<ExamStatus, ExamStatus[]> = {
  rascunho: ["em_revisao", "arquivado"],
  em_revisao: ["rascunho", "aprovado", "arquivado"],
  aprovado: ["em_revisao", "publicado", "arquivado"],
  publicado: ["em_revisao", "arquivado"],
  arquivado: ["rascunho"],
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
export interface RaioXResult { status: "ok" | "sem_catalogo"; raiox: RaioX | null; choices: Array<{ id: string; name: string }>; chosenId: string | null }

export async function getRaioX(userId: string, prepId: string): Promise<RaioXResult> {
  const db = createAdminClient();
  const prep = await db.from("edital_preparations").select("id, contest_name, role_name, file_name, strategic_exam_id").eq("id", prepId).eq("user_id", userId).maybeSingle();
  if (!prep.data) throw new UserFacingError("Preparação não encontrada.", "not_found");
  const pub = await db.from("strategic_exams").select("id, name").eq("status", "publicado").order("name").limit(300);
  const choices = ((pub.data ?? []) as Row[]).map((r) => ({ id: r.id as string, name: r.name as string }));
  let chosen = (prep.data.strategic_exam_id as string | null) ?? null;
  if (chosen && !choices.some((c) => c.id === chosen)) chosen = null; // deixou de estar publicado
  if (!chosen) {
    const text = `${(prep.data.contest_name as string | null) ?? ""} ${(prep.data.role_name as string | null) ?? ""}`;
    chosen = choices.find((c) => matchesExam(text, c.name))?.id ?? null;
  }
  if (!chosen) return { status: "sem_catalogo", raiox: null, choices, chosenId: null };
  const exam = await loadExam(chosen, { onlyPublished: true });
  if (!exam) return { status: "sem_catalogo", raiox: null, choices, chosenId: null };

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
  return { status: "ok", raiox: { exam, incidence, comparison, heat, lessons }, choices, chosenId: chosen };
}

export async function chooseExam(userId: string, prepId: string, examId: string | null) {
  if (examId && !UUID.test(examId)) throw new UserFacingError("Concurso inválido.", "bad_request");
  const db = createAdminClient();
  if (examId) {
    const ok = await db.from("strategic_exams").select("id").eq("id", examId).eq("status", "publicado").maybeSingle();
    if (!ok.data) throw new UserFacingError("Concurso indisponível.", "not_found");
  }
  const up = await db.from("edital_preparations").update({ strategic_exam_id: examId }).eq("id", prepId).eq("user_id", userId);
  if (up.error) throw new Error(up.error.message);
}
