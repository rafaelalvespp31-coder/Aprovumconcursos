"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { Button } from "@/components/ui";

type Step = { label: string; done: boolean };
type State = {
  id: string;
  status: "planejada" | "em_geracao" | "aguardando" | "em_revisao" | "concluida" | "falha";
  error: string | null;
  topicId: string | null;
  steps: Step[];
  progress: { percent: number; modules: { done: number; total: number }; flashcards: number; questions: { FÁCIL: number; MÉDIO: number; DIFÍCIL: number } };
};

async function call(body: Record<string, unknown>): Promise<State & { error?: string }> {
  const res = await fetch("/api/admin/catalogo/autogen", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const j = (await res.json().catch(() => ({}))) as State & { error?: string };
  if (!res.ok || !j.id) throw new Error(j.error ?? "Não foi possível gerar agora.");
  return j;
}

/** Gera a aula inteira por partes, sem "continue": cada passo salva o que foi produzido e o botão retoma de onde parou. */
export function AutogenButton({ outlineId, refKey }: { outlineId: string; refKey: string }) {
  const [st, setSt] = useState<State | null>(null);
  const [running, setRunning] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const stop = useRef(false);

  const run = async () => {
    setErr(null);
    setRunning(true);
    stop.current = false;
    try {
      let s = await call({ action: "start", outlineId, ref: refKey });
      setSt(s);
      let guard = 0;
      while (!stop.current && s.status !== "concluida" && s.status !== "em_revisao" && guard++ < 80) {
        s = await call({ action: "advance", id: s.id });
        setSt(s);
        if (s.status === "falha") break;
      }
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setRunning(false);
    }
  };

  const pr = st?.progress;
  return (
    <span className="inline-flex flex-col gap-1" data-testid="autogen">
      <Button type="button" variant="secundario" className="min-h-9 px-3 t-small" disabled={running} onClick={() => void run()} data-testid="gerar-ia">
        {running ? "Gerando…" : st && st.status !== "concluida" ? "Continuar geração" : "Gerar com IA (automático)"}
      </Button>
      {running && (
        <button type="button" className="t-tiny underline" onClick={() => (stop.current = true)}>
          Pausar (o progresso fica salvo)
        </button>
      )}
      {st && pr && (
        <span className="t-tiny text-tinta-suave" role="status">
          <b>GERANDO AULA — PADRÃO APROVUM</b> · {st.status === "concluida" ? "100% — publicada" : `${pr.percent}%`} · módulos {pr.modules.done}/{pr.modules.total} · flashcards {pr.flashcards} · questões F {pr.questions["FÁCIL"]}/12, M {pr.questions["MÉDIO"]}/12, D {pr.questions["DIFÍCIL"]}/12
        </span>
      )}
      {st?.status === "concluida" && st.topicId && (
        <Link href={`/admin/catalogo/${st.topicId}`} className="t-tiny font-semibold text-destaque underline">Aula concluída — abrir</Link>
      )}
      {st?.status === "em_revisao" && <span className="t-tiny text-erro">Em revisão: {st.error}{st.topicId ? " (salva como rascunho)" : ""}</span>}
      {(st?.status === "falha" || err) && <span className="t-tiny text-erro">{st?.error ?? err} Toque em “Continuar geração”: só a parte afetada é refeita.</span>}
    </span>
  );
}
