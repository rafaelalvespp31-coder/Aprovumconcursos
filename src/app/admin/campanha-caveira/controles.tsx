"use client";

import { useState, useTransition } from "react";
import type { CampanhaResult } from "./actions";

interface Props {
  active?: boolean;
  setActive?: (active: boolean) => Promise<CampanhaResult>;
  userId?: string;
  grant?: (userId: string) => Promise<CampanhaResult>;
  grantId?: string;
  extend?: (grantId: string, days: number) => Promise<CampanhaResult>;
}

const btn = "min-h-9 rounded-md border border-linha bg-superficie px-3 t-small font-semibold hover:bg-superficie-2 disabled:opacity-50";

/** Botões da campanha: ativar/desativar, conceder e estender (cada ação é validada e auditada no servidor). */
export function CampanhaControles({ active, setActive, userId, grant, grantId, extend }: Props) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<CampanhaResult | null>(null);
  const [dias, setDias] = useState(7);
  const run = (fn: () => Promise<CampanhaResult>) => start(async () => setMsg(await fn()));
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      {setActive && (
        <button
          className={`${btn} ${active ? "" : "!bg-[#E10600] !text-white"}`}
          disabled={pending}
          onClick={() => {
            if (!active || window.confirm("Desativar? Ninguém novo recebe os dias; prazos já concedidos continuam.")) run(() => setActive(!active));
          }}
        >
          {active ? "Desativar campanha" : "Ativar campanha"}
        </button>
      )}
      {grant && userId && <button className={btn} disabled={pending} onClick={() => run(() => grant(userId))}>Conceder 7 dias</button>}
      {extend && grantId && (
        <>
          <input type="number" min={1} max={30} value={dias} onChange={(e) => setDias(Number(e.target.value))} aria-label="Dias a estender" className="min-h-9 w-16 rounded-md border border-linha px-2 t-small" />
          <button className={btn} disabled={pending} onClick={() => run(() => extend(grantId, dias))}>Estender</button>
        </>
      )}
      {msg && <span role="status" className={`t-tiny ${msg.ok ? "text-green-700" : "text-red-700"}`}>{msg.ok ? msg.message : msg.error}</span>}
    </div>
  );
}
