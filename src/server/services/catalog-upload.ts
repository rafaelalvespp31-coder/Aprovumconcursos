import "server-only";
import { createHash } from "node:crypto";
import type { DisciplineMode } from "@/ai/pedagogy";
import { prepareLessonUpload, summarizeLessonUpload, type LessonUploadPreview } from "@/domain/catalog/upload-preview";
import { buildCompactPrompt, buildModelPrompt, buildModelPromptParts, exportTopicText, type ExportableTopic } from "@/domain/catalog/export";
import { parseQuestionsForTopic } from "@/domain/catalog/upload";
import { applyEnrichment, enrichStatus, parseEnrichment, type EnrichLesson } from "@/domain/catalog/enrich";
import { lessonSchema } from "@/ai/schemas";
import { createAdminClient } from "../supabase";
import type { SessionUser } from "../auth";
import { auditLog } from "../observability";
import { UserFacingError } from "./trails";
import { bannerUrlFor } from "./banners";

/** Confere o arquivo e mostra como a aula vai ficar, sem gravar nada. */
export async function previewLessonUpload(text: string): Promise<LessonUploadPreview> {
  const p = prepareLessonUpload(text);
  const db = createAdminClient();
  const { data: existing } = await db.from("catalog_topics").select("id, status, title").eq("slug", p.slug).maybeSingle();
  const errors: string[] = [];
  const warnings: string[] = [];
  if (existing?.status === "publicado") warnings.push(`“${existing.title}” já está publicada: ao salvar, esta versão substitui a do site (as questões antigas ficam inativas e quem já estudava recebe o aviso de atualização).`);
  const m = p.parsed.meta;
  if (m.kind === "dispositivo" && m.lawCode && m.articles.length) {
    const { data: same } = await db.from("catalog_topics").select("slug, title, articles").eq("law_code", m.lawCode).eq("status", "publicado").overlaps("articles", m.articles);
    for (const t of same ?? []) if (t.slug !== p.slug) warnings.push(`Atenção: “${t.title}” já está publicada e cobre ${m.lawCode}, art. ${(t.articles as string[]).filter((a) => m.articles.includes(a)).join(", ")}. A nova aula entra como rascunho separado; publique só se não for duplicar a existente.`);
  } else if (m.title && m.disciplineMode) {
    const { data: same } = await db.from("catalog_topics").select("title").eq("status", "publicado").eq("discipline_mode", m.disciplineMode).ilike("title", m.title.replace(/[%_\\]/g, ""));
    for (const t of same ?? []) warnings.push(`Atenção: já existe a aula publicada “${t.title}” na mesma matéria.`);
  }
  const vis = enrichStatus(p.built.lesson as unknown as EnrichLesson);
  if (vis.teaching && vis.withExample === 0) warnings.push(`A aula veio sem nenhum exemplo visual (bloco :::exemplo com tirinha, carimbo e esquema). Use o comando atual do painel ou, depois de catalogar, “Exemplos visuais e flashcards” na página da aula.`);
  else if (vis.withExample < vis.teaching) warnings.push(`${vis.teaching - vis.withExample} de ${vis.teaching} seções vieram sem exemplo visual; dá para completar depois em “Exemplos visuais e flashcards”, na página da aula.`);
  if (vis.flashcards < 4) warnings.push("A aula veio sem a seção de flashcards; dá para completar depois em “Exemplos visuais e flashcards”, na página da aula.");
  const summary = summarizeLessonUpload(p, { errors, warnings, existing: existing ? { id: existing.id as string, status: existing.status as string, title: existing.title as string } : null });
  return { ...summary, banner: await bannerUrlFor(m.disciplineMode) };
}

const MIN_PER_LEVEL = 10;

/** O que impede a publicação automática (mesmas regras do botão "Publicar"). */
function autoPublishBlockers(p: ReturnType<typeof prepareLessonUpload>): string[] {
  const out: string[] = [];
  if (!p.nodes.some((n) => n.requiresDirectCoverage)) out.push("o texto-base não gerou itens a ensinar");
  for (const [lv, label] of [["facil", "fácil"], ["medio", "médio"], ["dificil", "difícil"]] as const) {
    const n = p.built.questions.filter((q) => q.level === lv).length;
    if (n < MIN_PER_LEVEL) out.push(`nível ${label} com ${n} de ${MIN_PER_LEVEL} questões`);
  }
  return out;
}

