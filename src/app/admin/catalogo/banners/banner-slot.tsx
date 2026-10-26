"use client";

import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui";
import type { BannerResult } from "../actions";

export interface BannerActions {
  save: (form: FormData) => Promise<BannerResult>;
  remove: (mode: string) => Promise<BannerResult>;
}

/** Banner de uma matéria: prévia na proporção real (4:1), anexar, trocar e remover. */
export function BannerSlot({ mode, label, url, actions, compact = false }: { mode: string; label: string; url: string | null; actions: BannerActions; compact?: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const [current, setCurrent] = useState(url);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const upload = (f: File) => {
    setError(null);
    const fd = new FormData();
    fd.set("mode", mode);
    fd.set("file", f);
    start(async () => {
      const r = await actions.save(fd);
      if (r.ok) setCurrent(r.url);
      else setError(r.error);
    });
  };
  return (
    <div className={compact ? "" : "rounded-lg border border-linha bg-superficie p-3"} data-testid={`banner-${mode}`}>
      {!compact && <p className="mb-2 font-semibold">{label}</p>}
      <div className="ap-banner-previa" style={current ? { backgroundImage: `url("${current}")` } : undefined} data-padrao={current ? undefined : "1"}>
        {!current && <span>Sem banner: as aulas usam a arte padrão</span>}
      </div>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        aria-label={`Imagem do banner de ${label}`}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) upload(f);
          e.target.value = "";
        }}
      />
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Button variant="secundario" disabled={pending} onClick={() => input.current?.click()}>{pending ? "Enviando…" : current ? "Trocar banner" : "Anexar banner"}</Button>
        {current && (
          <Button variant="discreto" disabled={pending} onClick={() => start(async () => { const r = await actions.remove(mode); if (r.ok) setCurrent(null); else setError(r.error); })}>
            Remover
          </Button>
        )}
        <span className="t-tiny text-tinta-fraca">JPG, PNG ou WebP. Recortado em 1600 × 400 (4:1).</span>
      </div>
      {error && <p className="mt-1 t-small text-erro" role="alert">{error}</p>}
    </div>
  );
}
