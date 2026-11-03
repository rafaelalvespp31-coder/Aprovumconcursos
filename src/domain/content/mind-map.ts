/**
 * MAPA MENTAL da aula: resumo visual padronizado (modelo APROVUM) montado a partir do
 * conteúdo já catalogado — sem IA e sem inventar nada. Tudo vem das seções da aula:
 * esquema/quadro → blocos principais; conceitos → "O que é?"; listas de termos → mnemônicos
 * (iniciais dos termos, como "TCCCR"); resumo → resumo estratégico; pegadinhas → atenção;
 * checklist → o que lembrar; e cada módulo com seus pontos-chave (a matéria inteira).
 */
import { fromMarkdown } from "mdast-util-from-markdown";
import { gfmFromMarkdown } from "mdast-util-gfm";
import { gfm } from "micromark-extension-gfm";
import type { List, ListItem, Nodes, Paragraph, RootContent, Table } from "mdast";

export interface MindMapSection {
  kind: string;
  title: string;
  body: string;
  module?: string | null;
}

export interface MindMapBlock {
  title: string;
  detail: string;
  value: string | null;
}
export interface MindMapMnemonic {
  acronym: string;
  label: string;
  terms: string[];
  /** Os itens completos da lista de origem (termo + explicação). */
  items: string[];
  /** Módulo de onde saiu a lista. */
  module?: string | null;
}
export interface MindMapKey {
  /** Termo em destaque (ex.: "§ 2º", "Dolo eventual"), quando houver. */
  lead: string | null;
  text: string;
  /** Peso para prova: números/penas, termos em destaque, esquema/resumo/pegadinha valem mais. */
  score: number;
}
export interface MindMapModule {
  title: string;
  points: string[];
  /** Pontos principais do módulo, na ordem da aula. */
  keys: MindMapKey[];
  /** Sigla do mnemônico que saiu deste módulo, se houver. */
  mnemonic: string | null;
}
export interface MindMap {
  title: string;
  subtitle: string | null;
  subject: string | null;
  intro: string | null;
  blocks: MindMapBlock[];
  /** Nome da coluna do valor no esquema (ex.: "Pena ou efeito"). */
  valueLabel: string | null;
  mnemonics: MindMapMnemonic[];
  traps: Array<{ claim: string; truth: string }>;
  summary: Array<{ q: string; a: string }>;
  remember: string[];
  tip: string | null;
  comparisons: MindMapBlock[];
  modules: MindMapModule[];
}

/** Blocos especiais da apostila (:::exemplo, tirinhas, esquemas em JSON) não entram no mapa. */
const stripWidgets = (md: string) => md.replace(/^:::\w[\s\S]*?^:::\s*$/gm, "").replace(/^(Tirinha|Esquema|Carimbo):.*$/gm, "");
const parse = (md: string) => fromMarkdown(stripWidgets(md), { extensions: [gfm()], mdastExtensions: [gfmFromMarkdown()] });

/** Texto puro de um nó (sem marcação). */
function text(n: Nodes): string {
  if ("value" in n && typeof n.value === "string") return n.value;
  if ("children" in n) return (n.children as Nodes[]).map(text).join("");
  return "";
}
const squash = (s: string) => s.replace(/\s+/g, " ").trim();

/** Termo em destaque no começo de um item: "**comum:** ..." ou "Termo: ...". */
function leadTerm(item: ListItem): string | null {
  const p = item.children.find((c): c is Paragraph => c.type === "paragraph");
  if (!p) return null;
  const first = p.children[0];
  if (first && first.type === "strong") {
    const t = squash(text(first)).replace(/[:.;,–-]+$/, "").trim();
    return t.length >= 2 && t.length <= 48 ? t : null;
  }
  const whole = squash(text(p));
  const m = /^([^:;.]{2,40}):\s/.exec(whole);
  return m ? m[1]!.trim() : null;
}

const STOP = new Set(["de", "do", "da", "dos", "das", "o", "a", "os", "as", "e", "em", "com", "por", "para", "um", "uma", "no", "na", "ao", "à", "que", "se"]);

