import type { PartnerOk } from "@/components/business/dashboard";
import {
  PARTNER_PERMISSIONS,
  type PartnerPermission,
} from "@/domain/partner/permissions";

/**
 * Dados de EXEMPLO da galeria (nunca usados no painel real). A filtragem imita as regras do banco
 * (partner_dashboard) para revisar a tela com cada combinação de permissões.
 */
const TODAY = "2026-11-02";
const day = (offset: number) => {
  const d = new Date(`${TODAY}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
};
const wave = (i: number, base: number, amp: number) =>
  Math.max(0, Math.round(base + amp * Math.sin(i / 3) + (i % 5)));

export function fixture(
  days: number,
  perms: readonly PartnerPermission[],
): PartnerOk {
  const has = (p: PartnerPermission) => perms.includes(p);
  const serie = Array.from({ length: days }, (_, i) => ({
    dia: day(i - days + 1),
    novos: wave(i, 6, 4),
  }));
  const novosPeriodo = serie.reduce((a, p) => a + p.novos, 0);
  const total = 1842;
  let acc = total - novosPeriodo;
  const base = serie.map((p) => ({ dia: p.dia, total: (acc += p.novos) }));
  const out: PartnerOk = {
    status: "ok",
    days,
    today: TODAY,
    permissions: [...perms],
  };
  if (has("visualizar_total_cadastrados")) out.total_cadastrados = total;
  if (has("visualizar_usuarios_ativos")) {
    out.usuarios_ativos_30d = 612;
    out.ativos_periodo = Math.min(612, 120 + days * 4);
    out.dias_ativos_media = 4.6;
    out.retornaram = Math.round(out.ativos_periodo * 0.58);
    out.serie_ativos = serie.map((p, i) => ({
      dia: p.dia,
      ativos: wave(i, 80, 22),
    }));
    out.respostas_periodo = 410 * days;
  }
  if (has("visualizar_usuarios_inativos")) out.usuarios_inativos_30d = 1230;
  if (has("visualizar_cadastros_diarios")) {
    out.cadastros_hoje = serie.at(-1)!.novos;
    out.cadastros_7d = 47;
    out.cadastros_30d = 196;
  }
  if (has("visualizar_crescimento")) {
    out.crescimento_mensal_pct = 12.6;
    out.serie_cadastros = serie;
    out.periodo_atual = novosPeriodo;
    out.periodo_anterior = Math.round(novosPeriodo * 0.89);
    if (has("visualizar_total_cadastrados")) out.serie_base = base;
  }
  const pag = has("visualizar_pagantes");
  if (pag) out.pagantes = 138;
  if (has("visualizar_assinaturas_ativas")) out.assinaturas_ativas = 138;
  if (has("visualizar_assinaturas_vencidas")) out.assinaturas_vencidas = 21;
  if (has("visualizar_assinaturas_mensais")) out.assinaturas_mensais = 74;
  if (has("visualizar_assinaturas_semestrais")) out.assinaturas_semestrais = 39;
  if (has("visualizar_assinaturas_anuais")) out.assinaturas_anuais = 25;
  if (pag && has("visualizar_taxa_conversao")) out.taxa_conversao_pct = 7.5;
  const fat = has("visualizar_faturamento");
  if (fat) {
    out.faturamento_periodo_cents = 389000 + days * 1200;
    out.pagamentos_sem_valor = 2;
    out.faturamento_mensal = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(Date.UTC(2025, 11 + i, 1));
      return {
        mes: d.toISOString().slice(0, 7),
        cents: 180000 + i * 21000 + (i % 3) * 9000,
      };
    });
  }
  if (pag && has("visualizar_lista_pagantes"))
    out.lista_pagantes = [
      {
        nome: "Bruno Lima",
        email: "b•••@exemplo.com",
        plano: "premium",
        periodo: "anual",
        vence: `${day(200)}T23:59:59Z`,
      },
      {
        nome: "Carla Dias",
        email: "c•••@exemplo.com",
        plano: "pro",
        periodo: "mensal",
        vence: `${day(3)}T23:59:59Z`,
      },
      {
        nome: "Elisa Ramos",
        email: "e•••@exemplo.com",
        plano: "premium",
        periodo: "semestral",
        vence: `${day(90)}T23:59:59Z`,
      },
    ];
  if (has("visualizar_historico_pagamentos"))
    out.historico_pagamentos = [
      {
        pago_em: `${day(-1)}T15:00:00Z`,
        plano: "pro",
        periodo: "mensal",
        vence: `${day(29)}T23:59:59Z`,
        nome: "Carla Dias",
        ...(fat ? { valor_cents: 2990 } : {}),
      },
      {
        pago_em: `${day(-12)}T15:00:00Z`,
        plano: "premium",
        periodo: "semestral",
        vence: `${day(170)}T23:59:59Z`,
        nome: "Elisa Ramos",
        ...(fat ? { valor_cents: null } : {}),
      },
      {
        pago_em: `${day(-165)}T15:00:00Z`,
        plano: "premium",
        periodo: "anual",
        vence: `${day(200)}T23:59:59Z`,
        nome: "Bruno Lima",
        ...(fat ? { valor_cents: 29900 } : {}),
      },
    ];
  return out;
}

export const PRESETS: Record<string, readonly PartnerPermission[]> = {
  todos: PARTNER_PERMISSIONS,
  geral: [
    "visualizar_total_cadastrados",
    "visualizar_usuarios_ativos",
    "visualizar_usuarios_inativos",
    "visualizar_cadastros_diarios",
    "visualizar_crescimento",
  ],
  conversao_sem_pagantes: [
    "visualizar_taxa_conversao",
    "visualizar_lista_pagantes",
    "visualizar_historico_pagamentos",
  ],
  nenhum: [],
};