export interface LessonImportResult {
  id: string;
  updated: boolean;
  published: boolean;
  version: number | null;
  /** Motivos de não ter publicado (vazio quando publicou). */
  blockers: string[];
}

/**
 * Cataloga a aula colada e, quando ela atende às regras de publicação (≥ 10 questões por nível),
 * já publica: aparece no site na hora, sem etapa de aprovação. Mesmo endereço (slug) atualiza a
 * aula existente — as questões antigas ficam inativas (não são apagadas) e a versão sobe, então
 * quem já estudava a versão anterior recebe o aviso de conteúdo atualizado. Uma aula já publicada
 * só é substituída por outra que também possa ser publicada (nunca fica no ar pela metade).
 */
export async function importLessonUpload(user: SessionUser, text: string, fileName: string): Promise<LessonImportResult> {
  const p = prepareLessonUpload(text);
  if (p.errors.length) throw new UserFacingError(p.errors[0]!, "invalid_input");
  const blockers = autoPublishBlockers(p);
  const db = createAdminClient();
  const { data: existing } = await db.from("catalog_topics").select("id, status").eq("slug", p.slug).maybeSingle();
  const wasPublished = existing?.status === "publicado";
  if (wasPublished && blockers.length) {
    throw new UserFacingError(`Esta aula já está publicada e a nova versão ainda não pode ir ao ar (${blockers.join("; ")}). Complete e cole de novo: a versão publicada continua no site.`, "not_ready");
  }
  const m = p.parsed.meta;
  const row = {
    title: m.title,
    kind: m.kind,
    law_code: m.kind === "dispositivo" ? m.lawCode : null,
    articles: m.kind === "dispositivo" ? m.articles : [],
    aliases: m.aliases,
    discipline_mode: m.disciplineMode as DisciplineMode,
    summary: m.summary ? m.summary.slice(0, 2000) : null,
    source_text: p.source,
    nodes: p.nodes,
    lesson: p.built.lesson,
    estimated_minutes: m.estimatedMinutes,
    topic_group: m.topicGroup,
    topic_group_code: m.topicGroupCode,
    subtopic_code: m.subtopicCode,
    updated_at: new Date().toISOString(),
  };
  let id: string;
  let oldQuestionIds: string[] = [];
  if (existing) {
    id = existing.id as string;
    const { data: olds } = await db.from("catalog_questions").select("id").eq("topic_id", id).eq("active", true);
    oldQuestionIds = (olds ?? []).map((r) => r.id as string);
  } else {
    const ins = await db.from("catalog_topics").insert({ ...row, status: "rascunho", slug: p.slug, created_by: user.id }).select("id").single();
    if (ins.error) throw new UserFacingError(`Não foi possível criar a aula: ${ins.error.message}`, "invalid_input");
    id = ins.data.id as string;
  }
  // Questões novas entram antes de as antigas saírem: a aula publicada nunca fica sem banco.
  const rows = p.built.questions.map((q) => ({
    topic_id: id,
    level: q.level,
    type: q.type,
    statement: q.statement,
    options: q.options,
    correct_answer_true: q.correctAnswerTrue,
    justification: q.justification,
    node_key: q.nodeKey,
    difficulty: q.difficulty,
    essential: q.essential,
    depends_on_external_source: false,
  }));
  if (rows.length) {
    const ins = await db.from("catalog_questions").insert(rows);
    if (ins.error) throw new UserFacingError(`Não foi possível salvar as questões: ${ins.error.message}`, "invalid_input");
  }
  if (existing) {
    const up = await db.from("catalog_topics").update(row).eq("id", id);
    if (up.error) throw new UserFacingError(`Não foi possível atualizar a aula: ${up.error.message}`, "invalid_input");
    if (oldQuestionIds.length) await db.from("catalog_questions").update({ active: false }).in("id", oldQuestionIds);
  }
  let version: number | null = null;
  if (!blockers.length) {
    const r = await db.rpc("publish_catalog_topic", { p_topic: id });
    if (r.error) throw new UserFacingError(`A aula foi salva, mas não foi publicada: ${r.error.message}`, "db_rule");
    version = r.data as number;
  }
  const sha = createHash("sha256").update(text).digest("hex");
  await auditLog(db, {
    actorId: user.id,
    userId: user.id,
    action: version ? "catalog.topic_uploaded_published" : existing ? "catalog.topic_upload_updated" : "catalog.topic_uploaded",
    entity: "catalog_topics",
    entityId: id,
    meta: { fileName: fileName.slice(0, 200), sha256: sha, sections: p.built.lesson.sections.length, questions: rows.length, version },
  });
  return { id, updated: Boolean(existing), published: version !== null, version, blockers };
}

