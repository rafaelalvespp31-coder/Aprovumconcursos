"use client";

import { OutlineForm } from "@/app/admin/catalogo/plano/outline-form";
import { parseOutline } from "@/domain/catalog/topic-group";
import {
  SavedOutlines,
  type SavedOutline,
} from "@/app/admin/catalogo/plano/saved-outlines";

const SAMPLE =
  "1. Aplicação da lei penal\n1.1 Princípio da legalidade\n1.2 Lei penal no tempo\n2. Crime\n2.1 Fato típico";
/** Planos salvos de exemplo, de matérias diferentes e fora de ordem. */
const SAVED: SavedOutline[] = [
  { id: "p1", title: "Penal — Parte Especial", disciplineMode: "direito_penal", sourceText: SAMPLE, totals: { subtopics: 3, publicado: 2, rascunho: 1, faltam: 1 } },
  { id: "p2", title: "Constitucional — Direitos fundamentais", disciplineMode: "direito_constitucional", sourceText: SAMPLE, totals: { subtopics: 3, publicado: 0, rascunho: 0, faltam: 3 } },
  { id: "p3", title: "Penal — Parte Geral", disciplineMode: "direito_penal", sourceText: SAMPLE, totals: { subtopics: 3, publicado: 3, rascunho: 0, faltam: 0 } },
  { id: "p4", title: "Português — Gramática", disciplineMode: "lingua_portuguesa", sourceText: SAMPLE, totals: { subtopics: 3, publicado: 1, rascunho: 0, faltam: 2 } },
  { id: "p5", title: "Plano antigo", disciplineMode: "materia_removida", sourceText: SAMPLE, totals: { subtopics: 3, publicado: 0, rascunho: 2, faltam: 3 } },
];

/** Prévia do plano de tópicos: monta a árvore ao vivo, mas não grava nada. */
export function DemoOutline() {
  return (
    <>
      <SavedOutlines outlines={SAVED} base="/dev/galeria/catalogo/plano" />
      <section className="rounded-lg border border-linha p-5">
        <h2 className="t-h2">Plano de tópicos (prévia)</h2>
        <div className="mt-3">
          <OutlineForm
            submitLabel="Salvar plano"
            submit={async (d) =>
              parseOutline(d.text).groups.length
                ? { ok: true, message: "Prévia: nada foi gravado." }
                : { ok: false, error: "Sem tópicos." }
            }
          />
        </div>
      </section>
    </>
  );
}
