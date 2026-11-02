/** Seções do APROVUM BUSINESS e quais aparecem conforme o que o banco liberou. */
export const BUSINESS_SECTIONS = [
  { id: "visao-geral", label: "Visão geral" },
  { id: "crescimento", label: "Crescimento" },
  { id: "comercial", label: "Comercial" },
  { id: "desempenho", label: "Desempenho" },
] as const;
export type BusinessSectionId = (typeof BUSINESS_SECTIONS)[number]["id"];

const KEYS: Record<BusinessSectionId, readonly string[]> = {
  "visao-geral": [
    "total_cadastrados",
    "usuarios_ativos_30d",
    "usuarios_inativos_30d",
    "cadastros_hoje",
    "cadastros_7d",
    "cadastros_30d",
    "crescimento_mensal_pct",
  ],
  crescimento: ["serie_cadastros", "serie_base"],
  comercial: [
    "pagantes",
    "assinaturas_ativas",
    "assinaturas_vencidas",
    "assinaturas_mensais",
    "assinaturas_semestrais",
    "assinaturas_anuais",
    "taxa_conversao_pct",
    "faturamento_periodo_cents",
    "faturamento_mensal",
    "lista_pagantes",
    "historico_pagamentos",
  ],
  desempenho: ["ativos_periodo"],
};

/** Uma seção só existe se o banco devolveu ao menos um indicador dela (o que não veio não é desenhado). */
export function visibleSections(
  data: Record<string, unknown>,
): Set<BusinessSectionId> {
  return new Set(
    BUSINESS_SECTIONS.map((s) => s.id).filter((id) =>
      KEYS[id].some((k) => data[k] !== undefined),
    ),
  );
}
