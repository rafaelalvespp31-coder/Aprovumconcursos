import { DISCIPLINE_HINT, modeOfDiscipline } from "./disciplines";
import { fold, titleKey } from "./text";

/**
 * Leitura estrutural do edital (sem IA): acha a seção de CONTEÚDO PROGRAMÁTICO e extrai
 * disciplinas › tópicos › subtópicos com a numeração original e a página de origem.
 * Tudo fora da seção (salários, inscrições, cronograma, requisitos…) é ignorado.
 */

export interface ParsedTopic {
  code: string | null;
  depth: number;
  title: string;
  titleKey: string;
  page: number;
}
export interface ParsedDiscipline {
  name: string;
  mode: string | null;
  page: number;
  topics: ParsedTopic[];
}
export interface ParsedEdital {
  found: boolean;
  /** 0–1: confiança de que a seção programática foi localizada de verdade. */
  confidence: number;
  sectionPages: [number, number] | null;
  disciplines: ParsedDiscipline[];
  warnings: string[];
}

interface Line {
  text: string;
  page: number;
}

const START_RE = /(conte[úu]dos? program[áa]ticos?|programas? (das|de) (provas?|mat[ée]rias|conte[úu]dos?)|conhecimentos? (b[áa]sicos|gerais|espec[íi]ficos|profissionais)|anexo\s+[ivxl\d]+.{0,60}(conte[úu]do|programa|mat[ée]rias))/i;
const END_RE = /^(cronograma|das? inscri[çc][õo]es|das? atribui[çc][õo]es|da remunera[çc][ãa]o|dos? requisitos|das etapas|da prova (objetiva|discursiva|pr[aá]tica|de t[íi]tulos)|dos recursos|das disposi[çc][õo]es (finais|gerais)|disposi[çc][õo]es (finais|gerais)|quadro de vagas|modelo de|formul[áa]rio|anexo\s+[ivxl\d]+\s*[-–—:.]?\s*(?!.*(conte[úu]do|programa|mat[ée]rias))\S|da (convoca[çc][ãa]o|nomea[çc][ãa]o|posse)|dos? (resultados?|crit[ée]rios de desempate))/i;
const GROUP_RE = /^(conhecimentos? (b[áa]sicos|gerais|espec[íi]ficos|profissionais)|bloco\s+[ivx\d]+|parte\s+[ivx\d]+|etapa\s+[ivx\d]+|prova\s+(objetiva|discursiva|escrita)|(para|cargo)\b.*|nível\s+\w+)\s*[:.]?$/i;
const KNOW_GROUP = /^conhecimentos? (b[áa]sicos|gerais|espec[íi]ficos|especiais|profissionais|especializados)\s*[:.]?$/i;
const NOISE_RE = /^(\d{1,3}|p[áa]gina\s+\d+(\s+de\s+\d+)?|\d+\s*\/\s*\d+|-\s*\d+\s*-)$/i;
const ITEM_START = /^(\d{1,2}(?:\.\d{1,2}){0,3})[.)]?\s+(?=\S)/;
const LETTER_START = /^([a-z])[).]\s+(?=\S)/;
const INLINE_SPLIT = /(?<=[.;:])\s+(?=\d{1,2}(?:\.\d{1,2}){0,3}[.)]?\s+[A-ZÀ-Ú])/;

const upperRatio = (s: string) => {
  const letters = s.replace(/[^A-Za-zÀ-ÿ]/g, "");
  if (!letters.length) return 0;
  return letters.replace(/[^A-ZÀ-Ý]/g, "").length / letters.length;
};

function toLines(pages: readonly string[]): Line[] {
  const out: Line[] = [];
  pages.forEach((p, i) => {
    for (const raw of p.replace(/\r/g, "").split("\n")) {
      const text = raw.replace(/\s+/g, " ").trim();
      if (text) out.push({ text, page: i + 1 });
    }
  });
  // Cabeçalhos/rodapés repetidos em várias páginas não são conteúdo.
  const count = new Map<string, Set<number>>();
  for (const l of out) {
    const k = fold(l.text);
    if (k.length < 8) continue;
    const s = count.get(k) ?? new Set<number>();
    s.add(l.page);
    count.set(k, s);
  }
  return out.filter((l) => !NOISE_RE.test(l.text) && !((count.get(fold(l.text))?.size ?? 0) >= (pages.length <= 6 ? 2 : 4) && !ITEM_START.test(l.text)));
}

