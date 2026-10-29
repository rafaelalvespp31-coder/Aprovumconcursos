"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/server/services/catalog";
import { markStudentPaid, resetStudentPassword, setStudentPlan } from "@/server/services/students";
import { UserFacingError, enforceRateLimit } from "@/server/services/trails";
import { logEvent } from "@/server/observability";

export type StudentActionResult = { ok: true; message: string; password?: string } | { ok: false; error: string };

async function guard(name: string, fn: () => Promise<{ message: string; password?: string }>): Promise<StudentActionResult> {
  try {
    return { ok: true, ...(await fn()) };
  } catch (e) {
    if (e instanceof UserFacingError) return { ok: false, error: e.message };
    if (e instanceof z.ZodError) return { ok: false, error: e.issues[0]?.message ?? "Dados inválidos." };
    await logEvent(`${name}.failed`, { error: (e as Error).message });
    return { ok: false, error: "Não foi possível concluir. Tente novamente." };
  }
}

const str = (v: unknown) => (typeof v === "string" ? v : "");

export async function setPlanAction(userId: string, data: { planId: string; expiresOn?: string }): Promise<StudentActionResult> {
  const admin = await requireAdmin();
  const r = await guard("admin.plan", async () => {
    await enforceRateLimit(admin.id, "admin_students", 60);
    await setStudentPlan(admin, userId, { planId: str(data?.planId), expiresOn: str(data?.expiresOn) });
    return { message: "Plano atualizado." };
  });
  if (r.ok) revalidatePath("/admin/alunos");
  return r;
}

export async function markPaidAction(userId: string, data: { planId: string; period: string; amount?: string; note?: string }): Promise<StudentActionResult> {
  const admin = await requireAdmin();
  const r = await guard("admin.paid", async () => {
    await enforceRateLimit(admin.id, "admin_students", 60);
    const { periodEnd } = await markStudentPaid(admin, userId, { planId: str(data?.planId), period: str(data?.period), amount: str(data?.amount), note: str(data?.note) });
    return { message: `Pagamento registrado. Plano vale até ${new Date(periodEnd).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}.` };
  });
  if (r.ok) revalidatePath("/admin/alunos");
  return r;
}

export async function resetPasswordAction(userId: string, typed?: string): Promise<StudentActionResult> {
  const admin = await requireAdmin();
  return guard("admin.password", async () => {
    await enforceRateLimit(admin.id, "admin_password", 20);
    const { password } = await resetStudentPassword(admin, userId, str(typed));
    return { message: "Senha nova definida. Repasse ao aluno: ela não aparece de novo.", password };
  });
}
