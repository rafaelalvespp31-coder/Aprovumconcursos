"use client";

import { useState } from "react";
import { Icon } from "./icons";
import { Markdown } from "./markdown";

export interface ExampleCase {
  /** Título curto (ex.: "Briga no bar"). */
  title: string;
  /** Situação apresentada ao aluno. */
  situation: string;
  /** Resposta/enquadramento, revelada ao tocar. Vazio = exemplo ilustrativo sem pergunta. */
  answer: string;
}

const strip = (s: string) => s.replace(/^\s*[-*]\s+/, "").trim();

/**
 * Divide o texto de exemplos em casos. Formatos aceitos:
 *  - "**Caso 1 — Título.** Situação…\n→ Resposta"
 *  - listas "- **Título:** texto" (cada item vira um card ilustrativo)
 *  - parágrafos soltos (cada um vira um card)
 * Texto que não se encaixa continua como parágrafo (nada é descartado).
 */
export function parseExamples(md: string): ExampleCase[] {
  const blocks = md.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
  const out: ExampleCase[] = [];
  for (const block of blocks) {
    const lines = block.split("\n");
    const isList = lines.every((l) => /^\s*[-*]\s+/.test(l) || /^\s{2,}\S/.test(l));
    if (isList) {
      for (const item of block.split(/\n(?=\s*[-*]\s+)/)) out.push(toCase(strip(item)));
      continue;
    }
    out.push(toCase(block));
  }
  return out;
}

function toCase(text: string): ExampleCase {
  const [before, ...after] = text.split(/\n?\s*(?:→|->|Resposta:)\s*/);
  const answer = after.join(" → ").trim();
  const m = before!.match(/^\*\*(.+?)\*\*\s*:?\s*([\s\S]*)$/);
  let title = "";
  let situation = before!.trim();
  if (m) {
    title = m[1]!.replace(/[.:]\s*$/, "").replace(/^(caso|exemplo)\s*\d*\s*[—–-]\s*/i, "").trim();
    situation = m[2]!.trim();
  }
  return { title, situation, answer };
}

export function ExampleCards({ markdown, kind }: { markdown: string; kind: "exemplos" | "aplicacao" }) {
  const cases = parseExamples(markdown);
  const [open, setOpen] = useState<Set<number>>(new Set());
  const total = cases.filter((c) => c.answer).length;
  const seen = [...open].filter((i) => cases[i]?.answer).length;
  const toggle = (i: number) => setOpen((s) => new Set(s.has(i) ? [...s].filter((x) => x !== i) : [...s, i]));

  return (
    <div className="not-prose my-2 flex flex-col gap-3 font-sans" data-testid="exemplos-interativos">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-nevoa px-3 py-2 t-small">
        <span className="inline-flex items-center gap-1.5 font-semibold">
          <Icon name="lampada" className="size-4 text-destaque" />
          {kind === "exemplos" ? "Casos práticos" : "Aplicação prática"}: leia a situação, pense no enquadramento e toque para conferir.
        </span>
        {total > 0 && (
          <span className="tabular-nums text-tinta-suave">
            {seen} de {total} conferidos
          </span>
        )}
      </div>
      {cases.map((c, i) => {
        const revealed = open.has(i);
        return (
          <article
            key={i}
            className={`overflow-hidden rounded-lg border-2 transition-colors duration-300 ${revealed ? "border-acerto/60" : "border-linha-forte"}`}
            aria-label={c.title ? `Caso ${i + 1}: ${c.title}` : `Caso ${i + 1}`}
          >
            <header className={`flex items-center gap-2 px-4 py-2 ${revealed ? "bg-acerto-fundo" : "bg-papel"}`}>
              <span className={`flex size-7 shrink-0 items-center justify-center rounded-full t-small font-bold text-white ${revealed ? "bg-acerto" : "bg-azul"}`}>
                {revealed && c.answer ? <Icon name="check" className="size-4" /> : i + 1}
              </span>
              <span className="t-tiny font-bold uppercase tracking-wide text-tinta-fraca">Caso {i + 1}</span>
              {c.title && <span className="truncate font-semibold">{c.title}</span>}
            </header>
            <div className="px-4 pb-4 pt-3">
              <p className="mb-1 inline-flex items-center gap-1 t-tiny font-bold uppercase tracking-wide text-tinta-fraca">
                <Icon name="livro" className="size-3.5" /> Situação
              </p>
              <div className="leitura !max-w-none !text-[1rem]">
                <Markdown>{c.situation || "—"}</Markdown>
              </div>
              {c.answer && (
                <>
                  <button
                    type="button"
                    onClick={() => toggle(i)}
                    aria-expanded={revealed}
                    className={`mt-2 inline-flex min-h-11 items-center gap-2 rounded-full px-4 font-semibold transition-transform active:scale-95 ${
                      revealed ? "border border-linha-forte bg-superficie text-tinta-suave" : "bg-azul text-white shadow-sm"
                    }`}
                  >
                    <Icon name={revealed ? "chevronDown" : "alvo"} className={`size-4 ${revealed ? "rotate-180" : ""}`} />
                    {revealed ? "Esconder resposta" : "Qual o enquadramento? Ver resposta"}
                  </button>
                  {revealed && (
                    <div className="entrar mt-3 rounded-md border-l-4 border-acerto bg-acerto-fundo px-4 py-3" role="status">
                      <p className="mb-1 inline-flex items-center gap-1 t-tiny font-bold uppercase tracking-wide text-acerto">
                        <Icon name="balanca" className="size-3.5" /> Enquadramento
                      </p>
                      <div className="leitura !max-w-none !text-[1rem]">
                        <Markdown>{c.answer}</Markdown>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}
