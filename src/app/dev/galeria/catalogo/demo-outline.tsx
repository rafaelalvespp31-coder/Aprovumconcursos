"use client";

import { OutlineForm } from "@/app/admin/catalogo/plano/outline-form";
import { parseOutline } from "@/domain/catalog/topic-group";
import {
  SavedOutlines,
  type SavedOutline,
} from "@/app/admin/catalogo/plano/saved-outlines";
import { SubtopicCommands } from "@/app/admin/catalogo/plano/[id]/plan-tools";

const BIG_GROUP = { code: "2", title: "Conceitos e Modos de Utilização de Tecnologias, Ferramentas, Aplicativos e Procedimentos Associados à Internet/Intranet" };
const BIG_SUB = { code: "2.1", title: "Ferramentas e Aplicativos Comerciais de Navegação", items: Array.from({ length: 19 }, (_, i) => ({ code: `2.1.${i + 1}`, title: `Item ${i + 1} do edital` })) };
const SMALL_SUB = { code: "2.2", title: "Noções de Sistema Operacional", items: Array.from({ length: 4 }, (_, i) => ({ code: `2.2.${i + 1}`, title: `Item ${i + 1}` })) };

const SAMPLE =
  "1. Aplicação da lei penal\n1.1 Princípio da legalidade\n1.2 Lei penal no tempo\n2. Crime\n2.1 Fato típico";
/** Planos salvos de exemplo, de matérias diferentes e fora de ordem. */
const SAVED: SavedOutline[] = [
  {
    id: "p1",
    title: "Penal — Parte Especial",
    disciplineMode: "direito_penal",
    sourceText: SAMPLE,
    totals: {
      subtopics: 3,
      publicado: 2,
      rascunho: 1,
      faltam: 1,
      duplicados: 1,
    },
  },
  {
    id: "p2",
    title: "Constitucional — Direitos fundamentais",
    disciplineMode: "direito_constitucional",
    sourceText: SAMPLE,
    totals: { subtopics: 3, publicado: 0, rascunho: 0, faltam: 3 },
  },
  {
    id: "p3",
    title: "Penal — Parte Geral",
    disciplineMode: "direito_penal",
    sourceText: SAMPLE,
    totals: { subtopics: 3, publicado: 3, rascunho: 0, faltam: 0 },
  },
  {
    id: "p4",
    title: "Português — Gramática",
    disciplineMode: "lingua_portuguesa",
    sourceText: SAMPLE,
    totals: { subtopics: 3, publicado: 1, rascunho: 0, faltam: 2 },
  },
  {
    id: "p5",
    title: "Plano antigo",
    disciplineMode: "materia_removida",
    sourceText: SAMPLE,
    totals: { subtopics: 3, publicado: 0, rascunho: 2, faltam: 3 },
  },
];

/** Prévia do plano de tópicos: monta a árvore ao vivo, mas não grava nada. */
export function DemoOutline() {
  return (
    <>
      <SavedOutlines outlines={SAVED} base="/dev/galeria/catalogo/plano" />
      <section
        className="rounded-lg border border-linha p-5"
        data-testid="demo-comandos"
      >
        <h2 className="t-h2">Comandos do subtópico (prévia)</h2>
        <div className="mt-3 flex flex-col gap-3">
          <div data-testid="sub-grande">
            <p className="font-semibold">2.1 (19 itens)</p>
            <SubtopicCommands
              disciplineMode="informatica"
              group={BIG_GROUP}
              sub={BIG_SUB}
            />
          </div>
          <div data-testid="sub-pequeno">
            <p className="font-semibold">2.2 (4 itens)</p>
            <SubtopicCommands
              disciplineMode="informatica"
              group={BIG_GROUP}
              sub={SMALL_SUB}
            />
          </div>
        </div>
      </section>
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
