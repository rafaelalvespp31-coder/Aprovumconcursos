"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { DIFFICULTIES, DIFFICULTY_LABEL, SOURCE_KIND_LABEL, type SourceKind } from "@/domain/bank/labels";
import { MAX_PER_REQUEST, MAX_SOURCE_CHARS } from "@/domain/bank/generation";
import { cancelGenerationAction, generationStepAction, startGenerationAction } from "../actions";
import { DCard, DNotice, dButton, dInput, dLabel, dTextarea } from "../ui";

interface Props {
  subjects: Array<{ id: string; name: string }>;
  topics: Array<{ id: string; subject_id: string; path: string }>;
  boards: Array<{ slug: string; name: string }>;
  sources: Array<{ id: string; name: string; kind: string; usable: boolean }>;
  remainingToday: number;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function GenerateForm({ subjects, topics, boards, sources, remainingToday }: Props) {
  const router = useRouter();
  const [subjectId, setSubjectId] = useState("");
  const [text, setText] = useState("");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ produced: number; total: number; ids: string[]; rejected: Array<{ reason: string }>; note?: string } | null>(null);
  const cancelled = useRef(false);
  const batch = useRef<string | null>(null);
  const today = new Date().toISOString().slice(0, 10);

  async function loop(batchId: string, total: number) {
    for (let i = 0; i < 40 && !cancelled.current; i++) {
      const r = await generationStepAction(batchId);
      if (!r.ok || !r.data) {
        setError(r.error ?? "Falha na geração.");
        break;
      }
      const d = r.data;
      setProgress({ produced: d.produced, total, ids: d.questionIds, rejected: d.rejected, note: d.error });
      if (d.done) break;
      if (d.waitSeconds) {
        for (let s = d.waitSeconds; s > 0 && !cancelled.current; s--) {
          setProgress((p) => (p ? { ...p, note: `Limite por minuto do plano gratuito: continuando em ${s}s…` } : p));
          await sleep(1000);
        }
      }
    }
    setRunning(false);
    router.refresh();
  }

