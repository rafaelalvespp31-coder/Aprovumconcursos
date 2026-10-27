"use client";

import { useMemo, useState, useTransition } from "react";
import { Button, inputClass } from "@/components/ui";
import { DISCIPLINE_LABELS, DISCIPLINE_MODES, type DisciplineMode } from "@/ai/pedagogy";
import { parseOutline } from "@/domain/catalog/topic-group";
import type { AdminResult } from "../actions";

type Input = { disciplineMode: string; title: string; text: string };

const EXAMPLE = `4. Ilicitude
4.1. Causas de exclusão da ilicitude
* 4.1.1. Conceito de ilicitude ou antijuridicidade.
* 4.1.2. Estado de necessidade.
* 4.1.3. Legítima defesa.
4.2. Excesso punível
* 4.2.1. Conceito de excesso punível.
* 4.2.2. Excesso doloso.`;

/** Formulário do plano: cole o sumário do edital e veja a árvore montada enquanto digita. */
export function OutlineForm({ initial, submit, submitLabel, onDone }: { initial?: Input; submit: (d: Input) => Promise<AdminResult>; submitLabel: string; onDone?: () => void }) {
  const [disciplineMode, setDiscipline] = useState(initial?.disciplineMode ?? "direito_penal");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [text, setText] = useState(initial?.text ?? "");
  const [res, setRes] = useState<AdminResult | null>(null);
  const [pending, start] = useTransition();
  const tree = useMemo(() => (text.trim() ? parseOutline(text) : null), [text]);
  const subs = tree ? tree.groups.reduce((n, g) => n + g.subtopics.length, 0) : 0;

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await submit({ disciplineMode, title, text });
          setRes(r);
          if (r.ok) onDone?.();
        });
      }}
    >
      <div className="grid gap-3 sm:grid-cols-[1fr_2fr]">
        <label className="flex flex-col gap-1 t-small font-semibold">
          Matéria
          <select value={disciplineMode} onChange={(e) => setDiscipline(e.target.value)} className={inputClass} name="materia">
            {DISCIPLINE_MODES.filter((m) => m !== "outra").map((m) => (
              <option key={m} value={m}>{DISCIPLINE_LABELS[m as DisciplineMode]}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 t-small font-semibold">
          Nome do plano
          <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} placeholder="ex.: Direito Penal — Parte Geral (edital PPMG)" name="nome" maxLength={160} required />
        </label>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <label className="flex flex-col gap-1 t-small font-semibold">
          Sumário do edital
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={16}
            className={`${inputClass} py-2 font-mono text-[0.85rem]`}
            placeholder={EXAMPLE}
            name="sumario"
            required
          />
          <span className="t-tiny font-normal text-tinta-fraca">Cole como está no edital: 4. Tópico · 4.1 Subtópico · 4.1.1 Item (com ou sem “*”). “tópico: Nome” também vale.</span>
        </label>
        <div aria-live="polite" className="rounded-md border border-linha p-3" data-testid="arvore-previa">
          <p className="t-small font-semibold">Como vai ficar</p>
          {!tree ? (
            <p className="mt-2 t-small text-tinta-suave">Cole o sumário para ver os tópicos, subtópicos (aulas) e itens (módulos).</p>
          ) : (
            <>
              <p className="mt-1 t-tiny text-tinta-suave">
                {tree.groups.length} tópico(s) · {subs} subtópico(s) = {subs} aula(s) para catalogar
              </p>
              <ul className="mt-2 flex flex-col gap-2 t-small">
                {tree.groups.map((g, gi) => (
                  <li key={gi}>
                    <p className="font-semibold">📁 {g.code ? `${g.code}. ` : ""}{g.title}</p>
                    <ul className="ml-4 mt-1 flex flex-col gap-1">
                      {g.subtopics.map((s, si) => (
                        <li key={si}>
                          <p>📘 <span className="font-semibold">{s.code ? `${s.code} ` : ""}{s.title}</span> <span className="t-tiny text-tinta-fraca">· aula com {s.items.length} módulo(s)</span></p>
                          {s.items.length > 0 && (
                            <ul className="ml-5 t-tiny text-tinta-suave">
                              {s.items.map((it, ii) => (
                                <li key={ii}>{it.code ? `${it.code} ` : "• "}{it.title}</li>
                              ))}
                            </ul>
                          )}
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
              {tree.warnings.length > 0 && (
                <ul className="mt-3 flex flex-col gap-1 t-tiny text-alerta">
                  {tree.warnings.map((w, i) => <li key={i}>⚠ {w}</li>)}
                </ul>
              )}
            </>
          )}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending || !tree?.groups.length}>{pending ? "Salvando…" : submitLabel}</Button>
        {res && !res.ok && <span className="t-small text-erro" role="alert">{res.error}</span>}
        {res?.ok && res.message && <span className="t-small text-tinta-suave" role="status">{res.message}</span>}
      </div>
    </form>
  );
}
