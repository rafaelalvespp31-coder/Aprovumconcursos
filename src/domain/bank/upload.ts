/**
 * Upload de questões de concurso (PDF ou .txt) — leitura pura e determinística do MODELO DE QUESTÕES.
 *
 *   === PADRÃO ===        valores que valem para todas as questões (Matéria, Assunto, Banca, Ano…)
 *   === QUESTÕES ===
 *   --- QUESTÃO ---       (ou "QUESTÃO 12" sozinho na linha) campos da questão; qualquer campo do
 *                         PADRÃO pode ser repetido aqui para valer só nesta questão
 *   === GABARITO ===      (opcional) "1-B; 2-C" ou uma por linha, quando o gabarito vem no fim da prova
 *
 * Nada aqui grava no banco: o servidor resolve matéria/assunto/banca/concurso e salva como
 * "aguardando conferência".
 */
import { cleanPasted } from "@/domain/catalog/upload";
import { DIFFICULTIES, type Difficulty } from "./labels";

export interface ParsedBankQuestion {
  /** Posição no arquivo (1, 2, 3…) ou o "Número:" informado. */
  number: string;
  line: number;
  subject: string;
  topicPath: string[];
  board: string | null;
  year: number | null;
  exam: string | null;
  organ: string | null;
  role: string | null;
  difficulty: Difficulty;
  type: "multipla_escolha" | "certo_errado";
  caseContext: string | null;
  statement: string;
  options: Array<{ label: string; text: string; explanation: string | null }>;
  answer: string | null;
  justification: string | null;
  legalBasis: string | null;
}

export interface ParsedBankUpload {
  questions: ParsedBankQuestion[];
  errors: string[];
  warnings: string[];
}

const fold = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

const BLOCK = /^\s*={3,}\s*(.+?)\s*={0,}\s*$/;
const SEP = /^\s*(?:-{3,}\s*quest[ãa]o\b.*?-*\s*|quest[ãa]o\s+n?[º°.]?\s*(\d{1,4})\s*[:.-]?\s*)$/i;

type Fields = Record<string, string>;

const FIELD_KEYS: Record<string, string> = {
  materia: "materia",
  disciplina: "materia",
  assunto: "assunto",
  tema: "assunto",
  banca: "banca",
  ano: "ano",
  concurso: "concurso",
  prova: "concurso",
  orgao: "orgao",
  instituicao: "orgao",
  cargo: "cargo",
  numero: "numero",
  dificuldade: "dificuldade",
  tipo: "tipo",
  "texto de apoio": "apoio",
  "texto base": "apoio",
  texto: "apoio",
  enunciado: "enunciado",
  gabarito: "gabarito",
  resposta: "gabarito",
  justificativa: "justificativa",
  comentario: "justificativa",
  "comentario geral": "justificativa",
  "fundamento legal": "fundamento",
  fundamento: "fundamento",
};
const MULTILINE = new Set(["apoio", "enunciado", "justificativa", "fundamento"]);

function fieldOf(line: string): { key: string; value: string } | null {
  const m = line.match(/^\s*([A-Za-zÀ-ú ]{3,22}?)\s*:\s*(.*)$/);
  if (!m) return null;
  const key = FIELD_KEYS[fold(m[1]!)];
  return key ? { key, value: m[2]!.trim() } : null;
}

function difficultyOf(v: string | undefined): Difficulty | null {
  if (!v) return null;
  const f = fold(v).replace(/ /g, "_");
  if ((DIFFICULTIES as readonly string[]).includes(f)) return f as Difficulty;
  if (/extrem/.test(f)) return "extrema";
  if (/muito/.test(f)) return "muito_dificil";
  if (/dificil|alta|media|medio|facil|baixa/.test(f)) return "dificil";
  return null;
}

