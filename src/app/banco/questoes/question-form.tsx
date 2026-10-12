"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  DIFFICULTIES,
  DIFFICULTY_LABEL,
  OPTION_LABELS,
  ORIGIN_LABEL,
  ORIGINS,
  RIGHTS_LABEL,
  SOURCE_KIND_LABEL,
  TYPE_LABEL,
  USAGE_RIGHTS,
  type Origin,
  type QuestionType,
  type SourceKind,
} from "@/domain/bank/labels";
import { saveQuestionAction, similarAction } from "../actions";
import { DBadge, DCard, DNotice, dButton, dInput, dLabel, dTextarea } from "../ui";
import { emptyRef, today, type FormLookups, type LegalRefState, type QuestionFormState } from "./form-state";

export type { FormLookups, LegalRefState, QuestionFormState } from "./form-state";

function toPayload(s: QuestionFormState) {
  const isPast = s.origin === "prova_anterior";
  return {
    subjectId: s.subjectId,
    topicId: s.topicId,
    origin: s.origin,
    questionType: s.questionType,
    statement: s.statement,
    caseContext: s.caseContext,
    initialDifficulty: s.initialDifficulty,
    boardStyle: s.boardStyle,
    sourceId: s.sourceId,
    examId: isPast ? s.examId : "",
    boardSlug: isPast ? s.boardSlug : "",
    year: isPast ? s.year : "",
    originalNumber: isPast ? s.originalNumber : "",
    correctAnswerTrue: s.questionType === "certo_errado" && s.correctAnswerTrue ? s.correctAnswerTrue === "true" : undefined,
    options: s.questionType === "multipla_escolha" ? s.options.filter((o) => o.text.trim()).map((o) => ({ text: o.text, isCorrect: o.isCorrect, explanation: o.explanation })) : [],
    justification: s.justification,
    legalBasis: s.legalBasis,
    usageRights: s.usageRights,
    verifiedAt: s.verifiedAt,
    legalRefs: s.legalRefs.map((r) => ({ ...r })),
  };
}

