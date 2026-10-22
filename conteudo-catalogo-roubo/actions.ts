"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { lessonSchema } from "@/ai/schemas";
import { DISCIPLINE_MODES } from "@/ai/pedagogy";
import { requireAdmin } from "@/server/services/catalog";
import { createAdminClient } from "@/server/supabase";
import { auditLog, logEvent } from "@/server/observability";

export type ImportResult = { ok: boolean; error?: string; message?: string };

const MAX_FILE_BYTES = 1_000_000;
const MAX_TOTAL_BYTES = 3_500_000;
const slugSchema = z.string().trim().regex(/^[a-z0-9-]{2,120}$/, "O slug deve conter apenas letras minúsculas, números e hífens.");
const nodeSchema = z.object({
  key: z.string().regex(/^N\d{4,6}$/),
  title: z.string().trim().min(1).max(300),
  kind: z.string().min(1).max(40),
  marker: z.string().nullable().optional(),
  sourceText: z.string().optional(),
  span: z.object({ start: z.number().int().min(0), end: z.number().int().min(0) }).optional(),
  parentKey: z.string().nullable().optional(),
  depth: z.number().int().min(0).max(30).optional(),
  order: z.number().int().min(0).optional(),
  path: z.string().optional(),
  requiresDirectCoverage: z.boolean().optional(),
});
const topicSchema = z.object({
  slug: slugSchema,
  title: z.string().trim().min(2).max(200),
  kind: z.enum(["tema", "dispositivo"]),
  law_code: z.string().max(12).nullable().optional(),
  articles: z.array(z.string().max(30)).max(100).optional(),
  aliases: z.array(z.string().max(200)).max(30).optional(),
  discipline_mode: z.enum(DISCIPLINE_MODES),
  summary: z.string().max(2000).nullable().optional(),
  source_text: z.string().max(60000).optional(),
  nodes: z.array(nodeSchema).max(400),
  estimated_minutes: z.number().int().min(5).max(600),
});
const optionSchema = z.object({
  label: z.string().min(1).max(3),
  text: z.string().trim().min(1).max(1500),
  correct: z.boolean(),
  explanation: z.string().trim().min(5).max(1500),
});
const questionSchema = z.object({
  level: z.enum(["facil", "medio", "dificil"]),
  type: z.enum(["multipla_escolha", "certo_errado", "situacional"]),
  statement: z.string().trim().min(10).max(4000),
  options: z.array(optionSchema).max(5),
  correctAnswerTrue: z.boolean().optional(),
  justification: z.string().trim().min(10).max(3000),
  nodeKey: z.string().regex(/^N\d{4,6}$/),
  difficulty: z.number().int().min(1).max(5),
  essential: z.boolean(),
  dependsOnExternalSource: z.boolean(),
});

async function readJsonFile(form: FormData, field: string, required = true): Promise<unknown | null> {
  const entry = form.get(field);
  if (!(entry instanceof File) || entry.size === 0) {
    if (!required) return null;
    throw new Error(`Selecione o arquivo ${field}.`);
  }
  if (!entry.name.toLowerCase().endsWith(".json")) throw new Error(`O arquivo ${field} precisa estar em formato .json.`);
  if (entry.size > MAX_FILE_BYTES) throw new Error(`O arquivo ${field} ultrapassa 1 MB. Envie uma versão menor.`);
  try {
    return JSON.parse(await entry.text()) as unknown;
  } catch {
    throw new Error(`O arquivo ${field} não contém JSON válido.`);
  }
}

