"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "./ui";

/** Botão que pede confirmação num diálogo nativo antes de ações destrutivas. */
export function ConfirmAction({
  trigger,
  title,
  description,
  confirmLabel,
  onConfirm,
  danger = true,
}: {
  trigger: string;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void | Promise<void>;
  danger?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [busy, setBusy] = useState(false);
  return (
    <>
      <Button type="button" variant={danger ? "perigo" : "secundario"} onClick={() => ref.current?.showModal()}>
        {trigger}
      </Button>
      <dialog
        ref={ref}
        className="m-auto w-[min(92vw,420px)] rounded-lg border border-linha bg-superficie p-0 text-tinta backdrop:bg-black/40"
        aria-labelledby="confirm-title"
      >
        <div className="p-5">
          <h2 id="confirm-title" className="t-h3">{title}</h2>
          <p className="mt-2 t-small text-tinta-suave">{description}</p>
          <div className="mt-5 flex justify-end gap-2">
            <Button type="button" variant="secundario" onClick={() => ref.current?.close()} autoFocus>
              Cancelar
            </Button>
            <Button
              type="button"
              variant={danger ? "perigo" : "primario"}
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await onConfirm();
                } finally {
                  setBusy(false);
                  ref.current?.close();
                }
              }}
            >
              {busy ? "Aguarde…" : confirmLabel}
            </Button>
          </div>
        </div>
      </dialog>
    </>
  );
}

export type SaveState = "idle" | "saving" | "saved" | "error";

/** Indicador de salvamento — só mostra "salvo" após confirmação do servidor. */
export function SaveIndicator({ state, errorText = "Não salvo. Tente de novo." }: { state: SaveState; errorText?: string }) {
  if (state === "idle") return null;
  const map = {
    saving: { text: "Salvando…", cls: "text-tinta-fraca" },
    saved: { text: "Salvo", cls: "text-dominado" },
    error: { text: errorText, cls: "text-erro" },
  } as const;
  const m = map[state];
  return (
    <span role="status" className={`t-tiny font-semibold ${m.cls}`}>
      {m.text}
    </span>
  );
}

/** Cronômetro opcional (conta para cima). */
export function Stopwatch({ running, onTick }: { running: boolean; onTick?: (s: number) => void }) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [running]);
  // Ref evita reexecutar o efeito a cada render; o corpo em bloco garante que o
  // efeito nunca retorne o valor da callback (o React o trataria como função de limpeza).
  const tick = useRef(onTick);
  useEffect(() => {
    tick.current = onTick;
  });
  useEffect(() => {
    tick.current?.(seconds);
  }, [seconds]);
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  return (
    <span className="tabular-nums" aria-label={`Tempo: ${mm} minutos e ${ss} segundos`}>
      {mm}:{ss}
    </span>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="rounded border border-linha-forte bg-papel px-1.5 py-0.5 font-sans t-tiny font-semibold text-tinta-suave">{children}</kbd>;
}

/** Barra de progresso de leitura fixa no topo, baseada na rolagem do elemento alvo. */
export function ReadingProgress({ targetId, onComplete }: { targetId: string; onComplete?: () => void }) {
  const [p, setP] = useState(0);
  const fired = useRef(false);
  useEffect(() => {
    const el = document.getElementById(targetId);
    if (!el) return;
    const update = () => {
      const rect = el.getBoundingClientRect();
      const total = rect.height - window.innerHeight;
      const ratio = total <= 0 ? 1 : Math.min(1, Math.max(0, -rect.top / total));
      setP(ratio);
      if (ratio > 0.98 && !fired.current) {
        fired.current = true;
        onComplete?.();
      }
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [targetId, onComplete]);
  return (
    <div
      className="fixed inset-x-0 top-0 z-30 h-1 bg-transparent"
      role="progressbar"
      aria-label="Progresso da leitura"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(p * 100)}
    >
      <div className="h-full bg-azul transition-[width] duration-150" style={{ width: `${p * 100}%` }} />
    </div>
  );
}
