/** Rótulo e cor de cada tipo de seção da aula, para o aluno saber de relance o que está lendo (explicação, pegadinhas, lei seca…). Puro. */
export type SeloSecao = { rotulo: string; tom: string };

const SELOS: Record<string, SeloSecao> = {
  introducao: { rotulo: "Introdução", tom: "#1F5FBF" },
  objetivo: { rotulo: "Objetivo", tom: "#1F5FBF" },
  conceitos_fundamentais: { rotulo: "Glossário", tom: "#1F5FBF" },
  texto_legal: { rotulo: "Lei seca", tom: "#2A2D33" },
  explicacao: { rotulo: "Explicação", tom: "#B3261E" },
  aprofundamento: { rotulo: "Aprofundamento", tom: "#8A3FC4" },
  esquema: { rotulo: "Mapa mental", tom: "#1E8E5A" },
  comparacao: { rotulo: "Comparação", tom: "#1F5FBF" },
  quadro_comparativo: { rotulo: "Quadro comparativo", tom: "#1F5FBF" },
  excecoes: { rotulo: "Exceções", tom: "#C77700" },
  aplicacao: { rotulo: "Aplicação", tom: "#1E8E5A" },
  exemplos: { rotulo: "Exemplos", tom: "#8A3FC4" },
  pegadinhas: { rotulo: "Pegadinhas", tom: "#C77700" },
  interpretacao_banca: { rotulo: "Como a banca cobra", tom: "#C77700" },
  doutrina: { rotulo: "Doutrina", tom: "#8A3FC4" },
  jurisprudencia: { rotulo: "Jurisprudência", tom: "#2A2D33" },
  resumo: { rotulo: "Resumo", tom: "#B3261E" },
  flashcards: { rotulo: "Flashcards", tom: "#1E8E5A" },
  checklist: { rotulo: "Checklist", tom: "#1E8E5A" },
  referencias: { rotulo: "Referências", tom: "#2A2D33" },
};

/** Selo da seção; tipo desconhecido não ganha selo (a seção continua aparecendo normalmente). */
export function seloDaSecao(kind: string | null | undefined): SeloSecao | null {
  return (kind && SELOS[kind]) || null;
}
