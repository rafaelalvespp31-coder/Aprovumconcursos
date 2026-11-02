"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/server/services/catalog";
import {
  createPartner,
  setPartnerActive,
  setPartnerPermissions,
} from "@/server/services/partner-admin";
import { UserFacingError, enforceRateLimit } from "@/server/services/trails";
import { logEvent } from "@/server/observability";

export type PartnerActionResult =
  | { ok: true; message: string; password?: string | null }
  | { ok: false; error: string };

async function guard(
  name: string,
  fn: () => Promise<{ message: string; password?: string | null }>,
): Promise<PartnerActionResult> {
  try {
    return { ok: true, ...(await fn()) };
  } catch (e) {
    if (e instanceof UserFacingError) return { ok: false, error: e.message };
    if (e instanceof z.ZodError)
      return { ok: false, error: e.issues[0]?.message ?? "Dados inválidos." };
    await logEvent(`${name}.failed`, { error: (e as Error).message });
    return { ok: false, error: "Não foi possível concluir. Tente novamente." };
  }
}

const str = (v: unknown) => (typeof v === "string" ? v : "");

/** Só o ADMIN MASTER (requireAdmin no servidor, a cada chamada). */
export async function createPartnerAction(data: {
  name: string;
  email: string;
  password?: string;
}): Promise<PartnerActionResult> {
  const admin = await requireAdmin();
  const r = await guard("admin.partner_create", async () => {
    await enforceRateLimit(admin.id, "admin_partner", 30);
    const out = await createPartner(admin, {
      name: str(data?.name),
      email: str(data?.email),
      password: str(data?.password),
    });
    return {
      message: out.linked
        ? "Conta existente vinculada como sócio."
        : "Conta do sócio criada.",
      password: out.password,
    };
  });
  if (r.ok) revalidatePath("/admin/socio");
  return r;
}

export async function setPartnerActiveAction(
  userId: string,
  active: boolean,
): Promise<PartnerActionResult> {
  const admin = await requireAdmin();
  const r = await guard("admin.partner_active", async () => {
    await enforceRateLimit(admin.id, "admin_partner", 60);
    await setPartnerActive(admin, str(userId), active === true);
    return {
      message:
        active === true
          ? "Acesso ativado."
          : "Acesso desativado (sessões abertas encerradas).",
    };
  });
  if (r.ok) revalidatePath("/admin/socio");
  return r;
}

export async function setPartnerPermissionsAction(
  userId: string,
  permissions: string[],
): Promise<PartnerActionResult> {
  const admin = await requireAdmin();
  const r = await guard("admin.partner_permissions", async () => {
    await enforceRateLimit(admin.id, "admin_partner", 60);
    await setPartnerPermissions(
      admin,
      str(userId),
      Array.isArray(permissions) ? permissions.map(str) : [],
    );
    return { message: "Permissões salvas. Já valem no painel do sócio." };
  });
  if (r.ok) revalidatePath("/admin/socio");
  return r;
}
