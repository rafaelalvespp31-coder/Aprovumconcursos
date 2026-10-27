import "server-only";
import { createHash } from "node:crypto";
import { notFound } from "next/navigation";
import { z } from "zod";
import { getAIProvider } from "@/ai";
import { completeLessonSections, delimitScope, generateLesson, generateQuestions } from "@/ai/services";
import { DISCIPLINE_LABELS, DISCIPLINE_MODES, type DisciplineMode } from "@/ai/pedagogy";
import type { CatalogPickerGroup } from "@/domain/catalog/picker";
import { lessonSchema, type LessonOutput } from "@/ai/schemas";
import { normalizeContent } from "@/domain/content/normalize";
import { extractStructure, type ExtractedNode } from "@/domain/content/extract";
import { auditPlan } from "@/domain/content/audit";
import type { PlannedLesson } from "@/domain/content/plan";
import { LEVELS, LEVEL_KEYS, type LevelKey } from "@/domain/progress/levels";
import { LAWS, articleId, matchCatalog, normalizeText, type CatalogMatch, type CatalogTopicIndex } from "@/domain/catalog/match";
import { extractPractice, practiceToMarkdown, type PracticeCase } from "@/domain/content/practice";
import { composeStudy, type CatalogQuestion, type CatalogTopicContent } from "@/domain/catalog/compose";
import type { TrailRequest } from "@/domain/trail-input";
import { createAdminClient } from "../supabase";
import { getSessionUser, isAdmin, type SessionUser } from "../auth";
import { lessonPayload, nodesPayload, planPayload } from "../repos/payloads";
import { auditLog, logEvent } from "../observability";
import { UserFacingError } from "./trails";
import { parseTopicMeta, type TopicMetaInput } from "@/domain/catalog/topic-meta";

/** Rótulo de banca nas questões do catálogo (não são feitas para uma banca específica). */
export const CATALOG_BOARD_LABEL = "várias bancas";
/** Mínimo de questões no banco, por nível, para publicar um tema. */
export const MIN_BANK_PER_LEVEL = 10;
const BANK_PER_ROUND = 15;

/**
 * Exemplos "Na prática" da versão publicada de um tema, por título de seção.
 * Usado na leitura: estudos criados antes dos exemplos também ganham os cards
 * (só os exemplos são lidos do catálogo; o restante da aula continua o do aluno).
 */
export async function catalogPracticeByTitle(topicId: string): Promise<Record<string, PracticeCase[]>> {
  const db = createAdminClient();
  const { data } = await db.from("catalog_topics").select("lesson").eq("id", topicId).eq("status", "publicado").maybeSingle();
  const sections = ((data?.lesson as { sections?: Array<{ title: string; bodyMarkdown: string }> } | null)?.sections ?? []);
  const out: Record<string, PracticeCase[]> = {};
  for (const s of sections) {
    const { cases } = extractPractice(s.bodyMarkdown ?? "");
    if (cases.length) out[normalizeText(s.title)] = cases;
  }
  return out;
}

/** Módulo (tema) de cada seção da versão publicada, por título de seção. */
export async function catalogModulesByTitle(topicId: string): Promise<Record<string, string>> {
  const db = createAdminClient();
  const { data } = await db.from("catalog_topics").select("lesson").eq("id", topicId).eq("status", "publicado").maybeSingle();
  const sections = ((data?.lesson as { sections?: Array<{ title: string; module?: string }> } | null)?.sections ?? []);
  const out: Record<string, string> = {};
  for (const s of sections) if (s.module) out[normalizeText(s.title)] = s.module;
  return out;
}

// ---------------------------------------------------------------------------
// Busca (aluno)
// ---------------------------------------------------------------------------
export async function loadPublishedIndex(): Promise<CatalogTopicIndex[]> {
  const db = createAdminClient();
  const { data, error } = await db
    .from("catalog_topics")
    .select("id, title, kind, law_code, articles, aliases")
    .eq("status", "publicado")
    .limit(5000);
  if (error) throw new Error(error.message);
  return (data ?? []).map((t) => ({
    id: t.id as string,
    title: t.title as string,
    kind: t.kind as "tema" | "dispositivo",
    lawCode: t.law_code as string | null,
    articles: (t.articles as string[]) ?? [],
    aliases: (t.aliases as string[]) ?? [],
  }));
}

/** Aulas publicadas, agrupadas por matéria, para o seletor do novo estudo. */
export async function catalogPicker(): Promise<CatalogPickerGroup[]> {
  const db = createAdminClient();
  const { data, error } = await db
    .from("catalog_topics")
    .select("id, title, summary, discipline_mode, estimated_minutes")
    .eq("status", "publicado")
    .limit(5000);
  if (error) throw new Error(error.message);
  const groups = new Map<string, CatalogPickerGroup>();
  for (const t of data ?? []) {
    const discipline = DISCIPLINE_LABELS[t.discipline_mode as DisciplineMode] ?? "Outras matérias";
    const g = groups.get(discipline) ?? { discipline, topics: [] };
    g.topics.push({ id: t.id as string, title: t.title as string, summary: (t.summary as string | null) ?? null, minutes: t.estimated_minutes as number });
    groups.set(discipline, g);
  }
  const sorted = [...groups.values()].sort((a, b) => a.discipline.localeCompare(b.discipline, "pt-BR"));
  for (const g of sorted) g.topics.sort((a, b) => a.title.localeCompare(b.title, "pt-BR"));
  return sorted;
}