export type { LessonUploadPreview };

// ---------------------------------------------------------------------------
// Comando do ChatGPT a partir de uma aula-modelo publicada (padrão: Homicídio)
// ---------------------------------------------------------------------------

export const DEFAULT_MODEL_SLUG = "cp-art-121-homicidio";

export interface ModelPrompt {
  slug: string;
  title: string;
  prompt: string;
  /** O mesmo comando dividido em 2 (aula; depois questões, na mesma conversa). */
  parts: { part1: string; part2: string };
  /** Versão compacta (começo de cada seção + 1 exemplo de questão por tipo): cabe no ChatGPT. */
  compact: string;
  /** Problemas ao reler o próprio modelo no formato do painel (vazio = o formato bate). */
  selfCheck: string[];
  stats: { modules: number; sections: number; questions: Record<"facil" | "medio" | "dificil", number> };
}

export async function listModelTopics(): Promise<Array<{ slug: string; title: string }>> {
  const { data } = await createAdminClient().from("catalog_topics").select("slug, title").eq("status", "publicado").not("lesson", "is", null).order("title");
  return (data ?? []) as Array<{ slug: string; title: string }>;
}

/** Monta o comando com a aula-modelo inteira (exportada no mesmo formato que o painel lê). */
export async function modelPrompt(slug: string = DEFAULT_MODEL_SLUG): Promise<ModelPrompt | null> {
  const db = createAdminClient();
  const { data: t } = await db
    .from("catalog_topics")
    .select("id, slug, title, kind, law_code, articles, aliases, discipline_mode, summary, source_text, nodes, lesson, estimated_minutes")
    .eq("slug", slug)
    .eq("status", "publicado")
    .maybeSingle();
  if (!t || !t.lesson) return null;
  const { data: qs } = await db.from("catalog_questions").select("*").eq("topic_id", t.id).eq("active", true).order("level").order("created_at");
  const lesson = t.lesson as ExportableTopic["lesson"] & { references?: ExportableTopic["lesson"]["references"]; unverifiedClaims?: string[] };
  const topic: ExportableTopic = {
    title: t.title as string,
    disciplineMode: t.discipline_mode as string,
    kind: t.kind as "tema" | "dispositivo",
    lawCode: (t.law_code as string | null) ?? null,
    articles: (t.articles as string[]) ?? [],
    aliases: (t.aliases as string[]) ?? [],
    estimatedMinutes: (t.estimated_minutes as number) ?? 60,
    summary: (t.summary as string | null) ?? null,
    sourceText: (t.source_text as string) ?? "",
    nodes: (t.nodes as ExportableTopic["nodes"]) ?? [],
    lesson: { objective: lesson.objective, sections: lesson.sections ?? [], references: lesson.references ?? [], unverifiedClaims: lesson.unverifiedClaims ?? [] },
    questions: (qs ?? []).map((q) => ({
      level: q.level as "facil" | "medio" | "dificil",
      type: q.type as string,
      statement: q.statement as string,
      options: ((q.options as ExportableTopic["questions"][number]["options"]) ?? []).map((o) => ({ ...o, explanation: o.explanation ?? "" })),
      correctAnswerTrue: q.correct_answer_true as boolean | null,
      justification: q.justification as string,
      nodeKey: q.node_key as string,
      difficulty: q.difficulty as number,
      essential: q.essential as boolean,
    })),
  };
  const check = prepareLessonUpload(exportTopicText(topic));
  const count = (lv: "facil" | "medio" | "dificil") => topic.questions.filter((q) => q.level === lv).length;
  return {
    slug: t.slug as string,
    title: topic.title,
    prompt: buildModelPrompt(topic),
    parts: buildModelPromptParts(topic),
    compact: buildCompactPrompt(topic),
    selfCheck: check.errors,
    stats: { modules: new Set(topic.lesson.sections.map((s) => s.module ?? "")).size, sections: topic.lesson.sections.length, questions: { facil: count("facil"), medio: count("medio"), dificil: count("dificil") } },
  };
}

