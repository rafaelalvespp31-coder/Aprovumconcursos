"use client";

import { useMemo, useState, useTransition } from "react";
import { Button, inputClass } from "@/components/ui";
import type { AvatarRequestAdminRow } from "@/server/services/avatar";
import { CustomAvatar } from "./custom-avatar";

type Res = { ok: boolean; error?: string };
export interface CustomActions { save: (id: string, f: FormData) => Promise<Res>; remove: (id: string, slot: number) => Promise<Res> }
type StatusAction = (id: string, s: string, n: string) => Promise<Res>;

const LABEL = { enviada: "Recebida", em_producao: "Em produção", concluida: "Concluída", recusada: "Recusada" } as const;
const SLOTS = [0, 1, 2] as const;
const when = (iso: string) => new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" });

/** Um aluno = um card: todas as fotos que ele enviou, a situação do pedido mais recente e as 3 vagas de skin. */
function StudentCard({ rows, action, custom }: { rows: AvatarRequestAdminRow[]; action: StatusAction; custom: CustomActions }) {
  const latest = rows[0]!;
  const [status, setStatus] = useState<string>(latest.status);
  const [note, setNote] = useState(latest.note ?? "");
  const [msg, setMsg] = useState<string | null>(null);
  const [slot, setSlot] = useState<number | null>(null);
  const [pending, start] = useTransition();
  const skins = latest.skins;
  return (
    <li className="flex flex-col gap-4 rounded-lg border border-linha bg-superficie p-4" data-testid="avatar-aluno" data-aluno={latest.email ?? latest.userId}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <p className="font-bold">{latest.name ?? "Aluno"}</p>
          <p className="t-small text-tinta-suave">{latest.email}</p>
        </div>
        <p className="t-tiny text-tinta-fraca">
          {rows.length} pedido{rows.length === 1 ? "" : "s"} · skins {skins.length}/3
        </p>
      </div>

      <div>
        <p className="mb-1 t-small font-semibold">Fotos enviadas</p>
        <ul className="flex flex-wrap gap-2">
          {rows.map((r) => (
            <li key={r.id} className="flex flex-col items-center gap-1 t-tiny text-tinta-fraca">
              {r.photoUrl ? (
                <a href={r.photoUrl} target="_blank" rel="noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={r.photoUrl} alt={`Foto de ${r.name ?? "aluno"} enviada em ${when(r.createdAt)}`} className="h-28 w-20 rounded-md object-cover" />
                </a>
              ) : (
                <span className="flex h-28 w-20 items-center justify-center rounded-md bg-nevoa">sem foto</span>
              )}
              <span>{when(r.createdAt)}</span>
              <span>{LABEL[r.status]}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="grid gap-2 sm:grid-cols-[200px_1fr_auto] sm:items-end">
        <label className="flex flex-col gap-1 t-small font-semibold">
          Situação do pedido mais recente
          <select className={inputClass} value={status} onChange={(e) => setStatus(e.target.value)}>
            {Object.entries(LABEL).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 t-small font-semibold">
          Recado ao aluno (opcional)
          <input className={inputClass} value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} placeholder="Ex.: foto escura, envie outra com mais luz" />
        </label>
        <Button type="button" disabled={pending} onClick={() => start(async () => setMsg((await action(latest.id, status, note)).error ?? "Salvo."))}>
          {pending ? "Salvando…" : "Salvar"}
        </Button>
      </div>
      {msg && <p className="t-small" role="status">{msg}</p>}

      <div data-testid="skins-admin">
        <p className="mb-2 t-small font-semibold">Skins do aluno (máximo 3)</p>
        <ul className="grid grid-cols-3 gap-3 sm:max-w-md">
          {SLOTS.map((i) => {
            const s = skins[i];
            const canUse = i <= skins.length;
            return (
              <li key={i} className="flex flex-col items-center gap-1 rounded-md border border-linha p-2 text-center">
                {s ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={s.thumb} alt={`Skin ${i + 1}`} className="h-28 w-full rounded bg-[#111] object-contain" />
                ) : (
                  <span className="flex h-28 w-full items-center justify-center rounded bg-nevoa t-tiny text-tinta-fraca">vaga livre</span>
                )}
                <span className="t-tiny font-semibold">Skin {i + 1}{s?.active ? " · em uso" : ""}</span>
                <button type="button" disabled={!canUse} className="t-small font-semibold text-destaque underline disabled:text-tinta-fraca disabled:no-underline" onClick={() => setSlot(slot === i ? null : i)} data-testid={`skin-anexar-${i + 1}`}>
                  {slot === i ? "Fechar" : s ? "Trocar" : "Anexar"}
                </button>
              </li>
            );
          })}
        </ul>
        {slot !== null && <CustomAvatar key={slot} requestId={latest.id} slot={slot} hasCustom={!!skins[slot]} save={custom.save} remove={custom.remove} />}
      </div>
    </li>
  );
}

export function RequestsList({ rows, action, custom }: { rows: AvatarRequestAdminRow[]; action: StatusAction; custom: CustomActions }) {
  // Um card por aluno (o mais recente primeiro); as linhas já vêm da mais nova para a mais antiga.
  const groups = useMemo(() => {
    const by = new Map<string, AvatarRequestAdminRow[]>();
    for (const r of rows) by.set(r.userId, [...(by.get(r.userId) ?? []), r]);
    return [...by.values()];
  }, [rows]);
  if (!rows.length) return <p className="mt-4 t-small text-tinta-suave">Nenhuma solicitação ainda.</p>;
  return (
    <ul className="mt-4 flex flex-col gap-3">
      {groups.map((g) => (
        <StudentCard key={g[0]!.userId} rows={g} action={action} custom={custom} />
      ))}
    </ul>
  );
}
