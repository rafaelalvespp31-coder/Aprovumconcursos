"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { DIFFICULTIES, DIFFICULTY_LABEL } from "@/domain/bank/labels";
import { MAX_PER_REQUEST, MAX_SOURCE_CHARS } from "@/domain/bank/generation";
import { cancelGenerationAction, generationStepAction, startGenerationAction } from "../actions";
import { DCard, DNotice, dButton, dInput, dLabel, dTextarea } from "../ui";

interface Props {
  subjects: Array<{ id: string; name: string }>;
  boards: Array<{ slug: string; name: string }>;
  remainingToday: number;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Gerador objetivo: matéria + assunto/artigo → Gerar. O resto tem padrão em "Mais opções". */
export function GenerateForm({ subjects, boards, remainingToday }: Props) {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ produced: number; total: number; ids: string[]; rejected: Array<{ reason: string }>; note?: string; base?: string; notice?: string; done?: boolean } | null>(null);
  const cancelled = useRef(false);
  const batch = useRef<string | null>(null);
  const maxNow = Math.max(1, Math.min(MAX_PER_REQUEST, remainingToday));

  async function loop(batchId: string) {
    for (let i = 0; i < 40 && !cancelled.current; i++) {
      const r = await generationStepAction(batchId);
      if (!r.ok || !r.data) {
        setError(r.error ?? "Falha na geração.");
        break;
      }
      const d = r.data;
      setProgress((p) => ({ ...(p ?? {}), produced: d.produced, total: d.total, ids: d.questionIds, rejected: d.rejected, note: d.error, done: d.done }));
      if (d.done) break;
      if (d.waitSeconds) {
        for (let s = d.waitSeconds; s > 0 && !cancelled.current; s--) {
          setProgress((p) => (p ? { ...p, note: `Limite por minuto do plano gratuito: continuando em ${s}s…` } : p));
          await sleep(1000);
        }
        setProgress((p) => (p ? { ...p, note: undefined } : p));
      }
    }
    setRunning(false);
    router.refresh();
  }

