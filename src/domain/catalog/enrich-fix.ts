/**
 * Correção automática da resposta do ChatGPT para "Exemplos visuais e flashcards":
 * cabeçalhos fora do formato, título de seção parecido, bloco :::exemplo sem abrir/fechar,
 * JSON da tirinha/esquema com aspas curvas, vírgula sobrando ou valores fora da lista,
 * e flashcards em outros formatos ("Pergunta:/Resposta:", "P:/R:", "pergunta? — resposta").
 */
import { extractPractice } from "@/domain/content/practice";
import { MOODS, POSES, PROPS, ROLES, SCENES, schemeSchema, stripSchema } from "@/domain/content/visual";
import { countFlashcards, parseEnrichment, type EnrichLesson } from "./enrich";
import { similarity } from "./upload-fixes";
import { fold } from "./upload";

export interface EnrichAutoFix {
  text: string;
  applied: string[];
  errors: string[];
}

const keyOf = (s: string) => fold(s).replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();
const closest = (v: unknown, list: readonly string[]) => {
  const s = keyOf(String(v ?? "")).replace(/ /g, "_");
  if ((list as readonly string[]).includes(s)) return s;
  return [...list].sort((a, b) => similarity(s, b) - similarity(s, a))[0]!;
};
const cut = (v: unknown, n: number) => (typeof v === "string" && v.length > n ? `${v.slice(0, n - 1).trimEnd()}…` : v);
const STATES = ["ok", "erro", "neutro", "alerta"] as const;

