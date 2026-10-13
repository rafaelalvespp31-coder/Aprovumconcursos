/**
 * Quiz "Complete a lei": lacunas tiradas do texto legal do catálogo.
 *
 * Tudo é determinístico a partir do tema e do dispositivo (mesma lacuna e mesmo banco de
 * palavras sempre), para o servidor conferir a resposta sem guardar estado da rodada.
 * Nada é inventado: a frase é o texto do dispositivo; as palavras "erradas" do banco são
 * trocas típicas de banca (prazo, órgão, verbo) ou palavras de outros dispositivos do mesmo tema.
 */

export interface LawNode {
  key: string;
  kind: string;
  marker: string | null;
  sourceText: string;
  parentKey: string | null;
  path: string;
}

export interface ClozeItem {
  nodeKey: string;
  /** Contexto acima da frase (ex.: o caput de um inciso). */
  context: string | null;
  /** Frase em partes: texto e lacunas (índice da lacuna). */
  parts: Array<{ text: string } | { blank: number }>;
  /** Respostas certas, na ordem das lacunas. */
  answers: string[];
  /** Banco de palavras embaralhado (inclui as respostas). */
  bank: string[];
  /** Referência legível: "Art. 10, § 1º". */
  ref: string;
}

const LEGAL_KINDS = new Set(["artigo", "paragrafo", "inciso", "alinea", "item"]);

/** Remove notas de redação: "(Redação dada pela Lei nº ...)", "(Incluído pela ...)". */
export function cleanLegalText(text: string): string {
  return text
    .replace(/\s*\((?:Reda[çc][ãa]o dada|Inclu[íi]d[oa]|Acrescentad[oa]|Vide|Vig[êe]ncia|Renumerad[oa])[^)]*\)/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Tira o marcador do começo ("Art. 10.", "§ 1º", "IV -", "a)", "Parágrafo único."). */
function stripMarker(text: string): { marker: string; body: string } {
  const m = text.match(/^(Art\.\s*\d+[º°]?(?:-[A-Z])?\.?|§\s*\d+[º°]?(?:-[A-Z])?|Par[áa]grafo [úu]nico\.?|[IVXLC]+\s*[-–—]|[a-z]\))\s*/);
  return m ? { marker: m[1]!.trim(), body: text.slice(m[0].length) } : { marker: "", body: text };
}

const norm = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

/** Palavras que valem lacuna (o que a banca troca), com peso. */
const KEY_TERMS: Record<string, number> = {
  // prazos e quantidades
  dias: 3, horas: 3, anos: 2, metade: 4, terco: 4, tercos: 4, seis: 4, vinte: 4, doze: 4, trinta: 4, tres: 4, um: 1, dez: 4, quinze: 4, quatorze: 4, dois: 3,
  // verbos e negações que mudam o sentido
  nao: 5, somente: 4, sempre: 4, podera: 5, devera: 5, poderao: 4, deverao: 4, vedado: 4, salvo: 3,
  // atores
  juiz: 5, delegado: 5, ministerio: 5, ofendido: 4, indiciado: 4, investigado: 4, vitima: 4, peritos: 4, defensor: 4, curador: 4, chefe: 3, autoridade: 2,
  // institutos
  requisicao: 5, requerimento: 5, representacao: 5, oficio: 5, arquivar: 5, arquivamento: 4, sigilo: 5, incomunicabilidade: 4, flagrante: 4, preventivamente: 4,
  denuncia: 4, queixa: 4, relatorio: 4, diligencias: 3, diligencia: 3, reclusao: 5, detencao: 5, culposo: 5, doloso: 5, torpe: 5, futil: 5, veneno: 4, emboscada: 4,
  traicao: 4, dissimulacao: 4, asfixia: 3, tortura: 3, menor: 3, publica: 4, privada: 4, perigo: 3, comum: 2, citado: 4, precatorias: 3, antecedentes: 3, escrito: 3,
  minucioso: 3, imprescindiveis: 3, competente: 2, curadoria: 3, milicia: 4, exterminio: 4, emocao: 4, valor: 3, social: 2, moral: 2, perdao: 4,
};

