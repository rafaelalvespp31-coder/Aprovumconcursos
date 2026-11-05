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
  // direito administrativo (princípios, cargos, entidades, responsabilidade)
  legalidade: 5, impessoalidade: 5, moralidade: 5, publicidade: 4, eficiencia: 5, concurso: 4, titulos: 3, comissao: 5, confianca: 5, efetivo: 5,
  exclusivamente: 5, direcao: 3, chefia: 3, assessoramento: 3, professor: 4, tecnico: 4, cientifico: 4, saude: 4, autarquia: 5, especifica: 5, complementar: 5,
  educativo: 4, informativo: 3, nulidade: 5, regresso: 5, dolo: 5, culpa: 5, terceiros: 4, brasileiros: 4, estrangeiros: 4, horarios: 4, uma: 2,
  improrrogavel: 5, prioridade: 4, suspensao: 4, indisponibilidade: 4, ressarcimento: 4, legislativa: 4, subsidiarias: 4, privativos: 3, improbidade: 4,
  // trânsito (CTB)
  contran: 5, cetran: 5, contrandife: 4, jari: 5, semaforo: 5, agente: 5, sinais: 4, normativo: 4, consultivos: 3, executivos: 4, rodoviarios: 4,
  rodoviaria: 5, militares: 5, objetivamente: 5, vida: 4, quatro: 4, cinco: 4, sete: 4, animais: 4, estacionamento: 4, parada: 4, circulacao: 3,
  cassacao: 5, reciclagem: 4, advertencia: 4, ordens: 3, direito: 2, seguras: 3, omissao: 4,
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
  legalidade: ["razoabilidade", "finalidade"],
  impessoalidade: ["imparcialidade", "isonomia"],
  moralidade: ["motivação", "probidade"],
  publicidade: ["transparência", "motivação"],
  eficiência: ["economicidade", "eficácia"],
  concurso: ["processo seletivo", "seleção simplificada"],
  títulos: ["entrevistas", "currículo"],
  comissão: ["confiança", "caráter temporário"],
  confiança: ["comissão"],
  efetivo: ["comissão", "caráter temporário"],
  exclusivamente: ["preferencialmente", "prioritariamente"],
  chefia: ["execução"],
  assessoramento: ["execução", "fiscalização"],
  professor: ["médico", "policial"],
  técnico: ["administrativo", "operacional"],
  científico: ["administrativo", "comissionado"],
  saúde: ["educação", "segurança pública"],
  autarquia: ["fundação", "empresa pública"],
  específica: ["complementar", "ordinária"],
  complementar: ["ordinária", "específica"],
  educativo: ["promocional", "publicitário"],
  informativo: ["eleitoral", "promocional"],
  nulidade: ["anulabilidade", "revogação"],
  regresso: ["representação", "reclamação"],
  dolo: ["culpa grave", "má-fé"],
  culpa: ["imprudência", "omissão"],
  terceiros: ["usuários", "servidores"],
  brasileiros: ["estrangeiros", "naturalizados"],
  estrangeiros: ["brasileiros", "naturalizados"],
  horários: ["funções", "atribuições"],
  dois: ["três", "quatro"],
  uma: ["duas", "três"],
  improrrogável: ["prorrogável", "renovável"],
  prioridade: ["preferência relativa", "igualdade"],
  suspensão: ["perda", "cassação"],
  indisponibilidade: ["perda", "penhora"],
  ressarcimento: ["perdimento", "confisco"],
  legislativa: ["judicial", "ministerial"],
  subsidiárias: ["filiais", "autarquias"],
  privativos: ["exclusivos", "próprios"],
  improbidade: ["imoralidade", "ilegalidade"],
  contran: ["CETRAN", "DENATRAN"],
  cetran: ["CONTRAN", "JARI"],
  contrandife: ["CETRAN", "DETRAN"],
  jari: ["CETRAN", "CONTRAN"],
  semáforo: ["agente de trânsito", "sinal sonoro"],
  agente: ["semáforo", "condutor"],
  sinais: ["semáforos", "agentes"],
  normativo: ["executivo", "julgador"],
  executivos: ["normativos", "consultivos"],
  rodoviária: ["Civil", "Federal"],
  militares: ["Civis", "Penais"],
  objetivamente: ["subjetivamente", "solidariamente"],
  vida: ["propriedade", "fluidez"],
  quatro: ["três", "cinco"],
  cinco: ["quatro", "sete"],
  sete: ["cinco", "nove"],
  estacionamento: ["parada", "circulação"],
  parada: ["estacionamento", "circulação"],
  cassação: ["suspensão", "apreensão"],
  reciclagem: ["formação", "habilitação"],
  advertência: ["repreensão", "notificação"],
  omissão: ["dolo", "culpa"],
  seguras: ["adequadas", "regulares"],
};