function repairJson(raw: string): unknown {
  const t = raw
    .trim()
    .replace(/[“”„‟]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/,\s*([}\]])/g, "$1");
  for (const c of [t, t.includes('"') ? null : t.replace(/'/g, '"')]) {
    if (!c) continue;
    try {
      return JSON.parse(c);
    } catch {
      /* tenta a próxima */
    }
  }
  return undefined;
}

type Rec = Record<string, unknown>;
const isRec = (v: unknown): v is Rec => !!v && typeof v === "object" && !Array.isArray(v);

function coerceStrip(v: unknown): unknown {
  const panels = (Array.isArray(v) ? v : isRec(v) ? [v] : []).filter(isRec).slice(0, 3);
  return panels.map((p) => {
    const chars = (Array.isArray(p.personagens) ? p.personagens : []).filter(isRec).slice(0, 3);
    const out: Rec = {
      ...p,
      cenario: closest(p.cenario, SCENES),
      legenda: cut(p.legenda, 90),
      personagens: chars.map((c) => {
        const o: Rec = { ...c, p: closest(c.p, ROLES) };
        if (c.lado !== undefined) o.lado = closest(c.lado, ["esq", "centro", "dir"]);
        if (c.pose !== undefined) o.pose = closest(c.pose, POSES);
        if (c.humor !== undefined) o.humor = closest(c.humor, MOODS);
        if (c.objeto !== undefined && c.objeto !== null && c.objeto !== "") o.objeto = closest(c.objeto, PROPS);
        else delete o.objeto;
        if (c.olha !== undefined) o.olha = closest(c.olha, ["esq", "dir"]);
        return o;
      }),
    };
    if (isRec(p.fala)) out.fala = { quem: Math.max(0, Math.min(Math.max(0, chars.length - 1), Number(p.fala.quem) || 0)), texto: cut(String(p.fala.texto ?? "").trim() || "…", 80) };
    if (p.efeito !== undefined) out.efeito = cut(p.efeito, 12);
    return out;
  });
}

function coerceScheme(v: unknown): unknown {
  if (!isRec(v)) return v;
  const tipo = closest(v.tipo, ["fluxo", "linha_tempo", "comparacao"]);
  const st = (s: unknown) => {
    const k = keyOf(String(s ?? "neutro"));
    if (/^(certo|correto|sim|valido|legal|permitido|pode|verdadeiro|positivo|sucesso)$/.test(k)) return "ok";
    if (/^(errado|incorreto|nao|invalido|ilegal|proibido|falso|negativo|crime)$/.test(k)) return "erro";
    if (/^(atencao|cuidado|aviso|duvida|depende|pegadinha)$/.test(k)) return "alerta";
    return closest(s ?? "neutro", STATES);
  };
  const o: Rec = { ...v, tipo, titulo: cut(v.titulo, 70) };
  if (tipo === "fluxo") {
    o.passos = (Array.isArray(v.passos) ? v.passos : []).filter(isRec).slice(0, 6).map((p) => ({ ...p, rotulo: cut(p.rotulo, 70), detalhe: cut(p.detalhe, 120), estado: st(p.estado) }));
    if (isRec(v.conclusao)) o.conclusao = { ...v.conclusao, rotulo: cut(v.conclusao.rotulo, 70), detalhe: cut(v.conclusao.detalhe, 120), estado: st(v.conclusao.estado) };
  } else if (tipo === "linha_tempo") {
    o.unidade = cut(v.unidade ?? "dias", 12);
    o.marcos = (Array.isArray(v.marcos) ? v.marcos : []).filter(isRec).slice(0, 6).map((m) => ({ ...m, em: Math.max(0, Number(m.em) || 0), rotulo: cut(m.rotulo, 50), estado: st(m.estado) }));
  } else {
    o.lados = (Array.isArray(v.lados) ? v.lados : []).filter(isRec).slice(0, 2).map((l) => ({ ...l, titulo: cut(l.titulo, 50), resultado: cut(l.resultado, 60), estado: st(l.estado), itens: (Array.isArray(l.itens) ? l.itens : []).slice(0, 4).map((x) => cut(String(x), 80)) }));
  }
  return o;
}

/** Conserta (ou, se não der, tira) os campos Tirinha/Esquema de um bloco; devolve as linhas novas. */
function fixVisualFields(block: string[], label: string, applied: string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < block.length; i++) {
    const m = block[i]!.match(/^\s*(tirinha|esquema)\s*:\s*(.*)$/i);
    if (!m) {
      out.push(block[i]!);
      continue;
    }
    // O JSON pode vir em várias linhas: junta até o próximo campo.
    let raw = m[2]!;
    let j = i + 1;
    while (j < block.length && !/^\s*(situa[çc][ãa]o|pergunta|resposta|tirinha|esquema|carimbo)\s*:/i.test(block[j]!) && !/^\s*:::\s*$/.test(block[j]!)) raw += `\n${block[j++]}`;
    i = j - 1;
    const isStrip = /^t/i.test(m[1]!);
    const schema = isStrip ? stripSchema : schemeSchema;
    const field = isStrip ? "Tirinha" : "Esquema";
    const fixedWord = isStrip ? "consertada" : "consertado";
    const removedWord = isStrip ? "inválida removida" : "inválido removido";
    let v = repairJson(raw);
    if (v !== undefined && !schema.safeParse(v).success) v = isStrip ? coerceStrip(v) : coerceScheme(v);
    if (v !== undefined && schema.safeParse(v).success) {
      const line = `${field}: ${JSON.stringify(v)}`;
      if (line.replace(/\s/g, "") !== `${field}:${raw}`.replace(/\s/g, "")) applied.push(`“${label}”: ${field.toLowerCase()} ${fixedWord}`);
      out.push(line);
    } else {
      applied.push(`“${label}”: ${field.toLowerCase()} ${removedWord} (o card fica sem ${isStrip ? "ela" : "ele"})`);
    }
  }
  return out;
}

