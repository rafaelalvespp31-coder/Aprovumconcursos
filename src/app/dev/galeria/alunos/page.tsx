"use client";

import { useState, useSyncExternalStore } from "react";
import { StudentsTable, type StudentItem } from "@/app/admin/alunos/students-table";
import { effectivePlan, nextPeriodEnd } from "@/domain/plans/limits";
import { offerStorage, type AdminOffer } from "@/domain/plans/offers";

const DAY = 86_400_000;
const iso = (offsetDays: number) => new Date(Date.now() + offsetDays * DAY).toISOString();
const base = (over: Partial<StudentItem>): StudentItem => ({
  id: "00000000-0000-4000-8000-000000000a01", name: "Aluno", email: "aluno@exemplo.com", createdAt: iso(-30), lastSignInAt: iso(-1), confirmed: true, isAdmin: false,
  planId: "free", effectivePlanId: "free", state: "gratuito", billingPeriod: null, periodEnd: null, paidAt: null, lastPayment: null, ...over,
});

const INITIAL = (): StudentItem[] => [
  base({ id: "00000000-0000-4000-8000-000000000a01", name: "Ana Souza", email: "ana@exemplo.com", createdAt: iso(-2) }),
  base({ id: "00000000-0000-4000-8000-000000000a02", name: "Bruno Lima", email: "bruno@exemplo.com", planId: "premium", effectivePlanId: "premium", state: "ativo", billingPeriod: "anual", periodEnd: iso(200), paidAt: iso(-165), lastPayment: { period: "anual", amountCents: 29900, paidAt: iso(-165), planId: "premium" } }),
  base({ id: "00000000-0000-4000-8000-000000000a03", name: "Carla Dias", email: "carla@exemplo.com", planId: "pro", effectivePlanId: "pro", state: "ativo", billingPeriod: "mensal", periodEnd: iso(3), paidAt: iso(-27), lastPayment: { period: "mensal", amountCents: 2990, paidAt: iso(-27), planId: "pro" } }),
  base({ id: "00000000-0000-4000-8000-000000000a04", name: "Diego Melo", email: "diego@exemplo.com", planId: "premium", effectivePlanId: "free", state: "expirado", billingPeriod: "semestral", periodEnd: iso(-5), lastPayment: { period: "semestral", amountCents: 14900, paidAt: iso(-190), planId: "premium" } }),
];

/** Galeria: página de alunos do admin com dados fictícios (nada é gravado). */
const noop = () => () => {};

export default function Page() {
  // Datas relativas a "agora": desenha só no navegador (servidor e navegador não divergem).
  const mounted = useSyncExternalStore(noop, () => true, () => false);
  return mounted ? <Demo /> : <h1 className="t-h1">Alunos (prévia)</h1>;
}

function Demo() {
  const [rows, setRows] = useState(() => INITIAL());
  const patch = (id: string, f: (s: StudentItem) => StudentItem) => setRows((r) => r.map((s) => (s.id === id ? f(s) : s)));
  const recompute = (s: StudentItem): StudentItem => {
    const e = effectivePlan({ planId: s.planId, status: "active", currentPeriodEnd: s.periodEnd });
    return { ...s, effectivePlanId: e.planId, state: e.state };
  };
  return (
    <div>
      <h1 className="t-h1">Alunos (prévia)</h1>
      <StudentsTable
        students={rows}
        actions={{
          setPlan: async (id, d) => {
            const st = offerStorage(d.offer as AdminOffer);
            const end = st.period ? (d.expiresOn ? new Date(`${d.expiresOn}T23:59:59-03:00`).toISOString() : nextPeriodEnd(null, st.period).toISOString()) : null;
            patch(id, (s) => recompute({ ...s, planId: st.planId, periodEnd: end, billingPeriod: st.period }));
            return { ok: true, message: "Plano atualizado." };
          },
          markPaid: async (id, d) => {
            const s = rows.find((x) => x.id === id)!;
            const st = offerStorage(d.offer as AdminOffer);
            const end = st.period ? nextPeriodEnd(s.state === "ativo" ? s.periodEnd : null, st.period).toISOString() : null;
            const cents = d.amount ? Math.round(Number(d.amount.replace(",", ".")) * 100) : null;
            patch(id, (x) => recompute({ ...x, planId: st.planId, periodEnd: end, billingPeriod: st.period, paidAt: new Date().toISOString(), lastPayment: { period: st.period ?? "vitalicio", amountCents: cents, paidAt: new Date().toISOString(), planId: st.planId } }));
            return { ok: true, message: `Pagamento registrado. ${end ? `Plano vale até ${new Date(end).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}.` : "Plano vitalício, sem vencimento."}` };
          },
          resetPassword: async (_id, typed) => {
            if (typed && (typed.length < 8 || !/\d/.test(typed))) return { ok: false, error: "A senha precisa ter pelo menos 8 caracteres." };
            return { ok: true, message: "Senha nova definida. Repasse ao aluno: ela não aparece de novo.", password: typed || "Xk7mPq2Rta9w" };
          },
        }}
      />
    </div>
  );
}
