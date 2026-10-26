"use client";

import { AddQuestionsPanel } from "@/app/admin/catalogo/[id]/add-questions";
import { extractStructure } from "@/domain/content/extract";
import { normalizeContent } from "@/domain/content/normalize";
import { parseQuestionsForTopic } from "@/domain/catalog/upload";
import { buildQuestionsPrompt } from "@/domain/catalog/export";

const SOURCE = "Art. 155 - Subtrair, para si ou para outrem, coisa alheia móvel:\n§ 1º A pena aumenta-se de um terço, se o crime é praticado durante o repouso noturno.\n1 Tipo penal\n2 Furto noturno";

/** Completar questões na galeria: leitura real das questões coladas; nada é gravado. */
export function DemoAddQuestions() {
  const nodes = extractStructure(normalizeContent(SOURCE).normalized).nodes;
  const counts = { facil: 10, medio: 4, dificil: 0 };
  return (
    <AddQuestionsPanel
      topicId="exemplo"
      counts={counts}
      prompt={buildQuestionsPrompt({ title: "Furto (CP, art. 155)", sourceText: SOURCE, need: { facil: 2, medio: 8, dificil: 12 } })}
      actions={{
        preview: async (_id, text) => {
          const r = parseQuestionsForTopic(text, nodes, ["155"]);
          const adding = { facil: 0, medio: 0, dificil: 0 };
          for (const q of r.questions) adding[q.level]++;
          const after = { facil: counts.facil + adding.facil, medio: counts.medio + adding.medio, dificil: counts.dificil + adding.dificil };
          return { ok: true, preview: { ok: r.errors.length === 0 && r.questions.length > 0, errors: r.errors, warnings: r.warnings, adding, after, willPublish: false } };
        },
        add: async () => ({ ok: true, message: "Galeria: questões conferidas (nada é gravado)." }),
      }}
    />
  );
}
