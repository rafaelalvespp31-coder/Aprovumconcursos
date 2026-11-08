import { MeuConcurso } from "@/components/aprovum-ai/meu-concurso";
import type { PreparationTree } from "@/server/services/edital-view";

/** Dados de EXEMPLO (só na galeria de desenvolvimento) para revisar a página Meu Concurso sem backend. */
const disc = (id: string, name: string, n: number, done: number) => ({ id, name, page: null, mode: null, modeLabel: null, topics: Array.from({ length: n }, (_, i) => ({ id: `${id}${i}`, code: null, depth: 0, title: `Tópico ${i + 1}`, page: null, status: "completa", lessons: [] })), doneCount: done, pct: Math.round((done / n) * 100) });
const tree = {
  prep: { id: "demo", title: "Prefeitura Municipal de Paulínia", contestName: "Prefeitura Municipal de Paulínia", roleName: "Guarda Municipal", board: "Vunesp", year: 2026, orgLogo: null, createdAt: "2026-11-06T12:00:00Z", stats: { studyFolderId: "x" } },
  disciplines: [disc("a", "Língua Portuguesa", 12, 4), disc("b", "Matemática", 8, 1), disc("c", "Raciocínio Lógico", 6, 0), disc("d", "Conhecimentos Específicos", 22, 7)],
  totals: { topics: 48, done: 12, pct: 25, lessonsAvailable: 12, lessonsDone: 3, pending: 5, questionsAnswered: 10 },
} as unknown as PreparationTree;

async function save() { "use server"; }
async function start(): Promise<{ error?: string }> { "use server"; return {}; }

export default async function Page({ searchParams }: { searchParams: Promise<{ editar?: string }> }) {
  const { editar } = await searchParams;
  return <MeuConcurso tree={tree} save={save} start={start} tab="visao" editing={editar === "1"} />;
}