/** Trocas típicas de banca (palavra certa → candidatas a "errada"). */
const SWAPS: Record<string, string[]> = {
  juiz: ["delegado", "promotor", "Ministério Público"],
  delegado: ["juiz", "promotor"],
  "ministério público": ["juiz", "delegado de polícia", "Defensoria Pública"],
  requisição: ["requerimento", "representação"],
  requerimento: ["requisição", "representação"],
  representação: ["requisição", "requerimento"],
  ofício: ["requerimento", "requisição"],
  poderá: ["deverá", "não poderá"],
  deverá: ["poderá", "não deverá"],
  poderão: ["deverão"],
  deverão: ["poderão"],
  não: ["sempre", "também"],
  somente: ["também", "preferencialmente"],
  sempre: ["nunca", "somente"],
  dias: ["horas", "meses"],
  horas: ["dias", "minutos"],
  anos: ["meses"],
  reclusão: ["detenção", "prisão simples"],
  detenção: ["reclusão", "prisão simples"],
  culposo: ["doloso", "preterdoloso"],
  doloso: ["culposo"],
  torpe: ["fútil"],
  fútil: ["torpe"],
  pública: ["privada"],
  privada: ["pública"],
  ofendido: ["indiciado", "investigado"],
  indiciado: ["ofendido", "acusado"],
  investigado: ["ofendido", "acusado"],
  denúncia: ["queixa", "representação"],
  queixa: ["denúncia", "representação"],
  arquivar: ["instaurar", "suspender"],
  sigilo: ["publicidade", "contraditório"],
  flagrante: ["preventivamente", "temporariamente"],
  preventivamente: ["temporariamente"],
  metade: ["um terço", "dois terços"],
  peritos: ["policiais", "delegados"],
  menor: ["maior"],
  doze: ["seis", "quinze"],
  seis: ["doze", "oito"],
  vinte: ["trinta", "quinze"],
  trinta: ["vinte", "quinze"],
  três: ["dois", "cinco"],
  dez: ["quinze", "trinta", "cinco"],
  quinze: ["dez", "trinta"],
  "10": ["15", "30", "5"],
  "15": ["10", "30"],
  "30": ["10", "15", "60"],
  "48": ["24", "72"],
  "14": ["12", "18"],
  "60": ["30", "90"],
  "1/3": ["1/2", "2/3", "1/6"],
  "2/3": ["1/3", "1/2"],
  "1/6": ["1/3", "1/2"],
  "1/2": ["1/3", "2/3"],
};

/** Gerador pseudoaleatório determinístico (mulberry32) a partir de uma string. */
export function seeded(seed: string): () => number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(arr: T[], rnd: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

interface Token {
  text: string;
  start: number;
  end: number;
  score: number;
}

/** Palavras candidatas a lacuna, com "Ministério Público" tratado como um termo só. */
function candidates(body: string): Token[] {
  const out: Token[] = [];
  const re = /Minist[ée]rio P[úu]blico|\d+\/\d+|\d+|[A-Za-zÀ-ÖØ-öø-ÿ]+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body))) {
    const t = m[0];
    const n = norm(t);
    const before = body.slice(0, m.index);
    const after = body.slice(m.index + t.length, m.index + t.length + 3);
    // Número seguido do valor por extenso ("48 (quarenta e oito)") entregaria a resposta.
    const spelled = /^\s?\(/.test(after);
    let score = 0;
    if (/^minist/.test(n)) score = 5;
    else if (/^\d+\/\d+$/.test(t)) score = spelled ? 0 : 5;
    else if (/^\d+$/.test(t)) {
      // Número de artigo, parágrafo, lei ou ano não vira lacuna; prazo e idade, sim.
      const ref = /(art(?:igo)?s?\.?|§|inciso|n[º°o]\.?|lei)\s*$/i.test(before) || /^[º°\/.-]/.test(after) || t.length >= 4;
      score = ref || spelled ? 0 : 6;
    } else {
      score = KEY_TERMS[n] ?? 0;
      // "Pública"/"Privada" com inicial maiúscula costuma ser nome próprio (ex.: "Segurança Pública").
      if ((n === "publica" || n === "privada") && /^[A-ZÁ]/.test(t)) score = 0;
    }
    // Não esconde a primeira palavra da frase nem palavras dentro de parênteses de remissão (ex.: "(quatorze)").
    const openParens = (before.match(/\(/g) ?? []).length - (before.match(/\)/g) ?? []).length;
    if (score > 0 && m.index > 0 && openParens === 0) out.push({ text: t, start: m.index, end: m.index + t.length, score });
  }
  return out;
}

/** Sobe até o artigo ou parágrafo (as linhas "Pena - ..." às vezes ficam presas ao último inciso). */
function legalAnchor(node: LawNode, all: LawNode[]): LawNode | undefined {
  let cur = node.parentKey ? all.find((n) => n.key === node.parentKey) : undefined;
  while (cur && cur.kind !== "artigo" && cur.kind !== "paragrafo") cur = cur.parentKey ? all.find((n) => n.key === cur!.parentKey) : undefined;
  return cur;
}

