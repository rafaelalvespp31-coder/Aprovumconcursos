"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { availableActions, type BankAction, type BankRoles, type Checklist } from "@/domain/bank/workflow";
import type { BankStatus } from "@/domain/bank/labels";
import { decideAction } from "../../actions";
import { DNotice, dButton, dInput } from "../../ui";

const CHECK_LABEL: Record<keyof Checklist, string> = {
  content: "Conteúdo correto, claro e sem ambiguidade",
  answer: "Gabarito e justificativas conferidos",
  source: "Fonte e referências verificáveis (nada inventado)",
  rights: "Direito de uso confirmado",
};

export function DecisionPanel({
  id,
  status,
  roles,
  isCreator,
  rightsOk,
  checklist,
}: {
  id: string;
  status: BankStatus;
  roles: BankRoles;
  isCreator: boolean;
  rightsOk: boolean;
  checklist: Checklist;
}) {
  const canCheck = status === "em_revisao" && (roles.revisor || roles.admin);
  const router = useRouter();
  const [pending, start] = useTransition();
  const [checks, setChecks] = useState<Checklist>(checklist);
  const [reason, setReason] = useState("");
  const [chosen, setChosen] = useState<BankAction | null>(null);
  const [msg, setMsg] = useState<{ tone: "ok" | "erro"; text: string } | null>(null);
  const dirty = (Object.keys(checks) as Array<keyof Checklist>).some((k) => checks[k] !== checklist[k]);
  const actions = availableActions(status, roles, { isCreator, checklist: checks, rightsOk });

  const go = (to: BankAction["to"] | null) =>
    start(async () => {
      setMsg(null);
      const r = await decideAction(id, to, reason, canCheck && (dirty || to === "aprovada") ? checks : undefined);
      if (!r.ok) return setMsg({ tone: "erro", text: r.error ?? "Erro." });
      setMsg({ tone: "ok", text: to ? "Decisão registrada." : "Checklist salvo." });
      setReason("");
      setChosen(null);
      router.refresh();
    });

  return (
    <div className="flex flex-col gap-4">
      {canCheck && (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-[13px] font-semibold uppercase tracking-[0.08em] text-white/60">Checklist do revisor</legend>
          {(Object.keys(CHECK_LABEL) as Array<keyof Checklist>).map((k) => (
            <label key={k} className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-md border px-3 ${checks[k] ? "border-emerald-400/50 bg-emerald-400/[0.08]" : "border-white/10"}`}>
              <input type="checkbox" checked={checks[k]} onChange={(e) => setChecks((c) => ({ ...c, [k]: e.target.checked }))} className="size-5 accent-emerald-500" />
              <span className="text-[14px]">{CHECK_LABEL[k]}</span>
            </label>
          ))}
          {dirty && (
            <button type="button" disabled={pending} onClick={() => go(null)} className={`${dButton("secundario")} self-start`}>
              Salvar checklist
            </button>
          )}
        </fieldset>
      )}

      <div className="flex flex-wrap gap-2">
        {actions.map((a) => {
          return (
            <button
              key={a.to}
              type="button"
              disabled={pending || !!a.blocked}
              title={a.blocked ?? undefined}
              onClick={() => (a.needsReason ? setChosen(a) : go(a.to))}
              className={dButton(a.tone)}
            >
              {a.label}
            </button>
          );
        })}
      </div>
      {actions.some((a) => a.blocked) && (
        <ul className="flex flex-col gap-1 text-[12px] text-white/50">
          {actions
            .filter((a) => a.blocked)
            .map((a) => (
              <li key={a.to}>
                {a.label}: {a.blocked}
              </li>
            ))}
        </ul>
      )}

      {chosen && (
        <div className="entrar flex flex-col gap-2 rounded-lg border border-white/15 bg-white/[0.04] p-3">
          <label htmlFor="reason" className="text-[14px] font-semibold">Motivo — {chosen.label}</label>
          <textarea id="reason" value={reason} onChange={(e) => setReason(e.target.value)} rows={3} maxLength={2000} className={`${dInput} py-2`} placeholder="Fica registrado no histórico (mínimo 5 caracteres)." autoFocus />
          <div className="flex gap-2">
            <button type="button" disabled={pending || reason.trim().length < 5} onClick={() => go(chosen.to)} className={dButton(chosen.tone)}>
              {pending ? "Registrando…" : "Confirmar"}
            </button>
            <button type="button" onClick={() => setChosen(null)} className={dButton("discreto")}>Cancelar</button>
          </div>
        </div>
      )}
      {msg && <DNotice tone={msg.tone}>{msg.text}</DNotice>}
    </div>
  );
}
