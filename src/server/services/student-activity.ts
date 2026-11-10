import "server-only";
import { createAdminClient } from "../supabase";
import { OFFERS, type OfferKey } from "@/domain/plans/offers";

export type StudentActivityKind = "cadastro" | "pago";

export interface StudentActivity {
  id: string;
  kind: StudentActivityKind;
  at: string;
  userId: string;
  name: string | null;
  email: string | null;
  /** Só para pagamentos: nome do plano comprado e valor, se registrado. */
  plan?: string;
  amountCents?: number | null;
}

const DAY = 86_400_000;

/**
 * Novidades de alunos para a equipe: contas novas e pagamentos de plano (últimos `days` dias, mais recente primeiro).
 * Só admin (quem chama confere). Lê direto das tabelas: nada a manter em separado.
 */
export async function listStudentActivity(days = 30, limit = 40): Promise<StudentActivity[]> {
  const db = createAdminClient();
  const since = new Date(Date.now() - days * DAY).toISOString();
  const [profiles, pays] = await Promise.all([
    db.from("profiles").select("id, display_name, created_at").gte("created_at", since).order("created_at", { ascending: false }).limit(limit),
    db.from("subscription_payments").select("id, user_id, plan_id, period, amount_cents, paid_at").gte("paid_at", since).order("paid_at", { ascending: false }).limit(limit),
  ]);
  const ids = [...new Set([...(profiles.data ?? []).map((p) => p.id as string), ...(pays.data ?? []).map((p) => p.user_id as string)])];
  const info = new Map<string, { name: string | null; email: string | null }>();
  const names = ids.length ? await db.from("profiles").select("id, display_name").in("id", ids) : { data: [] as Array<{ id: string; display_name: string | null }> };
  for (const n of names.data ?? []) info.set(n.id as string, { name: (n.display_name as string | null) || null, email: null });
  await Promise.all(
    ids.map(async (id) => {
      const { data } = await db.auth.admin.getUserById(id);
      const cur = info.get(id) ?? { name: null, email: null };
      info.set(id, { ...cur, email: data?.user?.email ?? null });
    }),
  );
  const label = (planId: string, period: string) => {
    const o = OFFERS[(planId === "premium" && period === "vitalicio" ? "vitalicio" : period) as OfferKey];
    return o ? o.label : `${planId} ${period}`;
  };
  const items: StudentActivity[] = [
    ...(profiles.data ?? []).map((p): StudentActivity => ({ id: `c-${p.id}`, kind: "cadastro", at: p.created_at as string, userId: p.id as string, ...(info.get(p.id as string) ?? { name: null, email: null }) })),
    ...(pays.data ?? []).map((p): StudentActivity => ({
      id: `p-${p.id}`,
      kind: "pago",
      at: p.paid_at as string,
      userId: p.user_id as string,
      ...(info.get(p.user_id as string) ?? { name: null, email: null }),
      plan: label(p.plan_id as string, p.period as string),
      amountCents: (p.amount_cents as number | null) ?? null,
    })),
  ];
  return items.sort((a, b) => b.at.localeCompare(a.at)).slice(0, limit);
}
