/** Rótulos e enums do banco de questões (compartilhados entre servidor e telas). */
export const BANK_STATUSES = [
  "rascunho",
  "importada",
  "aguardando_conferencia",
  "em_revisao",
  "correcao_necessaria",
  "aprovada",
  "publicada",
  "suspensa",
  "arquivada",
] as const;
export type BankStatus = (typeof BANK_STATUSES)[number];

export const STATUS_LABEL: Record<BankStatus, string> = {
  rascunho: "Rascunho",
  importada: "Importada",
  aguardando_conferencia: "Aguardando conferência",
  em_revisao: "Em revisão",
  correcao_necessaria: "Correção necessária",
  aprovada: "Aprovada",
  publicada: "Publicada",
  suspensa: "Suspensa",
  arquivada: "Arquivada",
};

export const ORIGINS = ["prova_anterior", "autoral_humana", "ia_assistida"] as const;
export type Origin = (typeof ORIGINS)[number];
export const ORIGIN_LABEL: Record<Origin, string> = {
  prova_anterior: "Prova anterior (real)",
  autoral_humana: "Autoral (equipe)",
  ia_assistida: "Inédita com auxílio de IA",
};

export const DIFFICULTIES = ["dificil", "muito_dificil", "extrema"] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];
export const DIFFICULTY_LABEL: Record<Difficulty, string> = { dificil: "Difícil", muito_dificil: "Muito difícil", extrema: "Extrema" };

export const QUESTION_TYPES = ["multipla_escolha", "certo_errado"] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];
export const TYPE_LABEL: Record<QuestionType, string> = { multipla_escolha: "Múltipla escolha", certo_errado: "Certo ou errado" };

export const USAGE_RIGHTS = ["nao_verificado", "autorizado", "proprio", "uso_restrito", "proibido"] as const;
export type UsageRights = (typeof USAGE_RIGHTS)[number];
export const RIGHTS_LABEL: Record<UsageRights, string> = {
  nao_verificado: "Não verificado",
  autorizado: "Uso autorizado (licença/autorização registrada)",
  proprio: "Conteúdo próprio",
  uso_restrito: "Uso restrito",
  proibido: "Uso proibido",
};

export const SOURCE_KINDS = [
  "prova_oficial",
  "gabarito_oficial",
  "legislacao",
  "jurisprudencia",
  "doutrina",
  "material_didatico",
  "questao_autoral",
  "outra",
] as const;
export type SourceKind = (typeof SOURCE_KINDS)[number];
export const SOURCE_KIND_LABEL: Record<SourceKind, string> = {
  prova_oficial: "Prova oficial",
  gabarito_oficial: "Gabarito oficial",
  legislacao: "Legislação",
  jurisprudencia: "Jurisprudência",
  doutrina: "Doutrina",
  material_didatico: "Livro ou material didático",
  questao_autoral: "Questão autoral",
  outra: "Outra fonte documentada",
};
export const SOURCE_STATUSES = ["ativa", "restrita", "bloqueada", "arquivada"] as const;
export type SourceStatus = (typeof SOURCE_STATUSES)[number];
export const SOURCE_STATUS_LABEL: Record<SourceStatus, string> = { ativa: "Ativa", restrita: "Restrita", bloqueada: "Bloqueada", arquivada: "Arquivada" };

export const FLAG_LABEL: Record<string, string> = {
  erro_relatado: "Erro relatado",
  duplicidade: "Possível duplicidade",
  desatualizada: "Possivelmente desatualizada",
  ambiguidade: "Ambiguidade",
  divergencia_juridica: "Divergência jurídica",
  direitos: "Direitos de uso",
};

export const OPTION_LABELS = ["A", "B", "C", "D", "E"] as const;
