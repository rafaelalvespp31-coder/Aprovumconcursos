import { VisaoGeral } from "@/components/aprovum-ai/visao-geral";
import type { PreparationTree } from "@/server/services/edital-view";

/** Dados de EXEMPLO (só na galeria de desenvolvimento) para revisar a aba Visão geral sem backend. */
const d = (id: string, name: string, topics: number, done: number) => ({ id, name, page: null, topics: Array.from({ length: topics }, (_, i) => ({ id: `${id}-${i}` })), doneCount: done, pct: topics ? Math.round((done / topics) * 100) : 0 });

const tree = {
  prep: { id: "demo", title: "Polícia Penal MG" },
  disciplines: [d("1", "Língua Portuguesa", 9, 0), d("2", "Matemática e Raciocínio Lógico", 12, 3), d("3", "Raciocínio Lógico", 1, 1), d("4", "Conhecimentos Específicos", 26, 0)],
  totals: { topics: 48, done: 4, pct: 8, lessonsAvailable: 12, lessonsDone: 0, pending: 41, questionsAnswered: 10 },
} as unknown as PreparationTree;

export default function Page() {
  return <VisaoGeral tree={tree} />;
}
