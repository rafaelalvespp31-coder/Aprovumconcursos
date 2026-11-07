"use client";

import "@/components/aprovum-ai/aprovum-ai.css";
import { AulasEdital } from "@/components/aprovum-ai/aulas-edital";
import type { PreparationTree } from "@/server/services/edital-view";

/** Dados de EXEMPLO (só na galeria de desenvolvimento) para revisar a aba Aulas do edital sem backend. */
const t = (i: number, title: string, status: string, lessons: number, done = false) => ({ id: `t${i}`, code: null, depth: 1, title, page: 12, status, done, lessons: Array.from({ length: lessons }, (_, k) => ({ catalogId: `l${i}${k}`, title: `Aula: ${title}`, pct: done ? 100 : 30, done, coverage: "total" })) });
const tree = {
  prep: { id: "demo", fileName: "edital-guarda-paulinia.pdf", pageCount: 24, stats: { topics: 11, completa: 7, parcial: 1, conferencia: 1, pendentes: 2, coveragePct: 73 } },
  disciplines: [
    { id: "d1", name: "Língua Portuguesa", page: 5, topics: [t(1, "Classes de palavras", "completa", 1, true), t(2, "Sintaxe e análise sintática", "completa", 2)], doneCount: 1, pct: 50 },
    { id: "d2", name: "CONHECIMENTOS ESPECÍFICOS", page: 8, topics: [
      t(3, "Código Penal – Parte Geral", "completa", 1, true), t(4, "Código Penal – Crimes contra a pessoa", "parcial", 1), t(5, "Código de Processo Penal", "completa", 2), t(6, "Prisão em flagrante", "nao_encontrado", 0),
      t(7, "Lei de Drogas – Lei 11.343/2006", "completa", 1), t(8, "Constituição Federal – artigo 144", "conferencia", 1), t(9, "Estatuto Geral das Guardas Municipais – Lei 13.022/2014", "completa", 1), t(10, "Código de Trânsito Brasileiro", "completa", 1), t(11, "Legislação municipal de Paulínia", "nao_encontrado", 0)], doneCount: 1, pct: 9 },
  ],
  totals: { topics: 11, done: 2, pct: 18, lessonsAvailable: 11, lessonsDone: 2, pending: 2, questionsAnswered: 0 },
} as unknown as PreparationTree;

export default function Page() {
  return (
    <div style={{ background: "#050507", minHeight: "100vh", padding: 12 }}>
      <div className="ai-root mx-auto grid w-full max-w-4xl gap-4"><AulasEdital tree={tree} onLesson={() => {}} /></div>
    </div>
  );
}
