"use client";

import { useState, useTransition } from "react";
import { Button, inputClass } from "@/components/ui";
import type { AvatarRequestAdminRow } from "@/server/services/avatar";

const LABEL = { enviada: "Recebida", em_producao: "Em produção", concluida: "Concluída", recusada: "Recusada" } as const;

function Row({ r, action }: { r: AvatarRequestAdminRow; action: (id: string, s: string, n: string) => Promise<{ ok: boolean; error?: string }> }) {
  const [status, setStatus] = useState<string>(r.status);
  const [note, setNote] = useState(r.note ?? "");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <li className="flex flex-col gap-3 rounded-lg border border-linha bg-superficie p-4 sm:flex-row">
      {r.photoUrl ? (
        <a href={r.photoUrl} target="_blank" rel="noreferrer" className="shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={r.photoUrl} alt={`Foto de ${r.name ?? "aluno"}`} className="h-48 w-36 rounded-md object-cover" />
        </a>
      ) : (
        <div className="flex h-48 w-36 items-center justify-center rounded-md bg-nevoa t-tiny">sem foto</div>
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <p className="font-bold">{r.name ?? "Aluno"}</p>
        <p className="t-small text-tinta-suave">{r.email}</p>
        <p className="t-tiny text-tinta-fraca">Enviada em {new Date(r.createdAt).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" })}</p>
        <label className="flex flex-col gap-1 t-small font-semibold">
          Situação
          <select className={inputClass} value={status} onChange={(e) => setStatus(e.target.value)}>
            {Object.entries(LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 t-small font-semibold">
          Recado ao aluno (opcional)
          <input className={inputClass} value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} placeholder="Ex.: foto escura, envie outra com mais luz" />
        </label>
        <div className="flex items-center gap-3">
          <Button type="button" disabled={pending} onClick={() => start(async () => setMsg((await action(r.id, status, note)).error ?? "Salvo."))}>
            {pending ? "Salvando…" : "Salvar"}
          </Button>
          {msg && <span className="t-small">{msg}</span>}
        </div>
      </div>
    </li>
  );
}

export function RequestsList({ rows, action }: { rows: AvatarRequestAdminRow[]; action: (id: string, s: string, n: string) => Promise<{ ok: boolean; error?: string }> }) {
  if (!rows.length) return <p className="mt-4 t-small text-tinta-suave">Nenhuma solicitação ainda.</p>;
  return (
    <ul className="mt-4 flex flex-col gap-3">
      {rows.map((r) => (
        <Row key={r.id} r={r} action={action} />
      ))}
    </ul>
  );
}