/** Letra-chave do termo: primeira palavra significativa (ignora artigos e preposições). */
function initial(term: string): string | null {
  const words = term
    .replace(/[“”"'«»()[\]*_]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  const w = words.find((x) => !STOP.has(x.toLowerCase()) && /^\p{L}/u.test(x)) ?? words.find((x) => /^\p{L}/u.test(x));
  if (!w) return null;
  return w[0]!.normalize("NFD").replace(/\p{M}/gu, "").toUpperCase();
}

/** Mnemônico pelas iniciais de uma lista de 3 a 7 termos. */
export function acronymFor(terms: readonly string[]): string | null {
  if (terms.length < 3 || terms.length > 7) return null;
  // Termos que começam igual ("Quem pode…", "Quem pode…") não formam mnemônico útil.
  const firsts = terms.map((t) => t.trim().toLowerCase().split(/\s+/).find((w) => !STOP.has(w)) ?? t);
  if (new Set(firsts).size < firsts.length) return null;
  const letters = terms.map(initial);
  if (letters.some((l) => !l || !/^[A-Z]$/.test(l))) return null;
  return letters.join("");
}

function tableRows(t: Table): string[][] {
  return t.children.map((r) => r.children.map((c) => squash(text(c))));
}

function firstSentences(s: string, max: number): string {
  const clean = squash(s);
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const dot = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("; "));
  return (dot > max * 0.45 ? cut.slice(0, dot + 1) : cut.replace(/\s+\S*$/, "") + "…").trim();
}

/** "Homicídio (CP, art. 121)" → título "Homicídio", subtítulo "CP – art. 121". */
export function splitTitle(title: string): { title: string; subtitle: string | null } {
  const m = /^(.*?)\s*\(([^()]{2,60})\)\s*$/.exec(title.trim());
  if (!m || !m[1]) return { title: title.trim(), subtitle: null };
  return { title: m[1].trim(), subtitle: m[2]!.replace(/\s*,\s*/, " – ").trim() };
}

const EXCLUDE_MNEMONIC = new Set(["pegadinhas", "checklist", "flashcards", "resumo", "referencias", "proxima_etapa", "objetivo", "interpretacao_banca"]);
const isLabel = (s: string) => /^(§|art\.?|caput|inciso|par[aá]grafo|\d)/i.test(s.trim());

export function buildMindMap(input: { title: string; subject?: string | null; sections: readonly MindMapSection[] }): MindMap {
  const { title, subtitle } = splitTitle(input.title);
  const map: MindMap = { title, subtitle, subject: input.subject ?? null, intro: null, blocks: [], valueLabel: null, mnemonics: [], traps: [], summary: [], remember: [], tip: null, comparisons: [], modules: [] };
  const seenAcronyms = new Set<string>();
  const mnemonicCandidates: Array<MindMapMnemonic & { score: number }> = [];
  const modules = new Map<string, string[]>();
  let bankTip: string | null = null;
  let comparisonLabel: string | null = null;
  let calloutTip: string | null = null;

  for (const s of input.sections) {
    const tree = parse(s.body);
    const nodes = tree.children as RootContent[];
    const moduleName = (s.module ?? "").trim() || s.title;
    const points = modules.get(moduleName) ?? [];

    // "O que é?": primeiro parágrafo dos conceitos/introdução/explicação.
    if (!map.intro && ["conceitos_fundamentais", "introducao", "explicacao"].includes(s.kind)) {
      const p = nodes.find((n) => n.type === "paragraph");
      if (p) map.intro = firstSentences(text(p), 420);
    }

    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i]!;
      if (n.type === "table") {
        const rows = tableRows(n);
        const body = rows.slice(1).filter((r) => r[0]);
        if (s.kind === "esquema" && !map.blocks.length) {
          map.blocks = body.map((r) => ({ title: r[0]!, detail: r[1] ?? "", value: r.length > 2 ? r[r.length - 1]! : null }));
          map.valueLabel = rows[0] && rows[0].length > 2 ? rows[0][rows[0].length - 1]! : null;
        } else if (s.kind === "quadro_comparativo" && !map.comparisons.length) {
          map.comparisons = body.map((r) => ({ title: r[0]!, detail: r.length > 3 ? r[r.length - 2]! : (r[1] ?? ""), value: r.length > 2 ? r[r.length - 1]! : null }));
          comparisonLabel = rows[0] && rows[0].length > 2 ? rows[0][rows[0].length - 1]! : null;
        } else if (s.kind === "resumo" && !map.summary.length) {
          map.summary = body.filter((r) => r[1]).map((r) => ({ q: r[0]!, a: r[1]! }));
        }
        // Tabela de termos (1ª coluna) também vira mnemônico.
        const terms = body.map((r) => r[0]!).filter((t) => t.length <= 40);
        if (!EXCLUDE_MNEMONIC.has(s.kind) && terms.length === body.length && !terms.some(isLabel)) {
          const acr = acronymFor(terms);
          if (acr) mnemonicCandidates.push({ acronym: acr, label: s.title, terms, module: moduleName, items: body.map((r) => (r[1] ? `${r[0]}: ${r[1]}` : r[0]!)), score: 1 + (s.kind === "esquema" ? 1 : 0) });
        }
        points.push(...body.slice(0, 6).map((r) => r.filter(Boolean).join(" — ")));
      } else if (n.type === "list") {
        const list = n as List;
        const items = list.children.map((it) => squash(text(it)).replace(/^\[[ x]\]\s*/i, ""));
        if (s.kind === "pegadinhas") {
          for (const it of list.children) {
            const p = it.children.find((c): c is Paragraph => c.type === "paragraph");
            if (!p) continue;
            const strong = p.children.find((c) => c.type === "strong");
            const claim = strong ? squash(text(strong)).replace(/^["“]|["”]$/g, "") : "";
            const truth = squash(text(p).replace(strong ? text(strong) : "", ""));
            if (claim && truth) map.traps.push({ claim, truth });
            else map.traps.push({ claim: squash(text(p)), truth: "" });
          }
        } else if (s.kind === "checklist") {
          map.remember.push(...items.map((x) => x.replace(/^(dizer|explicar|listar|diferenciar|separar|classificar)\s+/i, (m) => m[0]!.toUpperCase() + m.slice(1)).replace(/\?$/, "")));
        } else {
          const terms = list.children.map(leadTerm);
          if (!EXCLUDE_MNEMONIC.has(s.kind) && terms.every((t): t is string => !!t)) {
            const acr = acronymFor(terms);
            const prev = i > 0 && nodes[i - 1]!.type === "paragraph" ? squash(text(nodes[i - 1]!)).replace(/[:(].*$/, "").trim() : "";
            if (acr) mnemonicCandidates.push({ acronym: acr, label: prev.length >= 3 && prev.length <= 70 ? prev : s.title, terms, items, module: moduleName, score: 2 + (/decore|memoriz/i.test(text(nodes[i - 1] ?? list)) ? 2 : 0) });
          }
          if (s.kind === "interpretacao_banca" && items[0]) bankTip ??= firstSentences(items[0], 220);
          points.push(...items.slice(0, 8).map((x) => firstSentences(x, 160)));
        }
      } else if (n.type === "paragraph" || n.type === "blockquote") {
        const t = squash(text(n));
        if (!/:$/.test(t) && t.length > 25) {
          if (s.kind === "interpretacao_banca") bankTip ??= firstSentences(t, 220);
          else if (/^(dica|aten[cç][aã]o|cuidado|na prova|pegadinha)/i.test(t)) calloutTip ??= firstSentences(t.replace(/^(dica de prova|dica|atenção|cuidado|pegadinha)\s*[:!-]\s*/i, ""), 220);
        }
        if (s.kind !== "texto_legal" && s.kind !== "pegadinhas" && s.kind !== "checklist" && t.length > 30) points.push(firstSentences(t, 170));
      }
    }
    if (!["pegadinhas", "checklist", "referencias", "proxima_etapa", "flashcards"].includes(s.kind)) modules.set(moduleName, points);
  }

  for (const c of mnemonicCandidates.sort((a, b) => b.score - a.score)) {
    if (seenAcronyms.has(c.acronym) || map.mnemonics.length >= 3) continue;
    seenAcronyms.add(c.acronym);
    map.mnemonics.push({ acronym: c.acronym, label: c.label, terms: c.terms, items: c.items, module: c.module ?? null });
  }
  // Faltando mnemônico (o modelo tem três): iniciais dos módulos e dos blocos do esquema.
  const fallbacks: Array<{ label: string; terms: string[]; items: string[] }> = [
    { label: "Ordem dos módulos da aula", terms: [...modules.keys()].slice(0, 7), items: [...modules.keys()].slice(0, 7) },
    { label: "Pontos do resumo", terms: map.summary.slice(0, 6).map((r) => r.q.replace(/^(qual|quais|quem|como|quando|o que|pena d[oa]s?|é|são)\s+/i, "")), items: map.summary.slice(0, 6).map((r) => `${r.q} ${r.a}`) },
  ];
  for (const f of fallbacks) {
    if (map.mnemonics.length >= 3) break;
    const acr = acronymFor(f.terms);
    if (acr && !seenAcronyms.has(acr)) {
      seenAcronyms.add(acr);
      map.mnemonics.push({ acronym: acr, ...f });
    }
  }
  // Sem esquema em tabela: o quadro comparativo vira os blocos principais.
  if (!map.blocks.length && map.comparisons.length) {
    map.blocks = map.comparisons;
    map.valueLabel = comparisonLabel;
    map.comparisons = [];
  }
  map.tip = calloutTip ?? bankTip;
  if (!map.tip && map.traps[0]) map.tip = map.traps[0].truth ? `${map.traps[0].claim} → ${map.traps[0].truth}` : map.traps[0].claim;
  const keys = moduleKeys(input.sections);
  map.modules = [...new Set([...keys.keys(), ...modules.keys()])]
    .map((t) => ({
      title: t,
      points: [...new Set(modules.get(t) ?? [])].filter(Boolean).slice(0, 14),
      keys: keys.get(t) ?? [],
      mnemonic: map.mnemonics.find((m) => m.module === t)?.acronym ?? null,
    }))
    .filter((m) => m.keys.length || m.points.length);
  return map;
}

