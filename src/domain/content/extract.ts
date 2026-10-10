/**
 * Etapa 2/3 — Extração hierárquica e mapa de cobertura (determinístico).
 *
 * Cada nó recebe uma chave estável e o trecho exato (span) do texto normalizado
 * que lhe deu origem. Ao final, calculamos quais trechos com conteúdo não foram
 * atribuídos a nenhum nó — a base da garantia de "nada some silenciosamente".
 *
 * A IA NÃO participa desta etapa: ela só enriquece (relevância, pré-requisitos)
 * nós que já existem e são validados contra este mapa.
 */
import {
  CONTAINER_KINDS,
  LEGAL_KINDS,
  type ContentNode,
  type ExtractionResult,
  type NodeKind,
  type SourceSpan,
} from "./types";

export interface ExtractedNode extends ContentNode {
  /** Falso para contêineres e tópicos totalmente decompostos em subtópicos. */
  requiresDirectCoverage: boolean;
}

export interface Extraction extends ExtractionResult {
  nodes: ExtractedNode[];
}

interface Segment {
  text: string;
  start: number;
  end: number;
}

// ---------------------------------------------------------------------------
// Segmentação: linhas + quebras de itens "em linha" (comuns em editais colados)
// ---------------------------------------------------------------------------

const UPPER_START = "A-ZÀ-ÖØ-Þ";
/** Pontos onde um item começa no meio de uma linha, após pontuação. */
const INLINE_BREAKS: RegExp[] = [
  // "... textos. 2 Reconhecimento ..." / "LÍNGUA PORTUGUESA: 1 Compreensão"
  new RegExp(`(?<=[.;:])\\s+(?=\\d{1,3}(?:\\.\\d{1,3})*\\.?\\s+[${UPPER_START}])`, "g"),
  // "... Art. 1º ... . Art. 2º ..."
  /(?<=[.;:])\s+(?=Art(?:igo)?\.?\s*\d)/g,
  /(?<=[.;:])\s+(?=§\s*\d)/g,
  /(?<=[.;:])\s+(?=Par[áa]grafo [úu]nico)/gi,
  // "...: I - ...; II - ...;"
  /(?<=[;:])\s+(?=[IVXLCDM]+\s*[-–—]\s)/g,
  // "...: a) ...; b) ..."
  /(?<=[;:])\s+(?=[a-z]\)\s)/g,
];

function segmentText(text: string): Segment[] {
  const segments: Segment[] = [];
  let offset = 0;
  for (const line of text.split("\n")) {
    const lineStart = offset;
    offset += line.length + 1;
    if (line.trim() === "") continue;

    const cuts = new Set<number>();
    for (const re of INLINE_BREAKS) {
      re.lastIndex = 0;
      for (const m of line.matchAll(re)) {
        if (m.index !== undefined) cuts.add(m.index + m[0].length);
      }
    }
    const points = [0, ...[...cuts].sort((a, b) => a - b), line.length];
    for (let i = 0; i < points.length - 1; i++) {
      const a = points[i]!;
      const b = points[i + 1]!;
      const raw = line.slice(a, b);
      const lead = raw.length - raw.trimStart().length;
      const trimmed = raw.trim();
      // Segmentos sem letras/dígitos (ex.: "...", "---") são ruído, não tópicos.
      if (!trimmed || !/[\p{L}\p{N}]/u.test(trimmed)) continue;
      const start = lineStart + a + lead;
      segments.push({ text: trimmed, start, end: start + trimmed.length });
    }
  }
  return segments;
}

// ---------------------------------------------------------------------------
// Classificação de segmentos
// ---------------------------------------------------------------------------

interface Classified {
  kind: NodeKind | "heading" | "plain";
  marker: string | null;
  /** Texto sem o marcador. */
  body: string;
  /** Profundidade da numeração decimal (1 para "2", 2 para "2.1"...). */
  decimalDepth?: number;
}

