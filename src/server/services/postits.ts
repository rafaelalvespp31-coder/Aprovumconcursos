import "server-only";
import { createHash } from "node:crypto";
import { z } from "zod";
import { createAdminClient, createUserClient } from "../supabase";
import { UserFacingError, enforceRateLimit } from "./trails";
import { auditLog, logEvent } from "../observability";
import { practiceToMarkdown } from "@/domain/content/practice";
import { POSTIT_NOTE_MAX, POSTIT_QUOTE_MAX, POSTIT_QUOTE_MIN, cleanPostitText, findQuoteSection, type QuoteSection } from "@/domain/study/postit-quote";
import { disciplineLabel } from "@/ai/pedagogy";
import type { PostitPdfSnapshot } from "../pdf/postit-types";

export interface Postit {
  id: string;
  lessonId: string;
  sectionId: string | null;
  sectionTitle: string | null;
  quote: string;
  quoteStart: number;
  note: string;
  createdAt: string;
  updatedAt: string;
}
export interface PostitPdfInfo {
  id: string;
  pdfVersion: number;
  createdAt: string;
  items: number;
}

const COLS = "id, lesson_id, section_id, section_title, quote, quote_start, note, created_at, updated_at";
type Row = { id: string; lesson_id: string; section_id: string | null; section_title: string | null; quote: string; quote_start: number; note: string; created_at: string; updated_at: string };
const toPostit = (r: Row): Postit => ({
  id: r.id, lessonId: r.lesson_id, sectionId: r.section_id, sectionTitle: r.section_title, quote: r.quote,
  quoteStart: r.quote_start, note: r.note, createdAt: r.created_at, updatedAt: r.updated_at,
});

const createSchema = z.object({
  lessonId: z.uuid(),
  sectionId: z.uuid().nullish(),
  quote: z.string().min(1).max(POSTIT_QUOTE_MAX * 2),
  quoteStart: z.number().int().min(0).max(1_000_000).default(0),
  note: z.string().max(POSTIT_NOTE_MAX * 2).default(""),
});
export type CreatePostitInput = z.input<typeof createSchema>;

/** Ordem de leitura: posição da seção na aula e, dentro dela, a posição do trecho. */
async function sectionOrder(lessonId: string): Promise<Map<string, number>> {
  const db = await createUserClient();
  const r = await db.from("lesson_sections").select("id, sort_order").eq("lesson_id", lessonId).order("sort_order");
  return new Map(((r.data ?? []) as Array<{ id: string; sort_order: number }>).map((s, i) => [s.id, i]));
}

export async function listPostits(lessonId: string): Promise<Postit[]> {
  const id = z.uuid().parse(lessonId);
  const db = await createUserClient();
  const [r, order] = await Promise.all([
    db.from("lesson_postits").select(COLS).eq("lesson_id", id).eq("status", "ativo").order("created_at"),
    sectionOrder(id),
  ]);
  if (r.error) throw new Error(`carregar post-its: ${r.error.message}`);
  return sortInLessonOrder((r.data ?? []) as Row[], order).map(toPostit);
}

function sortInLessonOrder(rows: Row[], order: Map<string, number>): Row[] {
  const pos = (r: Row) => (r.section_id ? order.get(r.section_id) ?? 9999 : 9999);
  return [...rows].sort((a, b) => pos(a) - pos(b) || a.quote_start - b.quote_start || a.created_at.localeCompare(b.created_at));
}