// ---------------------------------------------------------------------------
// Completar as questões de uma aula já catalogada
// ---------------------------------------------------------------------------

export interface TopicQuestionsPreview {
  ok: boolean;
  errors: string[];
  warnings: string[];
  adding: Record<"facil" | "medio" | "dificil", number>;
  after: Record<"facil" | "medio" | "dificil", number>;
  willPublish: boolean;
}

async function loadTopicForQuestions(topicId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(topicId)) throw new UserFacingError("Aula inválida.", "invalid_input");
  const db = createAdminClient();
  const { data: t } = await db.from("catalog_topics").select("id, title, status, nodes, articles, lesson, source_text").eq("id", topicId).maybeSingle();
  if (!t) throw new UserFacingError("Aula não encontrada.", "not_found");
  const { data: qs } = await db.from("catalog_questions").select("level").eq("topic_id", topicId).eq("active", true);
  const current = { facil: 0, medio: 0, dificil: 0 };
  for (const q of qs ?? []) current[q.level as keyof typeof current]++;
  return { t, current };
}

function analyzeTopicQuestions(text: string, t: { nodes: unknown; articles: unknown; lesson: unknown; status: unknown }, current: Record<"facil" | "medio" | "dificil", number>) {
  if (!text.trim()) throw new UserFacingError("Cole as questões no campo.", "invalid_input");
  if (text.length > 400_000) throw new UserFacingError("Texto grande demais. Cole em partes.", "invalid_input");
  const nodes = (t.nodes as ExportableTopic["nodes"]) ?? [];
  if (!nodes.length) throw new UserFacingError("Esta aula não tem texto-base: catalogue a aula completa primeiro.", "invalid_input");
  const r = parseQuestionsForTopic(text, nodes, (t.articles as string[]) ?? []);
  const adding = { facil: 0, medio: 0, dificil: 0 };
  for (const q of r.questions) adding[q.level]++;
  const after = { facil: current.facil + adding.facil, medio: current.medio + adding.medio, dificil: current.dificil + adding.dificil };
  const willPublish = r.errors.length === 0 && t.status !== "publicado" && !!t.lesson && after.facil >= 10 && after.medio >= 10 && after.dificil >= 10;
  return { ...r, adding, after, willPublish };
}

export async function previewTopicQuestions(topicId: string, text: string): Promise<TopicQuestionsPreview> {
  const { t, current } = await loadTopicForQuestions(topicId);
  const a = analyzeTopicQuestions(text, t, current);
  return { ok: a.errors.length === 0 && a.questions.length > 0, errors: a.errors, warnings: a.warnings, adding: a.adding, after: a.after, willPublish: a.willPublish };
}

/** Acrescenta as questões coladas ao banco da aula (as atuais continuam) e publica se ficou completa. */
export async function addTopicQuestions(user: SessionUser, topicId: string, text: string): Promise<{ added: number; published: boolean }> {
  const { t, current } = await loadTopicForQuestions(topicId);
  const a = analyzeTopicQuestions(text, t, current);
  if (a.errors.length) throw new UserFacingError(a.errors[0]!, "invalid_input");
  if (!a.questions.length) throw new UserFacingError("Nenhuma questão para adicionar.", "invalid_input");
  const db = createAdminClient();
  const rows = a.questions.map((q) => ({
    topic_id: topicId,
    level: q.level,
    type: q.type,
    statement: q.statement,
    options: q.options,
    correct_answer_true: q.correctAnswerTrue,
    justification: q.justification,
    node_key: q.nodeKey,
    difficulty: q.difficulty,
    essential: q.essential,
    depends_on_external_source: false,
  }));
  const ins = await db.from("catalog_questions").insert(rows);
  if (ins.error) throw new UserFacingError(`Não foi possível salvar as questões: ${ins.error.message}`, "invalid_input");
  let published = false;
  if (a.willPublish) {
    const r = await db.rpc("publish_catalog_topic", { p_topic: topicId });
    if (!r.error) published = true;
  }
  await auditLog(db, { actorId: user.id, userId: user.id, action: "catalog.questions_added", entity: "catalog_topics", entityId: topicId, meta: { added: rows.length, ...a.adding, published } });
  return { added: rows.length, published };
}

