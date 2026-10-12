import "server-only";
import { notFound } from "next/navigation";
import { z } from "zod";
import { getSessionUser, type SessionUser } from "../auth";
import { createAdminClient } from "../supabase";
import { auditLog } from "../observability";
import { UserFacingError } from "./trails";
import {
  questionInputSchema,
  slugify,
  sourceInputSchema,
  subjectInputSchema,
  toDbPayload,
  topicInputSchema,
  type QuestionInput,
  type SourceInput,
} from "@/domain/bank/schema";
import type { BankRoles } from "@/domain/bank/workflow";
import { BANK_STATUSES, type BankStatus } from "@/domain/bank/labels";

/**
 * Banco de questões — serviços do servidor.
 * Toda leitura/escrita passa pelo cliente privilegiado DEPOIS de conferir o papel da
 * pessoa; o banco confere de novo (funções bank_* e gatilhos). O aluno não tem acesso.
 */

export interface BankStaff extends SessionUser {
  roles: BankRoles;
}

export async function getBankRoles(userId: string): Promise<BankRoles> {
  const db = createAdminClient();
  const [a, s] = await Promise.all([
    db.from("admin_roles").select("role").eq("user_id", userId),
    db.from("staff_roles").select("role").eq("user_id", userId),
  ]);
  const admin = (a.data ?? []).some((r) => r.role === "admin");
  const staff = new Set((s.data ?? []).map((r) => r.role as string));
  return { admin, autor: admin || staff.has("autor"), revisor: admin || staff.has("revisor") };
}

/** Exige papel no banco de questões; sem papel, a área "não existe" (404). */
export async function requireBankStaff(need?: "autor" | "revisor" | "admin"): Promise<BankStaff> {
  const user = await getSessionUser();
  if (!user) notFound();
  const roles = await getBankRoles(user.id);
  if (!roles.autor && !roles.revisor && !roles.admin) notFound();
  if (need && !roles[need]) throw new UserFacingError(need === "admin" ? "Somente administradores." : need === "revisor" ? "Somente revisores." : "Somente autores.", "forbidden");
  return { ...user, roles };
}

/** Converte erros do Postgres (regras do banco) em mensagens para a equipe. */
function dbError(e: { message: string; code?: string } | null): never {
  if (!e) throw new Error("Erro desconhecido.");
  if (e.code === "23514" || e.code === "42501" || e.code === "P0002" || e.code === "23505" || e.code === "23503") {
    const msg =
      e.code === "23505"
        ? "Já existe um registro igual."
        : e.code === "23503"
          ? "Registro relacionado inválido ou em uso."
          : e.message.replace(/^.*?ERROR:\s*/, "");
    throw new UserFacingError(msg, "db_rule");
  }
  throw new Error(e.message);
}

// ---------------------------------------------------------------------------
// Referências (matérias, assuntos, bancas, concursos, fontes)
// ---------------------------------------------------------------------------
export interface SubjectRow {
  id: string;
  slug: string;
  name: string;
  status: string;
  sort_order: number;
}
export interface TopicRow {
  id: string;
  subject_id: string;
  parent_id: string | null;
  slug: string;
  name: string;
  status: string;
  sort_order: number;
}
export interface SourceRow {
  id: string;
  name: string;
  kind: string;
  author_institution: string | null;
  url: string | null;
  published_on: string | null;
  consulted_on: string | null;
  license: string | null;
  reuse_verified: boolean;
  reuse_verified_at: string | null;
  legal_notes: string | null;
  status: string;
  created_at: string;
}

export async function bankLookups() {
  const db = createAdminClient();
  const [subjects, topics, boards, exams, sources] = await Promise.all([
    db.from("subjects").select("id, slug, name, status, sort_order").order("sort_order"),
    db.from("subject_topics").select("id, subject_id, parent_id, slug, name, status, sort_order").order("sort_order").order("name"),
    db.from("exam_boards").select("slug, name").order("sort_order"),
    db.from("exams").select("id, name, year, board_slug").order("year", { ascending: false }),
    db.from("question_sources").select("id, name, kind, status, reuse_verified").neq("status", "arquivada").order("name"),
  ]);
  return {
    subjects: (subjects.data ?? []) as SubjectRow[],
    topics: (topics.data ?? []) as TopicRow[],
    boards: (boards.data ?? []) as Array<{ slug: string; name: string }>,
    exams: (exams.data ?? []) as Array<{ id: string; name: string; year: number | null; board_slug: string | null }>,
    sources: (sources.data ?? []) as Array<{ id: string; name: string; kind: string; status: string; reuse_verified: boolean }>,
  };
}

