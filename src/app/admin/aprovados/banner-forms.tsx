"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import type { ApprovedBannerRow } from "@/server/services/approved-banners";

type Result = { ok: boolean; error?: string };
const input = "mt-1 w-full rounded border border-linha bg-superficie px-2 py-1.5 text-sm";

type Fit = { grande: Blob; pequena: Blob };

/** Encaixa a foto no formato do banner sem cortar: imagem inteira no centro e, nas laterais, ela mesma ampliada e escurecida. */
async function fit(file: File): Promise<Fit> {
  const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
  const render = async (w: number, h: number, q: number) => {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d")!;
    // Fundo: a própria imagem em "cover", reduzida e ampliada (borra sem depender de ctx.filter, que o Safari não tem).
    const tiny = document.createElement("canvas");
    tiny.width = 40;
    tiny.height = Math.max(8, Math.round((40 * h) / w));
    const tctx = tiny.getContext("2d")!;
    const cover = Math.max(tiny.width / bmp.width, tiny.height / bmp.height);
    tctx.drawImage(bmp, (tiny.width - bmp.width * cover) / 2, (tiny.height - bmp.height * cover) / 2, bmp.width * cover, bmp.height * cover);
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(tiny, 0, 0, w, h);
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.fillRect(0, 0, w, h);
    const inside = Math.min(w / bmp.width, h / bmp.height);
    const iw = bmp.width * inside;
    const ih = bmp.height * inside;
    ctx.drawImage(bmp, (w - iw) / 2, (h - ih) / 2, iw, ih);
    return new Promise<Blob>((ok, no) => c.toBlob((b) => (b ? ok(b) : no(new Error("toBlob"))), "image/webp", q));
  };
  try {
    return { grande: await render(2000, 711, 0.86), pequena: await render(1000, 356, 0.84) };
  } finally {
    bmp.close();
  }
}

type Item = { name: string; state: "ajustando" | "enviando" | "ok" | "erro"; msg?: string };

/**
 * Envio prático: escolha ou arraste várias fotos de uma vez. O navegador ajusta cada uma ao banner
 * e já publica (o nome vem do arquivo e pode ser editado depois, na lista abaixo).
 */
export function NewBannerForm({ action }: { action: (f: FormData) => Promise<Result> }) {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState(false);
  const alt = useRef<HTMLInputElement>(null);
  const ordem = useRef<HTMLInputElement>(null);

  const run = async (files: File[]) => {
    const list = files.filter((f) => /^image\//.test(f.type) || /\.(jpe?g|png|webp)$/i.test(f.name));
    if (!list.length) return;
    setBusy(true);
    const base = items.length;
    setItems((cur) => [...cur, ...list.map((f): Item => ({ name: f.name, state: "ajustando" }))]);
    const set = (i: number, patch: Partial<Item>) => setItems((cur) => cur.map((it, k) => (k === base + i ? { ...it, ...patch } : it)));
    const typedAlt = list.length === 1 ? alt.current?.value.trim() ?? "" : "";
    for (let i = 0; i < list.length; i++) {
      const f = list[i]!;
      try {
        const out = await fit(f);
        set(i, { state: "enviando" });
        const fd = new FormData();
        fd.set("grande", new File([out.grande], "grande.webp", { type: out.grande.type || "image/webp" }));
        fd.set("pequena", new File([out.pequena], "pequena.webp", { type: out.pequena.type || "image/webp" }));
        fd.set("alt", typedAlt);
        fd.set("nome", f.name);
        fd.set("ordem", ordem.current?.value || "0");
        const r = await action(fd);
        set(i, r.ok ? { state: "ok" } : { state: "erro", msg: r.error ?? "Erro." });
      } catch {
        set(i, { state: "erro", msg: "Não consegui ler essa imagem. Tente outro arquivo (JPG, PNG ou WEBP)." });
      }
    }
    if (alt.current) alt.current.value = "";
    setBusy(false);
    router.refresh();
  };

  return (
    <div className="grid gap-3 rounded-lg border border-linha bg-superficie p-4" data-testid="aprovado-form-novo">
      <label
        className={`flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed px-4 py-8 text-center ${drag ? "border-destaque bg-nevoa" : "border-linha-forte"}`}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); void run([...e.dataTransfer.files]); }}
      >
        <span className="font-semibold">{busy ? "Publicando…" : "Clique para escolher ou arraste as fotos dos aprovados"}</span>
        <span className="t-small text-tinta-suave">Pode enviar várias de uma vez (JPG, PNG ou WEBP, de qualquer tamanho). Cada foto é ajustada ao banner sem cortar e já entra no painel.</span>
        <input
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          data-testid="aprovado-foto"
          disabled={busy}
          onChange={(e) => {
            const fl = [...(e.currentTarget.files ?? [])];
            e.currentTarget.value = "";
            void run(fl);
          }}
        />
      </label>
      <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
        <label className="text-sm">Nome e aprovações (opcional; vale para uma foto só)
          <input ref={alt} maxLength={400} className={input} placeholder="Nosso aluno aprovado João Silva. Aprovado em: Polícia Penal MG." />
        </label>
        <label className="text-sm">Ordem<input ref={ordem} type="number" min={0} max={999} defaultValue={0} className={input} /></label>
      </div>
      {items.length > 0 && (
        <ul className="grid gap-1 t-small" role="status" aria-live="polite" data-testid="aprovado-fila">
          {items.map((it, i) => (
            <li key={`${it.name}-${i}`} className={it.state === "erro" ? "text-erro" : it.state === "ok" ? "text-acerto" : "text-tinta-suave"}>
              {it.state === "ok" ? "✓ Publicado" : it.state === "erro" ? "✗ Não publicado" : it.state === "enviando" ? "Enviando" : "Ajustando"}: {it.name}
              {it.msg ? ` — ${it.msg}` : ""}
            </li>
          ))}
        </ul>
      )}
    </div>
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