/** Flashcards em qualquer formato comum → "**Pergunta?**\n→ resposta". */
export function normalizeFlashcards(md: string): string {
  const lines = md.split("\n").map((l) => l.trim());
  const cards: Array<[string, string]> = [];
  const strip = (s: string) => s.replace(/^(?:\d{1,2}[.)]|[-*•])\s+/, "").trim();
  const unbold = (s: string) => s.replace(/^\*\*(.+?)\*\*:?$/, "$1").replace(/\*\*/g, "").trim();
  let q: string | null = null;
  for (const raw of lines) {
    if (!raw) continue;
    const l = strip(raw);
    let m: RegExpMatchArray | null;
    if ((m = l.match(/^(?:\*\*)?(?:pergunta|frente|p|q)\s*(?:\d+)?\s*[:.)-]\s*(?:\*\*)?\s*(.+)$/i))) {
      q = unbold(m[1]!);
      continue;
    }
    if ((m = l.match(/^(?:\*\*)?(?:resposta|verso|r|a)\s*[:.)-]\s*(?:\*\*)?\s*(.+)$/i)) && q) {
      cards.push([q, m[1]!.trim()]);
      q = null;
      continue;
    }
    if ((m = l.match(/^(?:→|->|=>)\s*(.+)$/)) && q) {
      cards.push([q, m[1]!.trim()]);
      q = null;
      continue;
    }
    // Uma linha só: "Pergunta? → resposta", "**Pergunta?** — resposta", "Pergunta? - resposta".
    if ((m = l.match(/^(.+?\?)(?:\*\*)?\s*(?:→|->|=>|—|–|-|:)\s*(.+)$/))) {
      cards.push([unbold(m[1]!.replace(/^\*\*/, "")), m[2]!.trim()]);
      q = null;
      continue;
    }
    if (q) {
      cards.push([q, l]);
      q = null;
    } else q = unbold(l);
  }
  return cards.map(([a, b]) => `**${a.replace(/\*\*/g, "")}**\n→ ${b}`).join("\n\n");
}

