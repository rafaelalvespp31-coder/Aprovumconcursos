"use client";

import { forwardRef, useImperativeHandle, useRef } from "react";
import type { FixAction, TextIssue } from "@/domain/catalog/upload-fixes";

export type LineMark = "erro" | "aviso" | "foco";

export interface MarkedTextareaHandle {
  /** Seleciona a linha (1 = primeira) e rola até ela. */
  goTo: (line: number, endLine?: number | null) => void;
}

/**
 * Campo de texto com as linhas problemáticas destacadas por trás (mesma fonte e quebra de linha):
 * o administrador vê no próprio texto onde está cada erro.
 */
export const MarkedTextarea = forwardRef<
  MarkedTextareaHandle,
  { id: string; value: string; onChange: (v: string) => void; placeholder?: string; marks: Map<number, LineMark>; className?: string }
>(function MarkedTextarea({ id, value, onChange, placeholder, marks, className = "" }, ref) {
  const ta = useRef<HTMLTextAreaElement>(null);
  const back = useRef<HTMLDivElement>(null);
  const lines = value.split("\n");

  useImperativeHandle(ref, () => ({
    goTo(line, endLine) {
      const el = ta.current;
      if (!el) return;
      const all = el.value.split("\n");
      const from = Math.max(1, Math.min(line, all.length));
      const to = Math.max(from, Math.min((endLine ?? from + 1) - 1, all.length));
      let start = 0;
      for (let i = 0; i < from - 1; i++) start += all[i]!.length + 1;
      let end = start;
      for (let i = from - 1; i < to; i++) end += all[i]!.length + 1;
      el.focus({ preventScroll: true });
      el.setSelectionRange(start, Math.max(start, end - 1));
      const row = back.current?.querySelector<HTMLElement>(`[data-l="${from}"]`);
      if (row) el.scrollTop = Math.max(0, row.offsetTop - 48);
      el.scrollIntoView({ block: "nearest", behavior: "smooth" });
    },
  }));

  const shared = "m-0 w-full whitespace-pre-wrap break-words p-3 font-mono text-[13px] leading-relaxed [overflow-wrap:anywhere] [scrollbar-gutter:stable]";
  return (
    <div className={`relative rounded-md border border-linha-forte bg-superficie focus-within:border-azul focus-within:ring-2 focus-within:ring-azul/20 ${className}`}>
      <div ref={back} aria-hidden className={`pointer-events-none absolute inset-0 overflow-hidden text-transparent ${shared}`}>
        {lines.map((l, i) => {
          const m = marks.get(i + 1);
          return (
            <div key={i} data-l={i + 1} className={m === "erro" ? "rounded-sm bg-erro/15 shadow-[inset_3px_0_0_var(--color-erro)]" : m === "foco" ? "bg-erro/[0.06]" : m === "aviso" ? "rounded-sm bg-alerta-fundo" : undefined}>
              {l || " "}
            </div>
          );
        })}
      </div>
      <textarea
        ref={ta}
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onScroll={(e) => {
          if (back.current) back.current.scrollTop = e.currentTarget.scrollTop;
        }}
        placeholder={placeholder}
        spellCheck={false}
        className={`relative block min-h-72 resize-y overflow-y-auto bg-transparent focus:outline-none ${shared}`}
      />
    </div>
  );
});

/** Lista de problemas com "Ver no texto" e as correções de um clique. */
export function IssueList({
  issues,
  disabled,
  onGo,
  onFix,
  lineLabel,
}: {
  issues: TextIssue[];
  disabled?: boolean;
  onGo: (i: TextIssue) => void;
  onFix: (fix: FixAction, i: TextIssue) => void;
  lineLabel: (line: number) => string;
}) {
  if (!issues.length) return null;
  return (
    <ul className="flex flex-col gap-2" data-testid="problemas-texto">
      {issues.map((i, k) => {
        const many = i.fixes.length > 7;
        const ordered: FixAction[] = [...i.fixes].sort((a, b) => Number(!!b.recommended) - Number(!!a.recommended));
        return (
          <li key={`${k}-${i.message}`} className={`rounded-md border p-2.5 t-small ${i.severity === "erro" ? "border-erro/40 bg-erro/5" : "border-linha-forte bg-alerta-fundo"}`} data-severidade={i.severity}>
            <p>
              {i.line && <span className="mr-1.5 inline-block rounded bg-tinta/80 px-1.5 font-mono text-[11px] text-white">{lineLabel(i.line)}</span>}
              {i.line ? i.message.replace(/^Linha \d+:\s*/, "").replace(/^Questão da linha \d+:\s*/, "Questão: ") : i.message}
            </p>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              {i.line && (
                <button type="button" className="min-h-8 rounded border border-linha-forte bg-superficie px-2.5 font-semibold text-destaque" onClick={() => onGo(i)}>
                  Ver no texto
                </button>
              )}
              {many ? (
                <select
                  aria-label="Corrigir"
                  disabled={disabled}
                  className="min-h-8 rounded border border-linha-forte bg-superficie px-2"
                  defaultValue=""
                  onChange={(e) => {
                    const f = i.fixes[Number(e.target.value)];
                    if (f) onFix(f, i);
                  }}
                >
                  <option value="" disabled>
                    Corrigir: escolha…
                  </option>
                  {i.fixes.map((f, n) => (
                    <option key={f.label} value={n}>{f.recommended ? `${f.label} (sugerido)` : f.label}</option>
                  ))}
                </select>
              ) : (
                ordered.map((f) => (
                  <button
                    key={f.label}
                    type="button"
                    disabled={disabled}
                    onClick={() => onFix(f, i)}
                    className={`min-h-8 rounded px-2.5 font-semibold disabled:opacity-50 ${f.recommended ? "bg-tinta text-white" : /^Remover/.test(f.label) ? "border border-erro/50 bg-superficie text-erro" : "border border-linha-forte bg-superficie"}`}
                  >
                    {f.recommended ? `✓ ${f.label}` : f.label}
                  </button>
                ))
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