/** Caminho completo do assunto ("Teoria do Crime › Tipicidade"). */
export function topicPath(topics: TopicRow[], id: string | null): string {
  const byId = new Map(topics.map((t) => [t.id, t]));
  const parts: string[] = [];
  let cur = id ? byId.get(id) : undefined;
  let guard = 0;
  while (cur && guard++ < 20) {
    parts.unshift(cur.name);
    cur = cur.parent_id ? byId.get(cur.parent_id) : undefined;
  }
  return parts.join(" › ");
}

export async function listSources(): Promise<SourceRow[]> {
  const db = createAdminClient();
  const { data, error } = await db.from("question_sources").select("*").order("created_at", { ascending: false });
  if (error) dbError(error);
  return (data ?? []) as SourceRow[];
}

export async function saveSource(staff: BankStaff, id: string | null, raw: unknown) {
  if (!staff.roles.autor && !staff.roles.revisor) throw new UserFacingError("Sem permissão.", "forbidden");
  const s: SourceInput = sourceInputSchema.parse(raw);
  const row = {
    name: s.name,
    kind: s.kind,
    author_institution: s.authorInstitution ?? null,
    url: s.url ?? null,
    published_on: s.publishedOn ?? null,
    consulted_on: s.consultedOn ?? null,
    license: s.license ?? null,
    legal_notes: s.legalNotes ?? null,
    status: s.status,
    updated_at: new Date().toISOString(),
  };
  const db = createAdminClient();
  if (id) {
    z.uuid().parse(id);
    const { error } = await db.from("question_sources").update(row).eq("id", id);
    if (error) dbError(error);
    await auditLog(db, { actorId: staff.id, userId: null, action: "bank.source_updated", entity: "question_sources", entityId: id });
    return id;
  }
  const { data, error } = await db.from("question_sources").insert({ ...row, created_by: staff.id }).select("id").single();
  if (error) dbError(error);
  await auditLog(db, { actorId: staff.id, userId: null, action: "bank.source_created", entity: "question_sources", entityId: data.id });
  return data.id as string;
}

