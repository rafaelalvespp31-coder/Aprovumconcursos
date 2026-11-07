"use client";

import { Relatorio } from "@/components/redacao/relatorio";
import { Editor } from "@/components/redacao/editor";
import { Linha } from "@/components/redacao/ui";
import { localizar } from "@/domain/redacao/texto";
import type { EvaluationView, SubmissionView } from "@/server/services/redacao";

/** EXEMPLO de interface (galeria de desenvolvimento): texto e correção fictícios só para revisar o layout. Não é resultado real. */
const body = "A violência urbana é um problema que afeta a sociedade brasileira. Os jovem são os mais atingidos, pois falta oportunidades.\nPortanto, é necessário que o governo tome medidas, haja visto a gravidade do tema.";
const mk = (trecho: string, category: string, kind: string, severity: string, issue: string, i: number) => {
  const l = localizar(body, trecho)!;
  return { id: `e${i}`, category, kind, severity, start: l.start, end: l.end, paragraph: 1, excerpt: trecho, issue, explanation: "Explicação de exemplo da regra aplicável a este trecho.", rule: "Regra de exemplo.", suggestion: "Sugestão de exemplo.", example: "Exemplo adicional de uso correto." };
};
const sub = { id: "demo", title: "Exemplo", body, modality: "enem", board: null, contest: null, criteriaText: null, lineLimit: null, themeId: null, themeTitle: "Tema de exemplo", themeText: null, status: "concluida", parentId: null, wordCount: 40, createdAt: "2026-11-01T12:00:00Z", submittedAt: null } as SubmissionView;
const ev = {
  id: "ev", status: "concluida", stage: null, error: null, rubricKey: "enem", rubricVersion: 1, modality: "enem", estimated: false, model: "modelo-exemplo", score: 640, max: 1000, zeroReason: null, classification: "Bom", analysis: null, notes: ["Competência I: 160 → 120 (6 desvio(s) objetivo(s) de norma culta apontado(s))."], createdAt: "2026-11-01T12:00:00Z", finishedAt: null,
  diagnostic: { semProblemasRelevantes: false, resumo: "Resumo de exemplo do diagnóstico.", fezBem: ["Apresentou o tema logo na introdução."], fezMal: ["Argumentos curtos."], precisaMelhorar: ["Concordância e desenvolvimento."], paragrafosMelhorar: [{ paragrafo: 1, motivo: "Desenvolver melhor o argumento." }], frasesReformular: [], argumentosSuperficiais: [], errosRecorrentes: [{ categoria: "concordancia", descricao: "Sujeito e verbo." }], conteudoEstudar: ["Concordância verbal"], proximaRedacao: ["Detalhar a proposta."], prioridade: "Concordância.", ondeMelhorar: [{ localizacao: "1º parágrafo", problema: "Concordância", motivo: "Sujeito plural.", explicacaoTecnica: "O verbo deve concordar com o sujeito.", sugestao: "Os jovens…", exemplo: "Exemplo." }], naoMudar: [{ trecho: "A violência urbana é um problema", motivo: "Tese clara." }], pontosPositivos: ["Boa abertura."], pontosNegativos: ["Poucos exemplos."], oportunidades: ["Usar repertório."], plano: [{ prioridade: 1, acao: "Revisar concordância", porque: "Aparece em todos os parágrafos." }] },
  competencies: [1, 2, 3, 4, 5].map((n) => ({ key: `c${n}`, label: `Competência ${"I".repeat(n)} — exemplo`, score: [120, 160, 120, 160, 80][n - 1]!, max: 200, level: 3, justification: "Justificativa de exemplo para esta competência." })),
  errors: [mk("Os jovem", "concordancia", "erro_objetivo", "grave", "Concordância nominal", 1), mk("falta oportunidades", "concordancia", "erro_objetivo", "moderada", "Concordância verbal", 2), mk("haja visto", "gramatica", "erro_objetivo", "moderada", "Locução incorreta", 3), mk("É necessário que o governo tome medidas", "argumentacao", "fragilidade_argumentativa", "moderada", "Argumento genérico", 4)].filter(Boolean),
} as unknown as EvaluationView;

export default function Page() {
  return (
    <div style={{ background: "#F4F4F6", minHeight: "100vh", padding: 12 }}>
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <Relatorio sub={sub} ev={ev} cmp={null} />
        <div className="pc p-4"><Linha rotulo="exemplo" pontos={[{ x: "01/11", y: 48 }, { x: "08/11", y: 56 }, { x: "15/11", y: 64 }]} /></div>
        <Editor inicial={{ id: null, themeId: null, themeTitle: null, themeText: null, title: "", body: "", modality: "concurso", board: null, contest: null, criteriaText: null, lineLimit: null, parentId: null }} temaDaProposta={false} />
      </div>
    </div>
  );
}
