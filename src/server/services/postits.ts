import "server-only";
import { createHash } from "node:crypto";
import { z } from "zod";
import { createAdminClient, createUserClient } from "../supabase";
import { UserFacingError, enforceRateLimit } from "./trails";
import { auditLog, logEvent } from "../observability";
import { practiceToMarkdown } from "@/domain/content/practice";
import { POSTIT_NOTE_MAX, POSTIT_QUOTE_MAX, POSTIT_QUOTE_MIN, cleanPostitText, findQuoteSection, type QuoteSection } from "@/domain/study/postit-quote";
import { disciplineLabel } from "@/ai/pedagogy";
import { explainCacheKey } from "@/domain/study/explain-cache";
import { matchKey } from "@/domain/study/postit-quote";
import { hasBullets, wantsItemized } from "@/domain/study/explanation-format";
import { isRichStructure, sanitizeStructure, structureMatchesQuote, type QuoteBlock } from "@/domain/study/postit-structure";
import { getAIProvider, aiEnabled } from "@/ai";
import { explainSelection } from "@/ai/services";
import type { PostitPdfSnapshot } from "../pdf/postit-types";

export interface Postit {
  id: string;
  lessonId: string;
  sectionId: string | null;
  sectionTitle: string | null;
  quote: string;
  /** Estrutura do trecho (tabela, lista…) igual à da leitura; null = texto corrido. */
  structure: QuoteBlock[] | null;
  quoteStart: number;
  note: string;
  /** Explicação (modo Explicar) deste trecho, quando o aluno pediu. */
  explanation: string;
  createdAt: string;
  updatedAt: string;
}
export interface PostitPdfInfo {
  id: string;
  pdfVersion: number;
  createdAt: string;
  items: number;
}

const COLS = "id, lesson_id, section_id, section_title, quote, quote_structure, quote_start, note, explanation, created_at, updated_at";
type Row = { id: string; lesson_id: string; section_id: string | null; section_title: string | null; quote: string; quote_structure: unknown; quote_start: number; note: string; explanation: string | null; created_at: string; updated_at: string };
const toPostit = (r: Row): Postit => ({
  id: r.id, lessonId: r.lesson_id, sectionId: r.section_id, sectionTitle: r.section_title, quote: r.quote, structure: sanitizeStructure(r.quote_structure),
  quoteStart: r.quote_start, note: r.note, explanation: r.explanation ?? "", createdAt: r.created_at, updatedAt: r.updated_at,
});

