/** Rubricas do APROVUM REDAÇÃO ELITE. A rubrica ENEM segue a matriz oficial (5 competências, níveis de 40 em 40). As demais são ESTIMATIVAS pedagógicas. */

export interface Criterio {
  key: string;
  label: string;
  description: string;
  max: number;
  /** Pontuações válidas (degraus). Vazio = qualquer valor inteiro entre 0 e max. */
  steps?: number[];
}

export interface Rubrica {
  key: string;
  version: number;
  name: string;
  modalities: string[];
  criteria: Criterio[];
  max: number;
  /** true = não reproduz uma correção oficial; o relatório avisa o aluno. */
  estimated: boolean;
  note: string;
}

const ENEM_STEPS = [0, 40, 80, 120, 160, 200];

export const RUBRICA_ENEM: Rubrica = {
  key: "enem",
  version: 1,
  name: "ENEM — 5 competências",
  modalities: ["enem"],
  estimated: false,
  max: 1000,
  note: "Matriz de 5 competências do ENEM (0 a 200 cada, níveis 0/40/80/120/160/200). A nota é uma avaliação pedagógica automatizada: não é a nota oficial do INEP.",
  criteria: [
    { key: "c1", label: "Competência I — Norma culta", description: "Domínio da modalidade escrita formal da língua portuguesa (ortografia, acentuação, pontuação, concordância, regência, crase, sintaxe, registro).", max: 200, steps: ENEM_STEPS },
    { key: "c2", label: "Competência II — Tema e gênero", description: "Compreensão da proposta e desenvolvimento do tema dentro do texto dissertativo-argumentativo, com repertório sociocultural produtivo.", max: 200, steps: ENEM_STEPS },
    { key: "c3", label: "Competência III — Argumentação", description: "Seleção, relação, organização e interpretação de informações, fatos, opiniões e argumentos em defesa de um ponto de vista (projeto de texto).", max: 200, steps: ENEM_STEPS },
    { key: "c4", label: "Competência IV — Coesão", description: "Conhecimento dos mecanismos linguísticos para a argumentação: conectivos, referenciação, articulação entre períodos e parágrafos.", max: 200, steps: ENEM_STEPS },
    { key: "c5", label: "Competência V — Proposta de intervenção", description: "Proposta de intervenção detalhada (agente, ação, meio/modo, finalidade, detalhamento) respeitando os direitos humanos.", max: 200, steps: ENEM_STEPS },
  ],
};

export const RUBRICA_CONCURSO: Rubrica = {
  key: "concurso_estimado",
  version: 1,
  name: "Concurso público — avaliação pedagógica estimada",
  modalities: ["concurso", "discursiva", "dissertacao", "argumentativo", "vestibular"],
  estimated: true,
  max: 100,
  note: "Sem o edital ou o espelho oficial, esta é uma avaliação pedagógica ESTIMADA. A metodologia pode não reproduzir a correção da banca. Cole os critérios do edital para uma correção alinhada a ele.",
  criteria: [
    { key: "tema_genero", label: "Tema e tipo textual", description: "Compreensão do tema, atendimento ao comando e ao gênero exigido, sem fuga ou tangenciamento.", max: 20 },
    { key: "argumentacao", label: "Argumentação e desenvolvimento", description: "Tese clara, profundidade e consistência dos argumentos, repertório e fundamentação.", max: 30 },
    { key: "coesao_coerencia", label: "Coesão e coerência", description: "Progressão temática, articulação entre ideias e parágrafos, ausência de contradições.", max: 20 },
    { key: "norma_culta", label: "Domínio da norma culta", description: "Ortografia, acentuação, pontuação, concordância, regência, crase e adequação vocabular.", max: 30 },
  ],
};

export const RUBRICA_OFICIAL: Rubrica = {
  key: "oficial_estimado",
  version: 1,
  name: "Redação oficial, relatório e texto administrativo — estimada",
  modalities: ["oficial", "relatorio", "administrativo"],
  estimated: true,
  max: 100,
  note: "Avaliação pedagógica ESTIMADA com base nos princípios do Manual de Redação da Presidência (clareza, concisão, impessoalidade, formalidade, uniformidade). Pode não reproduzir a correção de uma banca.",
  criteria: [
    { key: "genero_formato", label: "Adequação ao gênero e ao formato", description: "Estrutura própria do documento (vocativo, fecho, assunto, identificação etc.) e ao comando da prova.", max: 25 },
    { key: "clareza_concisao", label: "Clareza, concisão e impessoalidade", description: "Objetividade, ausência de rodeios, impessoalidade e formalidade do tratamento.", max: 25 },
    { key: "conteudo", label: "Conteúdo e completude", description: "Atendimento a todos os itens solicitados com precisão e organização lógica.", max: 20 },
    { key: "norma_culta", label: "Domínio da norma culta", description: "Ortografia, acentuação, pontuação, concordância, regência, crase e vocabulário.", max: 30 },
  ],
};

