import "server-only";
import { createHash } from "node:crypto";
import type { DisciplineMode } from "@/ai/pedagogy";
import { prepareLessonUpload, summarizeLessonUpload, type LessonUploadPreview } from "@/domain/catalog/upload-preview";
import { createAdminClient } from "../supabase";
import type { SessionUser } from "../auth";
import { auditLog } from "../observability";
import { UserFacingError } from "./trails";

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
  return summarizeLessonUpload(p, { errors, warnings, existing: existing ? { id: existing.id as string, status: existing.status as string, title: existing.title as string } : null });
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
