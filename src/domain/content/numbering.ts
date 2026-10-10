/**
 * Detecção de lacunas de numeração entre irmãos (ex.: incisos I, II, IV → falta III).
 * Pode indicar omissão no texto colado ou falha de extração; em ambos os casos o
 * aluno precisa saber antes que a trilha seja considerada completa.
 */
import type { ContentNode, NodeKind } from "./types";

export interface NumberingGap {
  parentKey: string | null;
  kind: NodeKind;
  /** Rótulos esperados e ausentes, ex.: ["III"] ou ["4.2"]. */
  missing: string[];
  /** Nó imediatamente após a lacuna. */
  afterKey: string | null;
  beforeKey: string;
  outOfOrder: boolean;
}

const ROMAN: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };

export function romanToInt(roman: string): number | null {
  const s = roman.toUpperCase();
  if (!/^[IVXLCDM]+$/.test(s)) return null;
  let total = 0;
  for (let i = 0; i < s.length; i++) {
    const cur = ROMAN[s[i]!]!;
    const next = ROMAN[s[i + 1] ?? ""] ?? 0;
    total += cur < next ? -cur : cur;
  }
  return total;
}

export function intToRoman(n: number): string {
  const table: Array<[number, string]> = [
    [1000, "M"], [900, "CM"], [500, "D"], [400, "CD"], [100, "C"], [90, "XC"],
    [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"],
  ];
  let out = "";
  let rest = n;
  for (const [v, s] of table) {
    while (rest >= v) {
      out += s;
      rest -= v;
    }
  }
  return out;
}

interface Numbered {
  value: number;
  /** Itens com sufixo (Art. 5º-A) são inserções legítimas e não quebram a sequência. */
  suffixed: boolean;
}

function parseNumber(node: ContentNode): Numbered | null {
  const m = node.marker;
  if (!m) return null;
  switch (node.kind) {
    case "topico": {
      const last = m.split(".").at(-1);
      const v = last ? Number.parseInt(last, 10) : Number.NaN;
      return Number.isFinite(v) ? { value: v, suffixed: false } : null;
    }
    case "artigo":
    case "paragrafo":
    case "item_legal": {
      if (/único/i.test(m)) return null;
      const d = m.match(/(\d+)/);
      if (!d) return null;
      return { value: Number.parseInt(d[1]!, 10), suffixed: /-\s*[A-Z]\b/.test(m) };
    }
    case "inciso": {
      const v = romanToInt(m);
      return v ? { value: v, suffixed: false } : null;
    }
    case "alinea": {
      const c = m.toLowerCase().charCodeAt(0);
      return c >= 97 && c <= 122 ? { value: c - 96, suffixed: false } : null;
    }
    default:
      return null;
  }
}

function label(kind: NodeKind, value: number, sample: ContentNode): string {
  switch (kind) {
    case "inciso":
      return intToRoman(value);
    case "alinea":
      return `${String.fromCharCode(96 + value)})`;
    case "artigo":
      return `Art. ${value}${value < 10 ? "º" : ""}`;
    case "paragrafo":
      return `§ ${value}º`;
    case "topico": {
      const parts = (sample.marker ?? "").split(".");
      parts[parts.length - 1] = String(value);
      return parts.join(".");
    }
    default:
      return String(value);
  }
}

/** Tipos cuja numeração deve começar em 1 dentro do pai. */
const STARTS_AT_ONE: ReadonlySet<NodeKind> = new Set(["inciso", "alinea", "paragrafo", "item_legal"]);

export function detectNumberingGaps(nodes: ContentNode[]): NumberingGap[] {
  const groups = new Map<string, ContentNode[]>();
  for (const n of nodes) {
    if (!parseNumber(n)) continue;
    const k = `${n.parentKey ?? "root"}|${n.kind}`;
    const list = groups.get(k) ?? [];
    list.push(n);
    groups.set(k, list);
  }

  const gaps: NumberingGap[] = [];
  for (const list of groups.values()) {
    list.sort((a, b) => a.order - b.order);
    const seq = list.filter((n) => !parseNumber(n)!.suffixed);
    const first = seq[0];
    if (!first) continue;
    const firstVal = parseNumber(first)!.value;
    const isSubtopic = first.kind === "topico" && (first.marker ?? "").includes(".");
    if ((STARTS_AT_ONE.has(first.kind) || isSubtopic) && firstVal > 1) {
      gaps.push({
        parentKey: first.parentKey,
        kind: first.kind,
        missing: range(1, firstVal - 1).map((v) => label(first.kind, v, first)),
        afterKey: null,
        beforeKey: first.key,
        outOfOrder: false,
      });
    }
    for (let i = 1; i < seq.length; i++) {
      const prev = seq[i - 1]!;
      const cur = seq[i]!;
      const a = parseNumber(prev)!.value;
      const b = parseNumber(cur)!.value;
      if (b === a + 1) continue;
      gaps.push({
        parentKey: cur.parentKey,
        kind: cur.kind,
        missing: b > a ? range(a + 1, b - 1).map((v) => label(cur.kind, v, cur)) : [],
        afterKey: prev.key,
        beforeKey: cur.key,
        outOfOrder: b <= a,
      });
    }
  }
  return gaps;
}

function range(from: number, to: number): number[] {
  const out: number[] = [];
  for (let v = from; v <= to && out.length < 50; v++) out.push(v);
  return out;
}