/** A linha abre uma disciplina? Devolve o nome e o resto da linha (itens inline). */
const STRUCTURAL_RE = /^(cap[ií]tulo|t[ií]tulo|se[cç][aã]o|subse[cç][aã]o|anexo|parte|livro|artigo|art\.?)\s+[\divxlc]+\b/i;
function headingOf(line: string, next: string | undefined): { name: string; rest: string } | null {
  const r = headingRaw(line, next);
  if (!r) return null;
  const f = fold(r.name);
  if (STRUCTURAL_RE.test(f) || CHAPTER_RE.test(f)) return null;
  // "DA …", "DO …", "DOS …": regras do edital, a não ser que o nome seja de matéria conhecida.
  if (/^d[aeo]s?\s/.test(f) && !modeOfDiscipline(r.name)) return null;
  return r;
}

function headingRaw(line: string, next: string | undefined): { name: string; rest: string } | null {
  const explicit = line.match(/^(?:disciplina|mat[ée]ria)\s*[:\-–]\s*(.{3,90})$/i);
  if (explicit) return { name: explicit[1]!.replace(/[:.]+$/, "").trim(), rest: "" };
  const inline = line.match(/^([A-ZÀ-ÝÇ][A-ZÀ-ÝÇ0-9 ,/\-–()ºª.]{3,85}?)\s*:\s*(\S.*)$/);
  if (inline && upperRatio(inline[1]!) >= 0.85 && !GROUP_RE.test(inline[1]!)) return { name: inline[1]!.trim(), rest: inline[2]! };
  const bare = line.replace(/[:.]+$/, "").trim();
  if (bare.length < 4 || bare.length > 90 || ITEM_START.test(bare) || LETTER_START.test(bare)) return null;
  const nextIsItem = !!next && (ITEM_START.test(next) || /^[•*\-–]\s+/.test(next));
  const caps = upperRatio(bare) >= 0.85 && /[A-ZÀ-Ý]{3}/.test(bare);
  const known = DISCIPLINE_HINT.test(fold(bare)) && bare.split(" ").length <= 7 && !/[.;]$/.test(line) && !/[,;]/.test(bare);
  if (GROUP_RE.test(bare)) return null;
  if ((caps && (nextIsItem || line.endsWith(":") || known)) || (known && nextIsItem)) return { name: bare, rest: "" };
  return null;
}

/** Capítulos do corpo do edital ("DA PROVA OBJETIVA", "DO EXAME MÉDICO"…) nunca são matérias de estudo. */
const CHAPTER_RE = /^(d[aeo]s?|das?|dos?)\s+(.*\b)?(prova|provas|exame|exames|teste|testes|avaliacao|avaliacoes|investigacao|inscricao|inscricoes|curso|formacao|recurso|recursos|selecao|concurso|candidato|candidatos|vagas?|cargo|cargos|nomeacao|posse|resultado|resultados|habilitacao|titulos|disposicoes|etapas?|fase|fases|aptidao|heteroidentificacao|pessoas com deficiencia|remuneracao|atribuicoes|requisitos|convocacao|validade|cronograma)\b/;

/** Divide em frases ("Código Penal (arts. 1º ao 6º). Código de Processo Penal …") sem cortar dentro de parênteses. */
function splitSentences(text: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!;
    if (c === "(") depth++;
    else if (c === ")") depth = Math.max(0, depth - 1);
    else if (depth === 0 && /[.!?]/.test(c) && /\s/.test(text[i + 1] ?? "") && /[A-ZÀ-Ú]/.test(text.slice(i + 1).trimStart()[0] ?? "")) {
      out.push(text.slice(start, i + 1));
      start = i + 1;
    }
  }
  out.push(text.slice(start));
  return out;
}

const clean = (s: string) => s.replace(/\s+/g, " ").replace(/^[\s•*\-–—]+/, "").replace(/[\s;,.]+$/, "").trim();

