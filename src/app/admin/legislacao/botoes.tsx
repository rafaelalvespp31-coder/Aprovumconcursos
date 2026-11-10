"use client";

import { useState, useTransition } from "react";
import type { LegResult } from "./actions";

const btn = "min-h-9 rounded-md border border-linha bg-superficie px-3 t-small font-semibold hover:bg-superficie-2 disabled:opacity-50";

/** Botões da página de legislação. Cada ação é validada e auditada no servidor. */
export function LegBotao({ label, action, confirmText, primary }: { label: string; action: () => Promise<LegResult>; confirmText?: string; primary?: boolean }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<LegResult | null>(null);
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <button
        className={`${btn} ${primary ? "!bg-[#E10600] !text-white" : ""}`}
        disabled={pending}
        onClick={() => {
          if (confirmText && !window.confirm(confirmText)) return;
          start(async () => setMsg(await action()));
        }}
      >
        {pending ? "Aguarde…" : label}
      </button>
      {msg && (
        <span role="status" className={`t-tiny ${msg.ok ? "text-acerto" : "text-erro"}`}>
          {msg.ok ? msg.message : msg.error}
        </span>
      )}
    </span>
  );
}
