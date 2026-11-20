/**
 * Importador inteligente: lê questões coladas de uma fonte (ex.: TEC Concursos) e separa banca, ano,
 * cargo/concurso, texto-base, enunciado, alternativas, gabarito e comentário.
 *
 * Regras: leitura pura e determinística. NUNCA reescreve, resume nem completa o conteúdo; só separa.
 * O que não for encontrado fica ausente (null) e vira pendência para o administrador.
 */

export const KNOWN_BOARDS = [
  "CEBRASPE", "CESPE", "FCC", "FGV", "VUNESP", "IBFC", "IDECAN", "AOCP", "CONSULPLAN", "INSTITUTO CONSULPLAN", "IGEDUC", "AVANÇASP", "AVANCASP",
  "INSTITUTO ACCESS", "ACCESS", "QUADRIX", "IBADE", "FUNDATEC", "CESGRANRIO", "FUNCAB", "IADES", "OBJETIVA", "FEPESE", "UFPR", "NUCEPE", "COMPERVE",
  "FUNRIO", "INSTITUTO AOCP", "CS-UFG", "FADESP", "FUMARC", "MS CONCURSOS", "SELECON", "INSTITUTO MAIS", "LEGALLE", "GUALIMP", "UECE-CEV", "CEV-UECE",
] as const;

const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().replace(/\s+/g, " ").trim();
const KNOWN = new Set(KNOWN_BOARDS.map(fold));

export type SmartQuestionType = "multipla_escolha" | "certo_errado" | "discursiva";
export type SmartAnswerSource = "oficial" | "administrador" | null;

export interface SmartOption {
  label: string;
  text: string;
}

export interface SmartDraft {
  key: string;
  board: string | null;
  boardKnown: boolean;
  year: number | null;
  /** Cargo + órgão como vieram na origem (ex.: "Professor (Prefeitura de Calçado)/Educação Infantil"). */
  examLine: string | null;
  role: string | null;
  organ: string | null;
  discipline: string | null;
  topic: string | null;
  type: SmartQuestionType;
  baseTextCode: string | null;
  baseText: string | null;
  statement: string;
  options: SmartOption[];
  /** Letra (A–E) ou "certo"/"errado". */
  answer: string | null;
  answerSource: SmartAnswerSource;
  comment: string | null;
  /** Trecho original deste bloco, intacto. */
  raw: string;
  issues: SmartIssue[];
}

export type SmartIssue =
  | "gabarito_ausente"
  | "alternativas_nao_identificadas"
  | "banca_desconhecida"
  | "banca_ausente"
  | "ano_ausente"
  | "concurso_ausente"
  | "disciplina_pendente"
  | "enunciado_curto"
  | "sem_alternativas";

export interface SmartParse {
  drafts: SmartDraft[];
  baseTexts: Array<{ code: string; body: string; questions: number }>;
}

const BULLET = /^\s*(?:[-•*·▪●○◦■□►])\s+(.*\S.*)$/;
const LABELED = /^\s*\(?([A-Ea-e])\s*[).:\-–—]\s+(.*\S.*)$/;
const HEADER = /^\s*(.{2,60}?)\s+[—–-]\s+((?:19|20)\d{2})\s+[—–-]\s+(.+?)\s*$/;
const QMARK = /^\s*(?:quest[ãa]o\s*(?:n[º°.]?\s*)?\d{1,5}|q\s?\d{3,9})\s*[:.\-–—]?\s*$/i;
const BASE_HEAD = /^\s*(texto\s+(?:[A-Z]{1,4}\d[A-Z0-9-]*|[IVX]{1,5}|\d{1,2}|associado[s]?(?:\s+[\dA-Z-]+)?|[A-Z]{1,3}\d[A-Z0-9]*))\s*[:.]?\s*$/i;
const BASE_INTRO = /^\s*(leia o texto (?:a seguir|abaixo)|considere o texto (?:a seguir|abaixo)|texto (?:a seguir|abaixo))\b.*$/i;
const STATEMENT_START = /^\s*(julgue|assinale|marque|indique|identifique|considerando|com\s+rela[çc][ãa]o|em\s+rela[çc][ãa]o|de\s+acordo|segundo|quanto|analise|avalie|qual|quais|sobre|acerca|a\s+respeito|no\s+que\s+se\s+refere|assinalar|complete|preencha|observe)\b/i;
const ANSWER = /^\s*(?:gabarito|resposta(?:\s+correta)?|alternativa\s+correta)\s*(?:oficial)?\s*[:\-–]\s*(.+?)\s*$/i;
const COMMENT = /^\s*(?:coment[áa]rios?(?:\s+d[oa]\s+\w+)?|justificativa|explica[çc][ãa]o|resolu[çc][ãa]o)\s*[:\-–]\s*(.*)$/i;
const FIELD_DISC = /^\s*(?:disciplina|mat[ée]ria)\s*:\s*(.+?)\s*$/i;
const FIELD_TOPIC = /^\s*(?:assunto|tema|t[óo]pico)\s*:\s*(.+?)\s*$/i;
const NOISE = /^\s*(?:ver\s+coment[áa]rios?|resolver|anular|reportar|salvar|adicionar|imprimir|compartilhar|\d+\s*coment[áa]rios?|anotar|erro\s+no\s+enunciado|favoritar)\s*[.!]?\s*$/i;

