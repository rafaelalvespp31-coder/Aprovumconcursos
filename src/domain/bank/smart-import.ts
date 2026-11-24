/**
 * Importador inteligente: lê questões coladas de uma fonte (ex.: TEC Concursos, Gran Cursos) e separa banca, ano,
 * cargo/concurso, texto-base, enunciado, alternativas, gabarito e comentário.
 *
 * Regras: leitura pura e determinística. NUNCA reescreve, resume nem completa o conteúdo; só separa.
 * O que não for encontrado fica ausente (null) e vira pendência para o administrador.
 */

import { splitCommentByOption } from "./option-notes";

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
// Comentário por alternativa: "Alternativa (a). Essa não é a nossa alternativa correta. …"
const ALT_NOTE = /^\s*alternativa\s*\(?[A-Ea-e]\)?\s*[).:\-–—]\s*\S/i;
const FIELD_DISC = /^\s*(?:disciplina|mat[ée]ria)\s*:\s*(.+?)\s*$/i;
const FIELD_TOPIC = /^\s*(?:assuntos?|tema|t[óo]pico)\s*:\s*(.+?)\s*$/i;
const STATUS = String.raw`resolvida|n[ãa]o\s+resolvida|respondida|n[ãa]o\s+respondida|acertei|errei|anulada|desatualizada`;
const NOISE = /^\s*(?:resolvida|n[ãa]o\s+resolvida|respondida|n[ãa]o\s+respondida|acertei|errei|anulada|desatualizada|ver\s+coment[áa]rios?|resolver|anular|reportar|salvar|adicionar|imprimir|compartilhar|\d+\s*coment[áa]rios?|anotar|erro\s+no\s+enunciado|favoritar)\s*[.!]?\s*$/i;