/** Títulos publicados, para orientar o aluno no modo só catálogo. */
export async function catalogAvailableTitles(): Promise<string[]> {
  return (await loadPublishedIndex()).map((t) => t.title).sort((a, b) => a.localeCompare(b, "pt-BR"));
}

export async function findInCatalog(text: string): Promise<CatalogMatch> {
  if (text.trim().length < 3) return { kind: "nenhum" };
  return matchCatalog(text, await loadPublishedIndex());
}

async function loadTopicContents(ids: string[]): Promise<CatalogTopicContent[]> {
  const db = createAdminClient();
  const [topics, questions] = await Promise.all([
    db.from("catalog_topics").select("id, title, version, discipline_mode, source_text, nodes, lesson, estimated_minutes").in("id", ids).eq("status", "publicado"),
    db.from("catalog_questions").select("*").in("topic_id", ids).eq("active", true),
  ]);
  if (topics.error) throw new Error(topics.error.message);
  if (questions.error) throw new Error(questions.error.message);
  const byId = new Map((topics.data ?? []).map((t) => [t.id as string, t]));
  return ids.map((id) => {
    const t = byId.get(id);
    if (!t || !t.lesson) throw new Error("Tema do catálogo indisponível.");
    return {
      id,
      title: t.title as string,
      version: t.version as number,
      disciplineMode: t.discipline_mode as string,
      sourceText: t.source_text as string,
      nodes: t.nodes as ExtractedNode[],
      lesson: t.lesson as LessonOutput & { verificationPending: boolean },
      estimatedMinutes: t.estimated_minutes as number,
      questions: (questions.data ?? []).filter((q) => q.topic_id === id).map(rowToQuestion),
    };
  });
}

function rowToQuestion(q: Record<string, unknown>): CatalogQuestion {
  return {
    id: q.id as string,
    level: q.level as LevelKey,
    type: q.type as CatalogQuestion["type"],
    statement: q.statement as string,
    options: (q.options as CatalogQuestion["options"]) ?? [],
    ...(q.type === "certo_errado" ? { correctAnswerTrue: q.correct_answer_true as boolean } : {}),
    justification: q.justification as string,
    nodeKey: q.node_key as string,
    difficulty: q.difficulty as number,
    essential: q.essential as boolean,
    dependsOnExternalSource: q.depends_on_external_source as boolean,
  };
}

/**
 * Monta o estudo do aluno a partir do catálogo, sem IA: cópia do mapa, da aula e de
 * uma amostra de questões por nível. O estudo nasce pronto para conferência.
 */