/** Divide o texto corrido de uma disciplina em itens numerados (ou, sem numeração, por ponto e vírgula/marcadores). */
function itemsOf(lines: Line[]): ParsedTopic[] {
  const items: Array<{ code: string | null; depth: number; text: string; page: number }> = [];
  let last: (typeof items)[number] | null = null;
  let lastNumbered: (typeof items)[number] | null = null;
  const push = (code: string | null, depth: number, text: string, page: number) => {
    const it = { code, depth, text, page };
    items.push(it);
    last = it;
    if (code) lastNumbered = it;
  };
  for (const l of lines) {
    // Vários itens colados na mesma linha: "1 Compreensão. 2 Tipologia. 3 …"
    const parts = ITEM_START.test(l.text) || INLINE_SPLIT.test(l.text) ? l.text.split(INLINE_SPLIT) : [l.text];
    for (const part of parts) {
      const m = part.match(ITEM_START);
      const lm = part.match(LETTER_START);
      if (m) {
        const code = m[1]!;
        push(code, code.split(".").length, part.slice(m[0].length), l.page);
      } else if (lm && lastNumbered) {
        const base = (lastNumbered as { code: string | null; depth: number }).code ?? "";
        push(`${base}${base ? "." : ""}${lm[1]}`, ((lastNumbered as { depth: number }).depth ?? 1) + 1, part.slice(lm[0].length), l.page);
      } else if (/^[•*\-–]\s+/.test(part)) {
        push(null, 1, part.replace(/^[•*\-–]\s+/, ""), l.page);
      } else if (last) {
        const cur = last as { text: string };
        cur.text = /-$/.test(cur.text) ? `${cur.text.slice(0, -1)}${part}` : `${cur.text} ${part}`;
      } else {
        push(null, 1, part, l.page);
      }
    }
  }
  const out: ParsedTopic[] = [];
  const numbered = items.some((i) => i.code);
  for (const it of items) {
    const title = clean(it.text);
    if (title.length < 3) continue;
    // Sem numeração no edital: cada trecho separado por ";" vira um assunto.
    const bySemi = !numbered && !it.code && title.includes(";");
    const bySentence = !numbered && !it.code && !bySemi && title.length > 70 && /[.!?]\s+[A-ZÀ-Ú]/.test(title);
    const chunks = bySemi
      ? title.split(/\s*;\s*/).map(clean).filter((c) => c.length >= 3)
      : bySentence
        ? splitSentences(title).map(clean).filter((c) => c.length >= 3)
        : [title];
    for (const c of chunks) out.push({ code: it.code, depth: it.depth, title: c.slice(0, 400), titleKey: titleKey(c), page: it.page });
  }
  return out;
}

/**
 * Bloco corrido com rótulos de matéria no meio do texto ("Língua Portuguesa: Leitura… Matemática e Raciocínio Lógico: …").
 * Cada rótulo reconhecido abre uma disciplina; o rótulo igual ao nome do bloco só é removido.
 */
function splitByLabels(groupName: string, body: Line[]): ParsedDiscipline[] | null {
  if (!body.length) return null;
  const text = body.map((l) => l.text).join(" ").replace(/\s+/g, " ").trim();
  const page = body[0]!.page;
  const re = /(^|[.;]\s+)([A-ZÀ-Ú][A-Za-zÀ-ÿ ,/()ºª-]{2,70}?):\s+(?=\S)/g;
  const marks: Array<{ name: string; from: number; to: number }> = [];
  for (let m = re.exec(text); m; m = re.exec(text)) {
    const label = m[2]!.trim();
    if (label.split(" ").length > 8 || !DISCIPLINE_HINT.test(fold(label))) continue;
    marks.push({ name: label, from: m.index + m[1]!.length, to: m.index + m[0].length });
  }
  if (!marks.length) return null;
  const sameAsGroup = (n: string) => fold(n) === fold(groupName.replace(/[:.]+$/, ""));
  const segs: Array<{ name: string; txt: string }> = [];
  const head = text.slice(0, marks[0]!.from).trim();
  if (head.length >= 20) segs.push({ name: groupName.replace(/[:.]+$/, "").trim(), txt: head });
  marks.forEach((mk, i) => segs.push({ name: mk.name, txt: text.slice(mk.to, marks[i + 1]?.from ?? text.length).trim() }));
  const out: ParsedDiscipline[] = [];
  for (const sg of segs) {
    const topics = itemsOf([{ text: sg.txt, page }]);
    if (!topics.length) continue;
    const nm = sameAsGroup(sg.name) ? groupName.replace(/[:.]+$/, "").trim() : sg.name;
    const prev = out.find((d) => fold(d.name) === fold(nm));
    if (prev) prev.topics.push(...topics);
    else out.push({ name: nm, mode: modeOfDiscipline(nm), page, topics });
  }
  const labelled = out.filter((d) => !sameAsGroup(d.name)).length;
  // Um único rótulo igual ao próprio bloco ("Conhecimentos Específicos: …") vira uma disciplina só.
  return labelled >= 1 || out.length ? out : null;
}