export async function importCatalogBundleAction(_: ImportResult, form: FormData): Promise<ImportResult> {
  const user = await requireAdmin();
  let insertedTopicId: string | null = null;
  try {
    const [topicRaw, lessonRaw, questionsRaw, nodesRaw] = await Promise.all([
      readJsonFile(form, "topic"),
      readJsonFile(form, "lesson"),
      readJsonFile(form, "questions"),
      readJsonFile(form, "nodes", false),
    ]);
    const totalBytes = ["topic", "lesson", "questions", "nodes"].reduce((sum, key) => {
      const value = form.get(key);
      return sum + (value instanceof File ? value.size : 0);
    }, 0);
    if (totalBytes > MAX_TOTAL_BYTES) throw new Error("O conjunto ultrapassa 3,5 MB. Divida o conteúdo em temas menores.");

    const topicParsed = topicSchema.safeParse(topicRaw);
    if (!topicParsed.success) throw new Error(`topic.json inválido: ${topicParsed.error.issues[0]?.message ?? "verifique os campos"}`);
    const topic = topicParsed.data;
    const lessonObject = z.record(z.string(), z.unknown()).safeParse(lessonRaw);
    if (!lessonObject.success) throw new Error("lesson.json precisa ser um objeto JSON.");
    const lessonData = lessonObject.data;
    const lessonValidation = lessonSchema.safeParse(lessonData);
    if (!lessonValidation.success) throw new Error(`lesson.json inválido: ${lessonValidation.error.issues[0]?.message ?? "verifique as seções"}`);
    const questionsParsed = z.array(questionSchema).min(1).max(1000).safeParse(questionsRaw);
    if (!questionsParsed.success) throw new Error(`questoes.json inválido: ${questionsParsed.error.issues[0]?.message ?? "verifique as questões"}`);

    const nodesParsed = nodesRaw === null ? null : z.array(nodeSchema).max(400).safeParse(nodesRaw);
    if (nodesParsed && !nodesParsed.success) throw new Error(`nodes.json inválido: ${nodesParsed.error.issues[0]?.message ?? "verifique a estrutura"}`);
    const nodes = nodesParsed?.success ? nodesParsed.data : topic.nodes;
    if (!nodes.length) throw new Error("O tema precisa ter ao menos um item em nodes.json ou topic.json.");
    const nodeKeys = new Set(nodes.map((node) => node.key));
    const unknownNode = questionsParsed.data.find((question) => !nodeKeys.has(question.nodeKey));
    if (unknownNode) throw new Error(`A questão “${unknownNode.statement.slice(0, 60)}…” usa o item ${unknownNode.nodeKey}, que não existe na estrutura da aula.`);

    const statements = new Set<string>();
    for (const [index, question] of questionsParsed.data.entries()) {
      const normalized = question.statement.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
      if (statements.has(`${question.level}:${normalized}`)) throw new Error(`Há uma questão duplicada no nível ${question.level} (item ${index + 1}).`);
      statements.add(`${question.level}:${normalized}`);
      if (question.type === "certo_errado") {
        if (question.correctAnswerTrue === undefined) throw new Error(`A questão ${index + 1} de certo/errado precisa ter correctAnswerTrue.`);
      } else if (question.options.length < 2 || question.options.filter((option) => option.correct).length !== 1) {
        throw new Error(`A questão ${index + 1} precisa ter pelo menos duas alternativas e exatamente uma correta.`);
      }
    }

    const db = createAdminClient();
    const existing = await db.from("catalog_topics").select("id").eq("slug", topic.slug).maybeSingle();
    if (existing.error) throw new Error("Não foi possível verificar se o tema já existe.");
    if (existing.data) throw new Error(`O tema “${topic.title}” já existe no catálogo. Para evitar sobrescrever conteúdo, a importação foi cancelada.`);

    const created = await db.from("catalog_topics").insert({
      slug: topic.slug,
      title: topic.title,
      kind: topic.kind,
      law_code: topic.kind === "dispositivo" ? topic.law_code ?? null : null,
      articles: topic.kind === "dispositivo" ? topic.articles ?? [] : [],
      aliases: topic.aliases ?? [],
      discipline_mode: topic.discipline_mode,
      summary: topic.summary ?? null,
      source_text: topic.source_text ?? "",
      nodes,
      lesson: { ...lessonData, verificationPending: lessonData.verificationPending === true },
      estimated_minutes: topic.estimated_minutes,
      status: "rascunho",
      version: 0,
      origin: "equipe",
      created_by: user.id,
    }).select("id").single();
    if (created.error || !created.data) throw new Error(`Não foi possível criar o rascunho: ${created.error?.message ?? "erro no banco"}`);
    insertedTopicId = created.data.id as string;

    const rows = questionsParsed.data.map((question) => ({
      topic_id: insertedTopicId,
      level: question.level,
      type: question.type,
      statement: question.statement,
      options: question.type === "certo_errado" ? [] : question.options,
      correct_answer_true: question.type === "certo_errado" ? question.correctAnswerTrue ?? null : null,
      justification: question.justification,
      node_key: question.nodeKey,
      difficulty: question.difficulty,
      essential: question.essential,
      depends_on_external_source: question.dependsOnExternalSource,
      active: true,
    }));
    const saved = await db.from("catalog_questions").insert(rows);
    if (saved.error) {
      await db.from("catalog_topics").delete().eq("id", insertedTopicId);
      insertedTopicId = null;
      throw new Error(`As questões não foram gravadas; o rascunho foi revertido. Detalhe: ${saved.error.message}`);
    }

    await auditLog(db, {
      actorId: user.id,
      userId: user.id,
      action: "catalog.bundle_imported",
      entity: "catalog_topics",
      entityId: insertedTopicId,
      meta: { questionCount: rows.length, nodeCount: nodes.length, sectionCount: lessonValidation.data.sections.length },
    });
    revalidatePath("/admin/catalogo");
    revalidatePath("/admin/importar");
    return { ok: true, message: `Rascunho importado com sucesso: ${topic.title}. ${nodes.length} itens, ${lessonValidation.data.sections.length} seções de aula e ${rows.length} questões. Revise antes de publicar.` };
  } catch (error) {
    await logEvent("catalog.bundle_import_failed", { userId: user.id, error: error instanceof Error ? error.message : "unknown" });
    return { ok: false, error: error instanceof Error ? error.message : "Não foi possível importar os arquivos." };
  }
}