  return (
    <DCard title="Novo lote">
      <form
        className="grid gap-3 sm:grid-cols-2"
        onSubmit={async (e) => {
          e.preventDefault();
          if (running) return;
          const f = new FormData(e.currentTarget);
          const payload = {
            subjectId: f.get("subjectId"),
            topicId: f.get("topicId"),
            difficulty: f.get("difficulty"),
            questionType: f.get("questionType"),
            count: f.get("count"),
            boardStyle: f.get("boardStyle"),
            casePractice: f.get("casePractice") === "on",
            justification: f.get("justification"),
            sourceId: f.get("sourceId"),
            sourceText: f.get("sourceText"),
            focus: f.get("focus"),
            ref: {
              normName: f.get("normName"),
              normNumber: f.get("normNumber"),
              article: f.get("article"),
              officialUrl: f.get("officialUrl"),
              consultedOn: f.get("consultedOn"),
            },
          };
          setError(null);
          setRunning(true);
          cancelled.current = false;
          const r = await startGenerationAction(payload);
          if (!r.ok || !r.data) {
            setError(r.error ?? "Não foi possível iniciar.");
            setRunning(false);
            return;
          }
          batch.current = r.data.batchId;
          setProgress({ produced: 0, total: r.data.total, ids: [], rejected: [] });
          await loop(r.data.batchId, r.data.total);
        }}
      >
        <div>
          <label className={dLabel} htmlFor="g-subject">Matéria *</label>
          <select id="g-subject" name="subjectId" required value={subjectId} onChange={(e) => setSubjectId(e.target.value)} className={dInput}>
            <option value="">Escolha…</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={dLabel} htmlFor="g-topic">Assunto / subtópico</label>
          <select id="g-topic" name="topicId" className={dInput} disabled={!subjectId}>
            <option value="">Sem assunto específico</option>
            {topics.filter((t) => t.subject_id === subjectId).map((t) => (
              <option key={t.id} value={t.id}>{t.path}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={dLabel} htmlFor="g-diff">Dificuldade *</label>
          <select id="g-diff" name="difficulty" className={dInput} defaultValue="dificil">
            {DIFFICULTIES.map((d) => (
              <option key={d} value={d}>{DIFFICULTY_LABEL[d]}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={dLabel} htmlFor="g-type">Formato *</label>
          <select id="g-type" name="questionType" className={dInput} defaultValue="multipla_escolha">
            <option value="multipla_escolha">Múltipla escolha (5 alternativas)</option>
            <option value="certo_errado">Certo ou errado</option>
          </select>
        </div>
        <div>
          <label className={dLabel} htmlFor="g-count">Quantidade * (máx. {Math.min(MAX_PER_REQUEST, remainingToday)} agora)</label>
          <input id="g-count" name="count" type="number" min={1} max={Math.max(1, Math.min(MAX_PER_REQUEST, remainingToday))} defaultValue={Math.min(3, Math.max(1, remainingToday))} className={dInput} />
        </div>
        <div>
          <label className={dLabel} htmlFor="g-board">Estilo de cobrança</label>
          <select id="g-board" name="boardStyle" className={dInput} defaultValue="">
            <option value="">Sem estilo específico</option>
            {boards.map((b) => (
              <option key={b.slug} value={b.slug}>{b.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={dLabel} htmlFor="g-just">Justificativa</label>
          <select id="g-just" name="justification" className={dInput} defaultValue="completa">
            <option value="completa">Completa (explica cada alternativa)</option>
            <option value="objetiva">Objetiva</option>
          </select>
        </div>
        <label className="flex min-h-11 items-center gap-2 self-end text-[14px]">
          <input type="checkbox" name="casePractice" className="size-5 accent-[#e10600]" /> Com caso prático
        </label>

        <div className="sm:col-span-2">
          <label className={dLabel} htmlFor="g-source">Fonte autorizada do texto-base *</label>
          <select id="g-source" name="sourceId" required className={dInput} defaultValue="">
            <option value="">{sources.length ? "Escolha…" : "Cadastre a fonte (ex.: a lei no Planalto) em “Fontes”"}</option>
            {sources.map((s) => (
              <option key={s.id} value={s.id} disabled={!s.usable}>
                {s.name} — {SOURCE_KIND_LABEL[s.kind as SourceKind]}
                {s.usable ? "" : " (falta autorização verificada)"}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className={dLabel} htmlFor="g-text">Texto-base * (única base da IA)</label>
          <textarea id="g-text" name="sourceText" required minLength={200} maxLength={MAX_SOURCE_CHARS} value={text} onChange={(e) => setText(e.target.value)} className={`${dTextarea} min-h-48`} placeholder="Cole aqui o texto oficial do(s) artigo(s), exatamente como está na fonte." />
          <p className="mt-1 text-right text-[12px] text-white/45">{text.length}/{MAX_SOURCE_CHARS}</p>
        </div>
        <div className="sm:col-span-2 grid gap-2 sm:grid-cols-4">
          <p className="sm:col-span-4 text-[13px] font-semibold text-white/80">Referência que acompanhará cada questão</p>
          <input name="normName" required placeholder="Norma * (Código Penal)" className={`${dInput} sm:col-span-2`} aria-label="Norma" />
          <input name="normNumber" placeholder="Número (DL 2.848/1940)" className={dInput} aria-label="Número da norma" />
          <input name="article" placeholder="Artigo" className={dInput} aria-label="Artigo" />
          <input name="officialUrl" placeholder="Link oficial https://" className={`${dInput} sm:col-span-3`} aria-label="Link oficial" />
          <input name="consultedOn" type="date" required max={today} defaultValue={today} className={dInput} aria-label="Data de consulta" />
        </div>
        <div className="sm:col-span-2">
          <label className={dLabel} htmlFor="g-focus">Foco (opcional)</label>
          <input id="g-focus" name="focus" maxLength={300} className={dInput} placeholder="Ex.: qualificadoras do § 2º e diferença para o privilégio do § 1º" />
        </div>

        {error && <div className="sm:col-span-2"><DNotice tone="erro">{error}</DNotice></div>}

        <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
          <button type="submit" disabled={running || remainingToday <= 0} className={dButton("primario")}>
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
          {remainingToday <= 0 && <span className="text-[13px] text-amber-200">Limite diário atingido.</span>}
        </div>
      </form>

      {progress && (
        <div className="mt-4 flex flex-col gap-2" aria-live="polite">
          <div className="h-2 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-gradient-to-r from-[#ff2a2a] to-[#8a0303] transition-all" style={{ width: `${(progress.produced / Math.max(1, progress.total)) * 100}%` }} />
          </div>
          <p className="text-[14px]">
            {progress.produced} de {progress.total} questão(ões) geradas e salvas para conferência.
          </p>
          {progress.note && <p className="text-[13px] text-amber-200">{progress.note}</p>}
          {progress.ids.length > 0 && (
            <ul className="flex flex-wrap gap-2 text-[13px]">
              {progress.ids.map((id, i) => (
                <li key={id}>
                  <Link href={`/banco/questoes/${id}`} className="text-[#ff8080] underline">Questão {i + 1}</Link>
                </li>
              ))}
            </ul>
          )}
          {progress.rejected.length > 0 && (
            <details className="text-[13px] text-white/70">
              <summary className="cursor-pointer">{progress.rejected.length} descartada(s) pela validação automática</summary>
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
