import { RedacaoHomeElite } from "@/components/redacao/home-elite";
import type { CompetenciaView, HistoryItem } from "@/server/services/redacao";

/** EXEMPLO de interface (galeria de desenvolvimento): notas fictícias só para revisar o layout. Não é resultado real. */
const dia = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();
const item = (id: string, themeTitle: string, modality: string, score: number | null, dias: number, status = "concluida"): HistoryItem => ({ id, title: themeTitle, themeTitle, modality, status, score, max: score === null ? null : 1000, createdAt: dia(dias), parentId: null, wordCount: 320 });
const hist: HistoryItem[] = [
  item("a", "Inteligência Artificial e o mercado de trabalho", "enem", 920, 0),
  item("b", "Desigualdade Social no Brasil contemporâneo", "concurso", 780, 1),
  item("c", "Meio Ambiente e desenvolvimento sustentável", "enem", 700, 3),
  item("d", "Educação no Brasil: desafios do século XXI", "vestibular", 860, 5),
  item("e", "Mobilidade urbana", "enem", 640, 9),
  item("f", "Saúde mental dos jovens", "enem", 600, 14),
];
const competencias: CompetenciaView[] = [180, 160, 160, 160, 120].map((score, i) => ({ key: `c${i + 1}`, label: `Competência ${["I", "II", "III", "IV", "V"][i]} — exemplo`, score, max: 200, level: 4, justification: "" }));

export default async function Page({ searchParams }: { searchParams: Promise<{ vazio?: string }> }) {
  const { vazio } = await searchParams;
  return <RedacaoHomeElite hist={vazio ? [] : hist} competencias={vazio ? [] : competencias} iaAtiva />;
}
