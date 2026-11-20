import { cookies } from "next/headers";
import { requireUser } from "@/server/auth";
import { normalizeCouponCode } from "@/domain/partners/coupon";
import { PARTNER_COOKIE, VISITOR_COOKIE, linkReferralToUser } from "@/server/services/referrals";
import { listMyPayments, mpConfigured } from "@/server/services/payments";
import { OFFERS } from "@/domain/plans/offers";
import { PAY_STATUS_LABEL } from "@/domain/payments/mercadopago";
import { getProfile } from "@/server/queries";
import { effectivePlan } from "@/domain/plans/limits";
import { currentOffer } from "@/domain/plans/offers";
import { choosePlanAction } from "./actions";
import { PlanoView } from "./view";

export const metadata = { title: "Meu Plano" };

export default async function PlanoPage() {
  const user = await requireUser("/plano");
  const { subscription } = await getProfile();
  const sub = subscription as unknown as { plan_id: string; status: string; current_period_end?: string | null; billing_period?: string | null } | null;
  const eff = effectivePlan(sub ? { planId: sub.plan_id, status: sub.status, currentPeriodEnd: sub.current_period_end ?? null } : null);
  const publicKey = process.env.NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY?.trim();
  // Link de parceiro (?ref=CODIGO): o código fica guardado e vem no campo de cupom; o desconto só entra quando o aluno clica em Aplicar.
  const jar = await cookies();
  const refCupom = normalizeCouponCode(jar.get(PARTNER_COOKIE)?.value);
  await linkReferralToUser(user.id, jar.get(VISITOR_COOKIE)?.value);
  const mp = publicKey && mpConfigured() ? { publicKey, email: user.email ?? null, refCupom } : null;
  const history = await listMyPayments(user.id).catch(() => []);
  return (
    <>
      <PlanoView current={currentOffer(eff.paid, sub?.billing_period ?? null, !!sub?.current_period_end)} choose={choosePlanAction} mp={mp} />
      {history.length > 0 && (
        <section className="plano-hist" data-testid="plano-historico" aria-label="Histórico de pagamentos">
          <h2>Histórico de pagamentos</h2>
          <ul>
            {history.map((p) => (
              <li key={p.id}>
                <span>{new Date(p.createdAt).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}</span>
                <span>{OFFERS[p.offer].label}</span>
                <span>{(p.amountCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
                <span>{p.method === "pix" ? "PIX" : p.installments && p.installments > 1 ? `Cartão ${p.installments}x` : "Cartão"}</span>
                <b className={`plano-st plano-st-${p.status}`}>{PAY_STATUS_LABEL[p.status]}</b>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
