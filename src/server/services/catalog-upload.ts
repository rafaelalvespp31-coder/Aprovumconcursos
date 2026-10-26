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
  if (existing?.status === "publicado") errors.push(`Já existe uma aula publicada para “${existing.title}”. Para não substituir a aula que os alunos usam, mude o título (ex.: “… — parte 2”) ou arquive a atual antes de reenviar.`);
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

/**
 * Grava a aula como rascunho no catálogo. Se já existe um rascunho com o mesmo endereço (slug),
 * ele é atualizado e as questões antigas ficam inativas (não são apagadas). Aula publicada não é tocada.
 */
export async function importLessonUpload(user: SessionUser, text: string, fileName: string): Promise<{ id: string; updated: boolean }> {
  const p = prepareLessonUpload(text);
  if (p.errors.length) throw new UserFacingError(p.errors[0]!, "invalid_input");
  const db = createAdminClient();
  const { data: existing } = await db.from("catalog_topics").select("id, status").eq("slug", p.slug).maybeSingle();
  if (existing?.status === "publicado") throw new UserFacingError("Já existe uma aula publicada com esse título. Mude o título ou arquive a atual antes de reenviar.", "conflict");
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
    status: "rascunho" as const,
    updated_at: new Date().toISOString(),
  };
  let id: string;
  if (existing) {
    id = existing.id as string;
    const up = await db.from("catalog_topics").update(row).eq("id", id);
    if (up.error) throw new UserFacingError(`Não foi possível atualizar a aula: ${up.error.message}`, "invalid_input");
    await db.from("catalog_questions").update({ active: false }).eq("topic_id", id).eq("active", true);
  } else {
    const ins = await db.from("catalog_topics").insert({ ...row, slug: p.slug, created_by: user.id }).select("id").single();
    if (ins.error) throw new UserFacingError(`Não foi possível criar a aula: ${ins.error.message}`, "invalid_input");
    id = ins.data.id as string;
  }
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
    if (ins.error) throw new UserFacingError(`A aula foi salva, mas as questões não: ${ins.error.message}`, "invalid_input");
  }
  const sha = createHash("sha256").update(text).digest("hex");
  await auditLog(db, { actorId: user.id, userId: user.id, action: existing ? "catalog.topic_upload_updated" : "catalog.topic_uploaded", entity: "catalog_topics", entityId: id, meta: { fileName: fileName.slice(0, 200), sha256: sha, sections: p.built.lesson.sections.length, questions: rows.length } });
  return { id, updated: Boolean(existing) };
}

export type { LessonUploadPreview };
