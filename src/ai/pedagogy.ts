/**
 * Modelos didáticos por disciplina (seção 8) e regras do modo jurídico (seção 7).
 */

export const DISCIPLINE_MODES = [
  "lingua_portuguesa",
  "matematica",
  "raciocinio_logico",
  "informatica",
  "direito_constitucional",
  "direito_administrativo",
  "direito_penal",
  "direito_processual_penal",
  "legislacao_especial",
  "conhecimentos_especificos",
  "outra",
] as const;
export type DisciplineMode = (typeof DISCIPLINE_MODES)[number];

export const DISCIPLINE_LABELS: Record<DisciplineMode, string> = {
  lingua_portuguesa: "Língua Portuguesa",
  matematica: "Matemática",
  raciocinio_logico: "Raciocínio Lógico",
  informatica: "Informática",
  direito_constitucional: "Direito Constitucional",
  direito_administrativo: "Direito Administrativo",
  direito_penal: "Direito Penal",
  direito_processual_penal: "Direito Processual Penal",
  legislacao_especial: "Legislação especial",
  conhecimentos_especificos: "Conhecimentos específicos",
  outra: "Outra disciplina",
};

export function isLegalMode(mode: DisciplineMode): boolean {
  return mode.startsWith("direito_") || mode === "legislacao_especial";
}

const GUIDES: Record<DisciplineMode, string> = {
  lingua_portuguesa:
    "Apresente a regra, exemplos corretos e incorretos, a análise sintática quando relevante, exceções cobradas em prova e um exercício de interpretação. Diferencie norma-padrão de uso coloquial.",
  matematica:
    "Parta do conceito, apresente a fórmula com o significado de cada termo, resolva exemplos passo a passo mostrando cada operação e proponha exercícios progressivos. Confira toda conta.",
  raciocinio_logico:
    "Use tabelas-verdade, diagramas e resolução passo a passo. Mostre o raciocínio que elimina alternativas e os erros de interpretação mais comuns.",
  informatica:
    "Separe conceitos gerais de comportamentos de versões específicas de softwares. Quando citar atalho, menu ou recurso, informe a versão/sistema a que se refere e marque como 'verificar versão' se não houver certeza.",
  direito_constitucional: "",
  direito_administrativo: "",
  direito_penal: "",
  direito_processual_penal: "",
  legislacao_especial: "",
  conhecimentos_especificos:
    "Adapte a estrutura à natureza técnica do assunto: definições precisas, processos, comparações e aplicações práticas na função pública.",
  outra: "Adapte a estrutura à natureza do assunto, priorizando precisão e exemplos concretos.",
};

export const LEGAL_RULES = `MODO JURÍDICO:
- Separe visualmente: texto legal, explicação didática, doutrina, jurisprudência, exemplo prático, interpretação da banca.
- Seção "texto_legal": copie SOMENTE trechos que constam literalmente no conteúdo do aluno. Não complete, não atualize e não reescreva dispositivos de memória. Se o aluno não colou o texto do dispositivo, não crie seção "texto_legal".
- Nunca invente artigos, incisos, parágrafos, súmulas, julgados, números de processos, datas ou citações. Se não tiver certeza de um número, não o cite: descreva o entendimento sem número e marque a seção como pendente de verificação.
- Diferencie legislação vigente, histórica e alterações. Se não puder confirmar que o texto está atualizado, diga isso explicitamente.
- Não apresente interpretação controvertida como consenso; indique quando houver divergência.`;

export function disciplineGuide(mode: DisciplineMode): string {
  return isLegalMode(mode) ? LEGAL_RULES : GUIDES[mode];
}

export const LESSON_SECTION_KINDS = [
  "objetivo",
  "conhecimentos_previos",
  "introducao",
  "explicacao",
  "conceitos_fundamentais",
  "aprofundamento",
  "exemplos",
  "comparacao",
  "aplicacao",
  "pegadinhas",
  "excecoes",
  "quadro_comparativo",
  "esquema",
  "resumo",
  "checklist",
  "referencias",
  "proxima_etapa",
  "texto_legal",
  "doutrina",
  "jurisprudencia",
  "interpretacao_banca",
] as const;
export type LessonSectionKind = (typeof LESSON_SECTION_KINDS)[number];

export const SECTION_LABELS: Record<LessonSectionKind, string> = {
  objetivo: "Objetivo de aprendizagem",
  conhecimentos_previos: "Conhecimentos prévios",
  introducao: "Introdução",
  explicacao: "Explicação",
  conceitos_fundamentais: "Conceitos fundamentais",
  aprofundamento: "Aprofundamento",
  exemplos: "Exemplos práticos",
  comparacao: "Comparação entre conceitos",
  aplicacao: "Aplicação",
  pegadinhas: "Pegadinhas de prova",
  excecoes: "Exceções e particularidades",
  quadro_comparativo: "Quadro comparativo",
  esquema: "Esquema",
  resumo: "Resumo",
  checklist: "Checklist de aprendizagem",
  referencias: "Referências",
  proxima_etapa: "Próxima etapa",
  texto_legal: "Texto legal",
  doutrina: "Doutrina",
  jurisprudencia: "Jurisprudência",
  interpretacao_banca: "Como a banca costuma abordar",
};

/** Seções cujo conteúdo é factual externo e começa como "não verificado". */
export const VERIFICATION_SENSITIVE: ReadonlySet<LessonSectionKind> = new Set([
  "doutrina",
  "jurisprudencia",
  "interpretacao_banca",
  "referencias",
]);

/**
 * Formas de ensino OBRIGATÓRIAS em toda aula de tema (decisão do produto: esgotar
 * todas as formas aplicáveis antes da fixação). Cobrem os três níveis de profundidade:
 * básico (introdução), intermediário (explicação, conceitos) e avançado (aprofundamento).
 */
export const REQUIRED_SECTION_KINDS: readonly LessonSectionKind[] = [
  "introducao",
  "explicacao",
  "conceitos_fundamentais",
  "aprofundamento",
  "exemplos",
  "comparacao",
  "aplicacao",
  "pegadinhas",
  "excecoes",
  "resumo",
  "checklist",
];

/** Formas adicionais obrigatórias quando o tema é jurídico. */
export const LEGAL_REQUIRED_SECTION_KINDS: readonly LessonSectionKind[] = [
  "doutrina",
  "jurisprudencia",
  "interpretacao_banca",
];

/**
 * Seções exigidas para um tema. `texto_legal` só entra quando o aluno colou o texto
 * do dispositivo — é a única seção que não pode ser escrita sem a fonte.
 */
export function requiredSectionKinds(opts: { legal: boolean; hasLegalSourceText: boolean }): LessonSectionKind[] {
  const kinds = [...REQUIRED_SECTION_KINDS];
  if (opts.legal) kinds.push(...LEGAL_REQUIRED_SECTION_KINDS);
  if (opts.legal && opts.hasLegalSourceText) kinds.splice(1, 0, "texto_legal");
  return kinds;
}

/** Níveis de dificuldade exigidos nas questões de fixação de cada tema. */
export const REQUIRED_QUESTION_LEVELS = [1, 2, 3, 4, 5] as const;