const RE = {
  titulo: /^(T[ÍI]TULO\s+[IVXLCDM]+)\b\.?\s*[-–—]?\s*/i,
  capitulo: /^(CAP[ÍI]TULO\s+[IVXLCDM]+)\b\.?\s*[-–—]?\s*/i,
  subsecao: /^(Subse[çc][ãa]o\s+[IVXLCDM]+)\b\.?\s*[-–—]?\s*/i,
  secao: /^(Se[çc][ãa]o\s+[IVXLCDM]+)\b\.?\s*[-–—]?\s*/i,
  artigo: /^(Art(?:igo)?\.?\s*\d+(?:\.\d+)?\s*(?:[º°o]|ª)?(?:\s*-\s*[A-Z]\b)?)\.?\s*[-–—]?\s*/,
  paragrafo: /^(§\s*\d+\s*(?:[º°o])?(?:\s*-\s*[A-Z]\b)?|Par[áa]grafo [úu]nico)\.?\s*[-–—]?\s*/i,
  romano: /^([IVXLCDM]+)\s*[-–—]\s+/,
  letra: /^([a-z])\)\s+/,
  numeroLegal: /^(\d{1,2})(?:\)|\s*[-–—])\s+/,
  decimal: /^(\d{1,3}(?:\.\d{1,3})*)(?:\.(?!\d)|\s*[-–—)])?\s+(?=\S)/,
  bullet: /^[•*\-–]\s+/,
};

function upperRatio(s: string): number {
  const letters = s.match(/\p{L}/gu) ?? [];
  if (letters.length < 3) return 0;
  const upper = letters.filter((c) => c === c.toUpperCase() && c !== c.toLowerCase());
  return upper.length / letters.length;
}

function classify(text: string, legalContext: boolean, inAlinea: boolean): Classified {
  const take = (kind: Classified["kind"], m: RegExpMatchArray): Classified => ({
    kind,
    marker: (m[1] ?? "").replace(/\s+/g, " ").trim(),
    body: text.slice(m[0].length).trim(),
  });

  let m: RegExpMatchArray | null;
  if ((m = text.match(RE.titulo))) return take("titulo", m);
  if ((m = text.match(RE.capitulo))) return take("capitulo", m);
  if ((m = text.match(RE.subsecao))) return take("subsecao", m);
  if ((m = text.match(RE.secao))) return take("secao", m);
  if ((m = text.match(RE.artigo))) return take("artigo", m);
  if ((m = text.match(RE.paragrafo))) return take("paragrafo", m);
  if ((m = text.match(RE.romano))) return take(legalContext ? "inciso" : "grupo", m);
  if ((m = text.match(RE.letra))) return take(legalContext ? "alinea" : "item", m);
  if (inAlinea && (m = text.match(RE.numeroLegal))) return take("item_legal", m);
  if ((m = text.match(RE.decimal))) {
    const c = take("topico", m);
    c.decimalDepth = (c.marker ?? "").split(".").length;
    return c;
  }
  if ((m = text.match(RE.bullet))) {
    return { kind: "item", marker: null, body: text.slice(m[0].length).trim() };
  }
  const isHeading =
    text.length <= 150 && (/:\s*$/.test(text) || upperRatio(text) >= 0.8);
  if (isHeading) return { kind: "heading", marker: null, body: text };
  return { kind: "plain", marker: null, body: text };
}

const LEGAL_RANK: Partial<Record<NodeKind, number>> = {
  titulo: 41,
  capitulo: 42,
  secao: 43,
  subsecao: 44,
  artigo: 45,
  paragrafo: 46,
  inciso: 47,
  alinea: 48,
  item_legal: 49,
};

function cleanTitle(body: string, fallback: string | null): string {
  const t = body.replace(/\s+/g, " ").replace(/[\s.;:,]+$/u, "").trim();
  return t || fallback || "";
}

function endsSentence(s: string): boolean {
  return /[.;:!?)]\s*$/.test(s);
}

// ---------------------------------------------------------------------------
// Construção da árvore
// ---------------------------------------------------------------------------

interface StackEntry {
  node: ExtractedNode;
  rank: number;
}