export function autoFixEnrichment(raw: string, lesson: EnrichLesson): EnrichAutoFix {
  const applied: string[] = [];
  const titles = lesson.sections.map((s) => s.title);
  const lines = raw
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .filter((l) => !/^\s*```[\w-]*\s*$/.test(l));

  // 1) Cabeçalhos em outros formatos.
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i]!;
    const sec = l.match(/^\s*(?:#{1,6}\s*|>\s*)?(?:\*\*|__)?\s*(?:[-—–=]{1,}\s*)?SE[ÇC][ÃA]O\s*[:\-–—]\s*(.+?)\s*(?:[-—–=]{1,})?\s*(?:\*\*|__)?\s*$/i);
    if (sec && !/^\s*-{3,}\s*SE[ÇC][ÃA]O\s*:.+-{3,}\s*$/i.test(l)) lines[i] = `--- SEÇÃO: ${sec[1]!.replace(/\*\*/g, "").trim()} ---`;
    const fl = l.match(/^\s*(?:#{1,6}\s*)?(?:\*\*|__)?\s*(?:[=—–-]{1,}\s*)?FLASH\s*-?CARDS?(?:\s+de\s+revis[ãa]o)?\s*:?\s*(?:[=—–-]{1,})?\s*(?:\*\*|__)?\s*$/i);
    if (fl && !/^\s*={3,}\s*FLASHCARDS\s*={3,}\s*$/.test(l)) lines[i] = "=== FLASHCARDS ===";
  }

  // 2) Divide em trechos por seção e conserta cada um.
  const flashAt = lines.findIndex((l) => /^\s*={3,}\s*FLASHCARDS?\s*={0,}\s*$/i.test(l));
  const head = flashAt >= 0 ? lines.slice(0, flashAt) : lines;
  const tail = flashAt >= 0 ? lines.slice(flashAt + 1) : [];
  const out: string[] = [];
  const used = new Set<string>();
  let i = 0;
  while (i < head.length && !/^\s*-{3,}\s*SE[ÇC][ÃA]O\s*:/i.test(head[i]!)) out.push(head[i++]!);
  while (i < head.length) {
    let j = i + 1;
    while (j < head.length && !/^\s*-{3,}\s*SE[ÇC][ÃA]O\s*:/i.test(head[j]!) && !/^\s*={3,}/.test(head[j]!)) j++;
    const hdr = head[i]!.replace(/^\s*-{3,}\s*SE[ÇC][ÃA]O\s*:\s*/i, "").replace(/\s*-{3,}\s*$/, "").trim();
    const title = hdr.includes("|") ? hdr.split("|").slice(1).join("|").trim() : hdr;
    let body = head.slice(i + 1, j);
    i = j;
    // Título parecido com o de uma seção da aula.
    let real = titles.find((t) => keyOf(t) === keyOf(title));
    if (!real) {
      const best = [...titles].sort((a, b) => similarity(keyOf(title), keyOf(b)) - similarity(keyOf(title), keyOf(a)))[0];
      if (best && similarity(keyOf(title), keyOf(best)) >= 0.55) {
        real = best;
        applied.push(`Título “${title}” trocado por “${best}”`);
      } else {
        applied.push(`Seção “${title}” não existe na aula: trecho removido`);
        continue;
      }
    }
    if (used.has(real)) {
      applied.push(`“${real}” veio repetida: segunda vez removida`);
      continue;
    }
    // Bloco sem ":::exemplo" de abertura ou sem ":::" de fechamento.
    const firstField = body.findIndex((l) => /^\s*situa[çc][ãa]o\s*:/i.test(l));
    if (!body.some((l) => /^\s*:::exemplo\s*$/i.test(l)) && firstField >= 0) {
      body.splice(firstField, 0, ":::exemplo");
      applied.push(`“${real}”: faltava “:::exemplo” no começo do bloco`);
    }
    const open = body.findIndex((l) => /^\s*:::exemplo\s*$/i.test(l));
    if (open >= 0 && !body.slice(open + 1).some((l) => /^\s*:::\s*$/.test(l))) {
      let last = body.length - 1;
      while (last > open && !body[last]!.trim()) last--;
      body.splice(last + 1, 0, ":::");
      applied.push(`“${real}”: faltava “:::” no fim do bloco`);
    }
    body = fixVisualFields(body, real, applied);
    const block = body.join("\n");
    if (!extractPractice(block).cases.length) {
      applied.push(`“${real}”: bloco sem Situação/Resposta: trecho removido`);
      continue;
    }
    used.add(real);
    out.push(`--- SEÇÃO: ${real} ---`, ...body);
  }

  // 3) Flashcards.
  if (flashAt >= 0) {
    const md = tail.join("\n").replace(/^\s*\(.*\)\s*$/gm, "").trim();
    let fixed = md;
    if (countFlashcards(md) < 4) {
      const n = normalizeFlashcards(md);
      if (countFlashcards(n) > countFlashcards(md)) {
        fixed = n;
        applied.push(`Flashcards reescritos no formato do painel (${countFlashcards(n)} cartões)`);
      }
    }
    const cards = fixed.split(/\n\s*\n/).filter((b) => b.trim());
    if (cards.length > 15) {
      fixed = cards.slice(0, 15).join("\n\n");
      applied.push(`Flashcards: ficaram os 15 primeiros (de ${cards.length})`);
    }
    if (countFlashcards(fixed) < 4) {
      applied.push("Flashcards com menos de 4 cartões: removidos (peça de novo depois)");
    } else out.push("", "=== FLASHCARDS ===", fixed);
  }

  // 4) O que ainda impede (ex.: seção grande demais) sai do texto.
  let text = out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
  for (let round = 0; round < 30; round++) {
    const p = parseEnrichment(text, lesson);
    const tooBig = p.errors.map((e) => e.match(/^“(.+?)”: com o exemplo a seção passaria/)?.[1]).find(Boolean);
    if (!tooBig) return { text, applied, errors: p.errors };
    const ls = text.split("\n");
    const at = ls.findIndex((l) => l.trim() === `--- SEÇÃO: ${tooBig} ---`);
    if (at < 0) return { text, applied, errors: p.errors };
    let end = at + 1;
    while (end < ls.length && !/^\s*(-{3,}\s*SE[ÇC][ÃA]O|={3,})/i.test(ls[end]!)) end++;
    ls.splice(at, end - at);
    text = ls.join("\n");
    applied.push(`“${tooBig}”: exemplo removido (a seção passaria do tamanho máximo)`);
  }
  return { text, applied, errors: parseEnrichment(text, lesson).errors };
}
