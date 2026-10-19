/**
 * "Visão da aula": organiza o conteúdo REAL de uma aula (seções, itens do conteúdo e
 * exemplos) nos nove cards da interface de aula. Nada é inventado — cada card só mostra
 * o que existe nas seções; quando falta, o card fica vazio e aponta para o estudo guiado.
 * Funciona para qualquer matéria (com ou sem texto legal).
 */
import { fromMarkdown } from "mdast-util-from-markdown";
import { gfmFromMarkdown } from "mdast-util-gfm";
import { gfm } from "micromark-extension-gfm";
import type { List, Paragraph, Root, RootContent, Table } from "mdast";
import { extractPractice, type PracticeCase } from "./practice";

export interface BoardSection {
  id: string;
  kind: string;
  title: string;
  body_markdown: string;
  practice?: PracticeCase[];
}

export interface BoardExample {
  title: string;
  situation: string;
  answer: string;
}

export interface LessonBoard {
  /** Título sem a referência entre parênteses; a última palavra recebe destaque. */
  title: { lead: string; highlight: string };
  /** Referência entre parênteses no título (ex.: "CP, art. 121") ou null. */
  legalBasis: string | null;
  concept: { markdown: string; example: BoardExample | null; sectionId: string } | null;
  scheme: { items: Array<{ label: string; detail: string }>; sectionId: string | null; source: "esquema" | "conceitos" | "temas" };
  law: { markdown: string | null; items: Array<{ marker: string | null; text: string }>; sectionId: string | null } | null;
  glossary: { headers: string[]; rows: string[][]; sectionId: string | null; source: "tabela" | "termos" | "dispositivos" } | null;
  compare: { headers: string[]; rows: string[][]; panels: boolean; title: string; sectionId: string } | null;
  examples: { items: BoardExample[]; sectionId: string | null };
  traps: { items: Array<{ head: string; rest: string }>; sectionId: string | null };
  keyPoints: string[];
  mindmap: { center: string; branches: Array<{ label: string; items: string[] }> };
}

const CONCEPT_KINDS = ["explicacao", "introducao", "conceitos_fundamentais", "aprofundamento"];
const GLOSSARY_KINDS = ["conceitos_fundamentais", "explicacao", "aprofundamento", "introducao", "esquema", "aplicacao"];
const TRAP_KINDS = ["pegadinhas", "excecoes", "interpretacao_banca"];

const parse = (md: string): Root => fromMarkdown(md, { extensions: [gfm()], mdastExtensions: [gfmFromMarkdown()] });
const slice = (md: string, n: { position?: { start: { offset?: number }; end: { offset?: number } } }) =>
  n.position?.start.offset !== undefined && n.position.end.offset !== undefined ? md.slice(n.position.start.offset, n.position.end.offset) : "";