export function extractStructure(normalized: string): Extraction {
  const segments = segmentText(normalized);
  const nodes: ExtractedNode[] = [];
  const childCount = new Map<string | null, number>();
  const stack: StackEntry[] = [];
  let seq = 0;

  const nextKey = () => `N${String(++seq).padStart(4, "0")}`;
  const isLegalContext = () =>
    stack.some((e) => e.node.kind === "artigo" || e.node.kind === "paragrafo");
  const inAlinea = () => stack.at(-1)?.node.kind === "alinea";

  const makeNode = (
    kind: NodeKind,
    marker: string | null,
    title: string,
    span: SourceSpan,
    parent: ExtractedNode | null,
  ): ExtractedNode => {
    const parentKey = parent?.key ?? null;
    const order = childCount.get(parentKey) ?? 0;
    childCount.set(parentKey, order + 1);
    const label = marker ?? (title.length > 40 ? `${title.slice(0, 40)}…` : title);
    const node: ExtractedNode = {
      key: nextKey(),
      kind,
      marker,
      title,
      sourceText: normalized.slice(span.start, span.end),
      span: { ...span },
      parentKey,
      depth: parent ? parent.depth + 1 : 0,
      order,
      path: parent ? `${parent.path} › ${label}` : label,
      requiresDirectCoverage: !CONTAINER_KINDS.has(kind),
    };
    nodes.push(node);
    return node;
  };

  const extend = (node: ExtractedNode, seg: Segment, addToTitle: string) => {
    node.span.end = seg.end;
    node.sourceText = normalized.slice(node.span.start, node.span.end);
    node.title = cleanTitle(
      node.title && node.title !== node.marker ? `${node.title} ${addToTitle}` : addToTitle,
      node.marker,
    );
  };

  const looksLikeHeading = (s: Segment | undefined) =>
    !!s &&
    s.text.length <= 150 &&
    (/:\s*$/.test(s.text) || /:\s/.test(s.text.slice(0, 80)) || upperRatio(s.text) >= 0.8) &&
    !RE.decimal.test(s.text) &&
    !RE.bullet.test(s.text);

  for (let si = 0; si < segments.length; si++) {
    const seg = segments[si]!;
    const c = classify(seg.text, isLegalContext(), inAlinea());
    const top = stack.at(-1)?.node ?? null;

    // Nome de um título/capítulo/seção em linha separada: "TÍTULO II" ↵ "Dos Direitos..."
    if (
      top &&
      (c.kind === "plain" || c.kind === "heading") &&
      ["titulo", "capitulo", "secao", "subsecao"].includes(top.kind) &&
      top.title === top.marker &&
      top.span.end <= seg.start
    ) {
      extend(top, seg, cleanTitle(c.body, null));
      continue;
    }

    // Continuação de linha quebrada (PDF): anterior sem pontuação final + início minúsculo.
    const last = nodes.at(-1);
    if (
      last &&
      c.kind === "plain" &&
      /^[a-zà-öø-ÿ(]/.test(seg.text) &&
      !endsSentence(last.sourceText)
    ) {
      extend(last, seg, c.body);
      continue;
    }

    let kind: NodeKind;
    let rank: number;
    if (c.kind === "heading" && !/:\s*$/.test(seg.text) && looksLikeHeading(segments[si + 1])) {
      // "CONHECIMENTOS BÁSICOS" seguido de "LÍNGUA PORTUGUESA:" → agrupador acima das disciplinas.
      kind = "grupo";
      rank = -1;
    } else if (c.kind === "heading") {
      kind = "disciplina";
      rank = 0;
    } else if (c.kind === "grupo") {
      kind = "grupo";
      rank = 1;
    } else if (c.kind === "topico") {
      kind = "topico";
      rank = 1 + (c.decimalDepth ?? 1);
    } else if (c.kind === "item" || c.kind === "plain") {
      kind = "item";
      // Itens soltos ficam um nível abaixo do último nó estruturado.
      const anchor = [...stack].reverse().find((e) => e.node.kind !== "item");
      rank = (anchor?.rank ?? -1) + 1;
    } else {
      kind = c.kind;
      rank = LEGAL_RANK[kind] ?? 50;
    }

    while (stack.length && stack.at(-1)!.rank >= rank) stack.pop();
    const parent = stack.at(-1)?.node ?? null;
    const title = cleanTitle(c.body, c.marker);
    const node = makeNode(kind, c.marker, title, { start: seg.start, end: seg.end }, parent);
    stack.push({ node, rank });
  }

  splitSubtopics(nodes, normalized, nextKey);
  fixDescendantPaths(nodes);

  return { nodes, unassigned: findUnassigned(normalized, nodes) };
}

/**
 * Tópicos do tipo "Tipologia textual; gêneros; coesão" viram subtópicos, um por
 * conceito, para que cada conceito tenha cobertura rastreável.
 */
function splitSubtopics(
  nodes: ExtractedNode[],
  normalized: string,
  nextKey: () => string,
): void {
  const snapshot = [...nodes];
  for (const node of snapshot) {
    if (node.kind !== "topico" && node.kind !== "item") continue;
    if (nodes.some((n) => n.parentKey === node.key)) continue; // já tem filhos
    const text = node.sourceText;
    const bodyOffset = node.marker ? text.indexOf(node.title.slice(0, 8)) : 0;
    if (bodyOffset < 0) continue;
    let body = text.slice(bodyOffset);
    if (!body.includes(";")) continue;
    // "Tema: a; b; c" → os subtópicos são a, b, c; o tema continua sendo o título do pai.
    const colon = body.indexOf(": ");
    let effectiveOffset = bodyOffset;
    if (colon > 0 && colon < body.indexOf(";")) {
      effectiveOffset = bodyOffset + colon + 2;
      body = text.slice(effectiveOffset);
    }

    const parts: Array<{ text: string; start: number; end: number }> = [];
    let cursor = 0;
    for (const piece of body.split(";")) {
      const lead = piece.length - piece.trimStart().length;
      const clean = piece.trim().replace(/[.;:,]+$/, "").trim();
      if (clean.length >= 3) {
        const absStart = node.span.start + effectiveOffset + cursor + lead;
        parts.push({ text: clean, start: absStart, end: absStart + clean.length });
      }
      cursor += piece.length + 1;
    }
    if (parts.length < 2) continue;

    node.requiresDirectCoverage = false;
    const insertAt = nodes.indexOf(node) + 1;
    const children = parts.map<ExtractedNode>((p, i) => ({
      key: nextKey(),
      kind: "subtopico",
      marker: null,
      title: p.text,
      sourceText: normalized.slice(p.start, p.end),
      span: { start: p.start, end: p.end },
      parentKey: node.key,
      depth: node.depth + 1,
      order: i,
      path: `${node.path} › ${p.text.length > 40 ? `${p.text.slice(0, 40)}…` : p.text}`,
      requiresDirectCoverage: true,
    }));
    nodes.splice(insertAt, 0, ...children);
  }
}

/** Recalcula caminhos depois de títulos atualizados por linhas de continuação. */
function fixDescendantPaths(nodes: ExtractedNode[]): void {
  const byKey = new Map(nodes.map((n) => [n.key, n]));
  for (const n of nodes) {
    const label = n.marker ?? (n.title.length > 40 ? `${n.title.slice(0, 40)}…` : n.title);
    const parent = n.parentKey ? byKey.get(n.parentKey) : undefined;
    n.path = parent ? `${parent.path} › ${label}` : label;
  }
}

/** Trechos do texto com conteúdo (letras/dígitos) que nenhum nó cobre. */
export function findUnassigned(text: string, nodes: Pick<ContentNode, "span">[]): SourceSpan[] {
  const covered = new Uint8Array(text.length);
  for (const n of nodes) covered.fill(1, n.span.start, n.span.end);
  const gaps: SourceSpan[] = [];
  let i = 0;
  while (i < text.length) {
    if (covered[i]) {
      i++;
      continue;
    }
    const start = i;
    while (i < text.length && !covered[i]) i++;
    const chunk = text.slice(start, i);
    if (/[\p{L}\p{N}]/u.test(chunk)) {
      const lead = chunk.length - chunk.trimStart().length;
      const trail = chunk.length - chunk.trimEnd().length;
      gaps.push({ start: start + lead, end: i - trail });
    }
  }
  return gaps;
}

export function isLegalNode(kind: NodeKind): boolean {
  return LEGAL_KINDS.has(kind);
}