/**
 * Categorias de termos: o banco de palavras só recebe "erradas" da MESMA categoria da resposta
 * (ator com ator, prazo com prazo, princípio com princípio), para o bloco errado ser plausível e
 * encaixar na frase. A categoria também define a dificuldade do termo (ver LEVEL_OF_CATEGORY).
 */
const CATEGORY_WORDS: Record<string, string[]> = {
  ator: ["juiz", "delegado", "promotor", "Ministério Público", "ofendido", "indiciado", "investigado", "acusado", "vítima", "peritos", "defensor", "curador", "Defensoria Pública"],
  peca: ["requisição", "requerimento", "representação", "ofício", "denúncia", "queixa", "relatório", "portaria"],
  pena: ["reclusão", "detenção", "prisão simples", "multa"],
  elemento: ["culposo", "doloso", "preterdoloso"],
  qualificadora: ["torpe", "fútil", "veneno", "emboscada", "traição", "dissimulação", "asfixia", "tortura"],
  modal: ["poderá", "deverá", "poderão", "deverão", "vedado", "permitido", "facultado"],
  negacao: ["não", "sempre", "nunca", "somente", "também", "preferencialmente", "exclusivamente", "prioritariamente", "salvo", "exceto"],
  tempo: ["dias", "horas", "meses", "anos", "semanas"],
  numero_ext: ["um", "uma", "duas", "dois", "três", "quatro", "cinco", "seis", "sete", "dez", "doze", "quinze", "vinte", "trinta"],
  fracao: ["1/2", "1/3", "2/3", "1/6", "1/4"],
  digito: ["5", "10", "15", "24", "30", "48", "60", "72", "90"],
  natureza: ["pública", "privada", "condicionada", "incondicionada"],
  principio: ["legalidade", "impessoalidade", "moralidade", "publicidade", "eficiência", "razoabilidade", "finalidade", "motivação", "isonomia", "probidade", "economicidade"],
  provimento: ["concurso", "processo seletivo", "títulos", "entrevistas", "comissão", "confiança", "efetivo"],
  entidade: ["autarquia", "fundação", "empresa pública", "sociedade de economia mista"],
  transito: ["CONTRAN", "CETRAN", "DENATRAN", "DETRAN", "JARI"],
  sinalizacao: ["semáforo", "agente", "sinais", "estacionamento", "parada", "circulação"],
  sancao: ["advertência", "suspensão", "cassação", "reciclagem", "apreensão", "repreensão", "multa"],
  responsabilidade: ["dolo", "culpa", "regresso", "nulidade", "ressarcimento", "indisponibilidade", "improbidade", "anulabilidade", "revogação"],
  grupo: ["brasileiros", "estrangeiros", "naturalizados"],
};

const CATEGORY_INDEX = new Map<string, string>();
for (const [cat, words] of Object.entries(CATEGORY_WORDS)) for (const w of words) if (!CATEGORY_INDEX.has(norm(w))) CATEGORY_INDEX.set(norm(w), cat);

export function categoryOf(word: string): string | null {
  if (/^\d+\/\d+$/.test(word)) return "fracao";
  if (/^\d+$/.test(word)) return "digito";
  return CATEGORY_INDEX.get(norm(word)) ?? null;
}