/**
 * "CONHECIMENTOS ESPECÍFICOS:" sem matéria própria: os itens de 1º nível ("2. Direito Constitucional 2.1 …")
 * são as disciplinas, e os subitens, os tópicos. Sem esse padrão, o bloco vira uma disciplina só.
 */
function disciplinesOfGroup(name: string, body: Line[]): ParsedDiscipline[] {
  const byLabel = splitByLabels(name, body);
  if (byLabel) return byLabel;
  const cut = /\s(?=\d{1,2}(?:\.\d{1,2})+[.)]?\s+\S)/;
  const parts: Array<{ title: string; page: number; lines: Line[] }> = [];
  for (const l of body) {
    const m = l.text.match(/^(\d{1,2})[.)]?\s+(?=\S)/);
    const rest = m ? l.text.slice(m[0].length) : "";
    if (m && !/^\d/.test(rest)) {
      const at = rest.search(cut);
      const title = (at >= 0 ? rest.slice(0, at) : rest).replace(/[\s:.;]+$/, "").trim();
      if (title.length >= 3 && title.length <= 90 && !/[;]/.test(title) && (at >= 0 || title.split(" ").length <= 9)) {
        parts.push({ title, page: l.page, lines: at >= 0 ? [{ text: rest.slice(at + 1), page: l.page }] : [] });
        continue;
      }
    }
    parts.at(-1)?.lines.push(l);
  }
  if (parts.length >= 2) {
    return parts
      .map((x) => ({ name: x.title, mode: modeOfDiscipline(x.title), page: x.page, topics: itemsOf(x.lines) }))
      .filter((d) => d.topics.length);
  }
  const topics = itemsOf(body);
  return topics.length ? [{ name: name.replace(/[:.]+$/, "").trim(), mode: modeOfDiscipline(name), page: body[0]?.page ?? 1, topics }] : [];
}