/** Lê o texto de questões. */
export function parseBankUpload(raw: string): ParsedBankUpload {
  const lines = cleanPasted(raw).split("\n");
  const errors: string[] = [];
  const warnings: string[] = [];
  const defaults: Fields = {};
  const blocks: Array<{ start: number; number: string | null; lines: Array<{ t: string; n: number }> }> = [];
  const answerKey = new Map<string, string>();
  let mode: "none" | "padrao" | "questoes" | "gabarito" = "none";
  let cur: (typeof blocks)[number] | null = null;
  let seenBlock = false;

  lines.forEach((line, i) => {
    const n = i + 1;
    if (/^\s*\/\//.test(line)) return;
    const b = line.match(BLOCK);
    if (b && !/^\s*-{3}/.test(line)) {
      const name = fold(b[1]!);
      seenBlock = true;
      cur = null;
      if (/^padr|^dados gerais|^cabecalho/.test(name)) mode = "padrao";
      else if (/^questo/.test(name)) mode = "questoes";
      else if (/^gabarito/.test(name)) mode = "gabarito";
      else {
        warnings.push(`Linha ${n}: bloco “${b[1]}” não reconhecido; ignorado.`);
        mode = "none";
      }
      return;
    }
    if (mode === "padrao") {
      const f = fieldOf(line);
      if (f && f.key !== "numero") defaults[f.key] = f.value;
      else if (line.trim()) warnings.push(`Linha ${n}: linha ignorada no bloco PADRÃO (use “Campo: valor”).`);
      return;
    }
    if (mode === "gabarito") {
      for (const m of line.matchAll(/(\d{1,4})\s*[-–).:=]?\s*(certo|errado|[A-Ea-e]|C|E)\b/gi)) answerKey.set(String(Number(m[1])), m[2]!);
      return;
    }
    if (mode === "questoes") {
      const s = line.match(SEP);
      if (s) {
        cur = { start: n, number: s[1] ? String(Number(s[1])) : null, lines: [] };
        blocks.push(cur);
        return;
      }
      if (cur) cur.lines.push({ t: line, n });
      else if (line.trim()) warnings.push(`Linha ${n}: texto antes da primeira questão foi ignorado (comece com --- QUESTÃO ---).`);
    }
  });
  if (!seenBlock) errors.push("Não encontrei os blocos do modelo (=== PADRÃO === e === QUESTÕES ===). Use o comando do ChatGPT desta página para organizar as questões.");
  if (seenBlock && !blocks.length) errors.push("Nenhuma questão encontrada: separe cada uma com --- QUESTÃO ---.");

  const questions: ParsedBankQuestion[] = [];
  blocks.forEach((blk, idx) => {
    const q = parseOne(blk.lines, { ...defaults }, blk.number ?? String(idx + 1), blk.start, answerKey, errors);
    if (q) questions.push(q);
  });
  const seen = new Map<string, number>();
  for (const q of questions) {
    const k = fold(q.statement);
    if (seen.has(k)) warnings.push(`Questão ${q.number}: enunciado igual ao da questão ${seen.get(k)} do mesmo texto; só a primeira será cadastrada.`);
    else seen.set(k, Number(q.number) || 0);
  }
  return { questions, errors, warnings };
}

function parseOne(
  lines: Array<{ t: string; n: number }>,
  fields: Fields,
  number: string,
  start: number,
  key: Map<string, string>,
  errors: string[],
): ParsedBankQuestion | null {
  const options: ParsedBankQuestion["options"] = [];
  let field: string | null = null;
  const multi: Record<string, string[]> = {};
  for (const { t } of lines) {
    const opt = t.match(/^\s*\(?([A-Ea-e])\s*[).]\s+(.+)$/);
    const f = fieldOf(t);
    const optComment = t.match(/^\s*coment[aá]rio\s*(?:[A-E])?\s*:\s*(.+)$/i);
    if (optComment && field === "opcao" && options.length) {
      options[options.length - 1]!.explanation = optComment[1]!.trim();
      field = "opcomment";
    } else if (f) {
      field = f.key;
      if (MULTILINE.has(f.key)) multi[f.key] = f.value ? [f.value] : [];
      else fields[f.key] = f.value;
    } else if (opt && field !== "justificativa" && field !== "fundamento" && field !== "apoio") {
      options.push({ label: opt[1]!.toUpperCase(), text: opt[2]!.trim(), explanation: null });
      field = "opcao";
    } else if (t.trim()) {
      if (field && MULTILINE.has(field)) multi[field]!.push(t.trimEnd());
      else if (field === "opcao") options[options.length - 1]!.text += ` ${t.trim()}`;
      else if (field === "opcomment") options[options.length - 1]!.explanation += ` ${t.trim()}`;
      else if (!field) {
        (multi.enunciado ??= []).push(t.trimEnd());
        field = "enunciado";
      }
    } else if (field && MULTILINE.has(field)) multi[field]!.push("");
  }
  const text = (k: string) => (multi[k] ?? []).join("\n").trim() || null;
  const declared = fields.numero?.match(/\d{1,4}/)?.[0];
  if (declared) number = String(Number(declared));
  const where = `Questão ${number} (linha ${start})`;
  const statement = text("enunciado") ?? "";
  const tipo = fold(fields.tipo ?? "");
  const type: ParsedBankQuestion["type"] = /certo|errado|c\/e/.test(tipo) || (!options.length && /^(c|e|certo|errado)$/.test(fold(fields.gabarito ?? key.get(number) ?? ""))) ? "certo_errado" : "multipla_escolha";
  const answerRaw = (fields.gabarito || key.get(number) || "").trim();
  const yearN = Number((fields.ano ?? "").match(/\d{4}/)?.[0] ?? NaN);
  const q: ParsedBankQuestion = {
    number,
    line: start,
    subject: (fields.materia ?? "").trim(),
    topicPath: (fields.assunto ?? "").split(/\s*(?:>|›|\/)\s*/).map((x) => x.trim()).filter(Boolean).slice(0, 4),
    board: fields.banca?.trim() || null,
    year: Number.isFinite(yearN) ? yearN : null,
    exam: fields.concurso?.trim() || null,
    organ: fields.orgao?.trim() || null,
    role: fields.cargo?.trim() || null,
    difficulty: difficultyOf(fields.dificuldade) ?? "dificil",
    type,
    caseContext: text("apoio"),
    statement,
    options: type === "certo_errado" ? [] : options,
    answer: null,
    justification: text("justificativa"),
    legalBasis: text("fundamento"),
  };
  let ok = true;
  const fail = (m: string) => {
    errors.push(`${where}: ${m}`);
    ok = false;
  };
  if (!q.subject) fail("informe a “Matéria:” (no PADRÃO ou na questão).");
  if (statement.length < 10) fail("enunciado vazio ou curto demais.");
  if (statement.length > 6000) fail("enunciado com mais de 6.000 caracteres.");
  if (fields.ano && !q.year) fail(`ano “${fields.ano}” inválido.`);
  if (fields.dificuldade && !difficultyOf(fields.dificuldade)) fail(`dificuldade “${fields.dificuldade}” não reconhecida (difícil, muito difícil ou extrema).`);
  if (type === "multipla_escolha") {
    const labels = q.options.map((o) => o.label);
    if (q.options.length < 2 || q.options.length > 5) fail("use de 2 a 5 alternativas (A) … E)).");
    else if (labels.some((l, i) => l !== "ABCDE"[i])) fail("as alternativas devem seguir a ordem A, B, C, D, E.");
    const a = answerRaw.toUpperCase().match(/^[A-E]\b/)?.[0] ?? null;
    if (!answerRaw) fail("falta o “Gabarito:” (ou o bloco === GABARITO ===).");
    else if (!a || !labels.includes(a)) fail(`gabarito “${answerRaw}” não corresponde a uma alternativa.`);
    else q.answer = a;
  } else {
    const a = fold(answerRaw);
    if (!/^(c|certo|e|errado)$/.test(a)) fail("“Gabarito:” deve ser Certo ou Errado.");
    else q.answer = a.startsWith("c") ? "certo" : "errado";
  }
  const hasExam = Boolean(q.board || q.year || q.exam);
  if (hasExam && !(q.board && q.year && q.exam)) fail("questão de prova precisa de Banca, Ano e Concurso juntos (ou nenhum deles, para questão autoral).");
  return ok ? q : null;
}