const createSchema = z.object({
  lessonId: z.uuid(),
  sectionId: z.uuid().nullish(),
  quote: z.string().min(1).max(POSTIT_QUOTE_MAX * 2),
  quoteStart: z.number().int().min(0).max(1_000_000).default(0),
  note: z.string().max(POSTIT_NOTE_MAX * 2).default(""),
  around: z.string().max(2000).optional(),
  structure: z.unknown().optional(),
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
  if (quote.length > POSTIT_QUOTE_MAX) throw new UserFacingError(`Trecho grande demais.`, "too_long");
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

  // Estrutura (tabela, lista…): só vale se o texto dela é o mesmo do trecho.
  const rich = sanitizeStructure(p.structure);
  const structure = rich && isRichStructure(rich) && structureMatchesQuote(rich, quote) ? rich : null;
  const ins = await db
    .from("lesson_postits")
    .insert({
      lesson_id: lesson.id, trail_id: lesson.trail_id, subject_key: lesson.study_trails?.discipline_mode ?? null,
      section_id: sec.id, section_title: sec.title.slice(0, 200), quote, quote_start: p.quoteStart, note, quote_structure: structure,
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
  const created = toPostit(ins.data as Row);
  // Extra opcional: se falhar, o post-it já está salvo e a criação não pode falhar por causa disso.
  try {
    const expl = await cachedExplanation(quote, p.around ?? "");
    if (expl) {
      const up = await createAdminClient().from("lesson_postits").update({ explanation: expl }).eq("id", created.id).eq("user_id", userId);
      if (!up.error) created.explanation = expl;
    }
  } catch (e) {
    await logEvent("postit.explanation_skipped", { error: (e as Error).message });
  }
  return { postit: created, duplicate: false };
}

/** Explicação já gerada para este trecho (cache do modo Explicar): sem nova chamada de IA. */
async function cachedExplanation(quote: string, around: string): Promise<string> {
  const admin = createAdminClient();
  const flat = quote.replace(/\s+/g, " ").trim();
  const byKey = await admin.from("selection_explanations").select("meaning").eq("key", explainCacheKey(flat, around)).maybeSingle();
  if (byKey.data?.meaning) return String(byKey.data.meaning).slice(0, 3500);
  const bySel = await admin.from("selection_explanations").select("meaning").eq("selection", flat.slice(0, 600)).limit(1).maybeSingle();
  return bySel.data?.meaning ? String(bySel.data.meaning).slice(0, 3500) : "";
}

/**
 * Todo post-it vai ao PDF com a explicação do trecho. Os que ainda não têm (o aluno só marcou o texto) são
 * explicados agora, com a mesma IA e o mesmo cache do modo Explicar. Falha de IA não impede o PDF.
 */
async function ensureExplanations(userId: string, lessonId: string, lessonTitle: string, list: Postit[]): Promise<Postit[]> {
  const missing = list.filter((p) => !p.explanation || (wantsItemized(p.quote) && !hasBullets(p.explanation))).slice(0, 12);
  if (!missing.length) return list;
  const admin = createAdminClient();
  const secs = await admin.from("lesson_sections").select("id, body_markdown").eq("lesson_id", lessonId);
  const bodies = new Map(((secs.data ?? []) as Array<{ id: string; body_markdown: string }>).map((s) => [s.id, s.body_markdown]));
  const around = (p: Postit) => {
    const body = (p.sectionId && bodies.get(p.sectionId)) || "";
    const at = body.toLowerCase().indexOf(p.quote.slice(0, 40).toLowerCase());
    return at < 0 ? "" : body.slice(Math.max(0, at - 400), at + p.quote.length + 400);
  };
  const got = new Map<string, string>();
  await Promise.all(missing.map(async (p) => {
    try {
      const ctx = around(p);
      let meaning = p.explanation ? "" : await cachedExplanation(p.quote, ctx); // já tem texto corrido de vários itens: refaz em tópicos
      if (!meaning && aiEnabled("estudos")) {
        meaning = await explainSelection(getAIProvider("estudos"), { lessonTitle, selection: p.quote.slice(0, 4000), around: ctx });
        const flat = p.quote.replace(/\s+/g, " ").trim();
        await admin.from("selection_explanations").upsert({ key: explainCacheKey(flat, ctx), selection: flat.slice(0, 600), meaning: meaning.slice(0, 2500) }, { onConflict: "key" }).then(() => undefined, () => undefined);
      }
      meaning = meaning.slice(0, 3500);
      if (!meaning) return;
      const up = await admin.from("lesson_postits").update({ explanation: meaning }).eq("id", p.id).eq("user_id", userId);
      if (!up.error) got.set(p.id, meaning);
    } catch {
      /* sem explicação: o post-it segue no PDF só com o trecho e a anotação */
    }
  }));
  return list.map((p) => (got.has(p.id) ? { ...p, explanation: got.get(p.id)! } : p));
}

/** Chamado pelo modo Explicar: guarda a explicação nos post-its ativos do mesmo trecho nesta aula. */
export async function attachExplanation(userId: string, lessonId: string, selection: string, meaning: string): Promise<string[]> {
  const key = matchKey(selection);
  if (key.length < 2 || !meaning) return [];
  const admin = createAdminClient();
  const r = await admin.from("lesson_postits").select("id, quote").eq("user_id", userId).eq("lesson_id", lessonId).eq("status", "ativo");
  const ids = ((r.data ?? []) as Array<{ id: string; quote: string }>).filter((x) => matchKey(x.quote) === key).map((x) => x.id);
  if (!ids.length) return [];
  await admin.from("lesson_postits").update({ explanation: meaning.slice(0, 3500) }).in("id", ids).eq("user_id", userId);
  return ids;
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

/** Exclui uma versão do PDF de revisão do próprio aluno (os post-its não são afetados). */
export async function deletePostitPdf(userId: string, idIn: string): Promise<void> {
  const id = z.uuid().parse(idIn);
  await enforceRateLimit(userId, "postit_pdf_delete", 30, 60);
  const admin = createAdminClient();
  const r = await admin.from("postit_pdfs").delete().eq("id", id).eq("user_id", userId).select("id, lesson_id");
  if (r.error) throw new Error(`excluir PDF de revisão: ${r.error.message}`);
  if (!(r.data ?? []).length) throw new UserFacingError("PDF não encontrado.", "not_found");
  await auditLog(admin, { actorId: userId, userId, action: "postit_pdf.deleted", entity: "postit_pdfs", entityId: id, meta: { lessonId: (r.data![0] as { lesson_id: string }).lesson_id } });
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

  let postits = await listPostits(lessonId);
  if (!postits.length) throw new UserFacingError("Você ainda não tem post-its ativos nesta aula. Marque trechos da leitura para montar o seu PDF.", "empty");
  postits = await ensureExplanations(userId, lesson.id, lesson.title, postits);

  const admin = createAdminClient();
  const prof = await admin.from("profiles").select("display_name").eq("id", userId).maybeSingle();
  const trail = lesson.study_trails;
  const subject = trail?.scope_summary?.subject ?? (trail?.discipline_mode && trail.discipline_mode !== "outra" ? disciplineLabel(trail.discipline_mode) ?? null : null);
  const snapshot: PostitPdfSnapshot = {
    schema: 1,
    generatedAt: new Date().toISOString(),
    student: { name: (prof.data?.display_name as string | null | undefined) ?? null },
    lesson: { id: lesson.id, title: lesson.title, subject: subject ?? null, trailTitle: trail?.title ?? null },
    items: postits.map((p, i) => ({ n: i + 1, sectionTitle: p.sectionTitle, quote: p.quote, ...(p.structure ? { structure: p.structure } : {}), note: p.note, explanation: p.explanation, createdAt: p.createdAt })),
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
