"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/server/services/catalog";
import { enforceRateLimit, UserFacingError } from "@/server/services/trails";
import { logEvent } from "@/server/observability";
import { createPartnerWithCoupon, deletePartner, setAttributionWindow, setCommissionStatus, setPartnerStatus, updatePartnerWithCoupon } from "@/server/services/parceiros-admin";

const s = (v: FormDataEntryValue | null) => (typeof v === "string" ? v : "");
const fromForm = (fd: FormData) => ({
  name: s(fd.get("name")), code: s(fd.get("code")), discountPct: s(fd.get("discountPct")), commissionPct: s(fd.get("commissionPct")), status: s(fd.get("status")),
  maxUses: s(fd.get("maxUses")), expiresAt: s(fd.get("expiresAt")), stackable: false, offers: fd.getAll("offers").map(String),
});
async function run(back: string, name: string, fn: (adminId: string) => Promise<string | void>, ok: string): Promise<never> {
  const admin = await requireAdmin();
  let to = `${back}${back.includes("?") ? "&" : "?"}ok=${encodeURIComponent(ok)}`;
  try {
    await enforceRateLimit(admin.id, "admin_parceiros", 40);
    const next = await fn(admin.id);
    if (typeof next === "string") to = next;
  } catch (e) {
    const msg = e instanceof UserFacingError ? e.message : e instanceof z.ZodError ? (e.issues[0]?.message ?? "Dados inválidos.") : "Não foi possível concluir. Tente novamente.";
    if (!(e instanceof UserFacingError) && !(e instanceof z.ZodError)) await logEvent(`${name}.failed`, { error: String((e as Error).message).slice(0, 200) });
    to = `${back}${back.includes("?") ? "&" : "?"}erro=${encodeURIComponent(msg)}`;
  }
  revalidatePath("/admin/parceiros");
  redirect(to);
}

export async function createPartnerAction(fd: FormData) {
  await run("/admin/parceiros", "partners.create", async (id) => `/admin/parceiros/${await createPartnerWithCoupon(id, fromForm(fd))}?ok=${encodeURIComponent("Parceiro cadastrado.")}`, "Parceiro cadastrado.");
}
export async function updatePartnerAction(fd: FormData) {
  const pid = s(fd.get("partnerId")), cid = s(fd.get("couponId"));
  await run(`/admin/parceiros/${encodeURIComponent(pid)}`, "partners.update", (id) => updatePartnerWithCoupon(id, pid, cid, fromForm(fd)), "Alterações salvas.");
}
export async function setPartnerStatusAction(fd: FormData) {
  const pid = s(fd.get("partnerId")), to = s(fd.get("to")) === "ativo" ? "ativo" : "inativo";
  await run(s(fd.get("back")) === "list" ? "/admin/parceiros" : `/admin/parceiros/${encodeURIComponent(pid)}`, "partners.status", (id) => setPartnerStatus(id, pid, to), to === "ativo" ? "Parceiro ativado." : "Parceiro suspenso.");
}
export async function commissionStepAction(fd: FormData) {
  const pid = s(fd.get("partnerId")), to = s(fd.get("to")) === "paga" ? "paga" : "aprovada";
  await run(`/admin/parceiros/${encodeURIComponent(pid)}`, "partners.commission", (id) => setCommissionStatus(id, s(fd.get("redemptionId")), to), to === "paga" ? "Comissão marcada como paga." : "Comissão aprovada.");
}
export async function windowAction(fd: FormData) {
  await run("/admin/parceiros", "partners.window", (id) => setAttributionWindow(id, s(fd.get("days"))), "Janela de atribuição salva.");
}

export async function deletePartnerAction(fd: FormData) {
  const pid = s(fd.get("partnerId"));
  await run(s(fd.get("back")) === "list" ? "/admin/parceiros" : `/admin/parceiros/${encodeURIComponent(pid)}`, "partners.delete", async (id) => { await deletePartner(id, pid); return `/admin/parceiros?ok=${encodeURIComponent("Parceiro excluído.")}`; }, "Parceiro excluído.");
}