// ---------------------------------------------------------------------------
// Prévia (pura): o servidor informa as matérias/bancas cadastradas e quais enunciados já existem
// ---------------------------------------------------------------------------

export interface BankUploadPreview {
  ok: boolean;
  errors: string[];
  warnings: string[];
  total: number;
  duplicates: number;
  fresh: number;
  rows: Array<{ number: string; subject: string; topic: string; exam: string; type: string; answer: string; duplicate: boolean; snippet: string }>;
}

const key = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

export function matchByName<T extends { name: string; slug: string }>(list: readonly T[], name: string): T | null {
  const f = key(name);
  return list.find((x) => key(x.name) === f || key(x.slug) === f || key(x.name).split(" ")[0] === f) ?? null;
}

export function summarizeBankUpload(
  parsed: ParsedBankUpload,
  ctx: { subjects: ReadonlyArray<{ name: string; slug: string }>; boards: ReadonlyArray<{ name: string; slug: string }>; duplicate: readonly boolean[] },
): BankUploadPreview {
  const errors = [...parsed.errors];
  const warnings = [...parsed.warnings];
  for (const q of parsed.questions) {
    const s = ctx.subjects.find((x) => key(x.name) === key(q.subject) || key(x.slug) === key(q.subject));
    if (!s) errors.push(`Questão ${q.number}: a matéria “${q.subject}” não existe no banco. Use uma destas: ${ctx.subjects.map((x) => x.name).join(", ")}.`);
  }
  const newBoards = [...new Set(parsed.questions.filter((q) => q.board && !matchByName(ctx.boards, q.board)).map((q) => q.board!))];
  if (newBoards.length) warnings.push(`Banca(s) nova(s), serão cadastradas: ${newBoards.join(", ")}.`);
  const rows = parsed.questions.map((q, i) => ({
    number: q.number,
    subject: q.subject,
    topic: q.topicPath.join(" › ") || "—",
    exam: q.exam ? `${q.board} ${q.year} — ${q.exam}${q.organ ? ` (${q.organ})` : ""}` : "Autoral (equipe)",
    type: q.type === "certo_errado" ? "Certo/Errado" : `Múltipla (${q.options.length})`,
    answer: q.answer === "certo" ? "Certo" : q.answer === "errado" ? "Errado" : (q.answer ?? "—"),
    duplicate: Boolean(ctx.duplicate[i]),
    snippet: q.statement.replace(/\s+/g, " ").slice(0, 140),
  }));
  const duplicates = rows.filter((r) => r.duplicate).length;
  if (rows.length && duplicates === rows.length) warnings.push("Todas as questões deste texto já estão no banco; nada novo será cadastrado.");
  return { ok: errors.length === 0 && rows.length > 0 && duplicates < rows.length, errors, warnings, total: rows.length, duplicates, fresh: rows.length - duplicates, rows };
}
