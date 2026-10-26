import { normalizeContent } from "@/domain/content/normalize";
import { extractStructure } from "@/domain/content/extract";
import type { CatalogQuestion } from "@/domain/catalog/compose";
import { publishBlockers, type TopicRow } from "@/server/services/catalog";
import { PublishPanel, QuestionsEditor, SectionsEditor } from "@/app/admin/catalogo/[id]/editor";
import { DemoLessonUpload } from "./demo-upload";
import { DemoAddQuestions } from "./demo-add-questions";
import { DemoAddVisuals } from "./demo-add-visuals";

/** Prévia do editor do catálogo (área da equipe) com dados de EXEMPLO. Os botões não gravam aqui. */
export default function Page() {
  const source = normalizeContent("Art. 121. Matar alguém:\nPena - reclusão, de seis a vinte anos.\n§ 1º Se o agente comete o crime impelido por motivo de relevante valor social;").normalized;
  const nodes = extractStructure(source).nodes;
  const keys = nodes.filter((n) => n.requiresDirectCoverage).map((n) => n.key);
  const topic = {
    nodes,
    lesson: { title: "Homicídio", objective: "Dominar o art. 121", sections: [{ kind: "explicacao", title: "Explicação", bodyMarkdown: "**Homicídio simples**: matar alguém.", nodeKeys: keys, module: "1. Base do tema" }], taughtNodeKeys: keys, references: [], unverifiedClaims: [], verificationPending: false },
  } as unknown as TopicRow;
  const questions: CatalogQuestion[] = Array.from({ length: 4 }, (_, i) => ({
    id: `00000000-0000-4000-8000-00000000f00${i}`, level: "facil", type: "certo_errado", statement: `Questão de exemplo ${i + 1} sobre homicídio simples.`, options: [], correctAnswerTrue: true,
    justification: "Justificativa de exemplo.", nodeKey: keys[0]!, difficulty: 1, essential: i === 0, dependsOnExternalSource: false,
  }));
  return (
    <div className="flex flex-col gap-8">
      <h1 className="t-h1">Editor do catálogo (prévia)</h1>
      <PublishPanel id="exemplo" status="rascunho" version={0} blockers={publishBlockers(topic, questions)} />
      <DemoLessonUpload />
      <DemoAddQuestions />
      <DemoAddVisuals />
      <SectionsEditor id="exemplo" sections={topic.lesson!.sections} />
      <QuestionsEditor id="exemplo" questions={questions} nodeTitles={{ [keys[0]!]: "Art. 121" }} />
    </div>
  );
}