export async function createStudyFromCatalog(userId: string, req: TrailRequest, match: Extract<CatalogMatch, { kind: "completo" }>): Promise<string> {
  const db = createAdminClient();
  const topics = await loadTopicContents(match.topics.map((t) => t.id));
  const title = req.title || (topics.length === 1 ? topics[0]!.title : req.content.trim().slice(0, 80));
  const composed = composeStudy(topics, { seed: userId, moduleTitle: title });
  const norm = normalizeContent(req.content);

  const trail = await db
    .from("study_trails")
    .insert({
      user_id: userId,
      title: title.slice(0, 160),
      board_slug: req.board,
      other_board_name: req.board === "outra" ? req.otherBoardName : null,
      content_type: req.contentType,
      status: "processing",
    })
    .select("id")
    .single();
  if (trail.error) throw new Error(`Falha ao criar estudo: ${trail.error.message}`);
  const trailId = trail.data.id as string;
  try {
    const doc = await db.from("source_documents").insert({ trail_id: trailId, user_id: userId, kind: "texto" }).select("id").single();
    if (doc.error) throw new Error(doc.error.message);
    const ver = await db
      .from("source_document_versions")
      .insert({
        document_id: doc.data.id,
        user_id: userId,
        version: 1,
        original_text: norm.original,
        normalized_text: composed.normalizedText,
        char_count: composed.normalizedText.length,
        sha256: createHash("sha256").update(composed.normalizedText).digest("hex"),
      })
      .select("id")
      .single();
    if (ver.error) throw new Error(ver.error.message);

    const nodes = await db.rpc("replace_trail_nodes", { p_trail: trailId, p_user: userId, p_version: ver.data.id, p_nodes: nodesPayload(composed.nodes) });
    if (nodes.error) throw new Error(nodes.error.message);
    const audit = auditPlan({ normalizedText: composed.normalizedText, nodes: composed.nodes, unassigned: [], plan: composed.plan });
    const mode = (DISCIPLINE_MODES as readonly string[]).includes(composed.disciplineMode) ? composed.disciplineMode : "outra";
    const plan = await db.rpc("persist_trail_plan", {
      p_trail: trailId,
      p_user: userId,
      p_payload: planPayload({ plan: composed.plan, analysis: [], disciplineMode: mode, audit, repairs: [], ambiguities: [] }),
    });
    if (plan.error) throw new Error(plan.error.message);

    const lessons = await db.from("lessons").select("id, key").eq("trail_id", trailId).eq("user_id", userId);
    if (lessons.error) throw new Error(lessons.error.message);
    const idByKey = new Map((lessons.data ?? []).map((l) => [l.key as string, l.id as string]));
    for (const u of composed.units) {
      const lessonId = idByKey.get(u.lessonKey);
      if (!lessonId) throw new Error("Unidade do catálogo não gravada.");
      const save = await db.rpc("save_lesson_content", { p_lesson: lessonId, p_user: userId, p_payload: lessonPayload(u.lesson, "ready") });
      if (save.error) throw new Error(save.error.message);
      const tag = await db
        .from("lessons")
        .update({ catalog_topic_id: u.topicId, catalog_version: u.version, catalog_key_map: u.keyMap })
        .eq("id", lessonId)
        .eq("user_id", userId);
      if (tag.error) throw new Error(tag.error.message);
      for (const [i, lv] of LEVEL_KEYS.entries()) {
        const qs = u.questions[lv];
        if (!qs.length) continue;
        const r = await db.rpc("save_lesson_questions", {
          p_lesson: lessonId,
          p_user: userId,
          p_board: CATALOG_BOARD_LABEL,
          p_questions: qs.map(({ id: _id, level: _lv, ...q }) => (void _id, void _lv, q)),
          p_append: i > 0,
          p_level: lv,
        });
        if (r.error) throw new Error(r.error.message);
      }
    }
    const legal = topics.some((t) => t.nodes.some((n) => n.kind === "artigo"));
    await db
      .from("study_trails")
      .update({
        status: "review",
        scope_summary: {
          subject: title,
          scopeStatement: `Conteúdo revisado do catálogo APROVUM — ${match.reason}.`,
          outOfScope: [],
          isLegal: legal,
          legalReferences: [],
          catalog: true,
          catalogTopics: topics.map((t) => ({ id: t.id, title: t.title, version: t.version })),
        },
      })
      .eq("id", trailId)
      .eq("user_id", userId);
    await auditLog(db, { actorId: userId, userId, action: "trail.created_from_catalog", entity: "study_trails", entityId: trailId, meta: { topics: topics.length } });
    return trailId;
  } catch (err) {
    await db.from("study_trails").delete().eq("id", trailId).eq("user_id", userId);
    await logEvent("catalog.import_failed", { userId, error: (err as Error).message });
    throw new Error("Não foi possível montar o estudo a partir do catálogo. Tente novamente.");
  }
}

/**
 * Recuperação sem IA para unidades do catálogo: questões do banco ainda não usadas
 * na unidade, no mesmo nível e, de preferência, no mesmo item da questão errada.
 */
export async function recoveryFromBank(
  lesson: { id: string; userId: string; catalogTopicId: string; keyMap: Record<string, string> },
  level: LevelKey,
  wrong: Array<{ rootId: string; nodeKey: string }>,
): Promise<{ saved: number; pending: Array<{ rootId: string; nodeKey: string }> }> {
  const db = createAdminClient();
  const [bank, used] = await Promise.all([
    db.from("catalog_questions").select("*").eq("topic_id", lesson.catalogTopicId).eq("level", level).eq("active", true),
    db.from("questions").select("statement").eq("lesson_id", lesson.id).eq("user_id", lesson.userId),
  ]);
  if (bank.error) throw new Error(bank.error.message);
  const usedStatements = new Set((used.data ?? []).map((q) => normalizeText(q.statement as string)));
  const pool = (bank.data ?? []).map(rowToQuestion).filter((q) => !usedStatements.has(normalizeText(q.statement)) && lesson.keyMap[q.nodeKey]);
  const out: Array<Record<string, unknown>> = [];
  const pending: Array<{ rootId: string; nodeKey: string }> = [];
  for (const w of wrong) {
    let i = pool.findIndex((q) => lesson.keyMap[q.nodeKey] === w.nodeKey);
    if (i < 0) i = pool.length ? 0 : -1;
    if (i < 0) {
      pending.push(w);
      continue;
    }
    const [q] = pool.splice(i, 1);
    const { id: _id, level: _lv, nodeKey: _nk, ...rest } = q!;
    void _id; void _lv; void _nk;
    out.push({ ...rest, recoveryOf: w.rootId });
  }
  if (out.length) {
    const r = await db.rpc("save_recovery_questions", { p_user: lesson.userId, p_lesson: lesson.id, p_board: CATALOG_BOARD_LABEL, p_questions: out });
    if (r.error) throw new Error(r.error.message);
  }
  return { saved: out.length, pending };
}

// ---------------------------------------------------------------------------
// Administração
// ---------------------------------------------------------------------------
export async function requireAdmin(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user || !(await isAdmin())) notFound();
  return user;
}

const slugify = (s: string) =>
  normalizeText(s).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 100) || "tema";