export function parseEdital(pages: readonly string[]): ParsedEdital {
  const lines = toLines(pages);
  const warnings: string[] = [];
  const fail = (w: string): ParsedEdital => ({ found: false, confidence: 0, sectionPages: null, disciplines: [], warnings: [...warnings, w] });
  if (!lines.length) return fail("O PDF não tem texto selecionável.");

  // Candidatos ao início da seção; vence o que tem mais disciplinas logo em seguida.
  let best: { idx: number; score: number } | null = null;
  lines.forEach((l, idx) => {
    if (!START_RE.test(l.text) || l.text.length > 160) return;
    // Menção no meio de um item ("8.90. O conteúdo programático do Curso…") não é o título da seção.
    if (ITEM_START.test(l.text) || (l.text.length > 90 && upperRatio(l.text) < 0.6)) return;
    let score = 0;
    for (let j = idx + 1; j < Math.min(lines.length, idx + 500); j++) {
      if (END_RE.test(lines[j]!.text) && score > 0) break;
      const h = headingOf(lines[j]!.text, lines[j + 1]?.text);
      if (h) score += modeOfDiscipline(h.name) ? 3 : 1;
    }
    if (!best || score > best.score) best = { idx, score };
  });
  const b = best as { idx: number; score: number } | null;
  if (!b || b.score < 1) return fail("Não localizei a seção de conteúdo programático.");

  let end = lines.length;
  let seen = 0;
  for (let j = b.idx + 1; j < lines.length; j++) {
    if (seen > 0 && END_RE.test(lines[j]!.text)) {
      end = j;
      break;
    }
    if (headingOf(lines[j]!.text, lines[j + 1]?.text) || KNOW_GROUP.test(lines[j]!.text)) seen++;
  }

  const disciplines: ParsedDiscipline[] = [];
  let cur: { name: string; page: number; body: Line[] } | null = null;
  const flush = () => {
    if (!cur) return;
    const topics = itemsOf(cur.body);
    if (topics.length) disciplines.push({ name: cur.name.replace(/\s+/g, " "), mode: modeOfDiscipline(cur.name), page: cur.page, topics });
    cur = null;
  };
  let group: { name: string; body: Line[] } | null = null;
  const flushGroup = () => {
    if (group) disciplines.push(...disciplinesOfGroup(group.name, group.body));
    group = null;
  };
  for (let j = b.idx + 1; j < end; j++) {
    const l = lines[j]!;
    const h = headingOf(l.text, lines[j + 1]?.text);
    if (h) {
      flush();
      flushGroup();
      cur = { name: h.name, page: l.page, body: h.rest ? [{ text: h.rest, page: l.page }] : [] };
    } else if (KNOW_GROUP.test(l.text)) {
      flush();
      flushGroup();
      group = { name: l.text, body: [] };
    } else if (group) (group as { body: Line[] }).body.push(l);
    else if (cur) cur.body.push(l);
  }
  flush();
  flushGroup();

  if (disciplines.length && !disciplines.some((d) => d.mode || DISCIPLINE_HINT.test(fold(d.name)))) return fail("As seções encontradas não parecem matérias de estudo.");
  if (!disciplines.length) return fail("Encontrei o título do conteúdo programático, mas não consegui separar as disciplinas.");
  const total = disciplines.reduce((n, d) => n + d.topics.length, 0);
  const numbered = disciplines.reduce((n, d) => n + d.topics.filter((t) => t.code).length, 0);
  const known = disciplines.filter((d) => d.mode).length;
  // Confiança: várias disciplinas, itens numerados e nomes reconhecidos.
  const confidence = Math.min(1, 0.25 + Math.min(disciplines.length, 6) * 0.07 + (numbered / Math.max(1, total)) * 0.25 + (known / disciplines.length) * 0.2 + Math.min(total, 40) * 0.003);
  const pagesUsed = disciplines.flatMap((d) => [d.page, ...d.topics.map((t) => t.page)]);
  if (disciplines.length < 2) warnings.push("Só uma disciplina foi identificada; confira se o edital tem outras.");
  if (total < 5) warnings.push("Poucos assuntos foram extraídos; confira o conteúdo.");
  return { found: true, confidence, sectionPages: [Math.min(...pagesUsed), Math.max(...pagesUsed)], disciplines, warnings };
}

/** Conferência manual: o aluno cola/edita o conteúdo programático e o mesmo leitor monta a estrutura. */
export function parseProgrammaticText(text: string): ParsedEdital {
  const pages = [`CONTEÚDO PROGRAMÁTICO\n${text}`];
  return parseEdital(pages);
}

/** O arquivo parece ser um edital de concurso? (evita confundir material de estudo, apostila ou prova com edital) */
export function looksLikeEdital(pages: readonly string[]): boolean {
  const f = fold(pages.join("\n"));
  const markers = [/\bedital\b/g, /concurso publico/g, /inscri[cç]o?es?\b|\binscricao\b/g, /\bcandidat[oa]s?\b/g, /\bvagas?\b/g, /\bbanca\b|\borganizadora\b|\bfundacao\b/g, /\bcargo\b|\bcargos\b/g, /\bnomeacao\b|\bposse\b|\bremuneracao\b|\bvencimentos?\b/g];
  const hits = markers.map((re) => (f.match(re) ?? []).length);
  return hits.filter((n) => n > 0).length >= 4 && hits.reduce((a, b) => a + b, 0) >= 15;
}