function normalizeAnswer(v: string): string | null {
  const t = v.trim().replace(/[.\s]+$/g, "");
  const f = fold(t);
  // "letra D" / "alternativa (d)" / "opção C": é sempre letra (C e E aqui não são Certo/Errado).
  const withWord = f.match(/^(?:LETRA|ALTERNATIVA|OPCAO)\s+\(?([A-E])\)?$/);
  if (withWord) return withWord[1]!;
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
    if (a) {
      const n = normalizeAnswer(a[1]!);
      if (n) { answer = n; continue; }
      // "Gabarito: A) texto…" abre o comentário da alternativa certa.
      const lead = a[1]!.match(/^\(?([A-Ea-e])\)\s*\S/);
      if (lead && !inComment) { answer = lead[1]!.toUpperCase(); inComment = true; commentLines.push(l.trim()); continue; }
      if (!inComment) continue;
    }
    if (!inComment && body.length && ALT_NOTE.test(l)) { inComment = true; commentLines.push(l); continue; }
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
      // Parágrafo anterior sem pontuação final (ex.: termina em vírgula): é o mesmo enunciado quebrado, não um texto-base.
      // Termina em ":" (introduz um trecho citado logo abaixo): também é o mesmo enunciado.
      const quebrado = paras.length > 1 && (!/[.!?:…"”»)\]]\s*$/.test(paras[paras.length - 2]!.trim()) || /:\s*$/.test(paras[paras.length - 2]!.trim()));
      if (paras.length > 1 && !quebrado) {
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
  let statement = statementLines.join("\n").replace(/^\n+|\n+$/g, "").trim();
  // Rede de segurança: se separar o texto-base deixou o enunciado minúsculo, a separação errou. Fica tudo como enunciado.
  if (baseAt >= 0 && statement.length < 15) {
    statement = textLines.slice(baseAt + 1).join("\n").replace(/^\n+|\n+$/g, "").trim();
    baseText = null;
  }
  // Sem texto associado de verdade, o rótulo "Texto associado" não vira texto-base.
  if (!baseText && baseAt >= 0) baseCode = null;

  // Tipo.
  const onlyCE = options.length === 2 && options.every((o) => /^(certo|errado)$/i.test(o.text.trim().replace(/[.]$/, "")));
  let type: SmartQuestionType = "multipla_escolha";
  if (onlyCE || (!options.length && /^\s*julgue\b|julgue o(s)? iten?s?\b/i.test(statement + " " + textLines.join(" ")))) {
    type = "certo_errado";
    options = [];
  } else if (!options.length) type = "discursiva";

  // Rotula alternativas sem letra e valida sequência.
  options = options.map((o, i) => ({ label: o.label || "ABCDE"[i] || String(i + 1), text: o.text }));
  // Gabarito "C"/"E" numa questão de alternativas é a letra, não Certo/Errado.
  if (type === "multipla_escolha" && answer === "certo" && options.some((o) => o.label === "C")) answer = "C";
  if (type === "multipla_escolha" && answer === "errado" && options.some((o) => o.label === "E")) answer = "E";
  // Sem "Gabarito:" explícito, o comentário por alternativa pode dizer qual é a certa.
  if (!answer && comment && type === "multipla_escolha") {
    const n = splitCommentByOption(comment);
    if (n?.answer && options.some((o) => o.label === n.answer)) answer = n.answer;
  }

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

/** Número da questão no Gran Cursos ("Q4313594"). */
const GRAN_ID = /^\s*Q\d{3,9}\s*$/i;
/**
 * No Gran, a linha "[Matéria](link)[Assunto](link)" vem só com links (sem rótulo): vira "Matéria: …" e "Assunto: …".
 * Precisa rodar antes de os links serem removidos, senão matéria e assunto se misturam numa frase só.
 */
function granMateriaAssunto(text: string): string {
  const link = String.raw`\[([^\]]+)\]\((https?:\/\/[^)\s]*grancursosonline[^)\s]*)\)`;
  const re = new RegExp(String.raw`^[ \t]*${link}[ \t]*(?:${link})?[ \t]*$`, "gm");
  return text.replace(re, (m, a: string, ua: string, b?: string) => {
    if (/\/(?:concursos|prova|questoes-de-concursos|bancas?)(?:\/|$)/.test(ua) || /^\s*(?:Q?\d+|#\d+)\s*$/i.test(a)) return m;
    return b ? `Matéria: ${a.trim()}\nAssunto: ${b.trim()}` : `Matéria: ${a.trim()}`;
  });
}

const GRAN_LABEL = /^\s*(ano|banca|prova)\s*:\s*(.*?)\s*$/i;

/** Sigla da banca a partir de "Nome por extenso - SIGLA" (Gran) ou, na falta, da primeira parte da prova. */
function granBoard(banca: string | undefined, prova: string | undefined): string | null {
  const parts = (banca ?? "").split(/\s+-\s+/).map((x) => x.trim()).filter(Boolean);
  const tail = parts.length > 1 ? parts[parts.length - 1]! : null;
  if (tail && tail.length <= 30 && tail.split(/\s+/).length <= 3) return tail;
  const first = (prova ?? "").split(/\s+-\s+/)[0]?.trim();
  if (first && first.length <= 30 && first.split(/\s+/).length <= 3 && /^[^a-zà-ú]*[A-ZÀ-Ú]/.test(first) && first === first.toUpperCase()) return first;
  const whole = (banca ?? "").trim();
  return whole && whole.length <= 60 && whole.split(/\s+/).length <= 6 ? whole : whole ? whole.split(/\s+/).slice(0, 6).join(" ") : null;
}

/** "IDECAN - PC SC - Agente de Polícia - 2026" -> "Agente de Polícia (PC SC)" (cargo + órgão, como o resto do importador espera). */
function granExam(prova: string, board: string): string {
  const parts = prova.split(/\s+-\s+/).map((x) => x.trim()).filter(Boolean);
  if (parts.length && fold(parts[0]!) === fold(board.replace(/\s*\(.*\)\s*$/, ""))) parts.shift();
  if (parts.length && /^(?:19|20)\d{2}$/.test(parts[parts.length - 1]!)) parts.pop();
  if (parts.length >= 2) return `${parts.slice(1).join(" - ")} (${parts[0]})`;
  return parts[0] ?? prova;
}

/**
 * Formato copiado do Gran Cursos: três linhas "Ano:", "Banca:" e "Prova:" (com links) antes do enunciado,
 * e alternativas com a letra sozinha na linha. Vira o cabeçalho "SIGLA — ano — cargo (órgão)".
 */
function convertGran(lines: string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (!GRAN_LABEL.test(lines[i]!)) { out.push(lines[i]!); continue; }
    const f: { ano?: string; banca?: string; prova?: string } = {};
    let j = i, last = i;
    while (j < lines.length) {
      const l = lines[j]!;
      if (!l.trim()) { j++; continue; }
      const m = l.match(GRAN_LABEL);
      if (!m) break;
      const k = m[1]!.toLowerCase() as keyof typeof f;
      if (f[k] !== undefined) break;
      let v = m[2]!;
      if (!v) {
        let n = j + 1;
        while (n < lines.length && !lines[n]!.trim()) n++;
        if (n < lines.length && !GRAN_LABEL.test(lines[n]!)) { v = lines[n]!.trim(); j = n; }
      }
      f[k] = v;
      last = j;
      j++;
    }
    const year = (f.ano ?? "").match(/\b((?:19|20)\d{2})\b/)?.[1] ?? (f.prova ?? "").match(/\b((?:19|20)\d{2})\s*$/)?.[1];
    const board = granBoard(f.banca, f.prova);
    if ((!f.banca && !f.prova) || !year || !board) { out.push(lines[i]!); continue; }
    const rest = f.prova ? granExam(f.prova, board) : "Concurso não informado";
    pushHeader(out, `${board} — ${year} — ${rest}`, []);
    i = last;
  }
  return out;
}

/** Coloca o cabeçalho e leva para depois dele a matéria/assunto/número que vinham antes (ficam no mesmo bloco da questão). */
function pushHeader(out: string[], header: string, extra: string[]): void {
  const moved: string[] = [];
  while (out.length) {
    const prev = out[out.length - 1]!;
    if (!prev.trim()) { out.pop(); continue; }
    if (FIELD_DISC.test(prev) || FIELD_TOPIC.test(prev) || /^\s*\d{1,5}\s*$/.test(prev) || GRAN_ID.test(prev)) { moved.unshift(out.pop()!); continue; }
    break;
  }
  out.push(header, ...extra, ...moved.filter((x) => !/^\s*\d{1,5}\s*$/.test(x) && !GRAN_ID.test(x)));
}

/**
 * Formatos copiados de outras fontes: TEC Concursos (links em markdown, "#id BANCA - ano - concurso",
 * Matéria/Assunto antes do cabeçalho, número da questão solto, alternativas "* A" com o texto na linha seguinte)
 * e Gran Cursos ("Ano:", "Banca:", "Prova:"). Converte para o formato que o analisador já entende,
 * sem alterar o conteúdo da questão.
 */
function preprocessTec(text: string): string {
  const t0 = granMateriaAssunto(text).replace(/\[([^\]]*)\]\((?:https?:\/\/|\/)[^)\s]*\)/g, "$1");
  const gran = /^\s*banca\s*:/im.test(t0) || /^\s*prova\s*:/im.test(t0);
  if (!gran && !/^\s*#\d{3,}\b/m.test(t0) && !/^\s*[*•-]\s*\(?[A-Ea-e]\)?\s*$/m.test(t0)) return t0;
  // "Assunto:" sozinho na linha, com o valor na linha de baixo.
  const t = t0.replace(/^([ \t]*(?:assuntos?|mat[ée]ria|disciplina|tema|t[óo]pico)[ \t]*:)[ \t]*\n[ \t]*(\S[^\n]*)$/gim, "$1 $2");
  let lines = t.split("\n");
  if (gran) {
    // Sem links (texto puro): as 1 ou 2 linhas entre o número "Q…" e o bloco Ano/Banca/Prova são matéria e assunto.
    // Sem isto, essas linhas viravam uma "questão" à parte (sem alternativas) antes da questão de verdade.
    for (let i = 0; i < lines.length; i++) {
      if (!GRAN_ID.test(lines[i]!)) continue;
      const between: number[] = [];
      let k = i + 1;
      for (; k < lines.length && between.length <= 3; k++) {
        if (!lines[k]!.trim() || NOISE.test(lines[k]!)) continue;
        if (GRAN_LABEL.test(lines[k]!)) break;
        between.push(k);
      }
      if (k >= lines.length || !GRAN_LABEL.test(lines[k]!) || between.length < 1 || between.length > 2) continue;
      if (between.some((x) => FIELD_DISC.test(lines[x]!) || FIELD_TOPIC.test(lines[x]!))) continue;
      // O selo de status do Gran ("Resolvida") às vezes cola no fim da linha do assunto.
      const semStatus = (l: string) => l.trim().replace(new RegExp(String.raw`\s+(?:${STATUS})\s*$`, "i"), "");
      for (let x = i + 1; x < k; x++) if (NOISE.test(lines[x]!)) lines[x] = "";
      lines[between[0]!] = semStatus(lines[between[0]!]!);
      if (between[1] !== undefined) lines[between[1]] = semStatus(lines[between[1]]!);
      lines[between[0]!] = `Matéria: ${lines[between[0]!]!.trim()}`;
      if (between[1] !== undefined) lines[between[1]] = `Assunto: ${lines[between[1]]!.trim()}`;
    }
    lines = convertGran(lines);
  }
  // Cabeçalho do TEC -> "BANCA — ano — resto"; leva Matéria/Assunto/número que vinham antes para depois dele.
  const out: string[] = [];
  for (const l of lines) {
    const h = l.match(/^\s*#\d{3,}\s+(.+?)\s+-\s+((?:19|20)\d{2})\s+-\s+(.+?)\s*$/);
    if (!h) { out.push(l); continue; }
    const rest = h[3]!.replace(/\s*\(e mais \d+ concursos?\)\s*$/i, "");
    pushHeader(out, `${h[1]} — ${h[2]} — ${rest}`, []);
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
  // Rede de segurança: sobra sem cabeçalho nem alternativas logo antes de uma questão com cabeçalho (ex.: linhas de
  // matéria/assunto soltas) não é questão. Vira matéria/assunto da seguinte, se ela ainda não tiver.
  for (let i = drafts.length - 2; i >= 0; i--) {
    const d = drafts[i]!;
    const next = drafts[i + 1]!;
    if (d.board || d.year || d.examLine || d.options.length || d.type !== "discursiva" || d.statement.length > 200 || !next.board) continue;
    const soltas = d.statement.split("\n").map((l) => l.trim().replace(new RegExp(String.raw`\s+(?:${STATUS})\s*$`, "i"), "")).filter((l) => l && !NOISE.test(l));
    if (!next.discipline && soltas[0]) {
      next.discipline = soltas[0];
      if (!next.topic && soltas[1]) next.topic = soltas[1];
      next.issues = next.issues.filter((x) => x !== "disciplina_pendente");
    }
    drafts.splice(i, 1);
  }
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


const COMMON_DISCIPLINES = [
  "Língua Portuguesa", "Português", "Raciocínio Lógico", "Raciocínio Lógico-Matemático", "Matemática", "Informática", "Noções de Informática",
  "Direito Constitucional", "Direito Administrativo", "Direito Penal", "Direito Processual Penal", "Direito Civil", "Direito Processual Civil",
  "Direito do Trabalho", "Direito Tributário", "Direito Previdenciário", "Direito Penal Militar", "Direitos Humanos", "Legislação Especial",
  "Legislação Penal Especial", "Legislação Institucional", "Criminologia", "Medicina Legal", "Atualidades", "Ética no Serviço Público", "Contabilidade",
  "Administração Pública", "Língua Inglesa", "Geografia", "História", "Conhecimentos Gerais", "Noções de Direito",
];

/**
 * O Gran copiado como texto puro junta matéria e assunto numa linha só ("Língua Portuguesa Análise sintática").
 * Se o começo da linha é o nome de uma matéria (das já cadastradas ou das comuns), o resto é o assunto.
 * Só age quando o assunto ainda não foi lido por outro caminho.
 */
export function splitDisciplineTopic(subjects: Array<{ name: string }>, discipline: string | null, topic: string | null): { discipline: string | null; topic: string | null } {
  if (!discipline || topic) return { discipline, topic };
  const words = discipline.trim().split(/\s+/);
  const names = [...subjects.map((x) => x.name), ...COMMON_DISCIPLINES];
  let best: { n: number } | null = null;
  for (const name of names) {
    const want = key(name);
    if (!want) continue;
    for (let n = 1; n < words.length; n++) {
      const got = key(words.slice(0, n).join(" "));
      if (got === want) { if (!best || n > best.n) best = { n }; break; }
      if (got.length > want.length) break;
    }
  }
  if (!best) return { discipline, topic };
  const rest = words.slice(best.n).join(" ").trim();
  if (rest.length < 3) return { discipline, topic };
  return { discipline: words.slice(0, best.n).join(" "), topic: rest };
}