export const topicInputSchema = z
  .object({
    title: z.string().trim().min(2, "Informe o título.").max(200),
    kind: z.enum(["tema", "dispositivo"]),
    lawCode: z.string().trim().toUpperCase().max(12).optional().transform((v) => v || null),
    articles: z.string().max(500).optional().transform((v) => (v ? v.split(/[,;\s]+/).filter(Boolean).map(articleId) : [])),
    aliases: z.string().max(2000).optional().transform((v) => (v ? v.split("\n").map((a) => a.trim()).filter(Boolean).slice(0, 30) : [])),
    disciplineMode: z.enum(DISCIPLINE_MODES),
    summary: z.string().trim().max(2000).optional().transform((v) => v || null),
    sourceText: z.string().max(60000).optional().transform((v) => v ?? ""),
    estimatedMinutes: z.coerce.number().int().min(5).max(600).default(40),
  })
  .superRefine((v, ctx) => {
    if (v.kind === "dispositivo") {
      if (!v.lawCode || !/^[A-Z0-9]{2,12}$/.test(v.lawCode)) ctx.addIssue({ code: "custom", path: ["lawCode"], message: "Informe a lei (ex.: CP, CF, LEP, L11340)." });
      if (!v.articles.length) ctx.addIssue({ code: "custom", path: ["articles"], message: "Informe ao menos um artigo." });
    }
  });
export type TopicInput = z.output<typeof topicInputSchema>;

export async function createTopic(user: SessionUser, input: TopicInput): Promise<string> {
  const db = createAdminClient();
  const base = slugify(input.kind === "dispositivo" ? `${input.lawCode}-art-${input.articles.join("-")}` : input.title);
  let slug = base;
  for (let i = 2; i < 50; i++) {
    const { data } = await db.from("catalog_topics").select("id").eq("slug", slug).maybeSingle();
    if (!data) break;
    slug = `${base}-${i}`;
  }
  const r = await db
    .from("catalog_topics")
    .insert({
      slug,
      title: input.title,
      kind: input.kind,
      law_code: input.kind === "dispositivo" ? input.lawCode : null,
      articles: input.kind === "dispositivo" ? input.articles : [],
      aliases: input.aliases,
      discipline_mode: input.disciplineMode,
      summary: input.summary,
      source_text: input.sourceText ? normalizeContent(input.sourceText).normalized : "",
      estimated_minutes: input.estimatedMinutes,
      created_by: user.id,
    })
    .select("id")
    .single();
  if (r.error) throw new UserFacingError(`Não foi possível criar o tema: ${r.error.message}`, "invalid_input");
  await auditLog(db, { actorId: user.id, userId: user.id, action: "catalog.topic_created", entity: "catalog_topics", entityId: r.data.id as string, meta: {} });
  return r.data.id as string;
}

