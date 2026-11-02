import "server-only";
import { createAdminClient, createUserClient } from "../supabase";
import type { PartnerPermission } from "@/domain/partner/permissions";

export interface PartnerStatus {
  isPartner: boolean;
  active: boolean;
}

/** É conta de sócio? (lido no servidor, pelo id da sessão — nunca pelo navegador) */
export async function getPartnerStatus(userId: string): Promise<PartnerStatus> {
  const { data } = await createAdminClient().from("partner_accounts").select("active").eq("user_id", userId).maybeSingle();
  return { isPartner: !!data, active: !!data?.active };
}

export type PartnerDashboard =
  | { status: "sem_sessao" | "sem_acesso" | "desativado" }
  | ({
      status: "ok";
      days: number;
      today: string;
      permissions: PartnerPermission[];
      total_cadastrados?: number;
      usuarios_ativos_30d?: number;
      usuarios_inativos_30d?: number;
      cadastros_hoje?: number;
      cadastros_7d?: number;
      cadastros_30d?: number;
      crescimento_mensal_pct?: number | null;
      serie_cadastros?: Array<{ dia: string; novos: number }>;
      serie_base?: Array<{ dia: string; total: number }>;
      periodo_atual?: number;
      periodo_anterior?: number;
      ativos_periodo?: number;
      dias_ativos_media?: number | null;
      retornaram?: number;
      serie_ativos?: Array<{ dia: string; ativos: number }>;
      respostas_periodo?: number;
      pagantes?: number;
      assinaturas_mensais?: number;
      assinaturas_semestrais?: number;
      assinaturas_anuais?: number;
      assinaturas_ativas?: number;
      assinaturas_vencidas?: number;
      taxa_conversao_pct?: number | null;
      faturamento_periodo_cents?: number;
      pagamentos_sem_valor?: number;
      faturamento_mensal?: Array<{ mes: string; cents: number }>;
      lista_pagantes?: Array<{ nome: string; email: string; plano: string; periodo: string; vence: string }>;
      historico_pagamentos?: Array<{ pago_em: string; plano: string; periodo: string; vence: string; nome: string; valor_cents?: number | null }>;
    });

/**
 * Dados do painel do sócio. Sempre com a SESSÃO do sócio (não a chave de serviço): o próprio banco
 * confere a conta, o acesso e cada permissão, e só devolve o que estiver liberado.
 */
export async function loadPartnerDashboard(days: number): Promise<PartnerDashboard> {
  const db = await createUserClient();
  const { data, error } = await db.rpc("partner_dashboard", { p_days: days });
  if (error) throw new Error(error.message);
  return data as PartnerDashboard;
}