export function QuestionForm({ id, initial, lookups }: { id: string | null; initial: QuestionFormState; lookups: FormLookups }) {
  const router = useRouter();
  const [s, setS] = useState<QuestionFormState>(initial);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [similar, setSimilar] = useState<null | Array<{ question_id: string; public_code: string; status: string; similarity: number }>>(null);
  const set = <K extends keyof QuestionFormState>(k: K, v: QuestionFormState[K]) => setS((p) => ({ ...p, [k]: v }));

  const topics = useMemo(() => lookups.topics.filter((t) => t.subject_id === s.subjectId && (t.status === "ativo" || t.id === s.topicId)), [lookups.topics, s.subjectId, s.topicId]);
  const sources = lookups.sources.filter((x) => (s.origin === "prova_anterior" ? x.kind === "prova_oficial" : true) && (x.status !== "bloqueada" || x.id === s.sourceId));
  const chosenSource = lookups.sources.find((x) => x.id === s.sourceId);

  const setOrigin = (o: Origin) =>
    setS((p) => ({
      ...p,
      origin: o,
      usageRights: o === "prova_anterior" ? (p.usageRights === "proprio" ? "nao_verificado" : p.usageRights) : p.usageRights === "nao_verificado" ? "proprio" : p.usageRights,
    }));
  const setOption = (i: number, patch: Partial<QuestionFormState["options"][number]>) =>
    setS((p) => ({
      ...p,
      options: p.options.map((o, j) => (j === i ? { ...o, ...patch } : patch.isCorrect ? { ...o, isCorrect: false } : o)),
    }));
  const setRef = (i: number, patch: Partial<LegalRefState>) => setS((p) => ({ ...p, legalRefs: p.legalRefs.map((r, j) => (j === i ? { ...r, ...patch } : r)) }));

  const checkSimilar = () =>
    start(async () => {
      const r = await similarAction(s.statement, s.subjectId || null, id);
      if (!r.ok) setError(r.error ?? "Erro.");
      else setSimilar(r.data ?? []);
    });

  const submit = () =>
    start(async () => {
      setError(null);
      const r = await saveQuestionAction(id, toPayload(s));
      if (!r.ok || !r.data) {
        setError(r.error ?? "Não foi possível salvar.");
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      router.push(`/banco/questoes/${r.data.id}${r.data.duplicates ? `?duplicidade=${r.data.duplicates}` : "?salvo=1"}`);
      router.refresh();
    });

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      {error && <DNotice tone="erro">{error}</DNotice>}

      <DCard title="Classificação">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className={dLabel} htmlFor="f-subject">Matéria *</label>
            <select id="f-subject" required value={s.subjectId} onChange={(e) => setS((p) => ({ ...p, subjectId: e.target.value, topicId: "" }))} className={dInput}>
              <option value="">Escolha…</option>
              {lookups.subjects.filter((x) => x.status === "ativa" || x.id === s.subjectId).map((x) => (
                <option key={x.id} value={x.id}>{x.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={dLabel} htmlFor="f-topic">Assunto / subtópico</label>
            <select id="f-topic" value={s.topicId} onChange={(e) => set("topicId", e.target.value)} className={dInput} disabled={!s.subjectId}>
              <option value="">{topics.length ? "Sem assunto específico" : "Cadastre assuntos em “Matérias e assuntos”"}</option>
              {topics.map((t) => (
                <option key={t.id} value={t.id}>{t.path}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={dLabel} htmlFor="f-origin">Origem *</label>
            <select id="f-origin" value={s.origin} onChange={(e) => setOrigin(e.target.value as Origin)} className={dInput}>
              {ORIGINS.map((o) => (
                <option key={o} value={o}>{ORIGIN_LABEL[o]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={dLabel} htmlFor="f-diff">Dificuldade inicial *</label>
            <select id="f-diff" value={s.initialDifficulty} onChange={(e) => set("initialDifficulty", e.target.value)} className={dInput}>
              {DIFFICULTIES.map((d) => (
                <option key={d} value={d}>{DIFFICULTY_LABEL[d]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={dLabel} htmlFor="f-style">Estilo de cobrança (banca)</label>
            <select id="f-style" value={s.boardStyle} onChange={(e) => set("boardStyle", e.target.value)} className={dInput}>
              <option value="">Sem estilo específico</option>
              {lookups.boards.map((b) => (
                <option key={b.slug} value={b.slug}>{b.name}</option>
              ))}
            </select>
            <p className="mt-1 text-[12px] text-white/45">Só o estilo. Não indica que a questão veio dessa banca.</p>
          </div>
          <div>
            <label className={dLabel} htmlFor="f-type">Formato *</label>
            <select id="f-type" value={s.questionType} onChange={(e) => set("questionType", e.target.value as QuestionType)} className={dInput}>
              {(["multipla_escolha", "certo_errado"] as const).map((t) => (
                <option key={t} value={t}>{TYPE_LABEL[t]}</option>
              ))}
            </select>
          </div>
        </div>
      </DCard>

      {s.origin === "prova_anterior" && (
        <DCard title="Procedência (prova anterior real)">
          <DNotice tone="alerta">
            Informe apenas dados comprovados pela prova oficial. Uma URL pública não autoriza a republicação: a aprovação exige a autorização de reutilização registrada na fonte.
          </DNotice>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <label className={dLabel} htmlFor="f-exam">Concurso</label>
              <select id="f-exam" value={s.examId} onChange={(e) => set("examId", e.target.value)} className={dInput}>
                <option value="">Não informado</option>
                {lookups.exams.map((x) => (
                  <option key={x.id} value={x.id}>{x.name}{x.year ? ` (${x.year})` : ""}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={dLabel} htmlFor="f-board">Banca organizadora</label>
              <select id="f-board" value={s.boardSlug} onChange={(e) => set("boardSlug", e.target.value)} className={dInput}>
                <option value="">Não informada</option>
                {lookups.boards.map((b) => (
                  <option key={b.slug} value={b.slug}>{b.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={dLabel} htmlFor="f-year">Ano</label>
              <input id="f-year" value={s.year} onChange={(e) => set("year", e.target.value.replace(/\D/g, "").slice(0, 4))} inputMode="numeric" className={dInput} placeholder="2024" />
            </div>
            <div>
              <label className={dLabel} htmlFor="f-num">Número original</label>
              <input id="f-num" value={s.originalNumber} onChange={(e) => set("originalNumber", e.target.value)} maxLength={20} className={dInput} placeholder="37" />
            </div>
          </div>
        </DCard>
      )}

      <DCard title="Questão">
        <div className="flex flex-col gap-3">
          <div>
            <label className={dLabel} htmlFor="f-case">Contexto do caso (opcional)</label>
            <textarea id="f-case" value={s.caseContext} onChange={(e) => set("caseContext", e.target.value)} maxLength={6000} className={dTextarea} placeholder="Texto-base, situação hipotética…" />
          </div>
          <div>
            <label className={dLabel} htmlFor="f-statement">Enunciado *</label>
            <textarea id="f-statement" required minLength={10} maxLength={6000} value={s.statement} onChange={(e) => set("statement", e.target.value)} className={`${dTextarea} min-h-36`} />
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <button type="button" onClick={checkSimilar} disabled={pending || s.statement.trim().length < 20} className={dButton("secundario")}>
                Verificar duplicidade
              </button>
              {similar && (similar.length === 0 ? <DBadge tone="verde">Nenhuma questão parecida</DBadge> : <DBadge tone="vermelho">{similar.length} parecida(s)</DBadge>)}
            </div>
            {similar && similar.length > 0 && (
              <ul className="mt-2 flex flex-col gap-1 text-[13px]">
                {similar.map((h) => (
                  <li key={h.question_id}>
                    <a href={`/banco/questoes/${h.question_id}`} target="_blank" rel="noreferrer" className="font-mono text-[#ff8080] underline">{h.public_code}</a>{" "}
                    — {Math.round(h.similarity * 100)}% de semelhança textual ({h.status}). Apenas um alerta: confira antes de salvar.
                  </li>
                ))}
              </ul>
            )}
          </div>

          {s.questionType === "multipla_escolha" ? (
            <fieldset className="flex flex-col gap-2">
              <legend className={dLabel}>Alternativas * (marque a correta)</legend>
              {s.options.map((o, i) => (
                <div key={i} className={`rounded-lg border p-3 ${o.isCorrect ? "border-emerald-400/60 bg-emerald-400/[0.07]" : "border-white/10 bg-white/[0.02]"}`}>
                  <div className="flex items-start gap-3">
                    <label className="flex min-h-11 shrink-0 cursor-pointer items-center gap-2">
                      <input type="radio" name="correct" checked={o.isCorrect} onChange={() => setOption(i, { isCorrect: true })} className="size-5 accent-emerald-500" aria-label={`Alternativa ${OPTION_LABELS[i]} é a correta`} />
                      <span className={`flex size-8 items-center justify-center rounded-full font-bold ${o.isCorrect ? "bg-emerald-500 text-black" : "bg-white/10"}`}>{OPTION_LABELS[i]}</span>
                    </label>
                    <div className="flex flex-1 flex-col gap-2">
                      <textarea value={o.text} onChange={(e) => setOption(i, { text: e.target.value })} maxLength={3000} rows={2} className={`${dInput} py-2`} placeholder={i < 2 ? "Obrigatória" : "Opcional"} aria-label={`Texto da alternativa ${OPTION_LABELS[i]}`} />
                      <input value={o.explanation} onChange={(e) => setOption(i, { explanation: e.target.value })} maxLength={3000} className={dInput} placeholder={o.isCorrect ? "Por que está correta" : "Por que está errada"} aria-label={`Justificativa da alternativa ${OPTION_LABELS[i]}`} />
                    </div>
                  </div>
                </div>
              ))}
            </fieldset>
          ) : (
            <fieldset>
              <legend className={dLabel}>Gabarito *</legend>
              <div className="flex gap-2">
                {(["true", "false"] as const).map((v) => (
                  <label key={v} className={`flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-md border font-semibold ${s.correctAnswerTrue === v ? "border-emerald-400/70 bg-emerald-400/15 text-emerald-200" : "border-white/15 bg-white/[0.04]"}`}>
                    <input type="radio" name="ce" value={v} checked={s.correctAnswerTrue === v} onChange={() => set("correctAnswerTrue", v)} className="sr-only" />
                    {v === "true" ? "Certo" : "Errado"}
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          <div>
            <label className={dLabel} htmlFor="f-just">Justificativa do gabarito (obrigatória para aprovar)</label>
            <textarea id="f-just" value={s.justification} onChange={(e) => set("justification", e.target.value)} maxLength={6000} className={dTextarea} />
          </div>
        </div>
      </DCard>

      <DCard title="Fonte, fundamentação e direitos de uso">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={dLabel} htmlFor="f-source">Fonte {s.origin === "prova_anterior" ? "* (prova oficial)" : "(opcional)"}</label>
            <select id="f-source" value={s.sourceId} onChange={(e) => set("sourceId", e.target.value)} className={dInput} required={s.origin === "prova_anterior"}>
              <option value="">{sources.length ? "Sem fonte" : "Cadastre a fonte em “Fontes”"}</option>
              {sources.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name} — {SOURCE_KIND_LABEL[x.kind as SourceKind]}
                  {x.reuse_verified ? " ✓ autorização verificada" : ""}
                </option>
              ))}
            </select>
            {s.origin === "prova_anterior" && chosenSource && !chosenSource.reuse_verified && (
              <p className="mt-1 text-[12px] text-amber-200">Esta fonte ainda não tem autorização de reutilização verificada: a questão não poderá ser aprovada.</p>
            )}
          </div>
          <div>
            <label className={dLabel} htmlFor="f-rights">Direito de uso *</label>
            <select id="f-rights" value={s.usageRights} onChange={(e) => set("usageRights", e.target.value)} className={dInput}>
              {USAGE_RIGHTS.filter((r) => !(s.origin === "prova_anterior" && r === "proprio")).map((r) => (
                <option key={r} value={r}>{RIGHTS_LABEL[r]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={dLabel} htmlFor="f-verified">Data de verificação das fontes</label>
            <input id="f-verified" type="date" max={today()} value={s.verifiedAt} onChange={(e) => set("verifiedAt", e.target.value)} className={dInput} />
          </div>
          <div className="sm:col-span-2">
            <label className={dLabel} htmlFor="f-basis">Referência normativa ou bibliográfica (resumo)</label>
            <input id="f-basis" value={s.legalBasis} onChange={(e) => set("legalBasis", e.target.value)} maxLength={2000} className={dInput} placeholder="Ex.: CP, art. 121, § 2º, II" />
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-[14px] font-semibold text-white/85">Referências legais rastreáveis</p>
            <button type="button" onClick={() => set("legalRefs", [...s.legalRefs, emptyRef()])} disabled={s.legalRefs.length >= 10} className={dButton("secundario")}>
              + Referência
            </button>
          </div>
          {s.legalRefs.length === 0 && <p className="text-[13px] text-white/50">Para questões jurídicas, registre norma, artigo, link oficial e data de consulta. Nunca invente número de processo, tribunal ou tese.</p>}
          {s.legalRefs.map((r, i) => (
            <div key={i} className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
              <div className="grid gap-2 sm:grid-cols-4">
                <input value={r.normName} onChange={(e) => setRef(i, { normName: e.target.value })} className={`${dInput} sm:col-span-2`} placeholder="Norma * (ex.: Código Penal)" aria-label="Norma" />
                <input value={r.normNumber} onChange={(e) => setRef(i, { normNumber: e.target.value })} className={dInput} placeholder="Número (DL 2.848/1940)" aria-label="Número da norma" />
                <input value={r.normYear} onChange={(e) => setRef(i, { normYear: e.target.value.replace(/\D/g, "").slice(0, 4) })} className={dInput} placeholder="Ano" inputMode="numeric" aria-label="Ano da norma" />
                <input value={r.article} onChange={(e) => setRef(i, { article: e.target.value })} className={dInput} placeholder="Art." aria-label="Artigo" />
                <input value={r.paragraph} onChange={(e) => setRef(i, { paragraph: e.target.value })} className={dInput} placeholder="§" aria-label="Parágrafo" />
                <input value={r.item} onChange={(e) => setRef(i, { item: e.target.value })} className={dInput} placeholder="Inciso" aria-label="Inciso" />
                <input value={r.letter} onChange={(e) => setRef(i, { letter: e.target.value })} className={dInput} placeholder="Alínea" aria-label="Alínea" />
                <input value={r.officialUrl} onChange={(e) => setRef(i, { officialUrl: e.target.value })} className={`${dInput} sm:col-span-3`} placeholder="Link oficial https:// (Planalto, DOU, tribunal…)" aria-label="Link oficial" />
                <input type="date" max={today()} value={r.consultedOn} onChange={(e) => setRef(i, { consultedOn: e.target.value })} className={dInput} aria-label="Data de consulta" />
                <input value={r.normVersion} onChange={(e) => setRef(i, { normVersion: e.target.value })} className={`${dInput} sm:col-span-2`} placeholder="Versão/redação utilizada" aria-label="Versão da norma" />
                <input value={r.amendmentNote} onChange={(e) => setRef(i, { amendmentNote: e.target.value })} className={`${dInput} sm:col-span-2`} placeholder="Alteração legislativa relevante" aria-label="Alteração legislativa" />
              </div>
              <details className="mt-2">
                <summary className="cursor-pointer text-[13px] font-semibold text-white/70">Jurisprudência (opcional)</summary>
                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                  <input value={r.caseLawCourt} onChange={(e) => setRef(i, { caseLawCourt: e.target.value })} className={dInput} placeholder="Tribunal (STF, STJ…)" aria-label="Tribunal" />
                  <input value={r.caseLawId} onChange={(e) => setRef(i, { caseLawId: e.target.value })} className={`${dInput} sm:col-span-2`} placeholder="Identificação (HC nº …, Tema …, Súmula …)" aria-label="Identificação da decisão" />
                  <textarea value={r.caseLawThesis} onChange={(e) => setRef(i, { caseLawThesis: e.target.value })} className={`${dInput} py-2 sm:col-span-3`} rows={2} placeholder="Tese (somente com a decisão identificada)" aria-label="Tese" />
                </div>
              </details>
              <button type="button" onClick={() => set("legalRefs", s.legalRefs.filter((_, j) => j !== i))} className="mt-2 text-[13px] font-semibold text-[#ff8080] hover:underline">
                Remover referência
              </button>
            </div>
          ))}
        </div>
      </DCard>

      <div className="sticky bottom-0 z-10 -mx-4 flex flex-wrap items-center gap-3 border-t border-white/10 bg-[#09090b]/95 px-4 py-3 backdrop-blur">
        <button type="submit" disabled={pending} className={dButton("primario")}>
          {pending ? "Salvando…" : id ? "Salvar alterações" : "Salvar como rascunho"}
        </button>
        <button type="button" onClick={() => router.back()} className={dButton("discreto")}>
          Cancelar
        </button>
        <span className="text-[12px] text-white/45">Salvar não publica: a questão segue para revisão por outra pessoa.</span>
      </div>
    </form>
  );
}
