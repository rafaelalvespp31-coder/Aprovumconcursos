"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Button, inputClass, Tag } from "@/components/ui";
import { PERIOD_LABELS, type BillingPeriod, type PlanId, type PlanState } from "@/domain/plans/limits";
import { ADMIN_OFFERS, OFFERS, OFFER_KEYS, offerName, offerStorage, storedOffer, type AdminOffer, type OfferKey } from "@/domain/plans/offers";
import { formatWhatsapp } from "@/domain/contact/whatsapp";
import type { StudentActionResult } from "./actions";

export interface StudentItem {
  id: string;
  name: string | null;
  email: string | null;
  createdAt: string;
  lastSignInAt: string | null;
  whatsapp?: string | null;
  confirmed: boolean;
  isAdmin: boolean;
  isGhost?: boolean;
  planId: string;
  effectivePlanId: PlanId;
  state: PlanState;
  billingPeriod: BillingPeriod | null;
  periodEnd: string | null;
  paidAt: string | null;
  lastPayment: { period: string; amountCents: number | null; paidAt: string; planId: string } | null;
}

export interface StudentActions {
  setPlan: (id: string, data: { offer: string; expiresOn?: string }) => Promise<StudentActionResult>;
  markPaid: (id: string, data: { offer: string; amount?: string; note?: string }) => Promise<StudentActionResult>;
  resetPassword: (id: string, typed?: string) => Promise<StudentActionResult>;
  setGhost?: (id: string, ghost: boolean) => Promise<StudentActionResult>;
}

const TZ = { timeZone: "America/Sao_Paulo" } as const;
const date = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("pt-BR", TZ) : "—");
const dateTime = (iso: string | null) => (iso ? new Date(iso).toLocaleString("pt-BR", { ...TZ, dateStyle: "short", timeStyle: "short" }) : "nunca");
const money = (c: number | null) => (c === null ? "" : (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }));
const daysLeft = (iso: string | null) => (iso ? Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000) : null);
const studentOffer = (s: StudentItem): AdminOffer => storedOffer(s.planId, s.billingPeriod, !!s.periodEnd);
const paymentOffer = (p: { period: string; planId: string }): AdminOffer => (p.period === "vitalicio" ? "vitalicio" : p.planId === "free" ? "gratuito" : (p.period as OfferKey));
const offerOption = (o: AdminOffer) => (o === "gratuito" ? `${offerName(o)} (1 aula e 5 questões por dia)` : `${offerName(o)} · ${OFFERS[o].price} ${OFFERS[o].per}`);

function StatusTag({ s }: { s: StudentItem }) {
  if (s.state === "ativo") {
    const d = daysLeft(s.periodEnd);
    return <Tag tone={d !== null && d <= 7 ? "ambar" : "verde"}>{d === null ? "Pago · sem vencimento" : d <= 7 ? `Pago · vence em ${d} dia${d === 1 ? "" : "s"}` : "Pago · ativo"}</Tag>;
  }
  if (s.state === "expirado") return <Tag tone="vermelho">Expirado</Tag>;
  if (s.state === "cancelado") return <Tag tone="vermelho">Cancelado</Tag>;
  return <Tag tone="neutro">Gratuito</Tag>;
}

/**
 * Alunos cadastrados: busca, filtro por plano e, em cada aluno, mudar o plano, marcar como PAGO
 * (mensal, semestral ou anual) e definir uma senha nova.
 */