  return (
    <DCard>
      <form
        className="flex flex-col gap-3"
        onSubmit={async (e) => {
          e.preventDefault();
          if (running) return;
          const f = new FormData(e.currentTarget);
          setError(null);
          setRunning(true);
          setProgress(null);
          cancelled.current = false;
          const r = await startGenerationAction({
            subjectId: f.get("subjectId"),
            query: f.get("query"),
            count: f.get("count") || undefined,
            difficulty: f.get("difficulty") || undefined,
            questionType: f.get("questionType") || undefined,
            boardStyle: f.get("boardStyle"),
            casePractice: f.get("casePractice") === "on",
            customText: f.get("customText"),
          });
          if (!r.ok || !r.data) {
            setError(r.error ?? "Não foi possível iniciar.");
            setRunning(false);
            return;
          }
          batch.current = r.data.batchId;
          setProgress({ produced: 0, total: r.data.total, ids: [], rejected: [], base: r.data.base, notice: r.data.notice });
          await loop(r.data.batchId);
        }}
      >
        <div>
          <label className={dLabel} htmlFor="g-subject">Matéria</label>
          <select id="g-subject" name="subjectId" required defaultValue="" className={`${dInput} text-[16px]`}>
            <option value="" disabled>Escolha a matéria…</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={dLabel} htmlFor="g-query">Assunto ou artigo</label>
          <input id="g-query" name="query" required minLength={2} maxLength={200} className={`${dInput} min-h-12 text-[16px]`} placeholder="Ex.: art. 121 do CP · art. 33 da Lei 11.343 · Teoria do crime" autoComplete="off" />
        </div>

        <details className="rounded-md border border-white/10 px-3 py-2">
          <summary className="cursor-pointer text-[14px] font-semibold text-white/75">Mais opções (opcional)</summary>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <label className={dLabel} htmlFor="g-count">Quantidade</label>
              <input id="g-count" name="count" type="number" min={1} max={maxNow} defaultValue={Math.min(5, maxNow)} className={dInput} />
            </div>
            <div>
              <label className={dLabel} htmlFor="g-diff">Dificuldade</label>
              <select id="g-diff" name="difficulty" className={dInput} defaultValue="dificil">
                {DIFFICULTIES.map((d) => (
                  <option key={d} value={d}>{DIFFICULTY_LABEL[d]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={dLabel} htmlFor="g-type">Formato</label>
              <select id="g-type" name="questionType" className={dInput} defaultValue="multipla_escolha">
                <option value="multipla_escolha">Múltipla escolha (5 alternativas)</option>
                <option value="certo_errado">Certo ou errado</option>
              </select>
            </div>
            <div>
              <label className={dLabel} htmlFor="g-board">Estilo de banca</label>
              <select id="g-board" name="boardStyle" className={dInput} defaultValue="">
                <option value="">Nenhum</option>
                {boards.map((b) => (
                  <option key={b.slug} value={b.slug}>{b.name}</option>
                ))}
              </select>
            </div>
            <label className="flex min-h-11 items-center gap-2 text-[14px] sm:col-span-2">
              <input type="checkbox" name="casePractice" className="size-5 accent-[#e10600]" /> Com caso prático
            </label>
            <div className="sm:col-span-2">
              <label className={dLabel} htmlFor="g-text">Usar um texto meu como base (opcional)</label>
              <textarea id="g-text" name="customText" maxLength={MAX_SOURCE_CHARS} className={dTextarea} placeholder="Só se quiser substituir o texto oficial buscado automaticamente." />
            </div>
          </div>
        </details>

        {error && <DNotice tone="erro">{error}</DNotice>}

        <div className="flex flex-wrap items-center gap-2">
          <button type="submit" disabled={running || remainingToday <= 0} className={`${dButton("primario")} min-h-12 flex-1 text-[16px] sm:flex-none sm:px-8`}>
            {running ? "Gerando…" : "Gerar questões"}
          </button>
          {running && (
            <button
              type="button"
              className={dButton("discreto")}
              onClick={async () => {
                cancelled.current = true;
                if (batch.current) await cancelGenerationAction(batch.current);
              }}
            >
              Parar
            </button>
          )}
        </div>
        {remainingToday <= 0 && <p className="text-[13px] text-amber-200">Limite diário atingido. Volte amanhã.</p>}
      </form>

      {progress && (
        <div className="mt-4 flex flex-col gap-2" aria-live="polite">
          {progress.base && <p className="text-[13px] text-white/60">Base usada: {progress.base}</p>}
          {progress.notice && <DNotice tone="alerta">{progress.notice}</DNotice>}
          <div className="h-2 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-gradient-to-r from-[#ff2a2a] to-[#8a0303] transition-all" style={{ width: `${(progress.produced / Math.max(1, progress.total)) * 100}%` }} />
          </div>
          <p className="text-[15px] font-semibold">
            {progress.produced} de {progress.total} questão(ões) prontas{progress.done ? "." : "…"}
          </p>
          {progress.note && <p className="text-[13px] text-amber-200">{progress.note}</p>}
          {progress.ids.length > 0 && (
            <ul className="flex flex-wrap gap-2 text-[14px]">
              {progress.ids.map((id, i) => (
                <li key={id}>
                  <Link href={`/banco/questoes/${id}`} className="inline-flex min-h-9 items-center rounded-md border border-white/15 px-3 text-[#ff8080]">Questão {i + 1}</Link>
                </li>
              ))}
            </ul>
          )}
          {progress.done && progress.ids.length > 0 && (
            <p className="text-[13px] text-white/55">Elas ficam em “aguardando conferência” até a revisão.</p>
          )}
          {progress.rejected.length > 0 && (
            <details className="text-[13px] text-white/60">
              <summary className="cursor-pointer">{progress.rejected.length} descartada(s) pela checagem automática</summary>
              <ul className="mt-1 list-disc pl-5">
                {progress.rejected.map((r, i) => (
                  <li key={i}>{r.reason}</li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </DCard>
  );
}
