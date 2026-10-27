import { LessonReader } from "@/app/(app)/aula/[id]/reader";
import { Notice } from "@/components/ui";
import { reader } from "../fixtures";
import { PdfPanel } from "@/app/(app)/trilhas/[id]/pdf-panel";
import { SubtopicSearch } from "@/components/aula/subtopic-search";

// Exemplo: aula de um tópico com vários subtópicos (dados de exemplo, nada é gravado).
const S = (n: number) =>
  `00000000-0000-4000-8200-${String(n).padStart(12, "0")}`;
const subtopics = [
  {
    topicId: S(1),
    code: "1.1",
    title: "Peculato",
    lessonId: null,
    pct: null,
    done: false,
    current: true,
  },
  {
    topicId: S(2),
    code: "1.2",
    title: "Peculato culposo e mediante erro de outrem",
    lessonId: S(12),
    pct: 100,
    done: true,
    current: false,
  },
  {
    topicId: S(3),
    code: "1.3",
    title: "Concussão e excesso de exação",
    lessonId: S(13),
    pct: 33,
    done: false,
    current: false,
  },
  {
    topicId: S(4),
    code: "1.4",
    title: "Corrupção passiva",
    lessonId: null,
    pct: null,
    done: false,
    current: false,
  },
  {
    topicId: S(5),
    code: "1.5",
    title: "Prevaricação",
    lessonId: null,
    pct: null,
    done: false,
    current: false,
  },
  {
    topicId: S(6),
    code: "1.6",
    title: "Advocacia administrativa",
    lessonId: null,
    pct: null,
    done: false,
    current: false,
  },
];

export default function Page() {
  return (
    <LessonReader
      {...reader}
      pdf={
        <PdfPanel
          trailId={reader.lesson.trailId}
          ready={false}
          unitsDone={2}
          unitsTotal={6}
          pdfs={[]}
        />
      }
      notices={
        <>
          <SubtopicSearch
            group={{
              title: "Crimes contra a Administração Pública",
              code: "1",
            }}
            items={subtopics}
          />
          <Notice tone="alerta" title="Contém informação não verificada">
            A seção de jurisprudência foi escrita sem conferência em fonte
            oficial.
          </Notice>
        </>
      }
    />
  );
}