/** Registro da autorização de reutilização: só revisor, com observação obrigatória. */
export async function setSourceReuse(staff: BankStaff, id: string, verified: boolean, note: string) {
  if (!staff.roles.revisor) throw new UserFacingError("Somente revisores registram autorização de uso.", "forbidden");
  z.uuid().parse(id);
  const text = note.trim();
  if (verified && text.length < 10) throw new UserFacingError("Descreva a base da autorização (licença, termo, contrato…).", "invalid");
  const db = createAdminClient();
  const { data: cur } = await db.from("question_sources").select("legal_notes").eq("id", id).maybeSingle();
  if (!cur) throw new UserFacingError("Fonte não encontrada.", "not_found");
  const stamp = `[${new Date().toISOString().slice(0, 10)}] ${verified ? "Autorização verificada" : "Autorização retirada"}: ${text || "—"}`;
  const notes = [cur.legal_notes, stamp].filter(Boolean).join("\n").slice(-4000);
  const { error } = await db
    .from("question_sources")
    .update({
      reuse_verified: verified,
      reuse_verified_by: verified ? staff.id : null,
      reuse_verified_at: verified ? new Date().toISOString() : null,
      legal_notes: notes,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) dbError(error);
  await auditLog(db, { actorId: staff.id, userId: null, action: verified ? "bank.source_reuse_verified" : "bank.source_reuse_revoked", entity: "question_sources", entityId: id, meta: { note: text.slice(0, 300) } });
}

export async function createTopic(staff: BankStaff, raw: unknown) {
  if (!staff.roles.autor && !staff.roles.revisor) throw new UserFacingError("Sem permissão.", "forbidden");
  const t = topicInputSchema.parse(raw);
  const db = createAdminClient();
  const { error } = await db.from("subject_topics").insert({
    subject_id: t.subjectId,
    parent_id: t.parentId ?? null,
    slug: slugify(t.name),
    name: t.name,
    description: t.description ?? null,
  });
  if (error) dbError(error);
}

export async function setTopicStatus(staff: BankStaff, id: string, active: boolean) {
  if (!staff.roles.revisor) throw new UserFacingError("Somente revisores.", "forbidden");
  const { error } = await createAdminClient().from("subject_topics").update({ status: active ? "ativo" : "inativo" }).eq("id", z.uuid().parse(id));
  if (error) dbError(error);
}

export async function createSubject(staff: BankStaff, raw: unknown) {
  if (!staff.roles.admin && !staff.roles.revisor) throw new UserFacingError("Somente revisores ou administradores.", "forbidden");
  const s = subjectInputSchema.parse(raw);
  const db = createAdminClient();
  const { data: last } = await db.from("subjects").select("sort_order").order("sort_order", { ascending: false }).limit(1).maybeSingle();
  const { error } = await db.from("subjects").insert({ slug: slugify(s.name), name: s.name, description: s.description ?? null, sort_order: ((last?.sort_order as number) ?? 0) + 1 });
  if (error) dbError(error);
  await auditLog(db, { actorId: staff.id, userId: null, action: "bank.subject_created", entity: "subjects", meta: { name: s.name } });
}

export async function createExam(staff: BankStaff, raw: unknown) {
  if (!staff.roles.autor && !staff.roles.revisor) throw new UserFacingError("Sem permissão.", "forbidden");
  const e = z
    .object({
      name: z.string().trim().min(2, "Informe o concurso.").max(200),
      organ: z.string().trim().max(200).optional(),
      roleName: z.string().trim().max(200).optional(),
      boardSlug: z.string().trim().max(32).optional(),
      year: z.preprocess((v) => (v === "" || v == null ? undefined : v), z.coerce.number().int().min(1950, "Ano inválido.").max(2100, "Ano inválido.").optional()),
    })
    .parse(raw);
  const { error } = await createAdminClient().from("exams").insert({
    name: e.name,
    organ: e.organ || null,
    role_name: e.roleName || null,
    board_slug: e.boardSlug || null,
    year: e.year ?? null,
    created_by: staff.id,
  });
  if (error) dbError(error);
}

// ---------------------------------------------------------------------------
// Questões
// ---------------------------------------------------------------------------
export interface QuestionListFilters {
  q?: string;
  subject?: string;
  topic?: string;
  status?: string;
  difficulty?: string;
  origin?: string;
  board?: string;
  source?: string;
  exam?: string;
  year?: string;
  flagged?: string;
  page?: number;
}

export interface QuestionListRow {
  id: string;
  public_code: string;
  statement: string;
  status: BankStatus;
  origin: string;
  question_type: string;
  initial_difficulty: string;
  calibrated_difficulty: string | null;
  year: number | null;
  board_slug: string | null;
  board_style: string | null;
  usage_rights: string;
  updated_at: string;
  subjects: { name: string } | null;
  subject_topics: { name: string } | null;
}

export const PAGE_SIZE = 25;

export async function listQuestions(f: QuestionListFilters) {
  const db = createAdminClient();
  let q = db
    .from("bank_questions")
    .select(
      "id, public_code, statement, status, origin, question_type, initial_difficulty, calibrated_difficulty, year, board_slug, board_style, usage_rights, updated_at, subjects(name), subject_topics(name)",
      { count: "exact" },
    );
  const uuidOk = (v?: string) => !!v && /^[0-9a-f-]{36}$/i.test(v);
  if (uuidOk(f.subject)) q = q.eq("subject_id", f.subject!);
  if (uuidOk(f.topic)) q = q.eq("topic_id", f.topic!);
  if (uuidOk(f.source)) q = q.eq("source_id", f.source!);
  if (uuidOk(f.exam)) q = q.eq("exam_id", f.exam!);
  if (f.status && (BANK_STATUSES as readonly string[]).includes(f.status)) q = q.eq("status", f.status);
  else q = q.neq("status", "arquivada");
  if (f.difficulty && /^(dificil|muito_dificil|extrema)$/.test(f.difficulty)) q = q.eq("initial_difficulty", f.difficulty);
  if (f.origin && /^(prova_anterior|autoral_humana|ia_assistida)$/.test(f.origin)) q = q.eq("origin", f.origin);
  if (f.board && /^[a-z0-9_]{2,32}$/.test(f.board)) q = q.or(`board_slug.eq.${f.board},board_style.eq.${f.board}`);
  if (f.year && /^\d{4}$/.test(f.year)) q = q.eq("year", Number(f.year));
  if (f.q && f.q.trim()) {
    const term = f.q.trim().slice(0, 200);
    if (/^APV-\d{1,6}$/i.test(term)) q = q.eq("public_code", term.toUpperCase().replace(/^APV-(\d+)$/, (_m, n: string) => `APV-${n.padStart(6, "0")}`));
    else q = q.textSearch("search", term, { type: "websearch", config: "portuguese" });
  }
  if (f.flagged === "1") {
    const { data: flagged } = await db.from("bank_question_flags").select("question_id").in("status", ["aberto", "em_analise"]).limit(1000);
    const ids = [...new Set((flagged ?? []).map((r) => r.question_id as string))];
    q = q.in("id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
  }
  const page = Math.max(1, f.page ?? 1);
  const { data, error, count } = await q.order("updated_at", { ascending: false }).range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (error) dbError(error);
  return { rows: (data ?? []) as unknown as QuestionListRow[], total: count ?? 0, page };
}

export interface QuestionDetail {
  id: string;
  public_code: string;
  subject_id: string;
  topic_id: string | null;
  source_id: string | null;
  exam_id: string | null;
  origin: string;
  question_type: string;
  statement: string;
  case_context: string | null;
  board_slug: string | null;
  board_style: string | null;
  year: number | null;
  original_number: string | null;
  initial_difficulty: string;
  calibrated_difficulty: string | null;
  correct_answer_true: boolean | null;
  justification: string | null;
  legal_basis: string | null;
  usage_rights: string;
  status: BankStatus;
  content_checked: boolean;
  answer_checked: boolean;
  source_checked: boolean;
  rights_checked: boolean;
  verified_at: string | null;
  reviewed_at: string | null;
  current_version: number;
  created_by: string;
  approved_by: string | null;
  approved_at: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  options: Array<{ label: string; text: string; is_correct: boolean; explanation: string | null; sort_order: number }>;
  legal_refs: Array<Record<string, string | number | null>>;
  versions: Array<{ version: number; previous_version: number | null; reason: string | null; review_result: string; created_at: string; changed_by: string | null; snapshot: Record<string, unknown> }>;
  reviews: Array<{ id: number; from_status: string | null; to_status: string; notes: string | null; created_at: string; reviewer_id: string | null; checklist: Record<string, boolean> }>;
  flags: Array<{ id: string; kind: string; status: string; details: string | null; similar_question_id: string | null; similarity: number | null; created_at: string }>;
  ai_reviews: Array<{ id: string; provider: string; model: string; prompt_version: string; alerts: unknown; declared_confidence: number | null; human_status: string; created_at: string; result: unknown }>;
  source: SourceRow | null;
  exam: { name: string; year: number | null } | null;
}

export async function getQuestion(id: string): Promise<QuestionDetail> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const db = createAdminClient();
  const { data: q } = await db.from("bank_questions").select("*").eq("id", id).maybeSingle();
  if (!q) notFound();
  const [options, refs, versions, reviews, flags, ai, source, exam] = await Promise.all([
    db.from("bank_question_options").select("label, text, is_correct, explanation, sort_order").eq("question_id", id).order("sort_order"),
    db.from("bank_question_legal_refs").select("*").eq("question_id", id).order("created_at"),
    db.from("bank_question_versions").select("version, previous_version, reason, review_result, created_at, changed_by, snapshot").eq("question_id", id).order("version", { ascending: false }),
    db.from("bank_question_reviews").select("id, from_status, to_status, notes, created_at, reviewer_id, checklist").eq("question_id", id).order("id", { ascending: false }).limit(100),
    db.from("bank_question_flags").select("id, kind, status, details, similar_question_id, similarity, created_at").eq("question_id", id).order("created_at", { ascending: false }),
    db.from("bank_question_ai_reviews").select("id, provider, model, prompt_version, alerts, declared_confidence, human_status, created_at, result").eq("question_id", id).order("created_at", { ascending: false }),
    q.source_id ? db.from("question_sources").select("*").eq("id", q.source_id).maybeSingle() : Promise.resolve({ data: null }),
    q.exam_id ? db.from("exams").select("name, year").eq("id", q.exam_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  return {
    ...(q as Omit<QuestionDetail, "options" | "legal_refs" | "versions" | "reviews" | "flags" | "ai_reviews" | "source" | "exam">),
    options: (options.data ?? []) as QuestionDetail["options"],
    legal_refs: (refs.data ?? []) as QuestionDetail["legal_refs"],
    versions: (versions.data ?? []) as QuestionDetail["versions"],
    reviews: (reviews.data ?? []) as QuestionDetail["reviews"],
    flags: (flags.data ?? []) as QuestionDetail["flags"],
    ai_reviews: (ai.data ?? []) as QuestionDetail["ai_reviews"],
    source: (source.data ?? null) as SourceRow | null,
    exam: (exam.data ?? null) as QuestionDetail["exam"],
  };
}

/** Nomes (e-mails) da equipe para exibir no histórico. */
export async function staffNames(ids: Array<string | null | undefined>): Promise<Record<string, string>> {
  const wanted = new Set(ids.filter(Boolean) as string[]);
  if (!wanted.size) return {};
  const { data } = await createAdminClient().rpc("bank_staff_list");
  const out: Record<string, string> = {};
  for (const r of (data ?? []) as Array<{ user_id: string; email: string }>) if (wanted.has(r.user_id)) out[r.user_id] = r.email;
  return out;
}

export interface SimilarHit {
  question_id: string;
  public_code: string;
  status: string;
  similarity: number;
}

export async function findSimilar(text: string, subjectId?: string | null, excludeId?: string | null, threshold = 0.45): Promise<SimilarHit[]> {
  if (text.trim().length < 20) return [];
  const { data, error } = await createAdminClient().rpc("bank_similar_questions", {
    p_text: text.slice(0, 6000),
    p_subject: subjectId ?? null,
    p_threshold: threshold,
    p_exclude: excludeId ?? null,
  });
  if (error) dbError(error);
  return ((data ?? []) as SimilarHit[]).map((h) => ({ ...h, similarity: Number(h.similarity) }));
}

/** Semelhança alta vira alerta para revisão humana (nunca bloqueio automático). */
async function flagDuplicates(questionId: string, statement: string, subjectId: string, actorId: string) {
  const hits = (await findSimilar(statement, subjectId, questionId, 0.6)).slice(0, 5);
  if (!hits.length) return 0;
  const db = createAdminClient();
  const { data: existing } = await db
    .from("bank_question_flags")
    .select("similar_question_id")
    .eq("question_id", questionId)
    .eq("kind", "duplicidade")
    .in("status", ["aberto", "em_analise"]);
  const seen = new Set((existing ?? []).map((r) => r.similar_question_id as string));
  const fresh = hits.filter((h) => !seen.has(h.question_id));
  if (fresh.length) {
    await db.from("bank_question_flags").insert(
      fresh.map((h) => ({
        question_id: questionId,
        kind: "duplicidade",
        similar_question_id: h.question_id,
        similarity: Math.min(0.999, Math.round(h.similarity * 1000) / 1000),
        details: `Semelhança textual de ${Math.round(h.similarity * 100)}% com ${h.public_code}. Confirme se não é cópia/duplicata.`,
        reported_by: actorId,
      })),
    );
  }
  return fresh.length;
}

export async function saveQuestion(staff: BankStaff, id: string | null, raw: unknown): Promise<{ id: string; duplicates: number }> {
  const q: QuestionInput = questionInputSchema.parse(raw);
  if (!id && !staff.roles.autor) throw new UserFacingError("Somente autores cadastram questões.", "forbidden");
  const db = createAdminClient();
  if (q.sourceId) {
    const { data: src } = await db.from("question_sources").select("status, kind").eq("id", q.sourceId).maybeSingle();
    if (!src) throw new UserFacingError("Fonte não encontrada.", "not_found");
    if (src.status === "bloqueada") throw new UserFacingError("A fonte escolhida está bloqueada.", "invalid");
    if (q.origin === "prova_anterior" && src.kind !== "prova_oficial") throw new UserFacingError("Prova anterior precisa de uma fonte do tipo “Prova oficial”.", "invalid");
  }
  const { data, error } = await db.rpc("bank_save_question", { p_actor: staff.id, p_id: id, p: toDbPayload(q) });
  if (error) dbError(error);
  const qid = data as string;
  const duplicates = await flagDuplicates(qid, q.statement, q.subjectId, staff.id);
  await auditLog(db, { actorId: staff.id, userId: null, action: id ? "bank.question_updated" : "bank.question_created", entity: "bank_questions", entityId: qid, meta: { duplicates } });
  return { id: qid, duplicates };
}

export async function decideQuestion(
  staff: BankStaff,
  id: string,
  to: BankStatus | null,
  reason: string,
  checks?: { content: boolean; answer: boolean; source: boolean; rights: boolean },
) {
  z.uuid().parse(id);
  if (to && !(BANK_STATUSES as readonly string[]).includes(to)) throw new UserFacingError("Status inválido.", "invalid");
  const db = createAdminClient();
  const { error } = await db.rpc("bank_decide", {
    p_actor: staff.id,
    p_id: id,
    p_to: to,
    p_reason: reason.slice(0, 2000),
    p_checks: checks ?? null,
  });
  if (error) dbError(error);
  await auditLog(db, { actorId: staff.id, userId: null, action: "bank.question_decision", entity: "bank_questions", entityId: id, meta: { to, checks: checks ?? null } });
}

export async function resolveFlag(staff: BankStaff, flagId: string, outcome: "resolvido" | "descartado" | "em_analise") {
  if (!staff.roles.revisor) throw new UserFacingError("Somente revisores.", "forbidden");
  const db = createAdminClient();
  const { error } = await db
    .from("bank_question_flags")
    .update({ status: outcome, resolved_by: outcome === "em_analise" ? null : staff.id, resolved_at: outcome === "em_analise" ? null : new Date().toISOString() })
    .eq("id", z.uuid().parse(flagId));
  if (error) dbError(error);
}

export async function flagOutdated(staff: BankStaff, normNumber: string, article: string, details: string): Promise<number> {
  if (!staff.roles.revisor) throw new UserFacingError("Somente revisores.", "forbidden");
  const n = normNumber.trim();
  if (n.length < 2) throw new UserFacingError("Informe o número da norma exatamente como cadastrado nas referências.", "invalid");
  if (details.trim().length < 10) throw new UserFacingError("Descreva a alteração legislativa (mínimo 10 caracteres).", "invalid");
  const db = createAdminClient();
  const { data, error } = await db.rpc("bank_flag_outdated", { p_norm_number: n, p_article: article.trim() || null, p_actor: staff.id, p_details: details.trim().slice(0, 4000) });
  if (error) dbError(error);
  await auditLog(db, { actorId: staff.id, userId: null, action: "bank.legal_update_flagged", meta: { norm: n, article, count: data } });
  return data as number;
}

// ---------------------------------------------------------------------------
// Painel e equipe
// ---------------------------------------------------------------------------
export interface BankDashboard {
  by_status: Record<string, number>;
  by_subject: Array<{ slug: string; name: string; total: number; published: number }>;
  by_difficulty: Record<string, number>;
  by_origin: Record<string, number>;
  sources: number;
  sources_unverified: number;
  imports_processing: number;
  flags_open: Record<string, number>;
  attempts: number;
  attempts_correct: number;
  ai_cost_usd: number;
  ai_batches: number;
  recent: Array<{ created_at: string; from_status: string | null; to_status: string; notes: string | null; question_id: string; public_code: string }>;
}

export async function bankDashboard(): Promise<BankDashboard> {
  const { data, error } = await createAdminClient().rpc("bank_dashboard");
  if (error) dbError(error);
  return data as BankDashboard;
}

export async function listStaff() {
  const { data, error } = await createAdminClient().rpc("bank_staff_list");
  if (error) dbError(error);
  return (data ?? []) as Array<{ user_id: string; email: string; roles: string[]; is_admin: boolean }>;
}

export async function setStaffRole(staff: BankStaff, email: string, role: "autor" | "revisor", grant: boolean) {
  if (!staff.roles.admin) throw new UserFacingError("Somente administradores gerenciam a equipe.", "forbidden");
  const e = z.email("E-mail inválido.").parse(email.trim());
  const db = createAdminClient();
  const { data, error } = await db.rpc("bank_set_staff_role", { p_admin: staff.id, p_email: e, p_role: role, p_grant: grant });
  if (error) dbError(error);
  await auditLog(db, { actorId: staff.id, userId: data as string, action: grant ? "bank.role_granted" : "bank.role_revoked", meta: { role } });
}