function normalizeAnswer(v: string): string | null {
  const t = v.trim().replace(/[.\s]+$/g, "");
  const f = fold(t);
  if (/^(CERTO|C|CERTA)$/.test(f)) return "certo";
  if (/^(ERRADO|E|ERRADA)$/.test(f)) return "errado";
  const m = f.match(/^\(?([A-E])\)?$/);
  return m ? m[1]! : null;
}

function splitHeader(line: string): { board: string; year: number; rest: string } | null {
  const m = line.match(HEADER);
  if (!m) return null;
  const board = m[1]!.trim();
  // Evita confundir uma frase qualquer com cabeçalho: banca não termina com ponto nem é longa demais.
  if (/[.?!:]$/.test(board) || board.split(/\s+/).length > 6) return null;
  return { board, year: Number(m[2]), rest: m[3]!.trim() };
}

function splitExamLine(rest: string): { role: string | null; organ: string | null } {
  const m = rest.match(/^(.*?)\s*\(((?:[^()]|\([^()]*\))+)\)\s*(?:\/\s*(.+))?$/);
  if (m) return { role: [m[1]!.trim(), m[3]?.trim()].filter(Boolean).join(" / ") || null, organ: m[2]!.trim() };
  return { role: rest || null, organ: null };
}

/** Divide o texto colado em um bloco por questão. */
function blocks(lines: string[]): string[][] {
  const starts: number[] = [];
  lines.forEach((l, i) => {
    if (splitHeader(l)) starts.push(i);
    else if (QMARK.test(l)) {
      // "Questão 3" só abre bloco quando a linha seguinte não for cabeçalho (evita bloco vazio).
      const next = lines.slice(i + 1).find((x) => x.trim());
      if (!next || !splitHeader(next)) starts.push(i);
    }
  });
  if (!starts.length) return [lines];
  const out: string[][] = [];
  starts.forEach((s, k) => out.push(lines.slice(s, k + 1 < starts.length ? starts[k + 1] : lines.length)));
  return out;
}

/** Quantidade estimada de questões (para mostrar antes de analisar). */
export function estimateQuestions(text: string): number {
  if (!text.trim()) return 0;
  const lines = preprocessTec(text.replace(/\r\n?/g, "\n")).split("\n");
  return blocks(lines).filter((b) => b.some((l) => l.trim())).length;
}

