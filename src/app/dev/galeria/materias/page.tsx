import { MateriasView } from "@/components/aprovum-ai/materias-view";
import type { PreparationTree, TreeDiscipline, TreeTopic } from "@/server/services/edital-view";

/** Só galeria: edital de exemplo para revisar o visual. */
const tp = (id: string, code: string | null, depth: number, title: string, status: TreeTopic["status"], done = false, n = 1): TreeTopic => ({
  id, code, depth, title, page: null, status, done,
  lessons: status === "nao_encontrado" || status === "pendente" ? [] : Array.from({ length: n }, (_, i) => ({ catalogId: `${id}-${i}`, title, coverage: "completa" as const, pct: done ? 100 : 20, done })),
});
const disc = (id: string, name: string, topics: TreeTopic[]): TreeDiscipline => ({ id, name, page: null, mode: null, modeLabel: null, topics, doneCount: topics.filter((t) => t.done).length, pct: (topics.filter((t) => t.done).length / topics.length) * 100 });
const disciplines = [
  disc("1", "Língua Portuguesa", [tp("a", "1", 0, "Compreensão e interpretação de textos", "completa", true), tp("b", "1.1", 1, "Tipologia textual", "completa"), tp("c", "2", 0, "Ortografia oficial e acentuação", "parcial"), tp("d", "3", 0, "Crase", "nao_encontrado")]),
  disc("2", "Direito Constitucional", [tp("e", "1", 0, "Direitos e garantias fundamentais", "completa", false, 3), tp("f", "1.1", 1, "Direitos individuais e coletivos", "completa"), tp("g", "2", 0, "Segurança pública (art. 144)", "conferencia")]),
  disc("3", "Direito Penal", [tp("h", "1", 0, "Aplicação da lei penal", "completa", true), tp("i", "2", 0, "Crimes contra a pessoa", "completa"), tp("j", "3", 0, "Crimes contra o patrimônio", "nao_encontrado")]),
  disc("4", "Raciocínio Lógico", [tp("k", "1", 0, "Proposições e conectivos", "completa")]),
];
const tree: PreparationTree = {
  prep: { id: "x", title: "PRF", contestName: "PRF", roleName: "prf", orgLogo: null, board: null, year: 2025, fileName: "edital.pdf", fileSize: 1, pageCount: 1, status: "concluido", step: 5, error: null, stats: {}, createdAt: "2026-01-01" },
  disciplines,
  totals: { topics: 12, done: 2, pct: 17, lessonsAvailable: 9, lessonsDone: 2, pending: 3, questionsAnswered: 0 },
};
export default function Page() { return <MateriasView tree={tree} />; }
