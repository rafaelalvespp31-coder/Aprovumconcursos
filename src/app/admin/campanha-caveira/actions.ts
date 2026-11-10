"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/server/services/catalog";
import { extendGrant, grantManually, setCampaignActive } from "@/server/services/promo";
import { UserFacingError, enforceRateLimit } from "@/server/services/trails";
import { logEvent } from "@/server/observability";

export type CampanhaResult = { ok: true; message: string } | { ok: false; error: string };

async function guard(name: string, fn: () => Promise<string>): Promise<CampanhaResult> {
  try {
    return { ok: true, message: await fn() };
  } catch (e) {
    if (e instanceof UserFacingError) return { ok: false, error: e.message };
    if (e instanceof z.ZodError) return { ok: false, error: e.issues[0]?.message ?? "Dados inválidos." };
    await logEvent(`${name}.failed`, { error: (e as Error).message });
    return { ok: false, error: "Não foi possível concluir. Tente novamente." };
  }
}

const uuid = z.string().uuid("Identificador inválido.");

export async function setCampanhaAtivaAction(active: boolean): Promise<CampanhaResult> {
  const admin = await requireAdmin();
  const r = await guard("admin.campanha_ativa", async () => {
    await enforceRateLimit(admin.id, "admin_campanha", 30);
    const n = await setCampaignActive(admin.id, !!active);
    return active ? `Campanha ativada. ${n} conta(s) receberam os 7 dias agora.` : "Campanha desativada. Os prazos já concedidos continuam valendo.";
  });
  if (r.ok) revalidatePath("/admin/campanha-caveira");
  return r;
}

export async function concederManualAction(userId: string): Promise<CampanhaResult> {
  const admin = await requireAdmin();
  const r = await guard("admin.campanha_conceder", async () => {
    await enforceRateLimit(admin.id, "admin_campanha", 30);
    await grantManually(admin.id, uuid.parse(userId));
    return "Degustação concedida.";
  });
  if (r.ok) revalidatePath("/admin/campanha-caveira");
  return r;
}

export async function estenderAction(grantId: string, days: number): Promise<CampanhaResult> {
  const admin = await requireAdmin();
  const r = await guard("admin.campanha_estender", async () => {
    await enforceRateLimit(admin.id, "admin_campanha", 30);
    const d = z.number().int("Dias inválidos.").min(1, "Mínimo 1 dia.").max(30, "Máximo 30 dias.").parse(days);
    await extendGrant(admin.id, uuid.parse(grantId), d);
    return `Prazo estendido em ${d} dia(s).`;
  });
  if (r.ok) revalidatePath("/admin/campanha-caveira");
  return r;
}