export async function updateTopic(user: SessionUser, id: string, input: TopicInput) {
  const db = createAdminClient();
  const current = await getTopic(id);
  const sourceText = input.sourceText ? normalizeContent(input.sourceText).normalized : "";
  const sourceChanged = sourceText !== current.source_text;
  const r = await db
    .from("catalog_topics")
    .update({
      title: input.title,
      kind: input.kind,
      law_code: input.kind === "dispositivo" ? input.lawCode : null,
      articles: input.kind === "dispositivo" ? input.articles : [],
      aliases: input.aliases,
      discipline_mode: input.disciplineMode,
      summary: input.summary,
      source_text: sourceText,
      estimated_minutes: input.estimatedMinutes,
      // Texto-fonte novo invalida a estrutura, a aula e o banco (precisam ser refeitos).
      ...(sourceChanged ? { nodes: [], lesson: null } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (r.error) throw new UserFacingError(r.error.message, "invalid_input");
  if (sourceChanged) await db.from("catalog_questions").delete().eq("topic_id", id);
  await auditLog(db, { actorId: user.id, userId: user.id, action: "catalog.topic_updated", entity: "catalog_topics", entityId: id, meta: { sourceChanged } });
  return { sourceChanged };
}

export interface TopicRow {
  id: string;
  slug: string;
  title: string;
  kind: "tema" | "dispositivo";
  law_code: string | null;
  articles: string[];
  aliases: string[];
  discipline_mode: string;
  summary: string | null;
  source_text: string;
  nodes: ExtractedNode[];
  lesson: (LessonOutput & { verificationPending: boolean }) | null;
  estimated_minutes: number;
  status: "rascunho" | "publicado" | "arquivado";
  version: number;
  origin: string;
  published_at: string | null;
  updated_at: string;
  /** Tópico do edital que agrupa a aula ("Ilicitude"), número do tópico ("4") e do subtópico ("4.1"). */
  topic_group: string | null;
  topic_group_code: string | null;
  subtopic_code: string | null;
}

export async function getTopic(id: string): Promise<TopicRow> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const db = createAdminClient();
  const { data } = await db.from("catalog_topics").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  return data as TopicRow;
}

export async function getTopicQuestions(id: string) {
  const db = createAdminClient();
  const { data, error } = await db.from("catalog_questions").select("*").eq("topic_id", id).eq("active", true).order("level").order("created_at");
  if (error) throw new Error(error.message);
  return (data ?? []).map(rowToQuestion);
}

function lessonCtx(t: TopicRow) {
  const lesson: PlannedLesson = {
    key: "CAT",
    title: t.title,
    objective: t.summary ?? `Dominar ${t.title}`,
    nodeKeys: t.nodes.filter((n) => n.requiresDirectCoverage).map((n) => n.key),
    supplementary: [],
    prerequisiteLessonKeys: [],
    estimatedMinutes: t.estimated_minutes,
  };
  return { board: CATALOG_BOARD_LABEL, disciplineMode: t.discipline_mode as DisciplineMode, lesson, nodes: t.nodes, previousLessonTitles: [] };
}

/**
 * Passo 1: mapa de itens. Com texto-fonte (lei colada), a extração é determinística;
 * sem texto, a IA organiza os subtemas (só títulos, nunca texto legal de memória).
 */
export async function generateTopicStructure(id: string) {
  const t = await getTopic(id);
  const db = createAdminClient();
  let source = t.source_text;
  let nodes = source ? extractStructure(source).nodes : [];
  if (!nodes.some((n) => n.requiresDirectCoverage)) {
    const r = await delimitScope(getAIProvider(), {
      text: [t.title, t.kind === "dispositivo" ? `${LAWS.find((l) => l.code === t.law_code)?.name ?? t.law_code}, art(s). ${t.articles.join(", ")}` : "", t.summary ?? ""].filter(Boolean).join("\n"),
      contentType: t.kind === "dispositivo" ? "artigo_lei" : "tema_livre",
      board: CATALOG_BOARD_LABEL,
      answer: "Conteúdo de catálogo preparado pela equipe: siga a interpretação mais completa e usual do título, sem perguntar.",
    });
    if (!r.data.outline) throw new UserFacingError("A IA não conseguiu organizar os subtemas. Cole o texto-fonte ou detalhe o resumo.", "scope_empty");
    source = source ? `${source}\n\n${r.data.outline}` : r.data.outline;
    nodes = extractStructure(source).nodes;
  }
  const up = await db.from("catalog_topics").update({ source_text: source, nodes, lesson: null, updated_at: new Date().toISOString() }).eq("id", id);
  if (up.error) throw new Error(up.error.message);
  await db.from("catalog_questions").delete().eq("topic_id", id);
  return { items: nodes.filter((n) => n.requiresDirectCoverage).length };
}

/** Passo 2: aula completa (com complemento das formas de ensino que faltarem). */
export async function generateTopicLesson(id: string) {
  const t = await getTopic(id);
  if (!t.nodes.length) throw new UserFacingError("Gere a estrutura primeiro.", "no_structure");
  const ai = getAIProvider();
  const ctx = lessonCtx(t);
  let r = await generateLesson(ai, ctx);
  if (r.data.missingKinds.length) {
    const { missingKinds, ...current } = r.data;
    r = await completeLessonSections(ai, ctx, current, missingKinds);
  }
  const { missingKinds, ...lesson } = r.data;
  const db = createAdminClient();
  const up = await db.from("catalog_topics").update({ lesson, updated_at: new Date().toISOString() }).eq("id", id);
  if (up.error) throw new Error(up.error.message);
  return { sections: lesson.sections.length, missingKinds };
}

/** Passo 3: banco de questões de um nível (acrescenta; enunciados repetidos são descartados). */
export async function generateTopicQuestions(id: string, level: LevelKey) {
  const t = await getTopic(id);
  if (!t.lesson) throw new UserFacingError("Gere a aula primeiro.", "no_lesson");
  const existing = await getTopicQuestions(id);
  const markdown = [`# ${t.lesson.title}`, ...t.lesson.sections.map((s) => `## ${s.title}\n\n${practiceToMarkdown(s.bodyMarkdown)}`)].join("\n\n");
  const ctx = lessonCtx(t);
  const r = await generateQuestions(getAIProvider(), {
    board: CATALOG_BOARD_LABEL,
    lesson: ctx.lesson,
    lessonMarkdown: markdown,
    nodes: t.nodes,
    count: BANK_PER_ROUND,
    level,
    focus: existing.some((q) => q.level === level)
      ? { missingLevels: [], uncoveredNodeKeys: [], existingStatements: existing.filter((q) => q.level === level).map((q) => q.statement) }
      : undefined,
  });
  const rows = r.data.questions.map((q) => questionRow(id, level, q));
  if (rows.length) {
    const ins = await createAdminClient().from("catalog_questions").insert(rows);
    if (ins.error) throw new Error(ins.error.message);
  }
  return { added: rows.length };
}

function questionRow(topicId: string, level: LevelKey, q: Omit<CatalogQuestion, "id" | "level">) {
  return {
    topic_id: topicId,
    level,
    type: q.type,
    statement: q.statement,
    options: q.type === "certo_errado" ? [] : q.options,
    correct_answer_true: q.type === "certo_errado" ? q.correctAnswerTrue ?? null : null,
    justification: q.justification,
    node_key: q.nodeKey,
    difficulty: q.difficulty,
    essential: q.essential,
    depends_on_external_source: q.dependsOnExternalSource,
  };
}

const sectionEditSchema = z.object({ title: z.string().trim().min(2).max(160), bodyMarkdown: z.string().trim().min(1).max(12000) });

export async function updateTopicSection(id: string, index: number, input: unknown) {
  const t = await getTopic(id);
  if (!t.lesson || !t.lesson.sections[index]) throw new UserFacingError("Seção não encontrada.", "not_found");
  const v = sectionEditSchema.parse(input);
  const lesson = { ...t.lesson, sections: t.lesson.sections.map((s, i) => (i === index ? { ...s, ...v } : s)) };
  lessonSchema.parse({ ...lesson, verificationPending: undefined });
  const up = await createAdminClient().from("catalog_topics").update({ lesson, updated_at: new Date().toISOString() }).eq("id", id);
  if (up.error) throw new Error(up.error.message);
}

const questionEditSchema = z
  .object({
    statement: z.string().trim().min(10).max(4000),
    justification: z.string().trim().min(10).max(3000),
    essential: z.boolean(),
    correctAnswerTrue: z.boolean().optional(),
    options: z.array(z.object({ label: z.string().max(3), text: z.string().trim().min(1).max(1500), correct: z.boolean(), explanation: z.string().trim().min(5).max(1500) })).max(5),
  });

export async function updateTopicQuestion(questionId: string, input: unknown) {
  const v = questionEditSchema.parse(input);
  const db = createAdminClient();
  const cur = await db.from("catalog_questions").select("type").eq("id", questionId).single();
  if (cur.error) throw new UserFacingError("Questão não encontrada.", "not_found");
  if (cur.data.type !== "certo_errado" && v.options.filter((o) => o.correct).length !== 1) {
    throw new UserFacingError("Marque exatamente uma alternativa correta.", "invalid_input");
  }
  const up = await db
    .from("catalog_questions")
    .update({
      statement: v.statement,
      justification: v.justification,
      essential: v.essential,
      ...(cur.data.type === "certo_errado" ? { correct_answer_true: v.correctAnswerTrue ?? false } : { options: v.options }),
    })
    .eq("id", questionId);
  if (up.error) throw new UserFacingError(up.error.message, "invalid_input");
}

export async function removeTopicQuestion(questionId: string) {
  const up = await createAdminClient().from("catalog_questions").update({ active: false }).eq("id", questionId);
  if (up.error) throw new Error(up.error.message);
}

/** O que falta para publicar (vazio = pode publicar). */
export function publishBlockers(t: TopicRow, questions: CatalogQuestion[]): string[] {
  const out: string[] = [];
  if (!t.nodes.some((n) => n.requiresDirectCoverage)) out.push("Gere a estrutura (itens a ensinar).");
  if (!t.lesson) out.push("Gere e revise a aula.");
  for (const l of LEVELS) {
    const n = questions.filter((q) => q.level === l.key).length;
    if (n < MIN_BANK_PER_LEVEL) out.push(`Nível ${l.label.toLowerCase()}: ${n} de ${MIN_BANK_PER_LEVEL} questões no banco.`);
  }
  return out;
}

export async function publishTopic(user: SessionUser, id: string) {
  const t = await getTopic(id);
  const blockers = publishBlockers(t, await getTopicQuestions(id));
  if (blockers.length) throw new UserFacingError(`Ainda não dá para publicar: ${blockers.join(" ")}`, "not_ready");
  const db = createAdminClient();
  const r = await db.rpc("publish_catalog_topic", { p_topic: id });
  if (r.error) throw new Error(r.error.message);
  await auditLog(db, { actorId: user.id, userId: user.id, action: "catalog.topic_published", entity: "catalog_topics", entityId: id, meta: { version: r.data } });
  return r.data as number;
}

export async function setTopicStatus(user: SessionUser, id: string, status: "rascunho" | "arquivado") {
  const db = createAdminClient();
  const r = await db.from("catalog_topics").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
  if (r.error) throw new Error(r.error.message);
  await auditLog(db, { actorId: user.id, userId: user.id, action: `catalog.topic_${status}`, entity: "catalog_topics", entityId: id, meta: {} });
}

export interface TopicDeleteImpact {
  title: string;
  status: string;
  questions: number;
  studies: number;
  quizAttempts: number;
}

/** O que a exclusão de um tema afeta (para a confirmação). */
export async function topicDeleteImpact(id: string): Promise<TopicDeleteImpact> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new UserFacingError("Tema inválido.", "invalid_input");
  const db = createAdminClient();
  const [t, q, l, a] = await Promise.all([
    db.from("catalog_topics").select("title, status").eq("id", id).maybeSingle(),
    db.from("catalog_questions").select("id", { count: "exact", head: true }).eq("topic_id", id),
    db.from("lessons").select("id", { count: "exact", head: true }).eq("catalog_topic_id", id),
    db.from("quiz_attempts").select("id", { count: "exact", head: true }).eq("topic_id", id),
  ]);
  if (!t.data) throw new UserFacingError("Tema não encontrado.", "not_found");
  return { title: t.data.title as string, status: t.data.status as string, questions: q.count ?? 0, studies: l.count ?? 0, quizAttempts: a.count ?? 0 };
}

/**
 * Exclui o tema do catálogo de vez, com o banco de questões dele. Os estudos que os alunos já
 * criaram a partir dele continuam (cada estudo tem a própria cópia da aula e das questões); só
 * perdem o vínculo com o catálogo. Tentativas do Modo Jogo deste tema são apagadas junto.
 */
export async function deleteTopic(user: SessionUser, id: string) {
  const impact = await topicDeleteImpact(id);
  const db = createAdminClient();
  const r = await db.from("catalog_topics").delete().eq("id", id);
  if (r.error) throw new UserFacingError(`Não foi possível excluir: ${r.error.message}`, "db_rule");
  await auditLog(db, { actorId: user.id, userId: user.id, action: "catalog.topic_deleted", entity: "catalog_topics", entityId: id, meta: { ...impact } });
  return impact;
}

export async function listTopics() {
  const db = createAdminClient();
  const [topics, qs] = await Promise.all([
    db.from("catalog_topics").select("id, title, kind, law_code, articles, status, version, updated_at, origin, lesson, discipline_mode, topic_group, topic_group_code, subtopic_code").order("updated_at", { ascending: false }).limit(1000),
    db.from("catalog_questions").select("topic_id, level").eq("active", true).limit(50000),
  ]);
  if (topics.error) throw new Error(topics.error.message);
  const count = new Map<string, Record<string, number>>();
  for (const q of qs.data ?? []) {
    const c = count.get(q.topic_id as string) ?? {};
    c[q.level as string] = (c[q.level as string] ?? 0) + 1;
    count.set(q.topic_id as string, c);
  }
  return (topics.data ?? []).map((t) => ({
    id: t.id as string,
    title: t.title as string,
    kind: t.kind as string,
    lawCode: t.law_code as string | null,
    articles: (t.articles as string[]) ?? [],
    status: t.status as TopicRow["status"],
    version: t.version as number,
    updatedAt: t.updated_at as string,
    origin: t.origin as string,
    disciplineMode: (t.discipline_mode as string) ?? "outra",
    modules: new Set(((t.lesson as { sections?: Array<{ module?: string }> } | null)?.sections ?? []).map((s) => s.module).filter(Boolean)).size,
    hasLesson: !!t.lesson,
    questions: count.get(t.id as string) ?? {},
    topicGroup: (t.topic_group as string | null) ?? null,
    topicGroupCode: (t.topic_group_code as string | null) ?? null,
    subtopicCode: (t.subtopic_code as string | null) ?? null,
  }));
}

// ---------------------------------------------------------------------------
// Fila: temas gerados pela IA para alunos, candidatos ao catálogo
// ---------------------------------------------------------------------------
export interface QueueGroup {
  key: string;
  request: string;
  students: number;
  lessons: number;
  sampleLessonId: string;
  sampleTitle: string;
  lastAt: string;
}

/**
 * Agrupa os pedidos que a IA atendeu (sem catálogo) pelo texto normalizado do pedido.
 * Mostra só o pedido e a aula gerada — nunca quem pediu.
 */
export async function listQueue(limit = 60): Promise<QueueGroup[]> {
  const db = createAdminClient();
  const { data, error } = await db
    .from("lessons")
    .select("id, title, user_id, generated_at, trail_id, study_trails!inner(title, archived_at, source_documents(source_document_versions(original_text)))")
    .is("catalog_topic_id", null)
    .eq("status", "ready")
    .order("generated_at", { ascending: false })
    .limit(2000);
  if (error) throw new Error(error.message);
  const groups = new Map<string, QueueGroup & { users: Set<string> }>();
  for (const row of data ?? []) {
    const r = row as unknown as {
      id: string; title: string; user_id: string; generated_at: string | null;
      study_trails: { title: string; source_documents: Array<{ source_document_versions: Array<{ original_text: string }> }> };
    };
    const request = r.study_trails.source_documents?.[0]?.source_document_versions?.[0]?.original_text ?? r.study_trails.title;
    // Texto colado longo (lei inteira, apostila) não é um pedido reaproveitável como tema.
    if (request.length > 300) continue;
    const key = normalizeText(request).slice(0, 120);
    const g = groups.get(key) ?? { key, request: request.slice(0, 200), students: 0, lessons: 0, sampleLessonId: r.id, sampleTitle: r.title, lastAt: r.generated_at ?? "", users: new Set<string>() };
    g.users.add(r.user_id);
    g.students = g.users.size;
    g.lessons += 1;
    groups.set(key, g);
  }
  return [...groups.values()]
    .sort((a, b) => b.students - a.students || b.lastAt.localeCompare(a.lastAt))
    .slice(0, limit)
    .map(({ users: _u, ...g }) => (void _u, g));
}

/** Cria um rascunho no catálogo copiando uma aula gerada pela IA (itens, seções e questões). */
export async function promoteLesson(user: SessionUser, lessonId: string): Promise<string> {
  if (!/^[0-9a-f-]{36}$/i.test(lessonId)) throw new UserFacingError("Aula inválida.", "invalid_input");
  const db = createAdminClient();
  const l = await db.from("lessons").select("id, title, objective, estimated_minutes, trail_id, study_trails(discipline_mode)").eq("id", lessonId).single();
  if (l.error) throw new UserFacingError("Aula não encontrada.", "not_found");
  const [nodesRes, sections, questions] = await Promise.all([
    db.from("lesson_nodes").select("content_nodes(key, kind, marker, title, source_text, span_start, span_end, depth, sort_order, path, requires_direct_coverage, parent_id, id)").eq("lesson_id", lessonId),
    db.from("lesson_sections").select("kind, title, body_markdown, node_keys").eq("lesson_id", lessonId).order("sort_order"),
    db.from("questions").select("type, statement, justification, difficulty, essential, depends_on_external_source, correct_answer_true, level, node_id, question_options(label, text, is_correct, explanation, sort_order)").eq("lesson_id", lessonId).eq("active", true).is("recovery_of", null),
  ]);
  type N = { id: string; key: string; kind: ExtractedNode["kind"]; marker: string | null; title: string; source_text: string; span_start: number; span_end: number; depth: number; sort_order: number; path: string; requires_direct_coverage: boolean; parent_id: string | null };
  const raw = (nodesRes.data ?? []).map((x) => (x as unknown as { content_nodes: N }).content_nodes).filter(Boolean).sort((a, b) => a.sort_order - b.sort_order);
  if (!raw.length) throw new UserFacingError("A aula não tem itens para copiar.", "empty");
  // Novo texto-fonte só com os trechos desta aula, e chaves renumeradas a partir de N0001.
  let source = "";
  const keyMap = new Map<string, string>();
  const idToKey = new Map(raw.map((n) => [n.id, n.key]));
  const nodes: ExtractedNode[] = raw.map((n, i) => {
    const start = source.length ? source.length + 1 : 0;
    source = source.length ? `${source}\n${n.source_text}` : n.source_text;
    const key = `N${String(i + 1).padStart(4, "0")}`;
    keyMap.set(n.key, key);
    return { key, kind: n.kind, marker: n.marker, title: n.title, sourceText: n.source_text, span: { start, end: start + n.source_text.length }, parentKey: n.parent_id ? (idToKey.get(n.parent_id) ?? null) : null, depth: n.depth, order: i, path: n.path, requiresDirectCoverage: n.requires_direct_coverage };
  });
  for (const n of nodes) n.parentKey = n.parentKey ? (keyMap.get(n.parentKey) ?? null) : null;
  const map = (k: string) => keyMap.get(k);
  const lesson = {
    title: l.data.title as string,
    objective: l.data.objective as string,
    sections: (sections.data ?? []).map((s) => ({ kind: s.kind, title: s.title, bodyMarkdown: s.body_markdown, nodeKeys: ((s.node_keys as string[]) ?? []).map(map).filter(Boolean) as string[] })),
    taughtNodeKeys: nodes.filter((n) => n.requiresDirectCoverage).map((n) => n.key),
    references: [],
    unverifiedClaims: [],
    verificationPending: true,
  };
  const disc = (l.data.study_trails as unknown as { discipline_mode: string | null } | null)?.discipline_mode ?? "outra";
  const id = await createTopic(user, {
    title: l.data.title as string,
    kind: "tema",
    lawCode: null,
    articles: [],
    aliases: [],
    disciplineMode: ((DISCIPLINE_MODES as readonly string[]).includes(disc) ? disc : "outra") as DisciplineMode,
    summary: l.data.objective as string,
    sourceText: "",
    estimatedMinutes: (l.data.estimated_minutes as number) ?? 40,
  });
  await db.from("catalog_topics").update({ source_text: source, nodes, lesson, origin: "promovido", origin_lesson_id: lessonId }).eq("id", id);
  const keyById = new Map(raw.map((n) => [n.id, keyMap.get(n.key)!]));
  const rows = (questions.data ?? []).flatMap((q) => {
    const nodeKey = keyById.get(q.node_id as string);
    if (!nodeKey) return [];
    const opts = ((q.question_options as Array<{ label: string; text: string; is_correct: boolean; explanation: string; sort_order: number }>) ?? [])
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((o) => ({ label: o.label, text: o.text, correct: o.is_correct, explanation: o.explanation }));
    return [questionRow(id, (q.level as LevelKey) ?? "facil", {
      type: q.type as CatalogQuestion["type"],
      statement: q.statement as string,
      options: opts,
      correctAnswerTrue: (q.correct_answer_true as boolean | null) ?? undefined,
      justification: q.justification as string,
      nodeKey,
      difficulty: q.difficulty as number,
      essential: q.essential as boolean,
      dependsOnExternalSource: q.depends_on_external_source as boolean,
    })];
  });
  if (rows.length) await db.from("catalog_questions").insert(rows);
  await auditLog(db, { actorId: user.id, userId: user.id, action: "catalog.lesson_promoted", entity: "catalog_topics", entityId: id, meta: { lessonId } });
  return id;
}

/** Corrige o tema (título) e o tipo da aula sem recolar o texto; vale na hora para todos. */
export async function updateTopicMeta(id: string, input: TopicMetaInput) {
  await getTopic(id);
  const r = parseTopicMeta(input);
  if (!r.ok) throw new UserFacingError(r.error, "invalid_input");
  const up = await createAdminClient()
    .from("catalog_topics")
    .update({ ...r.meta, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (up.error) throw new UserFacingError("Não foi possível salvar: confira a lei e os artigos.", "invalid_input");
}