/** Cria um post-it. O trecho é conferido contra o texto real da aula do próprio aluno. */
export async function createPostit(userId: string, input: CreatePostitInput): Promise<{ postit: Postit; duplicate: boolean }> {
  const p = createSchema.parse(input);
  await enforceRateLimit(userId, "postit_create", 40, 60);
  const quote = cleanPostitText(p.quote);
  const note = cleanPostitText(p.note);
  if (quote.length < POSTIT_QUOTE_MIN) throw new UserFacingError("Selecione um trecho do texto da aula.", "invalid");
  if (quote.length > POSTIT_QUOTE_MAX) throw new UserFacingError(`Selecione um trecho menor (até ${POSTIT_QUOTE_MAX} caracteres).`, "too_long");
  if (note.length > POSTIT_NOTE_MAX) throw new UserFacingError(`A anotação pode ter até ${POSTIT_NOTE_MAX} caracteres.`, "too_long");

  const db = await createUserClient();
  const [lessonR, secR] = await Promise.all([
    db.from("lessons").select("id, trail_id, study_trails(discipline_mode)").eq("id", p.lessonId).maybeSingle(),
    db.from("lesson_sections").select("id, title, body_markdown").eq("lesson_id", p.lessonId).order("sort_order"),
  ]);
  const lesson = lessonR.data as unknown as { id: string; trail_id: string; study_trails: { discipline_mode: string | null } | null } | null;
  if (!lesson) throw new UserFacingError("Aula não encontrada.", "not_found");
  const sections: QuoteSection[] = ((secR.data ?? []) as Array<{ id: string; title: string; body_markdown: string }>).map((s) => ({
    id: s.id, title: s.title, bodies: [s.body_markdown, practiceToMarkdown(s.body_markdown)],
  }));
  const sec = findQuoteSection(quote, sections, p.sectionId ?? null);
  if (!sec) throw new UserFacingError("Esse trecho não foi encontrado no texto desta aula. Selecione o texto diretamente na leitura.", "invalid");

  const ins = await db
    .from("lesson_postits")
    .insert({
      lesson_id: lesson.id, trail_id: lesson.trail_id, subject_key: lesson.study_trails?.discipline_mode ?? null,
      section_id: sec.id, section_title: sec.title.slice(0, 200), quote, quote_start: p.quoteStart, note,
    })
    .select(COLS)
    .single();
  if (ins.error) {
    if (ins.error.code === "23505") {
      // Mesmo trecho no mesmo lugar: devolve o post-it que já existe, sem duplicar.
      const ex = await db
        .from("lesson_postits").select(COLS)
        .eq("lesson_id", lesson.id).eq("section_id", sec.id).eq("quote", quote).eq("quote_start", p.quoteStart).eq("status", "ativo")
        .limit(1).maybeSingle();
      if (ex.data) return { postit: toPostit(ex.data as Row), duplicate: true };
    }
    await logEvent("postit.create_failed", { lessonId: lesson.id, error: ins.error.message });
    throw new Error(`criar post-it: ${ins.error.message}`);
  }
  return { postit: toPostit(ins.data as Row), duplicate: false };
}

export async function updatePostitNote(userId: string, idIn: string, noteIn: string): Promise<Postit> {
  const id = z.uuid().parse(idIn);
  const note = cleanPostitText(z.string().max(POSTIT_NOTE_MAX * 2).parse(noteIn));
  if (note.length > POSTIT_NOTE_MAX) throw new UserFacingError(`A anotação pode ter até ${POSTIT_NOTE_MAX} caracteres.`, "too_long");
  await enforceRateLimit(userId, "postit_edit", 120, 60);
  const db = await createUserClient();
  const r = await db.from("lesson_postits").update({ note }).eq("id", id).eq("user_id", userId).eq("status", "ativo").select(COLS);
  if (r.error) throw new Error(`salvar anotação: ${r.error.message}`);
  const row = (r.data ?? [])[0] as Row | undefined;
  if (!row) throw new UserFacingError("Post-it não encontrado.", "not_found");
  return toPostit(row);
}

/** Exclusão lógica: o post-it sai dos próximos PDFs; o texto da aula nunca é tocado. */
export async function deletePostit(userId: string, idIn: string): Promise<{ lessonId: string }> {
  const id = z.uuid().parse(idIn);
  await enforceRateLimit(userId, "postit_delete", 60, 60);
  const db = await createUserClient();
  const r = await db.from("lesson_postits").update({ status: "excluido" }).eq("id", id).eq("user_id", userId).eq("status", "ativo").select("lesson_id");
  if (r.error) throw new Error(`excluir post-it: ${r.error.message}`);
  const row = (r.data ?? [])[0] as { lesson_id: string } | undefined;
  if (!row) throw new UserFacingError("Post-it não encontrado.", "not_found");
  return { lessonId: row.lesson_id };
}

function hashOf(s: PostitPdfSnapshot): string {
  // O instante de geração não entra: o mesmo conteúdo gera o mesmo hash.
  const { generatedAt: _g, ...rest } = s;
  void _g;
  return createHash("sha256").update(JSON.stringify(rest)).digest("hex");
}

