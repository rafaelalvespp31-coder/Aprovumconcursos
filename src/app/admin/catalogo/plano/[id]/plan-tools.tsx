"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui";
import type { AdminResult } from "../../actions";
import { OutlineForm } from "../outline-form";

/** Copia o comando do subtópico (com baixar .txt quando a área de transferência falha). */
export function CopyPrompt({ prompt, name }: { prompt: string; name: string }) {
  const [state, setState] = useState<"" | "ok" | "erro">("");
  const download = () => {
    const url = URL.createObjectURL(new Blob([prompt], { type: "text/plain;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `comando-${name}.txt`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <Button
        type="button"
        variant="secundario"
        className="min-h-9 px-3 t-small"
        data-testid="copiar-comando"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(prompt);
            setState("ok");
            setTimeout(() => setState(""), 2500);
          } catch {
            setState("erro");
          }
        }}
      >
        {state === "ok" ? "✓ Copiado" : "Copiar comando"}
      </Button>
      {state === "erro" && (
        <button type="button" onClick={download} className="t-tiny font-semibold text-destaque underline underline-offset-2">
          Não deu para copiar — baixar .txt
        </button>
      )}
    </span>
  );
}

type Input = { disciplineMode: string; title: string; text: string };

export function EditPlan({ id, initial, update, remove }: { id: string; initial: Input; update: (id: string, d: Input) => Promise<AdminResult>; remove: (id: string) => Promise<AdminResult> }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secundario" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
          {open ? "Fechar edição" : "Editar sumário"}
        </Button>
        {!confirm ? (
          <Button type="button" variant="secundario" onClick={() => setConfirm(true)}>Excluir plano</Button>
        ) : (
          <span className="inline-flex flex-wrap items-center gap-2 t-small">
            Excluir só o plano (as aulas catalogadas continuam)?
            <Button type="button" disabled={pending} onClick={() => start(async () => { const r = await remove(id); if (!r.ok) setErr(r.error ?? "Erro."); })}>Sim, excluir</Button>
            <Button type="button" variant="secundario" onClick={() => setConfirm(false)}>Cancelar</Button>
          </span>
        )}
        {err && <span className="t-small text-erro" role="alert">{err}</span>}
      </div>
      {open && (
        <div className="rounded-lg border border-linha p-4">
          <OutlineForm
            initial={initial}
            submitLabel="Salvar alterações"
            submit={(d) => update(id, d)}
            onDone={() => {
              setOpen(false);
              router.refresh();
            }}
          />
        </div>
      )}
    </div>
  );
}