/** Texto puro (sem marcação Markdown). */
export function plain(md: string): string {
  return md
    .replace(/:::\w+[\s\S]*?:::/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[*_`>#|]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Corta em até `max` caracteres, preferindo o fim de uma frase ou palavra. */
export function clip(s: string, max: number): string {
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const dot = cut.lastIndexOf(". ");
  if (dot > max * 0.55) return cut.slice(0, dot + 1);
  return cut.replace(/\s+\S*$/, "") + "…";
}

const withoutBlocks = (md: string) => extractPractice(md).body.replace(/:::\w+[\s\S]*?:::/g, "").trim();

function paragraphs(md: string): string[] {
  const src = withoutBlocks(md);
  return parse(src).children.filter((c): c is Paragraph => c.type === "paragraph").map((p) => slice(src, p).trim()).filter(Boolean);
}

function listItems(md: string): string[] {
  const src = withoutBlocks(md);
  const out: string[] = [];
  const walk = (nodes: RootContent[]) => {
    for (const n of nodes) {
      if (n.type === "list") for (const it of (n as List).children) out.push(slice(src, it).replace(/^\s*(?:[-*+]|\d+[.)])\s+/, "").trim());
      else if ("children" in n && n.type === "blockquote") walk((n as { children: RootContent[] }).children);
    }
  };
  walk(parse(src).children);
  return out.filter(Boolean);
}

function firstTable(md: string): { headers: string[]; rows: string[][] } | null {
  const src = withoutBlocks(md);
  const t = parse(src).children.find((c): c is Table => c.type === "table");
  if (!t || t.children.length < 2) return null;
  const cellText = (c: Table["children"][number]["children"][number]) => {
    const first = c.children[0];
    const last = c.children.at(-1);
    if (!first || !last || first.position?.start.offset === undefined || last.position?.end.offset === undefined) return "";
    return src.slice(first.position.start.offset, last.position.end.offset).trim();
  };
  const cells = t.children.map((r) => r.children.map(cellText));
  return { headers: cells[0]!, rows: cells.slice(1) };
}

/** Exemplos escritos como "**Caso 1 — Título.** Situação → Resposta" ou blocos :::exemplo. */
function examplesFrom(s: BoardSection): BoardExample[] {
  const fromBlocks = [...(s.practice ?? []), ...extractPractice(s.body_markdown).cases].map((c) => ({ title: "", situation: plain(c.situation), answer: plain(c.answer) }));
  if (fromBlocks.length) return fromBlocks;
  if (s.kind !== "exemplos" && s.kind !== "aplicacao") return [];
  return paragraphs(s.body_markdown)
    .map((p) => {
      const [before, ...after] = p.split(/\n?\s*(?:→|->|Resposta:)\s*/);
      const m = before!.match(/^\*\*(.+?)\*\*\s*:?\s*([\s\S]*)$/);
      return {
        title: m ? plain(m[1]!).replace(/[.:]\s*$/, "").replace(/^(caso|exemplo)\s*\d*\s*[—–-]\s*/i, "") : "",
        situation: plain(m ? m[2]! : before!),
        answer: plain(after.join(" → ")),
      };
    })
    .filter((e) => e.situation);
}

/** "**Termo**: definição" / "**Termo** — definição" → [termo, definição]. */
function termRows(md: string): string[][] {
  const lines = [...listItems(md), ...paragraphs(md)];
  const rows: string[][] = [];
  for (const l of lines) {
    const m = l.match(/^\*\*(.{2,60}?)\*\*\s*[:—–-]\s*([\s\S]{3,})$/);
    if (m) rows.push([plain(m[1]!), plain(m[2]!)]);
  }
  return rows;
}

function splitHeadRest(md: string): { head: string; rest: string } {
  const t = plain(md);
  const m = t.match(/^(.{12,160}?[.!?:])\s+([\s\S]+)$/);
  return m ? { head: m[1]!, rest: clip(m[2]!, 200) } : { head: clip(t, 160), rest: "" };
}

function splitTitle(title: string): { lead: string; highlight: string; legalBasis: string | null } {
  const m = title.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
  const core = (m ? m[1]! : title).trim();
  const words = core.split(/\s+/);
  if (words.length < 2) return { lead: "", highlight: core, legalBasis: m ? m[2]! : null };
  return { lead: words.slice(0, -1).join(" "), highlight: words.at(-1)!, legalBasis: m ? m[2]! : null };
}

export function buildLessonBoard(input: {
  title: string;
  sections: BoardSection[];
  nodes: Array<{ key: string; marker: string | null; title: string }>;
}): LessonBoard {
  const { sections, nodes } = input;
  const byKinds = (kinds: string[]) => kinds.flatMap((k) => sections.filter((s) => s.kind === k));
  const t = splitTitle(input.title);

  // 1. Conceito + exemplo prático
  const conceptSec = byKinds(CONCEPT_KINDS).find((s) => paragraphs(s.body_markdown).length > 0) ?? null;
  const allExamples = sections.flatMap((s) => examplesFrom(s).map((e) => ({ ...e, sectionId: s.id })));
  const concept = conceptSec
    ? {
        markdown: clip(paragraphs(conceptSec.body_markdown)[0]!, 420),
        example: allExamples[0] ? { title: allExamples[0].title, situation: clip(allExamples[0].situation, 220), answer: clip(allExamples[0].answer, 220) } : null,
        sectionId: conceptSec.id,
      }
    : null;

  // 2. Visualize: esquema → conceitos → temas da aula
  const esquema = sections.find((s) => s.kind === "esquema" && listItems(s.body_markdown).length >= 2);
  const conceitos = sections.find((s) => s.kind === "conceitos_fundamentais" && listItems(s.body_markdown).length >= 2);
  const schemeSrc = esquema ?? conceitos;
  const toNode = (it: string) => {
    const m = it.match(/^\*\*(.+?)\*\*\s*[:—–-]?\s*([\s\S]*)$/);
    const label = plain(m ? m[1]! : it.split(/[:—–]/)[0]!);
    return { label: clip(label, 32), detail: clip(plain(m ? m[2]! : it.slice(label.length).replace(/^\s*[:—–-]\s*/, "")), 70) };
  };
  const scheme = schemeSrc
    ? { items: listItems(schemeSrc.body_markdown).slice(0, 4).map(toNode), sectionId: schemeSrc.id, source: esquema ? ("esquema" as const) : ("conceitos" as const) }
    : {
        items: sections
          .filter((s) => !["objetivo", "referencias", "proxima_etapa", "flashcards", "checklist", "resumo"].includes(s.kind))
          .slice(0, 4)
          .map((s) => ({ label: clip(s.title, 32), detail: clip(plain(paragraphs(s.body_markdown)[0] ?? ""), 60) })),
        sectionId: null,
        source: "temas" as const,
      };

  // 3. Lei
  const lawSec = sections.find((s) => s.kind === "texto_legal") ?? null;
  const lawItems = nodes.filter((n) => n.marker).slice(0, 8).map((n) => ({ marker: n.marker, text: clip(n.title, 140) }));
  const law = lawSec || lawItems.length ? { markdown: lawSec ? clip(lawSec.body_markdown.trim(), 700) : null, items: lawItems, sectionId: lawSec?.id ?? null } : null;

  // 4. Destrinche: tabela → termos em negrito → dispositivos
  let glossary: LessonBoard["glossary"] = null;
  for (const s of byKinds(GLOSSARY_KINDS)) {
    const tb = firstTable(s.body_markdown);
    if (tb) {
      glossary = { ...tb, sectionId: s.id, source: "tabela" };
      break;
    }
  }
  if (!glossary) {
    for (const s of byKinds(GLOSSARY_KINDS)) {
      const rows = termRows(s.body_markdown);
      if (rows.length >= 2) {
        glossary = { headers: ["Palavra/expressão", "Significado"], rows: rows.slice(0, 6), sectionId: s.id, source: "termos" };
        break;
      }
    }
  }
  if (!glossary && lawItems.length) glossary = { headers: ["Dispositivo", "O que diz"], rows: lawItems.slice(0, 6).map((i) => [i.marker ?? "", i.text]), sectionId: lawSec?.id ?? null, source: "dispositivos" };

  // 5. Diferencie
  let compare: LessonBoard["compare"] = null;
  for (const s of byKinds(["quadro_comparativo", "comparacao"])) {
    const tb = firstTable(s.body_markdown);
    if (tb) {
      compare = { ...tb, panels: tb.headers.length === 3, title: s.title, sectionId: s.id };
      break;
    }
  }

  // 6. Na prática
  const examples = { items: allExamples.slice(0, 3).map(({ title, situation, answer }) => ({ title, situation: clip(situation, 200), answer: clip(answer, 200) })), sectionId: allExamples[0]?.sectionId ?? null };

  // 7. Atenção à banca
  const trapSecs = byKinds(TRAP_KINDS);
  const traps = {
    items: trapSecs
      .flatMap((s) => {
        const li = listItems(s.body_markdown);
        return li.length ? li : paragraphs(s.body_markdown);
      })
      .slice(0, 5)
      .map(splitHeadRest),
    sectionId: trapSecs[0]?.id ?? null,
  };

  // Pontos-chave: resumo/checklist → primeira frase das explicações
  const summary = byKinds(["resumo", "checklist"]).flatMap((s) => listItems(s.body_markdown));
  const keyPoints = (summary.length ? summary : byKinds(CONCEPT_KINDS).map((s) => splitHeadRest(paragraphs(s.body_markdown)[0] ?? "").head))
    .map((s) => clip(plain(s), 110))
    .filter(Boolean)
    .slice(0, 5);

  // Mapa mental (sempre derivado do conteúdo acima)
  const short = (s: string) => clip(plain(s), 46);
  const branches: Array<{ label: string; items: string[] }> = [];
  if (concept) branches.push({ label: "Conceito", items: [short(splitHeadRest(concept.markdown).head)] });
  if (scheme.items.length) branches.push({ label: scheme.source === "temas" ? "Temas" : "Elementos", items: scheme.items.slice(0, 4).map((i) => short(i.label)) });
  if (lawItems.length) branches.push({ label: "Lei", items: lawItems.slice(0, 3).map((i) => short(`${i.marker ?? ""} ${i.text}`)) });
  if (compare) branches.push({ label: "Diferenças", items: (compare.panels ? compare.headers.slice(1) : compare.rows.map((r) => r[0]!)).slice(0, 3).map(short) });
  if (examples.items.length) branches.push({ label: "Exemplos", items: examples.items.slice(0, 2).map((e) => short(e.title || e.situation)) });
  if (traps.items.length) branches.push({ label: "Atenção", items: traps.items.slice(0, 3).map((x) => short(x.head)) });
  if (branches.length < 6 && keyPoints.length) branches.push({ label: "Resumo", items: keyPoints.slice(0, 3).map(short) });

  return {
    title: { lead: t.lead, highlight: t.highlight },
    legalBasis: t.legalBasis,
    concept,
    scheme,
    law,
    glossary,
    compare,
    examples,
    traps,
    keyPoints,
    mindmap: { center: (t.lead ? `${t.lead} ${t.highlight}` : t.highlight).toLocaleUpperCase("pt-BR"), branches: branches.slice(0, 6) },
  };
}
