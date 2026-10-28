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

// ---------------------------------------------------------------------------
// Matérias cadastradas pela equipe (além das fixas acima). Cada uma segue o estilo pedagógico de
// uma matéria fixa ("base"). O registro é preenchido no servidor (do banco) e no navegador (pela
// página), então rótulos e validações funcionam igual nos dois lados.
// ---------------------------------------------------------------------------

export interface CustomDiscipline {
  slug: string;
  label: string;
  /** Matéria fixa cujo estilo pedagógico esta segue (ex.: direito_penal para uma matéria jurídica). */
  base: DisciplineMode;
}

const customs = new Map<string, CustomDiscipline>();
const isBuiltIn = (slug: string): slug is DisciplineMode => (DISCIPLINE_MODES as readonly string[]).includes(slug);

/** Troca a lista de matérias cadastradas (idempotente). */
export function setCustomDisciplines(list: readonly CustomDiscipline[]): void {
  customs.clear();
  for (const d of list) if (!isBuiltIn(d.slug) && isBuiltIn(d.base)) customs.set(d.slug, d);
}
export function customDisciplines(): CustomDiscipline[] {
  return [...customs.values()].sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));
}
/** Nome da matéria (fixa ou cadastrada); undefined quando não existe. */
export function disciplineLabel(slug: string | null | undefined): string | undefined {
  if (!slug) return undefined;
  return isBuiltIn(slug) ? DISCIPLINE_LABELS[slug] : customs.get(slug)?.label;
}
export function isDisciplineSlug(slug: string | null | undefined): boolean {
  return !!slug && (isBuiltIn(slug) || customs.has(slug));
}
/** Todas as matérias escolhíveis (fixas, depois as cadastradas; "outra" por último). */
export function disciplineSlugs(): string[] {
  return [...DISCIPLINE_MODES.filter((m) => m !== "outra"), ...customDisciplines().map((d) => d.slug), "outra"];
}
/** Estilo pedagógico de uma matéria (a própria, se fixa; a base, se cadastrada). */
export function baseMode(slug: string | null | undefined): DisciplineMode {
  if (!slug) return "outra";
  return isBuiltIn(slug) ? slug : (customs.get(slug)?.base ?? "outra");
}

export function isLegalMode(mode: string): boolean {
  const m = baseMode(mode);
  return m.startsWith("direito_") || m === "legislacao_especial";
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

export function disciplineGuide(mode: string): string {
  return isLegalMode(mode) ? LEGAL_RULES : GUIDES[baseMode(mode)];
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
  "flashcards",
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
  flashcards: "Flashcards",
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
