"use server";

import { requireUser } from "@/server/auth";
import { CAVEIRA_CAMPAIGN_ID, markPromoPopupSeen } from "@/server/services/promo";

/** Registra a visualização da popup (botão ou fechar). Só a concessão do próprio aluno; não mexe no prazo. */
export async function markPopupSeenAction(campaignId: string): Promise<void> {
  const user = await requireUser();
  if (campaignId !== CAVEIRA_CAMPAIGN_ID) return;
  await markPromoPopupSeen(user.id, campaignId);
}