// ---------------------------------------------------------------------------
// Pontos principais de cada módulo (o que mais cai em prova), sem repetir.
// ---------------------------------------------------------------------------
const SKIP_KEYS = new Set(["texto_legal", "checklist", "referencias", "proxima_etapa", "flashcards", "objetivo", "conhecimentos_previos"]);
const KIND_BONUS: Record<string, number> = { esquema: 2, resumo: 2, pegadinhas: 2, quadro_comparativo: 1.5, comparacao: 1.5, conceitos_fundamentais: 1.5, excecoes: 1, jurisprudencia: 1, explicacao: 0.5, aprofundamento: 0.5 };

function scoreKey(lead: string | null, txt: string, kind: string): number {
  let sc = KIND_BONUS[kind] ?? 0;
  if (lead) sc += 1.5;
  if (/\d+\s*(a|até)\s*\d+\s*anos|\d\/\d|reclus|deten|súmula|s[uú]mula|\bart\.\s*\d|§|\bLei\s+\d/i.test(`${lead ?? ""} ${txt}`)) sc += 2;
  if (/\b(não|nunca|só|somente|exceto|salvo|errado|vedad)/i.test(txt)) sc += 0.7;
  if (txt.length > 140) sc -= 1;
  return sc;
}

function shortText(s: string, max = 120): string {
  return firstSentences(s.replace(/\s+/g, " ").trim(), max).replace(/[.;:]+$/, "");
}