/** Dificuldade do termo: 1 = conceito/definição, 2 = aplicação e distinção, 3 = exceção, prazo e requisito. */
const LEVEL_OF_CATEGORY: Record<string, 1 | 2 | 3> = {
  principio: 1, provimento: 1, entidade: 1, transito: 1, peca: 1, pena: 1, natureza: 1, qualificadora: 1, sinalizacao: 1, grupo: 1,
  ator: 2, tempo: 2, modal: 2, elemento: 2, sancao: 2, responsabilidade: 2,
  negacao: 3, digito: 3, fracao: 3, numero_ext: 3,
};
export function levelOfTerm(word: string): 1 | 2 | 3 {
  const c = categoryOf(word);
  return (c && LEVEL_OF_CATEGORY[c]) || 2;
}

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
export interface ClozeOptions {
  /** Máximo de lacunas (padrão 2). */
  blanks?: number;
  /** Tamanho do banco de palavras (padrão 6). */
  bank?: number;
  /** Mostrar o caput acima do inciso/alínea (padrão sim). */
  context?: boolean;
  /** Nível do jogo (1 Fácil, 2 Médio, 3 Difícil, 4 Elite): decide que tipo de termo vira lacuna. */
  tier?: 1 | 2 | 3 | 4;
}

/** Mínimo de blocos errados no banco: sem isso a lacuna seria "de graça". */
const MIN_DISTRACTORS = 2;

