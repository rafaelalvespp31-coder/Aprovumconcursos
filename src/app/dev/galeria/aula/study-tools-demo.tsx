"use client";

import { StudyTools, type StudyApi } from "@/components/aula/study-tools";
import { SelectionExplainer } from "@/components/aula/selection-explainer";

/** Galeria: mesmas telas da barra de estudo, com um "servidor" em memória (nada é gravado). */
const mem: { id: string; sectionId: string | null; sectionTitle: string | null; quote: string; quoteStart: number; note: string; explanation: string; createdAt: string }[] = [];
const pdfs: { id: string; pdfVersion: number; createdAt: string; items: number }[] = [];
let lastHash = "";
const explained = new Map<string, string>();
const key = (t: string) => t.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");

const demoApi: StudyApi = {
  async create(input) {
    const quote = input.quote.trim();
    const dup = mem.find((m) => m.sectionId === (input.sectionId ?? null) && m.quote === quote && m.quoteStart === (input.quoteStart ?? 0));
    if (dup) return { ok: true, postit: { ...dup, lessonId: input.lessonId, updatedAt: dup.createdAt }, duplicate: true };
    if (quote.length < 2) return { ok: false, error: "Selecione um trecho do texto da aula." };
    const row = { id: crypto.randomUUID(), sectionId: input.sectionId ?? null, sectionTitle: "Seção de exemplo", quote, quoteStart: input.quoteStart ?? 0, note: input.note ?? "", explanation: explained.get(key(quote)) ?? "", createdAt: new Date().toISOString() };
    mem.push(row);
    return { ok: true, postit: { ...row, lessonId: input.lessonId, updatedAt: row.createdAt }, duplicate: false };
  },
  async updateNote(id, note) {
    const m = mem.find((x) => x.id === id);
    if (!m) return { ok: false, error: "Post-it não encontrado." };
    m.note = note.trim();
    return { ok: true, postit: { ...m } };
  },
  async remove(id) {
    const i = mem.findIndex((x) => x.id === id);
    if (i < 0) return { ok: false, error: "Post-it não encontrado." };
    mem.splice(i, 1);
    return { ok: true, deleted: true as const };
  },
  async removePdf(id: string) {
    const i = pdfs.findIndex((x) => x.id === id);
    if (i < 0) return { ok: false, error: "PDF não encontrado." };
    pdfs.splice(i, 1);
    return { ok: true, pdfs: [...pdfs] };
  },
  async generatePdf() {
    if (!mem.length) return { ok: false, error: "Você ainda não tem post-its ativos nesta aula." };
    const hash = JSON.stringify(mem.map((m) => [m.quote, m.note]));
    const reused = hash === lastHash && pdfs.length > 0;
    if (!reused) {
      pdfs.unshift({ id: crypto.randomUUID(), pdfVersion: pdfs.length + 1, createdAt: new Date().toISOString(), items: mem.length });
      lastHash = hash;
    }
    const cur = reused ? pdfs[0]! : pdfs[0]!;
    return { ok: true, id: cur.id, pdfVersion: cur.pdfVersion, reused, pdfs: [...pdfs] };
  },
};

export function StudyToolsDemo({ lessonId, lessonTitle, sectionOrder }: { lessonId: string; lessonTitle: string; sectionOrder: string[] }) {
  return (
    <>
      <SelectionExplainer lessonId={lessonId} explain={async ({ selection }) => {
        const meaning = "Explicação de exemplo (galeria): o significado do trecho no contexto da aula.";
        explained.set(key(selection), meaning);
        for (const m of mem) if (key(m.quote) === key(selection)) m.explanation = meaning;
        return { ok: true as const, meaning };
      }} />
      <StudyTools lessonId={lessonId} lessonTitle={lessonTitle} subject="Direito Administrativo" sectionOrder={sectionOrder} initialPostits={[]} initialPdfs={[]} api={demoApi} />
    </>
  );
}