function moduleKeys(sections: readonly MindMapSection[]): Map<string, MindMapKey[]> {
  const out = new Map<string, MindMapKey[]>();
  const seen = new Set<string>();
  const push = (mod: string, lead: string | null, txt: string, kind: string) => {
    const t = shortText(txt);
    const l = lead ? lead.replace(/[:.]+$/, "").trim() : null;
    if (!t && !l) return;
    const sig = `${(l ?? "").toLowerCase()}|${t.toLowerCase().slice(0, 50)}`;
    if (seen.has(sig) || t.length < 3) return;
    seen.add(sig);
    const list = out.get(mod) ?? [];
    list.push({ lead: l, text: t, score: scoreKey(l, t, kind) });
    out.set(mod, list);
  };
  for (const s of sections) {
    if (SKIP_KEYS.has(s.kind)) continue;
    const mod = (s.module ?? "").trim() || s.title;
    for (const n of parse(s.body).children as RootContent[]) {
      if (n.type === "table") {
        const rows = tableRows(n);
        const head = rows[0] ?? [];
        for (const r of rows.slice(1)) {
          if (!r[0]) continue;
          if (r.length >= 3 && (s.kind === "esquema" || /pena|efeito|consequ|resultado/i.test(head[head.length - 1] ?? ""))) push(mod, r[0], `${shortText(r[1] ?? "", 38)} — ${r[r.length - 1]}`, s.kind);
          else if (r.length >= 3) push(mod, r[0], r[1] ?? "", s.kind);
          else push(mod, r[0], r[1] ?? "", s.kind);
        }
      } else if (n.type === "list") {
        for (const it of (n as List).children) {
          const p = it.children.find((c): c is Paragraph => c.type === "paragraph");
          if (!p) continue;
          const full = squash(text(p));
          if (s.kind === "pegadinhas") {
            const strong = p.children.find((c) => c.type === "strong");
            const claim = strong ? squash(text(strong)).replace(/^["“]|["”]$/g, "").replace(/[.]$/, "") : "";
            const truth = squash(full.replace(strong ? squash(text(strong)) : "", ""));
            push(mod, null, claim ? `“${claim}” ${truth || "Errado"}` : full, s.kind);
            continue;
          }
          const lead = leadTerm(it);
          if (lead) push(mod, lead, full.slice(full.indexOf(lead) + lead.length).replace(/^[\s:–—-]+/, ""), s.kind);
          else push(mod, null, full, s.kind);
        }
      } else if (n.type === "paragraph") {
        const first = n.children[0];
        const full = squash(text(n));
        if (first && first.type === "strong") {
          const lead = squash(text(first)).replace(/[:.]+$/, "");
          if (lead.length <= 60) push(mod, lead, full.slice(squash(text(first)).length).replace(/^[\s:–—-]+/, ""), s.kind);
        } else if (full.length > 40 && !/:$/.test(full)) push(mod, null, full, s.kind);
      } else if (n.type === "blockquote") {
        const t = squash(text(n)).replace(/^[^:]{2,45}:\s*/, "");
        if (t.length > 20) push(mod, "Atenção", t, s.kind);
      }
    }
  }
  return out;
}