export async function listPostitPdfs(lessonId: string): Promise<PostitPdfInfo[]> {
  const id = z.uuid().parse(lessonId);
  const db = await createUserClient();
  const r = await db.from("postit_pdfs").select("id, pdf_version, created_at, snapshot").eq("lesson_id", id).order("pdf_version", { ascending: false }).limit(50);
  if (r.error) throw new Error(`carregar PDFs de revisão: ${r.error.message}`);
  return ((r.data ?? []) as unknown as Array<{ id: string; pdf_version: number; created_at: string; snapshot: PostitPdfSnapshot }>).map((p) => ({
    id: p.id, pdfVersion: p.pdf_version, createdAt: p.created_at, items: p.snapshot?.items?.length ?? 0,
  }));
}

/**
 * Gera o "Meu PDF de Revisão": só post-its ativos desta aula, na ordem da aula, sem alterar
 * nenhuma palavra. Cada geração é uma versão nova; se nada mudou desde a última, devolve a
 * versão existente em vez de duplicar.
 */
export async function createPostitPdf(userId: string, lessonIdIn: string): Promise<{ id: string; pdfVersion: number; reused: boolean }> {
  const lessonId = z.uuid().parse(lessonIdIn);
  await enforceRateLimit(userId, "postit_pdf", 6, 60);
  const user = await createUserClient();
  const lessonR = await user
    .from("lessons")
    .select("id, title, study_trails(title, scope_summary, discipline_mode)")
    .eq("id", lessonId)
    .maybeSingle();
  const lesson = lessonR.data as unknown as {
    id: string; title: string;
    study_trails: { title: string; scope_summary: { subject?: string | null } | null; discipline_mode: string | null } | null;
  } | null;
  if (!lesson) throw new UserFacingError("Aula não encontrada.", "not_found");

  const postits = await listPostits(lessonId);
  if (!postits.length) throw new UserFacingError("Você ainda não tem post-its ativos nesta aula. Marque trechos da leitura para montar o seu PDF.", "empty");

  const admin = createAdminClient();
  const prof = await admin.from("profiles").select("display_name").eq("id", userId).maybeSingle();
  const trail = lesson.study_trails;
  const subject = trail?.scope_summary?.subject ?? (trail?.discipline_mode && trail.discipline_mode !== "outra" ? disciplineLabel(trail.discipline_mode) ?? null : null);
  const snapshot: PostitPdfSnapshot = {
    schema: 1,
    generatedAt: new Date().toISOString(),
    student: { name: (prof.data?.display_name as string | null | undefined) ?? null },
    lesson: { id: lesson.id, title: lesson.title, subject: subject ?? null, trailTitle: trail?.title ?? null },
    items: postits.map((p, i) => ({ n: i + 1, sectionTitle: p.sectionTitle, quote: p.quote, note: p.note, createdAt: p.createdAt })),
  };
  const hash = hashOf(snapshot);

  for (let attempt = 0; attempt < 4; attempt++) {
    const last = await admin.from("postit_pdfs").select("id, pdf_version, content_hash").eq("lesson_id", lessonId).eq("user_id", userId).order("pdf_version", { ascending: false }).limit(1).maybeSingle();
    const lastRow = last.data as { id: string; pdf_version: number; content_hash: string } | null;
    if (lastRow && lastRow.content_hash === hash) return { id: lastRow.id, pdfVersion: lastRow.pdf_version, reused: true };
    const version = (lastRow?.pdf_version ?? 0) + 1;
    const ins = await admin.from("postit_pdfs").insert({ user_id: userId, lesson_id: lessonId, pdf_version: version, snapshot, content_hash: hash }).select("id, pdf_version").single();
    if (ins.error) {
      if (ins.error.code === "23505") continue; // outra geração simultânea ocupou a versão: tenta a próxima
      throw new Error(`gravar PDF de revisão: ${ins.error.message}`);
    }
    const out = ins.data as { id: string; pdf_version: number };
    await auditLog(admin, { actorId: userId, userId, action: "postit_pdf.created", entity: "postit_pdfs", entityId: out.id, meta: { lessonId, version: out.pdf_version, items: snapshot.items.length } });
    return { id: out.id, pdfVersion: out.pdf_version, reused: false };
  }
  throw new Error("gravar PDF de revisão: conflito de versão");
}
