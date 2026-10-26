"use client";

import { AddVisualsPanel } from "@/app/admin/catalogo/[id]/add-visuals";
import { applyEnrichment, buildEnrichPrompt, enrichStatus, parseEnrichment, type EnrichLesson } from "@/domain/catalog/enrich";

const LESSON: EnrichLesson = {
  sections: [
    { kind: "explicacao", title: "Equações do 2º grau: discriminante", bodyMarkdown: "Δ = b² − 4ac decide as raízes.", nodeKeys: ["N0001"], module: "Equações" },
    { kind: "resumo", title: "Resumo para revisão", bodyMarkdown: "| Pergunta | Resposta |\n|---|---|\n| Δ < 0? | Sem raiz real |", nodeKeys: ["N0001"], module: "Revisão final" },
  ],
};

/** Exemplos visuais e flashcards na galeria: leitura real do texto colado; nada é gravado. */
export function DemoAddVisuals() {
  return (
    <AddVisualsPanel
      topicId="exemplo"
      status={enrichStatus(LESSON)}
      prompt={buildEnrichPrompt("Equações do 1º e 2º graus", LESSON)}
      actions={{
        preview: async (_id, text) => {
          const p = parseEnrichment(text, LESSON);
          const st = enrichStatus(applyEnrichment(LESSON, p));
          return { ok: true, preview: { ok: p.errors.length === 0 && (p.examples.length > 0 || !!p.flashcards), errors: p.errors, warnings: p.warnings, examples: p.examples.map((e) => e.title), flashcards: p.flashcards ? p.flashCount : 0, after: { withExample: st.withExample, teaching: st.teaching, flashcards: st.flashcards } } };
        },
        apply: async () => ({ ok: true, message: "Galeria: blocos conferidos (nada é gravado)." }),
      }}
    />
  );
}