export function StudentsTable({ students, actions }: { students: StudentItem[]; actions: StudentActions }) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"todos" | "gratuito" | "pago" | "expirado" | "vencendo">("todos");
  const [open, setOpen] = useState<string | null>(null);
  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return students.filter((s) => {
      if (t && !`${s.name ?? ""} ${s.email ?? ""}`.toLowerCase().includes(t)) return false;
      if (filter === "gratuito") return s.state === "gratuito";
      if (filter === "pago") return s.state === "ativo";
      if (filter === "expirado") return s.state === "expirado" || s.state === "cancelado";
      if (filter === "vencendo") {
        const d = daysLeft(s.periodEnd);
        return s.state === "ativo" && d !== null && d <= 7;
      }
      return true;
    });
  }, [students, q, filter]);

  return (
    <div className="mt-5">
      <div className="flex flex-wrap gap-2" role="search">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nome ou e-mail" aria-label="Buscar por nome ou e-mail" className="min-h-10 min-w-[240px] flex-1 rounded-md border border-linha-forte px-3 t-small" />
        <select value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)} aria-label="Filtrar por plano" className="min-h-10 rounded-md border border-linha-forte px-3 t-small">
          <option value="todos">Todos</option>
          <option value="gratuito">Gratuitos</option>
          <option value="pago">Pagos ativos</option>
          <option value="vencendo">Vencendo em 7 dias</option>
          <option value="expirado">Expirados ou cancelados</option>
        </select>
      </div>
      <p className="mt-2 t-small text-tinta-suave" data-testid="alunos-contagem">
        {list.length} de {students.length} aluno{students.length === 1 ? "" : "s"}
      </p>
      <div className="mt-2 overflow-x-auto rounded-lg border border-linha">
        <table className="w-full min-w-[920px] t-small">
          <thead className="bg-nevoa text-left">
            <tr>
              <th className="px-3 py-2">Aluno</th>
              <th className="px-3 py-2">Cadastro</th>
              <th className="px-3 py-2">Plano adquirido</th>
              <th className="px-3 py-2">Situação</th>
              <th className="px-3 py-2">Vence em</th>
              <th className="px-3 py-2">Último pagamento</th>
              <th className="px-3 py-2">
                <span className="sr-only">Ações</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-linha">
            {list.map((s) => (
              <StudentRowView key={s.id} s={s} open={open === s.id} onToggle={() => setOpen((o) => (o === s.id ? null : s.id))} actions={actions} />
            ))}
            {!list.length && (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-tinta-suave">
                  Nenhum aluno encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StudentRowView({ s, open, onToggle, actions }: { s: StudentItem; open: boolean; onToggle: () => void; actions: StudentActions }) {
  return (
    <>
      <tr data-testid="aluno-linha" data-aluno={s.email ?? s.id}>
        <td className="px-3 py-2">
          <p className="font-semibold">
            {s.name || "(sem nome)"} {s.isAdmin && <Tag tone="azul">Admin</Tag>} {s.isGhost && <Tag tone="neutro">Fantasma</Tag>}
          </p>
          <p className="t-tiny text-tinta-fraca">
            {s.email ?? "—"}
            {!s.confirmed && " · e-mail não confirmado"}
          </p>
          <p className="t-tiny text-tinta-fraca" data-testid="aluno-whatsapp">
            WhatsApp: {s.whatsapp ? <a href={`https://wa.me/${s.whatsapp}`} target="_blank" rel="noopener noreferrer" className="font-semibold text-azul underline">{formatWhatsapp(s.whatsapp)}</a> : "não informado"}
          </p>
          <p className="t-tiny text-tinta-fraca">Último acesso: {dateTime(s.lastSignInAt)}</p>
        </td>
        <td className="px-3 py-2 tabular-nums">{date(s.createdAt)}</td>
        <td className="px-3 py-2">
          <span className="font-semibold">{offerName(studentOffer(s))}</span>
          {s.billingPeriod && s.planId !== "free" && <span className="text-tinta-fraca"> · {PERIOD_LABELS[s.billingPeriod]}</span>}
        </td>
        <td className="px-3 py-2">
          <StatusTag s={s} />
        </td>
        <td className="px-3 py-2 tabular-nums">{s.planId === "free" ? "—" : s.periodEnd ? date(s.periodEnd) : "sem vencimento"}</td>
        <td className="px-3 py-2">
          {s.lastPayment ? (
            <>
              <span className="tabular-nums">{date(s.lastPayment.paidAt)}</span>
              <span className="block t-tiny text-tinta-fraca">
                {offerName(paymentOffer(s.lastPayment))} {money(s.lastPayment.amountCents)}
              </span>
            </>
          ) : (
            "—"
          )}
        </td>
        <td className="px-3 py-2 text-right">
          <button type="button" onClick={onToggle} aria-expanded={open} className="font-semibold text-destaque underline underline-offset-2" data-testid="gerenciar-aluno">
            {open ? "Fechar" : "Gerenciar"}
          </button>
        </td>
      </tr>
      {open && (
        <tr>
          <td colSpan={7} className="bg-nevoa px-3 py-4">
            <ManagePanel s={s} actions={actions} />
          </td>
        </tr>
      )}
    </>
  );
}

function ManagePanel({ s, actions }: { s: StudentItem; actions: StudentActions }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [res, setRes] = useState<StudentActionResult | null>(null);
  const [offer, setOffer] = useState<AdminOffer>(studentOffer(s));
  const [expires, setExpires] = useState(s.periodEnd ? new Date(s.periodEnd).toLocaleDateString("en-CA", TZ) : "");
  const [paidOffer, setPaidOffer] = useState<OfferKey>(studentOffer(s) === "gratuito" ? "mensal" : (studentOffer(s) as OfferKey));
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [typed, setTyped] = useState("");
  const [confirmPw, setConfirmPw] = useState(false);

  const run = (fn: () => Promise<StudentActionResult>, refresh = true) =>
    start(async () => {
      const r = await fn().catch((): StudentActionResult => ({ ok: false, error: "Sem conexão. Tente de novo." }));
      setRes(r);
      if (r.ok && refresh) router.refresh();
    });

  return (
    <div className="grid gap-4 lg:grid-cols-3" data-testid="painel-aluno">
      <form
        className="flex flex-col gap-2 rounded-md border border-linha bg-superficie p-3"
        aria-label="Marcar como pago"
        onSubmit={(e) => {
          e.preventDefault();
          run(() => actions.markPaid(s.id, { offer: paidOffer, amount, note }));
        }}
      >
        <p className="font-bold">Marcar como PAGO</p>
        <fieldset className="flex flex-col gap-1">
          <legend className="t-small font-semibold">Plano pago</legend>
          <div className="flex flex-col gap-1 t-small">
            {OFFER_KEYS.map((o) => (
              <label key={o} className="flex items-center gap-1.5">
                <input type="radio" name={`plano-pago-${s.id}`} value={o} checked={paidOffer === o} onChange={() => setPaidOffer(o)} /> {offerName(o)} · {OFFERS[o].price} <span className="text-tinta-fraca">({OFFERS[o].per})</span>
              </label>
            ))}
          </div>
        </fieldset>
        <label className="flex flex-col gap-1 t-small font-semibold">
          Valor pago (opcional)
          <input value={amount} onChange={(e) => setAmount(e.target.value)} className={inputClass} placeholder={`ex.: ${(OFFERS[paidOffer].cents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} inputMode="decimal" />
        </label>
        <label className="flex flex-col gap-1 t-small font-semibold">
          Observação (opcional)
          <input value={note} onChange={(e) => setNote(e.target.value)} className={inputClass} placeholder="ex.: Pix em 29/10" maxLength={300} />
        </label>
        <p className="t-tiny text-tinta-fraca">O vencimento soma o período ao vencimento atual (se ainda vigente) ou começa hoje. O Comando Supremo é vitalício, sem vencimento.</p>
        <Button type="submit" disabled={pending} data-testid="marcar-pago">
          Marcar como PAGO
        </Button>
      </form>

      <form
        className="flex flex-col gap-2 rounded-md border border-linha bg-superficie p-3"
        aria-label="Mudar plano"
        onSubmit={(e) => {
          e.preventDefault();
          run(() => actions.setPlan(s.id, { offer, expiresOn: offerStorage(offer).period ? expires : "" }));
        }}
      >
        <p className="font-bold">Mudar plano</p>
        <label className="flex flex-col gap-1 t-small font-semibold">
          Plano
          <select value={offer} onChange={(e) => setOffer(e.target.value as AdminOffer)} className={inputClass} data-testid="mudar-plano-select">
            {ADMIN_OFFERS.map((o) => (
              <option key={o} value={o}>
                {offerOption(o)}
              </option>
            ))}
          </select>
        </label>
        {offerStorage(offer).period && (
          <label className="flex flex-col gap-1 t-small font-semibold">
            Vence em (vazio = soma o período a partir de hoje)
            <input type="date" value={expires} onChange={(e) => setExpires(e.target.value)} className={inputClass} />
          </label>
        )}
        <p className="t-tiny text-tinta-fraca">Muda o plano sem registrar pagamento (cortesia, correção ou volta ao Recruta).</p>
        <Button type="submit" variant="secundario" disabled={pending} data-testid="salvar-plano">
          Salvar plano
        </Button>
      </form>

      <div className="flex flex-col gap-2 rounded-md border border-linha bg-superficie p-3">
        <p className="font-bold">Senha nova</p>
        <label className="flex flex-col gap-1 t-small font-semibold">
          Digite uma senha (ou deixe vazio para gerar)
          <input value={typed} onChange={(e) => setTyped(e.target.value)} className={inputClass} placeholder="mín. 8, com letras e números" autoComplete="new-password" />
        </label>
        {confirmPw ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="t-small font-semibold">Trocar a senha de {s.email}?</span>
            <Button
              variant="perigo"
              disabled={pending}
              onClick={() => {
                setConfirmPw(false);
                run(() => actions.resetPassword(s.id, typed), false);
              }}
              data-testid="confirmar-senha"
            >
              Sim, trocar
            </Button>
            <Button variant="secundario" onClick={() => setConfirmPw(false)}>
              Não
            </Button>
          </div>
        ) : (
          <Button variant="secundario" disabled={pending} onClick={() => setConfirmPw(true)} data-testid="refazer-senha">
            Definir senha nova
          </Button>
        )}
        <p className="t-tiny text-tinta-fraca">A senha antiga deixa de valer na hora. A nova aparece só uma vez, aqui.</p>
      </div>

      {actions.setGhost && (
        <div className="flex flex-col gap-2 rounded-md border border-linha bg-superficie p-3 lg:col-span-3" data-testid="painel-fantasma">
          <p className="font-bold">Conta fantasma</p>
          <p className="t-tiny text-tinta-fraca">
            {s.isGhost
              ? "Esta conta está fantasma: não conta nos indicadores do sócio (cadastros, pagantes, faturamento e listas). Você segue vendo e administrando normalmente."
              : "Tira esta conta (paga ou não) de todos os indicadores do sócio. Não muda plano, pagamento nem acesso do aluno. Só você vê."}
          </p>
          <Button variant="secundario" disabled={pending} onClick={() => run(() => actions.setGhost!(s.id, !s.isGhost))} data-testid="alternar-fantasma">
            {s.isGhost ? "Voltar a aparecer nos indicadores" : "Tornar fantasma"}
          </Button>
        </div>
      )}

      {res && (
        <div className="lg:col-span-3" role={res.ok ? "status" : "alert"} data-testid="aluno-aviso">
          {res.ok ? (
            <p className="t-small font-semibold text-tinta">
              {res.message}
              {res.password && (
                <span className="ml-2 inline-flex items-center gap-2">
                  <code className="rounded bg-tinta px-2 py-1 font-mono text-white" data-testid="senha-nova">
                    {res.password}
                  </code>
                  <button type="button" className="t-tiny font-semibold text-destaque underline" onClick={() => void navigator.clipboard?.writeText(res.password!).catch(() => undefined)}>
                    Copiar
                  </button>
                </span>
              )}
            </p>
          ) : (
            <p className="t-small font-semibold text-erro">{res.error}</p>
          )}
        </div>
      )}
    </div>
  );
}