function parseBlock(blockLines: string[], idx: number, carry: { baseCode: string | null; baseText: string | null }): SmartDraft | null {
  const raw = blockLines.join("\n").trim();
  if (!raw) return null;
  let lines = blockLines.map((l) => l.replace(/\s+$/g, ""));
  let board: string | null = null;
  let year: number | null = null;
  let examLine: string | null = null;
  // Cabeçalho (banca — ano — cargo/concurso), possivelmente após "Questão N".
  for (let i = 0; i < Math.min(lines.length, 4); i++) {
    const h = splitHeader(lines[i]!);
    if (h) {
      board = h.board;
      year = h.year;
      examLine = h.rest;
      lines = [...lines.slice(0, i), ...lines.slice(i + 1)];
      break;
    }
  }
  lines = lines.filter((l) => !QMARK.test(l) && !NOISE.test(l));

  let discipline: string | null = null;
  let topic: string | null = null;
  let answer: string | null = null;
  let comment: string | null = null;
  const body: string[] = [];
  let inComment = false;
  const commentLines: string[] = [];
  for (const l of lines) {
    const d = l.match(FIELD_DISC);
    if (d && !inComment) { discipline = d[1]!; continue; }
    const t = l.match(FIELD_TOPIC);
    if (t && !inComment) { topic = t[1]!; continue; }
    const a = l.match(ANSWER);
    if (a && !inComment) { answer = normalizeAnswer(a[1]!) ?? answer; continue; }
    const c = l.match(COMMENT);
    if (c) { inComment = true; if (c[1]) commentLines.push(c[1]); continue; }
    if (inComment) commentLines.push(l);
    else body.push(l);
  }
  if (commentLines.length) comment = commentLines.join("\n").trim() || null;

  // Alternativas: bloco final de linhas com marcador.
  const type0 = detectOptions(body);
  const textLines = body.slice(0, type0.firstOptionIndex ?? body.length);
  let options = type0.options;

  // Texto-base e enunciado.
  let baseCode: string | null = null;
  let baseText: string | null = null;
  let statementLines = textLines.slice();
  const baseAt = statementLines.findIndex((l) => BASE_HEAD.test(l) || BASE_INTRO.test(l));
  if (baseAt >= 0) {
    const head = statementLines[baseAt]!;
    const hm = head.match(BASE_HEAD);
    baseCode = hm ? hm[1]!.replace(/\s+/g, " ").trim().slice(0, 60) : null;
    const after = statementLines.slice(baseAt + 1);
    let stmtAt = -1;
    for (let i = after.length - 1; i >= 0; i--) if (STATEMENT_START.test(after[i]!) && (i === 0 || !after[i - 1]!.trim() || true)) { stmtAt = i; if (i > 0 && after[i - 1]!.trim() === "") break; }
    // Usa a última linha que inicia enunciado, desde que não seja a primeira linha do próprio texto.
    const lastStart = (() => { let k = -1; after.forEach((l, i) => { if (STATEMENT_START.test(l) && i > 0) k = i; }); return k; })();
    stmtAt = lastStart >= 0 ? lastStart : stmtAt;
    if (stmtAt > 0) {
      baseText = [head.match(BASE_INTRO) ? head : "", ...after.slice(0, stmtAt)].filter((x, i) => i > 0 || x).join("\n").replace(/^\n+|\n+$/g, "");
      statementLines = after.slice(stmtAt);
    } else {
      // Sem enunciado separado: o último parágrafo vira enunciado.
      const paras = after.join("\n").split(/\n\s*\n/);
      if (paras.length > 1) {
        statementLines = paras[paras.length - 1]!.split("\n");
        baseText = paras.slice(0, -1).join("\n\n").trim();
      } else {
        statementLines = after;
      }
    }
    if (baseText !== null && baseText.length < 10) baseText = null;
    // "Texto associado" sem número: usa o título (primeira linha) como código, para textos diferentes não se misturarem.
    if (baseText && baseCode && /^texto\s+associados?$/i.test(baseCode)) {
      const title = baseText.split("\n").map((x) => x.trim()).find(Boolean);
      if (title) baseCode = title.slice(0, 60);
    }
  } else if (carry.baseCode && new RegExp(`\\b${carry.baseCode.replace(/^texto\s+/i, "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(textLines.join(" "))) {
    // Questão que cita um texto já apresentado antes no mesmo lote (ex.: "texto CB2A1").
    baseCode = carry.baseCode;
    baseText = carry.baseText;
  }
  const statement = statementLines.join("\n").replace(/^\n+|\n+$/g, "").trim();

  // Tipo.
  const onlyCE = options.length === 2 && options.every((o) => /^(certo|errado)$/i.test(o.text.trim().replace(/[.]$/, "")));
  let type: SmartQuestionType = "multipla_escolha";
  if (onlyCE || (!options.length && /^\s*julgue\b|julgue o(s)? iten?s?\b/i.test(statement + " " + textLines.join(" ")))) {
    type = "certo_errado";
    options = [];
  } else if (!options.length) type = "discursiva";

  // Rotula alternativas sem letra e valida sequência.
  options = options.map((o, i) => ({ label: o.label || "ABCDE"[i] || String(i + 1), text: o.text }));

  const issues: SmartIssue[] = [];
  const { role, organ } = examLine ? splitExamLine(examLine) : { role: null, organ: null };
  if (!board) issues.push("banca_ausente");
  else if (!KNOWN.has(fold(board.replace(/\s*\(.*\)\s*$/, ""))) && !KNOWN.has(fold(board))) issues.push("banca_desconhecida");
  if (!year) issues.push("ano_ausente");
  if (!examLine) issues.push("concurso_ausente");
  if (!discipline) issues.push("disciplina_pendente");
  if (type === "multipla_escolha" && options.length < 2) issues.push("alternativas_nao_identificadas");
  if (type === "discursiva") issues.push("sem_alternativas");
  if (!answer) issues.push("gabarito_ausente");
  if (statement.length < 10) issues.push("enunciado_curto");
  if (answer && type === "multipla_escolha" && !options.some((o) => o.label === answer)) answer = null;
  if (answer && type === "certo_errado" && answer !== "certo" && answer !== "errado") answer = null;

  return {
    key: `q${idx + 1}`,
    board,
    boardKnown: board ? KNOWN.has(fold(board.replace(/\s*\(.*\)\s*$/, ""))) || KNOWN.has(fold(board)) : false,
    year,
    examLine,
    role,
    organ,
    discipline,
    topic,
    type,
    baseTextCode: baseCode,
    baseText,
    statement,
    options,
    answer,
    answerSource: answer ? "oficial" : null,
    comment,
    raw,
    issues: dedupe(issues),
  };
}

const dedupe = <T,>(a: T[]) => [...new Set(a)];

function detectOptions(body: string[]): { options: SmartOption[]; firstOptionIndex: number | null } {
  // Procura o último trecho contínuo de linhas com marcador (letra ou lista) ou as linhas "Certo"/"Errado".
  const isMarked = (l: string) => LABELED.test(l) || BULLET.test(l);
  let first: number | null = null;
  for (let i = 0; i < body.length; i++) {
    if (isMarked(body[i]!)) {
      // Letras só valem quando começam em A (evita "a) ..." no meio de um texto).
      const lm = body[i]!.match(LABELED);
      if (lm && lm[1]!.toUpperCase() !== "A") continue;
      first = i;
      break;
    }
  }
  if (first === null) {
    const loose = detectLooseOptions(body);
    if (loose) return loose;
    // "Certo" / "Errado" soltos.
    const c = body.findIndex((l) => /^\s*certo\s*\.?\s*$/i.test(l));
    const e = body.findIndex((l) => /^\s*errado\s*\.?\s*$/i.test(l));
    if (c >= 0 && e >= 0) return { options: [{ label: "", text: "Certo" }, { label: "", text: "Errado" }], firstOptionIndex: Math.min(c, e) };
    return { options: [], firstOptionIndex: null };
  }
  const options: SmartOption[] = [];
  let cur: SmartOption | null = null;
  for (let i = first; i < body.length; i++) {
    const l = body[i]!;
    const lm = l.match(LABELED);
    const bm = l.match(BULLET);
    if (lm) { cur = { label: lm[1]!.toUpperCase(), text: lm[2]!.trim() }; options.push(cur); }
    else if (bm) { cur = { label: "", text: bm[1]!.trim() }; options.push(cur); }
    else if (l.trim() && cur) cur.text += `\n${l.trim()}`;
  }
  // Rótulos ou lista simples: se havia rótulos mas faltou algum, descarta rótulos para renumerar.
  const labeled = options.filter((o) => o.label).length;
  if (labeled && labeled !== options.length) options.forEach((o) => (o.label = ""));
  return { options, firstOptionIndex: first };
}

/** Alternativas sem marcador (texto copiado sem "A)" nem bullets): linhas ou parágrafos logo após o enunciado. */
function detectLooseOptions(body: string[]): { options: SmartOption[]; firstOptionIndex: number } | null {
  // Letra sozinha na linha ("A" / "a)" / "(A)") seguida do texto na linha de baixo.
  const alone = /^\s*\(?([A-Ea-e])\s*[).:]?\s*$/;
  const at: number[] = [];
  body.forEach((l, i) => { if (alone.test(l)) at.push(i); });
  if (at.length >= 2 && at[0] !== undefined && alone.exec(body[at[0]]!)![1]!.toUpperCase() === "A") {
    const opts: SmartOption[] = at.map((start, k) => ({
      label: alone.exec(body[start]!)![1]!.toUpperCase(),
      text: body.slice(start + 1, k + 1 < at.length ? at[k + 1] : body.length).map((x) => x.trim()).filter(Boolean).join("\n"),
    }));
    if (opts.every((o) => o.text)) return { options: opts, firstOptionIndex: at[0] };
  }
  // Depois da última linha que pede a resposta (termina em ":" ou "?", ou começa com "Assinale..."), cada linha/parágrafo é uma alternativa.
  let ask = -1;
  body.forEach((l, i) => { const t = l.trim(); if (t && (/[:?]$/.test(t) || STATEMENT_START.test(t))) ask = i; });
  if (ask < 0) return null;
  const tail = body.slice(ask + 1);
  const paras = tail.join("\n").split(/\n\s*\n/).map((x) => x.trim()).filter(Boolean);
  const lines = tail.map((x) => x.trim()).filter(Boolean);
  const pick = paras.length >= 2 && paras.length <= 5 ? paras : lines.length >= 2 && lines.length <= 5 ? lines : null;
  if (!pick) return null;
  // Se a própria linha de pedido já começa a lista (ex.: sem ":" no fim), não confunde: exige que as alternativas não sejam pedidos.
  if (pick.some((x) => /^\s*(julgue|assinale)\b/i.test(x))) return null;
  return { options: pick.map((text) => ({ label: "", text })), firstOptionIndex: ask + 1 + (tail.findIndex((x) => x.trim()) < 0 ? 0 : tail.findIndex((x) => x.trim())) };
}

/**
 * Formato copiado do TEC Concursos: links em markdown, "#id BANCA - ano - concurso",
 * Matéria/Assunto antes do cabeçalho, número da questão solto e alternativas "* A" com o texto na linha seguinte.
 * Converte para o formato que o analisador já entende, sem alterar o conteúdo da questão.
 */
function preprocessTec(text: string): string {
  const t0 = text.replace(/\[([^\]]*)\]\((?:https?:\/\/|\/)[^)\s]*\)/g, "$1");
  if (!/^\s*#\d{3,}\b/m.test(t0) && !/^\s*[*•-]\s*\(?[A-Ea-e]\)?\s*$/m.test(t0)) return t0;
  // "Assunto:" sozinho na linha, com o valor na linha de baixo.
  const t = t0.replace(/^([ \t]*(?:assunto|mat[ée]ria|disciplina|tema|t[óo]pico)[ \t]*:)[ \t]*\n[ \t]*(\S[^\n]*)$/gim, "$1 $2");
  let lines = t.split("\n");
  // Cabeçalho do TEC -> "BANCA — ano — resto"; leva Matéria/Assunto/número que vinham antes para depois dele.
  const out: string[] = [];
  for (const l of lines) {
    const h = l.match(/^\s*#\d{3,}\s+(.+?)\s+-\s+((?:19|20)\d{2})\s+-\s+(.+?)\s*$/);
    if (!h) { out.push(l); continue; }
    const moved: string[] = [];
    while (out.length) {
      const prev = out[out.length - 1]!;
      if (!prev.trim()) { out.pop(); continue; }
      if (FIELD_DISC.test(prev) || FIELD_TOPIC.test(prev) || /^\s*\d{1,5}\s*$/.test(prev)) { moved.unshift(out.pop()!); continue; }
      break;
    }
    const rest = h[3]!.replace(/\s*\(e mais \d+ concursos?\)\s*$/i, "");
    out.push(`${h[1]} — ${h[2]} — ${rest}`, ...moved.filter((x) => !/^\s*\d{1,5}\s*$/.test(x)));
  }
  lines = out;
  // "* A" + texto na linha de baixo -> "A) texto".
  const res: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i]!.match(/^\s*[*•-]\s*\(?([A-Ea-e])\)?\s*$/);
    if (m) {
      let j = i + 1;
      while (j < lines.length && !lines[j]!.trim()) j++;
      if (j < lines.length) { res.push(`${m[1]!.toUpperCase()}) ${lines[j]!.trim()}`); i = j; continue; }
    }
    res.push(lines[i]!);
  }
  return res.join("\n");
}

export function parseSmart(input: string): SmartParse {
  const text = preprocessTec(input.replace(/\r\n?/g, "\n").replace(/ /g, " "));
  const lines = text.split("\n");
  const bl = blocks(lines);
  const drafts: SmartDraft[] = [];
  const carry = { baseCode: null as string | null, baseText: null as string | null };
  bl.forEach((b, i) => {
    const d = parseBlock(b, i, carry);
    if (!d) return;
    if (!d.statement && !d.options.length) return;
    if (d.baseTextCode && d.baseText) { carry.baseCode = d.baseTextCode; carry.baseText = d.baseText; }
    drafts.push(d);
  });
  drafts.forEach((d, i) => (d.key = `q${i + 1}`));
  const map = new Map<string, { code: string; body: string; questions: number }>();
  for (const d of drafts) {
    if (!d.baseTextCode || !d.baseText) continue;
    const k = d.baseTextCode.toLowerCase();
    const cur = map.get(k);
    if (cur) cur.questions++;
    else map.set(k, { code: d.baseTextCode, body: d.baseText, questions: 1 });
  }
  return { drafts, baseTexts: [...map.values()] };
}

/** Comparação de duplicidade: ignora espaços, quebras de linha e caixa. */
export function normalizeForCompare(s: string): string {
  return s.replace(/\s+/g, " ").trim().toLowerCase();
}

export interface DestinoMatch { subjectId: string | null; topicId: string | null }
interface DestinoSubject { id: string; name: string; topics: Array<{ id: string; name: string; parentId: string | null }> }

const key = (s: string) => fold(s.replace(/\([^)]*\)/g, " ")).replace(/[^A-Z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
const tokens = (s: string) => new Set(key(s).split(" ").filter((w) => w.length > 2));

/** Acha a melhor pasta já existente: igual > uma contém a outra (a mais longa vence) > palavras em comum. */
function best<T extends { name: string }>(items: T[], wanted: string): T | null {
  const w = key(wanted);
  if (!w) return null;
  const exact = items.find((i) => key(i.name) === w);
  if (exact) return exact;
  const part = items.filter((i) => { const k = key(i.name); return k.length >= 4 && (w.includes(k) || k.includes(w)); }).sort((a, b) => key(b.name).length - key(a.name).length);
  if (part[0]) return part[0];
  const wt = tokens(wanted);
  let top: { item: T; score: number } | null = null;
  for (const i of items) {
    const it = tokens(i.name);
    const common = [...wt].filter((x) => it.has(x)).length;
    const score = common / Math.max(1, Math.min(wt.size, it.size));
    if (common >= 1 && score >= 0.75 && (!top || score > top.score)) top = { item: i, score };
  }
  return top?.item ?? null;
}

/** Casa a matéria/assunto lidos do texto com as pastas existentes (sem criar nada). */
export function matchDestino(subjects: DestinoSubject[], discipline: string | null, topic: string | null): DestinoMatch {
  const s = discipline ? best(subjects, discipline) : null;
  if (!s) return { subjectId: null, topicId: null };
  const t = topic ? best(s.topics, topic) : null;
  return { subjectId: s.id, topicId: t?.id ?? null };
}
