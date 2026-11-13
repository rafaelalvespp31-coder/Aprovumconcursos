/**
 * Estrutura do trecho marcado num post-it: parágrafos, títulos, listas, código e TABELAS
 * (linhas e colunas) exatamente como aparecem na leitura. O navegador monta, o servidor limpa e
 * confere que o texto da estrutura é o mesmo do trecho (nada inventado) antes de guardar.
 */
import { matchKey } from "./postit-quote";

export type QuoteBlock =
  | { k: "p"; t: string }
  | { k: "h"; t: string }
  | { k: "li"; t: string; n?: number; d?: number }
  | { k: "pre"; t: string }
  | { k: "table"; rows: Array<{ h?: boolean; c: string[] }> };

export const STRUCT_LIMITS = { blocks: 4000, rows: 1500, cols: 20, text: 100_000, total: 400_000 };

const txt = (v: unknown): string =>
  typeof v === "string" ? v.normalize("NFC").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F​-‍⁠﻿]/g, "").replace(/\r\n?/g, "\n").slice(0, STRUCT_LIMITS.text) : "";

export function sanitizeStructure(raw: unknown): QuoteBlock[] | null {
  if (!Array.isArray(raw) || !raw.length || raw.length > STRUCT_LIMITS.blocks) return null;
  const out: QuoteBlock[] = [];
  for (const b of raw as Array<Record<string, unknown>>) {
    if (!b || typeof b !== "object") return null;
    if (b.k === "p" || b.k === "h" || b.k === "pre") {
      const t = txt(b.t);
      if (t.trim()) out.push({ k: b.k, t });
    } else if (b.k === "li") {
      const t = txt(b.t);
      if (!t.trim()) continue;
      const n = typeof b.n === "number" && Number.isInteger(b.n) && b.n >= 0 && b.n < 10000 ? b.n : undefined;
      const d = typeof b.d === "number" && Number.isInteger(b.d) && b.d >= 0 && b.d <= 4 ? b.d : undefined;
      out.push({ k: "li", t, ...(n != null ? { n } : {}), ...(d ? { d } : {}) });
    } else if (b.k === "table" && Array.isArray(b.rows)) {
      if (b.rows.length > STRUCT_LIMITS.rows) return null;
      const rows: Array<{ h?: boolean; c: string[] }> = [];
      for (const r of b.rows as Array<Record<string, unknown>>) {
        if (!r || !Array.isArray(r.c) || r.c.length > STRUCT_LIMITS.cols) return null;
        rows.push({ ...(r.h === true ? { h: true } : {}), c: (r.c as unknown[]).map(txt) });
      }
      if (rows.length) out.push({ k: "table", rows });
    } else return null;
  }
  if (!out.length) return null;
  return structureText(out).length <= STRUCT_LIMITS.total ? out : null;
}

/** Todo o texto da estrutura, na ordem. */
export function structureText(blocks: QuoteBlock[]): string {
  return blocks.map((b) => (b.k === "table" ? b.rows.map((r) => r.c.join(" ")).join(" ") : b.t)).join(" ");
}

/** A estrutura só vale se contém exatamente o mesmo texto (letras e números) do trecho. */
export function structureMatchesQuote(blocks: QuoteBlock[], quote: string): boolean {
  return matchKey(structureText(blocks)) === matchKey(quote);
}

/** Vale guardar? Um parágrafo só já é o próprio trecho. */
export const isRichStructure = (blocks: QuoteBlock[]): boolean => blocks.length > 1 || blocks[0]?.k !== "p";