export function buildCloze(node: LawNode, all: LawNode[], topicSeed: string, opts: ClozeOptions = {}): ClozeItem | null {
  const maxBlanks = Math.max(1, Math.min(4, opts.blanks ?? 2));
  const bankSize = Math.max(maxBlanks + 2, Math.min(10, opts.bank ?? 6));
  if (!LEGAL_KINDS.has(node.kind)) return null;
  const clean = cleanLegalText(node.sourceText);
  if (/\brevogad[oa]\b/i.test(clean) || clean.length < 18 || clean.length > 420) return null;
  const { marker, body } = stripMarker(clean);
  if (body.length < 12) return null;

  const rnd = seeded(opts.blanks || opts.bank ? `${topicSeed}:${node.key}:${maxBlanks}-${bankSize}${opts.tier ? `:t${opts.tier}` : ""}` : `${topicSeed}:${node.key}`);
  const wanted: 1 | 2 | 3 = opts.tier ? (Math.min(3, opts.tier) as 1 | 2 | 3) : 2;
  const cands = candidates(body);
  if (!cands.length) return null;
  // Melhores termos primeiro (empate decidido pela semente), no máximo 2 lacunas, sem palavras coladas.
  // O termo do nível pedido (conceito no Fácil, aplicação no Médio, exceção/prazo no Difícil) passa na frente.
  const bonus = (t: Token) => (opts.tier && levelOfTerm(t.text) === wanted ? 10 : 0);
  const ranked = shuffle(cands, rnd).sort((a, b) => b.score + bonus(b) - (a.score + bonus(a)));
  const countOf = (t: Token) => cands.filter((x) => norm(x.text) === norm(t.text)).length + (body.toLowerCase().split(t.text.toLowerCase()).length - 1 > 1 ? 1 : 0);
  const chosen: Token[] = [];
  for (const c of ranked) {
    if (chosen.length >= maxBlanks) break;
    // A palavra que aparece em outro ponto da frase entregaria a resposta.
    if (countOf(c) > 1) continue;
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

  // Banco: respostas + erradas plausíveis. Prioridade: trocas típicas de banca; depois termos do mesmo
  // tema e da MESMA categoria da resposta; depois a lista geral da categoria. Nunca palavra aleatória.
  const lowerAnswers = new Set(answers.map(norm));
  const cats = answers.map((a) => categoryOf(a));
  const swaps: string[] = [];
  for (const a of answers) for (const sw of SWAPS[a.toLowerCase()] ?? SWAPS[a] ?? []) swaps.push(matchCase(sw, a));
  const topicSame = shuffle(
    all.filter((n) => n.key !== node.key && LEGAL_KINDS.has(n.kind)).flatMap((n) => candidates(stripMarker(cleanLegalText(n.sourceText)).body).map((c) => c.text)),
    rnd,
  ).filter((w) => cats.includes(categoryOf(w)));
  const globalSame = answers.flatMap((a, i) => (cats[i] ? shuffle(CATEGORY_WORDS[cats[i]!] ?? [], rnd).map((w) => matchCase(w, a)) : []));
  // Blocos do mesmo "tamanho" da resposta (mesmo número de palavras) vêm primeiro: o tamanho não denuncia a certa.
  const wc = (w: string) => w.trim().split(/\s+/).length;
  const sizes = new Set(answers.map(wc));
  const ordered = [...swaps, ...topicSame, ...globalSame];
  const pool = [...ordered.filter((w) => sizes.has(wc(w))), ...ordered.filter((w) => !sizes.has(wc(w)))];
  const bodyNorm = ` ${norm(body)} `;
  const distractors: string[] = [];
  for (const w of pool) {
    if (distractors.length >= bankSize - answers.length) break;
    const k = norm(w);
    if (lowerAnswers.has(k) || distractors.some((d) => norm(d) === k) || bodyNorm.includes(` ${k} `)) continue;
    distractors.push(w);
  }
  if (distractors.length < MIN_DISTRACTORS) return null;
  const bank = shuffle([...answers, ...distractors], rnd);

  // Contexto: o caput a que o inciso/alínea pertence; a linha "Pena - ..." pertence ao artigo ou parágrafo.
  const parent = node.kind === "item" ? legalAnchor(node, all) : node.parentKey ? all.find((n) => n.key === node.parentKey) : undefined;
  const context = opts.context !== false && (node.kind === "inciso" || node.kind === "alinea" || node.kind === "item") && parent ? cleanLegalText(parent.sourceText) : null;
  const ref = node.kind === "item" && parent ? refOf(parent, all) : refOf(node, all, marker);
  const item: ClozeItem = { nodeKey: node.key, context, parts, answers, bank, ref };
  return validateCloze(item) ? item : null;
}

/**
 * Validação interna antes de exibir (se falhar, a atividade é descartada e outra é usada):
 * a frase mantém sentido sem as lacunas, há resposta única e os blocos permitem montá-la.
 */
export function validateCloze(item: ClozeItem): boolean {
  const blanks = item.parts.filter((p): p is { blank: number } => "blank" in p);
  if (!item.answers.length || blanks.length !== item.answers.length) return false;
  if (item.answers.some((a) => !a.trim() || a.length > 40)) return false;
  // Cada resposta está no banco, uma única vez, e o banco não repete bloco.
  const bankKeys = item.bank.map(norm);
  if (new Set(bankKeys).size !== bankKeys.length) return false;
  if (item.answers.some((a) => bankKeys.filter((k) => k === norm(a)).length !== 1)) return false;
  if (item.bank.length - item.answers.length < MIN_DISTRACTORS) return false;
  // Sobra contexto suficiente na frase para o aluno raciocinar.
  const visible = item.parts.map((p) => ("text" in p ? p.text : " ")).join("");
  if (`${item.context ?? ""} ${visible}`.split(/\s+/).filter((w) => w.length > 2).length < 4) return false;
  // Nenhum bloco errado (nem resposta) aparece já escrito na frase.
  const vis = ` ${norm(visible)} `;
  return item.bank.every((w) => !vis.includes(` ${norm(w)} `));
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
export function buildAll(nodes: LawNode[], topicSeed: string, opts: ClozeOptions = {}): ClozeItem[] {
  // Sem repetir a mesma frase (dispositivos de texto igual, mudando só a ordem ou a pontuação).
  const seen = new Set<string>();
  return nodes
    .map((n) => buildCloze(n, nodes, topicSeed, opts))
    .filter((x): x is ClozeItem => {
      if (!x) return false;
      const key = norm(x.parts.map((p) => ("text" in p ? p.text : x.answers[p.blank]!)).join("")).replace(/[^a-z0-9]+/g, " ").trim().split(" ").sort().join(" ");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}
