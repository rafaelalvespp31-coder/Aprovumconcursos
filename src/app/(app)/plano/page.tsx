import { requireUser } from "@/server/auth";
import { getProfile } from "@/server/queries";
import { effectivePlan } from "@/domain/plans/limits";
import { currentOffer } from "@/domain/plans/offers";
import { choosePlanAction } from "./actions";
import { PlanoView } from "./view";

export const metadata = { title: "Meu Plano" };

export default async function PlanoPage() {
  await requireUser("/plano");
  const { subscription } = await getProfile();
  const sub = subscription as unknown as { plan_id: string; status: string; current_period_end?: string | null; billing_period?: string | null } | null;
  const eff = effectivePlan(sub ? { planId: sub.plan_id, status: sub.status, currentPeriodEnd: sub.current_period_end ?? null } : null);
  return <PlanoView current={currentOffer(eff.paid, sub?.billing_period ?? null, !!sub?.current_period_end)} choose={choosePlanAction} />;
}
