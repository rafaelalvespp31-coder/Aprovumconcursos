import "@/components/aprovum-ai/aprovum-ai.css";
import { RaioXView } from "@/components/aprovum-ai/raiox-view";
import { compareLastTwo, heatmap, subjectIncidence, type Edition } from "@/domain/strategic/analysis";
import type { RaioX } from "@/server/services/strategic";

/** Dados de EXEMPLO (só na galeria de desenvolvimento): Raio-X completo com muitas disciplinas e nomes longos. */
const T: Record<string, string[]> = {
  "Língua Portuguesa": ["Classes de palavras", "Sintaxe e análise sintática", "Interpretação de textos"],
  "Matemática e Raciocínio Lógico": ["Equações e problemas matemáticos", "Sequências lógicas"],
  "Conhecimentos Específicos": ["Código de Processo Penal", "Código de Trânsito Brasileiro", "Código Penal – Crimes contra a Administração Pública", "Código Penal – Crimes contra a pessoa", "Código Penal – Parte Geral", "Constituição Federal – artigo 144", "Constituição Federal – artigo 37", "Estatuto da Criança e do Adolescente", "Estatuto da Pessoa Idosa", "Estatuto do Desarmamento – Lei 10.826/2003", "Estatuto Geral das Guardas Municipais – Lei 13.022/2014", "Juizados Especiais", "Legislação municipal de Paulínia", "Lei 7.716/1989 – Crimes resultantes de preconceito", "Lei de Abuso de Autoridade – Lei 13.869/2019", "Lei de Drogas – Lei 11.343/2006", "Lei de Improbidade Administrativa", "Lei Geral de Proteção de Dados – Lei 13.709/2018", "Lei Maria da Penha – Lei 11.340/2006", "Prisão em flagrante", "Provas e busca e apreensão", "Sistema Único de Segurança Pública – Lei 13.675/2018"],
};
const nomes = Object.keys(T);
const ed = (year: number, k: number): Edition => ({ id: String(year), year, board: "VUNESP", totalQuestions: null, countingRule: null,
  subjects: nomes.map((name, i) => ({ name, mode: null, questions: 6 + ((i * 3 + k) % 9), annulled: 0, topics: T[name]!.map((title, j) => ({ title, questions: 1 + ((j + k) % 3), annulled: 0 })) })) });
const editions = [ed(2025, 1), ed(2023, 2), ed(2021, 3), ed(2019, 4), ed(2017, 5), ed(2015, 6)];
const cutoffs = editions.flatMap((e, i) => ["ampla", "pcd"].map((m, j) => ({ id: `${e.year}${m}`, editionYear: e.year, board: e.board, position: "Policial Penal — Agente de Segurança Penitenciária", modality: m, stage: "1ª fase", kind: "minima_aprovacao", score: 55 + i * 3 + j * 2, maxScore: 100, candidates: 1234, criterion: "Critério", source: { name: "Edital de resultado final do concurso público", url: null, kind: "oficial", organ: null, reviewer: null }, sourcePage: 12, verifiedAt: "2025-01-10" })));
const data = {
  exam: { id: "x", name: "Concurso Público de Exemplo para Agente", organ: null, status: "publicado", limitations: null, positions: [], editions, cutoffs, sources: [], recommendations: [] },
  incidence: editions.map((e) => ({ year: e.year, board: e.board, countingRule: null, ...subjectIncidence(e) })),
  comparison: compareLastTwo(editions), heat: heatmap(editions), lessons: {},
} as unknown as RaioX;

export default function Page() {
  return (
    <div style={{ background: "#050507", minHeight: "100vh", padding: 12 }}>
      <div className="ai-root mx-auto grid w-full max-w-4xl gap-4"><RaioXView data={data} /></div>
    </div>
  );
}