export const RUBRICA_NARRATIVA: Rubrica = {
  key: "narrativo_estimado",
  version: 1,
  name: "Textos narrativos, descritivos e expositivos — estimada",
  modalities: ["narrativo", "descritivo", "expositivo"],
  estimated: true,
  max: 100,
  note: "Avaliação pedagógica ESTIMADA, com critérios compatíveis com o gênero. Não reproduz correção oficial.",
  criteria: [
    { key: "tema_genero", label: "Adequação ao tema e ao gênero", description: "Atendimento à proposta e às características do gênero (narrativo, descritivo ou expositivo).", max: 25 },
    { key: "organizacao", label: "Organização e progressão", description: "Estrutura, sequência de ideias/fatos, coerência interna e fechamento.", max: 25 },
    { key: "coesao", label: "Coesão e recursos expressivos", description: "Articulação, referenciação e escolhas lexicais apropriadas ao gênero.", max: 20 },
    { key: "norma_culta", label: "Domínio da norma culta", description: "Ortografia, acentuação, pontuação, concordância, regência e crase.", max: 30 },
  ],
};

export const RUBRICAS_PADRAO: Rubrica[] = [RUBRICA_ENEM, RUBRICA_CONCURSO, RUBRICA_OFICIAL, RUBRICA_NARRATIVA];

export const MODALIDADES: { id: string; label: string }[] = [
  { id: "enem", label: "ENEM" },
  { id: "concurso", label: "Concurso público" },
  { id: "vestibular", label: "Vestibular" },
  { id: "discursiva", label: "Redação discursiva" },
  { id: "dissertacao", label: "Dissertação" },
  { id: "argumentativo", label: "Texto argumentativo" },
  { id: "expositivo", label: "Texto expositivo" },
  { id: "narrativo", label: "Texto narrativo" },
  { id: "descritivo", label: "Texto descritivo" },
  { id: "oficial", label: "Redação oficial" },
  { id: "relatorio", label: "Relatório" },
  { id: "administrativo", label: "Texto administrativo" },
];

export const BANCAS = ["FGV", "Cebraspe/CESPE", "FCC", "Vunesp", "AOCP", "IBFC", "IBADE", "Instituto Consulplan", "Fundatec", "Outra"];

export const CATEGORIAS_ERRO: { id: string; label: string }[] = [
  { id: "ortografia", label: "Ortografia" },
  { id: "gramatica", label: "Gramática" },
  { id: "pontuacao", label: "Pontuação" },
  { id: "concordancia", label: "Concordância" },
  { id: "regencia", label: "Regência" },
  { id: "coesao", label: "Coesão" },
  { id: "coerencia", label: "Coerência" },
  { id: "argumentacao", label: "Argumentação" },
  { id: "estrutura", label: "Estrutura" },
  { id: "adequacao_tema", label: "Adequação ao tema" },
  { id: "vocabulario", label: "Vocabulário" },
];
export const CATEGORIA_IDS = CATEGORIAS_ERRO.map((c) => c.id) as [string, ...string[]];
export const categoriaLabel = (id: string) => CATEGORIAS_ERRO.find((c) => c.id === id)?.label ?? id;

export const TIPOS_MARCACAO = [
  { id: "erro_objetivo", label: "Erro objetivo" },
  { id: "problema_construcao", label: "Problema de construção" },
  { id: "fragilidade_argumentativa", label: "Fragilidade argumentativa" },
  { id: "oportunidade", label: "Oportunidade de aprimoramento" },
  { id: "estilistica", label: "Preferência estilística" },
] as const;
export const tipoLabel = (id: string) => TIPOS_MARCACAO.find((t) => t.id === id)?.label ?? id;

/** Escolhe a rubrica da modalidade; sem correspondência cai na estimada de concurso. */
export function rubricaDaModalidade(modality: string): Rubrica {
  return RUBRICAS_PADRAO.find((r) => r.modalities.includes(modality)) ?? RUBRICA_CONCURSO;
}

/** Rubrica dinâmica criada a partir dos critérios do edital/espelho (extraídos e validados antes). */
export function rubricaPersonalizada(criteria: Criterio[], base: Rubrica): Rubrica {
  return { ...base, key: "edital_personalizado", version: 1, name: "Critérios do edital informado pelo aluno", criteria, max: criteria.reduce((s, c) => s + c.max, 0), estimated: false, note: "Corrigido pelos critérios que você informou do edital/espelho. A fidelidade depende de o texto colado estar completo e correto." };
}
