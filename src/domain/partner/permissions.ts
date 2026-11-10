/** Permissões do SÓCIO ADMINISTRATIVO (PARTNER_ADMIN) — as mesmas de public.partner_permission_keys(). */
export const PARTNER_PERMISSIONS = [
  "visualizar_total_cadastrados",
  "visualizar_usuarios_ativos",
  "visualizar_usuarios_inativos",
  "visualizar_cadastros_diarios",
  "visualizar_crescimento",
  "visualizar_pagantes",
  "visualizar_assinaturas_mensais",
  "visualizar_assinaturas_semestrais",
  "visualizar_assinaturas_anuais",
  "visualizar_assinaturas_ativas",
  "visualizar_assinaturas_vencidas",
  "visualizar_faturamento",
  "visualizar_taxa_conversao",
  "visualizar_lista_pagantes",
  "visualizar_historico_pagamentos",
  // Não é indicador: libera as telas "Plano de tópicos" e "Catalogar aula" (as mesmas do administrador).
  "catalogar_aulas",
] as const;
export type PartnerPermission = (typeof PARTNER_PERMISSIONS)[number];

export const PERMISSION_GROUPS: Array<{
  title: string;
  kind: "geral" | "comercial" | "financeiro" | "catalogo";
  items: Array<{ key: PartnerPermission; label: string; note?: string }>;
}> = [
  {
    title: "Indicadores gerais da plataforma",
    kind: "geral",
    items: [
      {
        key: "visualizar_total_cadastrados",
        label: "Total de alunos cadastrados",
        note: "Também libera a curva da base total no gráfico de crescimento.",
      },
      {
        key: "visualizar_usuarios_ativos",
        label: "Usuários ativos e desempenho",
        note: "Ativos nos últimos 30 dias, frequência de acesso, quem retornou e respostas no período.",
      },
      { key: "visualizar_usuarios_inativos", label: "Usuários inativos" },
      {
        key: "visualizar_cadastros_diarios",
        label: "Novos cadastros (hoje, 7 e 30 dias)",
      },
      {
        key: "visualizar_crescimento",
        label: "Crescimento (gráficos e % mensal)",
      },
    ],
  },
  {
    title: "Indicadores comerciais",
    kind: "comercial",
    items: [
      {
        key: "visualizar_pagantes",
        label: "Quantidade de assinantes pagantes",
      },
      { key: "visualizar_assinaturas_ativas", label: "Assinaturas ativas" },
      { key: "visualizar_assinaturas_vencidas", label: "Assinaturas vencidas" },
      { key: "visualizar_assinaturas_mensais", label: "Assinaturas mensais" },
      {
        key: "visualizar_assinaturas_semestrais",
        label: "Assinaturas semestrais",
      },
      { key: "visualizar_assinaturas_anuais", label: "Assinaturas anuais" },
      {
        key: "visualizar_taxa_conversao",
        label: "Conversão gratuito → pagante",
        note: "Só aparece junto com “assinantes pagantes” (sozinha revelaria esse número).",
      },
      {
        key: "visualizar_lista_pagantes",
        label: "Lista de assinantes",
        note: "Nome, plano e vencimento (e-mail mascarado). Só junto com “assinantes pagantes”.",
      },
    ],
  },
  {
    title: "Informações financeiras",
    kind: "financeiro",
    items: [
      {
        key: "visualizar_faturamento",
        label: "Faturamento",
        note: "Valores recebidos no período e nos últimos 12 meses.",
      },
      {
        key: "visualizar_historico_pagamentos",
        label: "Histórico de pagamentos",
        note: "Valores só aparecem se “Faturamento” também estiver liberado.",
      },
    ],
  },
  {
    title: "Catálogo de aulas",
    kind: "catalogo",
    items: [
      {
        key: "catalogar_aulas",
        label: "Plano de tópicos e Catalogar aula",
        note: "Libera as mesmas telas e comandos do administrador para planejar e catalogar aulas. Não dá acesso ao restante do painel de administração.",
      },
    ],
  },
];

export const COMMERCIAL_PERMISSIONS: readonly PartnerPermission[] =
  PERMISSION_GROUPS.filter((g) => g.kind === "comercial" || g.kind === "financeiro").flatMap((g) =>
    g.items.map((i) => i.key),
  );

/** Lista limpa (só chaves conhecidas, sem repetição, na ordem oficial). */
export function normalizePermissions(
  input: readonly string[],
): PartnerPermission[] {
  const set = new Set(input);
  return PARTNER_PERMISSIONS.filter((p) => set.has(p));
}