// ---------------------------------------------------------------------------
// Completar aula catalogada com exemplos visuais e flashcards
// ---------------------------------------------------------------------------

export interface TopicEnrichPreview {
  ok: boolean;
  errors: string[];
  warnings: string[];
  examples: string[];
  flashcards: number;
  after: { withExample: number; teaching: number; flashcards: number };
}

async function loadTopicForEnrich(topicId: string) {
  const { data: t, error } = await createAdminClient().from("catalog_topics").select("id, title, status, lesson").eq("id", topicId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!t) throw new UserFacingError("Aula não encontrada.", "not_found");
  if (!t.lesson) throw new UserFacingError("Esta aula ainda não tem conteúdo: catalogue a aula completa primeiro.", "invalid_input");
  return t as { id: string; title: string; status: string; lesson: EnrichLesson };
}

function analyzeEnrich(text: string, lesson: EnrichLesson) {
  if (text.length > 200_000) throw new UserFacingError("Texto grande demais.", "invalid_input");
  const p = parseEnrichment(text, lesson);
  const next = applyEnrichment(lesson, p);
  if (next.sections.length > 30) p.errors.push("A aula já tem 30 seções (o máximo): não cabe a seção de flashcards.");
  const st = enrichStatus(next);
  return { p, next, st };
}

export async function previewTopicEnrichment(topicId: string, text: string): Promise<TopicEnrichPreview> {
  const t = await loadTopicForEnrich(topicId);
  const { p, st } = analyzeEnrich(text, t.lesson);
  return {
    ok: p.errors.length === 0 && (p.examples.length > 0 || !!p.flashcards),
    errors: p.errors,
    warnings: p.warnings,
    examples: p.examples.map((e) => e.title),
    flashcards: p.flashcards ? p.flashCount : 0,
    after: { withExample: st.withExample, teaching: st.teaching, flashcards: st.flashcards },
  };
}

/**
 * Acrescenta os blocos às seções (o resto da aula fica igual). Se a aula está publicada, a versão
 * sobe: novos estudos já saem com os cards e quem estudava recebe o aviso de conteúdo atualizado.
 */
export async function applyTopicEnrichment(user: SessionUser, topicId: string, text: string): Promise<{ examples: number; flashcards: number; version: number | null }> {
  const t = await loadTopicForEnrich(topicId);
  const { p, next } = analyzeEnrich(text, t.lesson);
  if (p.errors.length) throw new UserFacingError(p.errors[0]!, "invalid_input");
  if (!p.examples.length && !p.flashcards) throw new UserFacingError("Nada para acrescentar.", "invalid_input");
  const chk = lessonSchema.safeParse({ ...next, verificationPending: undefined });
  if (!chk.success) throw new UserFacingError(`A aula ficaria fora do formato: ${chk.error.issues[0]?.path.join(".")} — ${chk.error.issues[0]?.message}`, "invalid_input");
  const db = createAdminClient();
  const up = await db.from("catalog_topics").update({ lesson: next, updated_at: new Date().toISOString() }).eq("id", topicId);
  if (up.error) throw new UserFacingError(`Não foi possível salvar: ${up.error.message}`, "invalid_input");
  let version: number | null = null;
  if (t.status === "publicado") {
    const r = await db.rpc("publish_catalog_topic", { p_topic: topicId });
    if (r.error) throw new UserFacingError(`Salvo, mas a versão não subiu: ${r.error.message}`, "db_rule");
    version = r.data as number;
  }
  await auditLog(db, { actorId: user.id, userId: user.id, action: "catalog.topic_enriched", entity: "catalog_topics", entityId: topicId, meta: { examples: p.examples.length, flashcards: p.flashcards ? p.flashCount : 0, version } });
  return { examples: p.examples.length, flashcards: p.flashcards ? p.flashCount : 0, version };
}
