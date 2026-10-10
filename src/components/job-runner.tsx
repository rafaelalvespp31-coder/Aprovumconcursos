"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Notice } from "./ui";
import { useOnline } from "./pwa";

export interface PublicJob {
  id: string;
  kind: string;
  stage: string;
  status: "queued" | "running" | "succeeded" | "failed";
  progress: number;
  error: string | null;
  attempts: number;
  maxAttempts: number;
}

/**
 * Conduz um job em etapas: chama /advance enquanto houver trabalho. Cada resposta
 * reflete o estado persistido no servidor — nada de progresso simulado.
 */
export function JobRunner({
  initial,
  stageLabels,
  doneHref,
  title,
}: {
  initial: PublicJob;
  stageLabels: Record<string, string>;
  doneHref: string;
  title: string;
}) {
  const router = useRouter();
  const online = useOnline();
  const [job, setJob] = useState(initial);
  const [netError, setNetError] = useState<string | null>(null);
  const [run, setRun] = useState(0);
  const terminal = job.status === "succeeded" || job.status === "failed";

  // Laço de avanço: cada chamada executa um passo no servidor e devolve o estado persistido.
  useEffect(() => {
    if (!online || terminal) return;
    let cancelled = false;
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
    void (async () => {
      let last = { stage: "", progress: -1 };
      while (!cancelled) {
        let wait = 0;
        try {
          const res = await fetch(`/api/jobs/${initial.id}/advance`, { method: "POST" });
          const data = (await res.json()) as PublicJob & { error?: string };
          if (cancelled) return;
          if (!res.ok) {
            setNetError(data.error ?? "Falha ao consultar o processamento.");
            wait = res.status === 429 ? 5000 : 3000;
          } else {
            setNetError(null);
            setJob(data);
            if (data.status === "succeeded" || data.status === "failed") return;
            // Falha temporária registrada: espera antes da nova tentativa automática.
            if (data.error) wait = 4000;
            // Outro passo em andamento (lease ocupado): aguarda um pouco.
            else if (data.stage === last.stage && data.progress === last.progress) wait = 1500;
            last = { stage: data.stage, progress: data.progress };
          }
        } catch {
          if (cancelled) return;
          setNetError("Sem resposta do servidor. Vamos tentar novamente.");
          wait = 4000;
        }
        if (wait) await sleep(wait);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [initial.id, online, terminal, run]);

  useEffect(() => {
    if (job.status === "succeeded") {
      router.replace(doneHref);
      router.refresh();
    }
  }, [job.status, router, doneHref]);

  const retry = async () => {
    const res = await fetch(`/api/jobs/${job.id}/retry`, { method: "POST" });
    const data = await res.json();
    if (res.ok) {
      setJob(data);
      setRun((n) => n + 1);
    } else setNetError(data.error);
  };

  const label = stageLabels[job.stage] ?? job.stage;
  return (
    <section aria-live="polite" className="rounded-lg border border-linha bg-superficie p-5">
      <p className="t-h3">{title}</p>
      <div className="mt-4 flex items-baseline justify-between gap-3">
        <p className="t-small text-tinta-suave">{job.status === "failed" ? "Processamento interrompido" : label}</p>
        <p className="t-small font-semibold tabular-nums">{job.progress}%</p>
      </div>
      <div
        className="mt-2 h-2.5 w-full overflow-hidden rounded-sm bg-linha"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={job.progress}
        aria-label="Progresso do processamento"
      >
        <div className={`h-full transition-[width] duration-500 ${job.status === "failed" ? "bg-erro" : "bg-azul"}`} style={{ width: `${Math.max(job.progress, 3)}%` }} />
      </div>

      <div className="mt-4 flex flex-col gap-3">
        {!online && <Notice tone="alerta">Sem conexão. O processamento continua de onde parou quando a internet voltar.</Notice>}
        {job.status === "running" && job.error && (
          <Notice tone="alerta" title={`Tentativa ${job.attempts} de ${job.maxAttempts} falhou`}>
            {job.error} Tentando novamente automaticamente.
          </Notice>
        )}
        {netError && job.status !== "failed" && <Notice tone="alerta">{netError}</Notice>}
        {job.status === "failed" && (
          <>
            <Notice tone="erro" title="Não foi possível concluir">
              {job.error ?? "Erro desconhecido."} O que já foi feito está salvo; ao tentar de novo, o processamento continua da etapa que falhou.
            </Notice>
            <Button onClick={retry} className="self-start">Tentar novamente</Button>
          </>
        )}
        {job.status !== "failed" && (
          <p className="t-tiny text-tinta-fraca">Você pode sair desta tela: o progresso fica salvo e continua quando você voltar.</p>
        )}
      </div>
    </section>
  );
}