/** Monta a lacuna de um dispositivo; null se o texto não serve (revogado, curto, sem termo-chave). */
export function buildCloze(node: LawNode, all: LawNode[], topicSeed: string): ClozeItem | null {
  if (!LEGAL_KINDS.has(node.kind)) return null;
  const clean = cleanLegalText(node.sourceText);
  if (/\brevogad[oa]\b/i.test(clean) || clean.length < 18 || clean.length > 420) return null;
  const { marker, body } = stripMarker(clean);
  if (body.length < 12) return null;

  const rnd = seeded(`${topicSeed}:${node.key}`);
  const cands = candidates(body);
  if (!cands.length) return null;
  // Melhores termos primeiro (empate decidido pela semente), no máximo 2 lacunas, sem palavras coladas.
  const ranked = shuffle(cands, rnd).sort((a, b) => b.score - a.score);
  const chosen: Token[] = [];
  for (const c of ranked) {
    if (chosen.length >= 2) break;
    if (chosen.some((x) => Math.abs(x.start - c.start) < 12 || norm(x.text) === norm(c.text))) continue;
    if (c.score < 3 && chosen.length) continue;
    chosen.push(c);
  }
  if (!chosen.length || chosen[0]!.score < 3) return null;
  chosen.sort((a, b) => a.start - b.start);

  const parts: ClozeItem["parts"] = [];
  let pos = 0;
  chosen.forEach((c, i) => {
    if (c.start > pos) parts.push({ text: body.slice(pos, c.start) });
    parts.push({ blank: i });
    pos = c.end;
  });
  if (pos < body.length) parts.push({ text: body.slice(pos) });
  const answers = chosen.map((c) => c.text);

  // Banco: respostas + trocas típicas + palavras-chave de outros dispositivos do tema.
  const lowerAnswers = new Set(answers.map(norm));
  const pool: string[] = [];
  for (const a of answers) for (const s of SWAPS[a.toLowerCase()] ?? SWAPS[a] ?? []) pool.push(matchCase(s, a));
  const others = shuffle(
    all.filter((n) => n.key !== node.key && LEGAL_KINDS.has(n.kind)).flatMap((n) => candidates(stripMarker(cleanLegalText(n.sourceText)).body).filter((c) => c.score >= 4 && !/\d/.test(c.text)).map((c) => c.text)),
    rnd,
  );
  pool.push(...others);
  const distractors: string[] = [];
  for (const w of pool) {
    if (distractors.length >= 6 - answers.length) break;
    const k = norm(w);
    if (lowerAnswers.has(k) || distractors.some((d) => norm(d) === k) || body.toLowerCase().includes(` ${w.toLowerCase()} `)) continue;
    distractors.push(w);
  }
  const bank = shuffle([...answers, ...distractors], rnd);

  // Contexto: o caput a que o inciso/alínea pertence; a linha "Pena - ..." pertence ao artigo ou parágrafo.
  const parent = node.kind === "item" ? legalAnchor(node, all) : node.parentKey ? all.find((n) => n.key === node.parentKey) : undefined;
  const context = (node.kind === "inciso" || node.kind === "alinea" || node.kind === "item") && parent ? cleanLegalText(parent.sourceText) : null;
  const ref = node.kind === "item" && parent ? refOf(parent, all) : refOf(node, all, marker);
  return { nodeKey: node.key, context, parts, answers, bank, ref };
}

function matchCase(word: string, like: string): string {
  return /^[A-ZÀ-Ö]/.test(like) && !/^[A-ZÀ-Ö]/.test(word) ? word[0]!.toUpperCase() + word.slice(1) : word;
}

/** "Art. 10, § 1º", "Art. 121, § 2º, IV". */
export function refOf(node: LawNode, all: LawNode[], marker?: string): string {
  const chain: string[] = [];
  let cur: LawNode | undefined = node;
  while (cur) {
    const m = cur.marker ?? (cur === node ? marker : null);
    if (m && cur.kind !== "item") chain.unshift(cur.kind === "alinea" ? `alínea ${m}` : m);
    cur = cur.parentKey ? all.find((n) => n.key === cur!.parentKey) : undefined;
  }
  return chain.join(", ") || node.path;
}

/** Confere as respostas (sem diferenciar maiúsculas e acentos). */
export function checkCloze(item: ClozeItem, given: string[]): boolean[] {
  return item.answers.map((a, i) => norm(given[i] ?? "").trim() === norm(a));
}

/** Todos os itens possíveis de um tema. */
export function buildAll(nodes: LawNode[], topicSeed: string): ClozeItem[] {
  return nodes.map((n) => buildCloze(n, nodes, topicSeed)).filter((x): x is ClozeItem => !!x);
}
