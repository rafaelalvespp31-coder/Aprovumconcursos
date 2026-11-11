import "server-only";
import { BULK_MAX_LESSONS, splitLessons, type BulkChunk } from "@/domain/catalog/bulk";
import type { LessonUploadPreview } from "@/domain/catalog/upload-preview";
import { importLessonUpload, previewLessonUpload } from "./catalog-upload";
import type { SessionUser } from "../auth";
import { UserFacingError } from "./trails";

const MIN_PER_LEVEL = 10;

export interface BulkItem {
  index: number;
  line: number;
  title: string;
  group: string | null;
  ok: boolean;
  errors: string[];
  warnings: string[];
  questions: LessonUploadPreview["questions"] | null;
  /** Vai ao ar na hora (>= 10 questões por nível); senão entra como rascunho. */
  willPublish: boolean;
  /** Já existe no catálogo: esta versão atualiza a aula. */
  updates: { title: string; status: string } | null;
}

export interface BulkPreview {
  items: BulkItem[];
  total: number;
  ready: number;
  blocked: number;
  willPublish: number;
}

function publishable(p: LessonUploadPreview): boolean {
  return p.ok && p.items > 0 && (["facil", "medio", "dificil"] as const).every((lv) => p.questions[lv] >= MIN_PER_LEVEL);
}

function chunksOf(text: string): BulkChunk[] {
  const chunks = splitLessons(text);
  if (!chunks.length) throw new UserFacingError("O arquivo está vazio.", "invalid_input");
  if (chunks.length > BULK_MAX_LESSONS) throw new UserFacingError(`O arquivo tem ${chunks.length} aulas; o máximo é ${BULK_MAX_LESSONS} por envio. Divida em dois arquivos.`, "invalid_input");
  return chunks;
}

/** Confere cada aula do arquivo, sem gravar nada. */
export async function previewBulkUpload(text: string): Promise<BulkPreview> {
  const chunks = chunksOf(text);
  const items: BulkItem[] = [];
  const seen = new Map<string, number>();
  for (const c of chunks) {
    try {
      const p = await previewLessonUpload(c.text);
      const errors = [...p.errors];
      const key = p.group ? `g:${p.group.toLowerCase()}|${p.title.toLowerCase()}` : `s:${p.slug}`;
      if (seen.has(key)) errors.push(`Repetida no arquivo: é a mesma aula da posição ${seen.get(key)} (mesmo tópico, subtópico e título). Apague uma das duas.`);
      else seen.set(key, c.index);
      items.push({
        index: c.index, line: c.line, title: p.title || `Aula ${c.index}`, group: p.group, ok: errors.length === 0, errors, warnings: p.warnings,
        questions: p.questions, willPublish: errors.length === 0 && publishable(p), updates: p.existing ? { title: p.existing.title, status: p.existing.status } : null,
      });
    } catch (e) {
      items.push({ index: c.index, line: c.line, title: `Aula ${c.index}`, group: null, ok: false, errors: [e instanceof Error ? e.message : "Não foi possível ler esta aula."], warnings: [], questions: null, willPublish: false, updates: null });
    }
  }
  const ready = items.filter((i) => i.ok).length;
  return { items, total: items.length, ready, blocked: items.length - ready, willPublish: items.filter((i) => i.willPublish).length };
}

export interface BulkResultItem {
  index: number;
  title: string;
  status: "publicada" | "rascunho" | "atualizada" | "falhou" | "ignorada";
  id: string | null;
  message: string | null;
}

export interface BulkResult {
  items: BulkResultItem[];
  published: number;
  drafts: number;
  failed: number;
}

/**
 * Catalogamos cada aula do arquivo (a mesma regra da aula avulsa: publica na hora com >= 10 questões por nível,
 * senão fica em rascunho; o mesmo subtópico atualiza a aula existente, nunca duplica). Uma aula com problema
 * não impede as outras: o resultado diz o que entrou e o que não.
 */
export async function importBulkUpload(user: SessionUser, text: string, fileName: string): Promise<BulkResult> {
  const chunks = chunksOf(text);
  const pre = await previewBulkUpload(text);
  const items: BulkResultItem[] = [];
  for (const c of chunks) {
    const it = pre.items.find((x) => x.index === c.index)!;
    if (!it.ok) { items.push({ index: c.index, title: it.title, status: "ignorada", id: null, message: it.errors[0] ?? "Com erro." }); continue; }
    try {
      const r = await importLessonUpload(user, c.text, `${fileName} (aula ${c.index})`);
      items.push({ index: c.index, title: it.title, status: r.published ? "publicada" : "rascunho", id: r.id, message: r.published ? null : r.blockers.join("; ") || null });
    } catch (e) {
      items.push({ index: c.index, title: it.title, status: "falhou", id: null, message: e instanceof UserFacingError ? e.message : "Não foi possível salvar esta aula." });
    }
  }
  return { items, published: items.filter((i) => i.status === "publicada").length, drafts: items.filter((i) => i.status === "rascunho").length, failed: items.filter((i) => i.status === "falhou" || i.status === "ignorada").length };
}
