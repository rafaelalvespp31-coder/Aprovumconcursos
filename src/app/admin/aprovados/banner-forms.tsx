"use client";

import { useState, useTransition } from "react";
import type { ApprovedBannerRow } from "@/server/services/approved-banners";

type Result = { ok: boolean; error?: string };
const input = "mt-1 w-full rounded border border-linha bg-superficie px-2 py-1.5 text-sm";

/** A hospedagem aceita até ~4,5 MB por envio: fotos grandes são reduzidas no aparelho antes. */
async function shrink(file: File): Promise<File> {
  if (file.size <= 3_500_000) return file;
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 2600 / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * scale);
    c.height = Math.round(bmp.height * scale);
    c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
    const blob = await new Promise<Blob | null>((r) => c.toBlob(r, "image/jpeg", 0.9));
    return blob ? new File([blob], "aprovado.jpg", { type: "image/jpeg" }) : file;
  } catch {
    return file;
  }
}

export function NewBannerForm({ action }: { action: (f: FormData) => Promise<Result> }) {
  const [msg, setMsg] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <form
      className="grid gap-3 rounded-lg border border-linha bg-superficie p-4 sm:grid-cols-[1fr_1fr]"
      data-testid="aprovado-form-novo"
      action={(fd) =>
        start(async () => {
          const f = fd.get("foto");
          if (f instanceof File && f.size) fd.set("foto", await shrink(f));
          const r = await action(fd);
          setMsg(r.ok ? "Banner publicado no painel." : r.error ?? "Erro.");
          if (r.ok) setPreview(null);
        })
      }
    >
      <label className="text-sm">
        Foto ou arte do aprovado* (JPG, PNG ou WEBP)
        <input name="foto" type="file" required accept="image/jpeg,image/png,image/webp" className="mt-1 block text-sm" data-testid="aprovado-foto"
          onChange={(e) => {
            const f = e.currentTarget.files?.[0];
            setPreview(f ? URL.createObjectURL(f) : null);
          }} />
        <span className="mt-1 block t-small text-tinta-suave">Ideal: arte no formato do banner (2000 × 711). Foto em outro formato aparece inteira, sem cortes, com laterais desfocadas.</span>
      </label>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {preview ? <img src={preview} alt="Prévia" className="h-32 w-full rounded border border-linha object-contain bg-black" /> : <div />}
      <label className="text-sm sm:col-span-2">
        Nome e aprovações* (também é lido por leitores de tela)
        <input name="alt" required maxLength={400} className={input} placeholder="Nosso aluno aprovado João Silva. Aprovado em: Polícia Penal MG e PMMG." />
      </label>
      <label className="text-sm">Ordem no carrossel<input name="ordem" type="number" min={0} max={999} defaultValue={0} className={input} /></label>
      <div className="flex items-end gap-3">
        <button type="submit" disabled={pending} className="rounded bg-tinta px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{pending ? "Enviando…" : "Publicar no banner"}</button>
        {msg && <span role="status" className="t-small">{msg}</span>}
      </div>
    </form>
  );
}

export function BannerItem({ b, update, remove }: { b: ApprovedBannerRow; update: (id: string, f: FormData) => Promise<Result>; remove: (id: string) => Promise<Result> }) {
  const [msg, setMsg] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [pending, start] = useTransition();
  return (
    <form
      className="grid gap-3 rounded-lg border border-linha bg-superficie p-3 sm:grid-cols-[260px_1fr]"
      data-testid={`aprovado-${b.id}`}
      action={(fd) => start(async () => { const r = await update(b.id, fd); setMsg(r.ok ? "Salvo." : r.error ?? "Erro."); })}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={b.srcSm} alt={b.alt} className="w-full rounded border border-linha" />
      <div className="grid gap-2">
        <label className="text-sm">Nome e aprovações<input name="alt" defaultValue={b.alt} maxLength={400} className={input} /></label>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <label className="flex items-center gap-2">Ordem<input name="ordem" type="number" min={0} max={999} defaultValue={b.sortOrder} className="w-20 rounded border border-linha px-2 py-1" /></label>
          <label className="flex items-center gap-2"><input type="checkbox" name="ativo" defaultChecked={b.active} /> Mostrar no painel</label>
          <button type="submit" disabled={pending} className="rounded bg-tinta px-3 py-1.5 font-semibold text-white disabled:opacity-60">Salvar</button>
          {!confirm ? (
            <button type="button" className="rounded border border-linha px-3 py-1.5" onClick={() => setConfirm(true)}>Excluir</button>
          ) : (
            <span className="flex items-center gap-2">
              Excluir de vez?
              <button type="button" className="rounded bg-red-700 px-3 py-1.5 font-semibold text-white" disabled={pending}
                onClick={() => start(async () => { const r = await remove(b.id); if (!r.ok) setMsg(r.error ?? "Erro."); })}>Sim, excluir</button>
              <button type="button" className="underline" onClick={() => setConfirm(false)}>Cancelar</button>
            </span>
          )}
          {msg && <span role="status" className="t-small">{msg}</span>}
        </div>
      </div>
    </form>
  );
}
