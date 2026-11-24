import "server-only";
import { createHash } from "node:crypto";
import { z } from "zod";
import { KNOWN_BOARDS, parseSmart, resumirAssunto, type SmartDraft, type SmartParse } from "@/domain/bank/smart-import";
import { splitCommentByOption } from "@/domain/bank/option-notes";
import { matchByName, parseBankUpload, summarizeBankUpload, type BankUploadPreview, type ParsedBankQuestion } from "@/domain/bank/upload";
import { slugify } from "@/domain/bank/schema";
import { createAdminClient } from "../supabase";
import { auditLog } from "../observability";
import type { BankStaff } from "./bank";
import { UserFacingError } from "./trails";

/**
 * Upload de questões de concurso para o banco. Tudo entra como "aguardando conferência"
 * (nada chega ao aluno sem a conferência do administrador). Não grava URL nem endereço de
 * onde as questões foram obtidas: a fonte registrada é só a prova oficial (banca, ano, concurso).
 */

const fold = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/** Mesmo cálculo da coluna gerada bank_questions.content_hash. */
export function contentHash(statement: string): string {
  const norm = statement.replace(/^ +| +$/g, "").replace(/[ \t\n\r\f\v]+/g, " ").toLowerCase();
  return createHash("md5").update(norm).digest("hex");
}

interface Lookups {
  subjects: Array<{ id: string; slug: string; name: string }>;
  boards: Array<{ slug: string; name: string }>;
}

async function lookups(): Promise<Lookups> {
  const db = createAdminClient();
  const [s, b] = await Promise.all([db.from("subjects").select("id, slug, name"), db.from("exam_boards").select("slug, name")]);
  return { subjects: (s.data ?? []) as Lookups["subjects"], boards: (b.data ?? []) as Lookups["boards"] };
}

function findSubject(l: Lookups, name: string) {
  const f = fold(name);
  return l.subjects.find((s) => fold(s.name) === f || fold(s.slug) === f) ?? null;
}

const findBoard = (l: Lookups, name: string) => matchByName(l.boards, name);

export type { BankUploadPreview };

async function analyze(text: string) {
  const parsed = parseBankUpload(text);
  const l = await lookups();
  const hashes = parsed.questions.map((q) => contentHash(q.statement));
  const db = createAdminClient();
  const existing = new Map<string, string>();
  for (let i = 0; i < hashes.length; i += 200) {
    const { data } = await db.from("bank_questions").select("id, content_hash").in("content_hash", hashes.slice(i, i + 200));
    for (const r of data ?? []) existing.set(r.content_hash as string, r.id as string);
  }
  const seen = new Set<string>();
  const dup = hashes.map((h) => {
    const d = existing.has(h) || seen.has(h);
    seen.add(h);
    return d;
  });
  const summary = summarizeBankUpload(parsed, { subjects: l.subjects, boards: l.boards, duplicate: dup });
  return { parsed, l, summary, hashes, existing, dup };
}

export async function previewBankUpload(text: string): Promise<BankUploadPreview> {
  return (await analyze(text)).summary;
}

/** Garante o caminho de assuntos dentro da matéria ("Crimes contra a vida › Homicídio"). */
async function ensureTopic(subjectId: string, path: string[], cache: Map<string, string>): Promise<string | null> {
  const db = createAdminClient();
  let parent: string | null = null;
  for (const nome of path) {
    const name = resumirAssunto(nome);
    const slug = slugify(name);
    const key: string = `${subjectId}/${parent ?? ""}/${slug}`;
    let id: string | null = cache.get(key) ?? null;
    if (!id) {
      let q = db.from("subject_topics").select("id, name").eq("subject_id", subjectId);
      q = parent ? q.eq("parent_id", parent) : q.is("parent_id", null);
      const { data: rows } = await q;
      const hit = (rows ?? []).find((r) => fold(r.name as string) === fold(name)) ?? null;
      id = (hit?.id as string) ?? null;
      if (!id) {
        const ins = await db.from("subject_topics").insert({ subject_id: subjectId, parent_id: parent, slug, name }).select("id").single();
        if (ins.error) {
          // corrida/slug igual com nome diferente: reaproveita o existente
          let again = db.from("subject_topics").select("id").eq("subject_id", subjectId).eq("slug", slug);
          again = parent ? again.eq("parent_id", parent) : again.is("parent_id", null);
          const { data: ex } = await again.maybeSingle();
          if (!ex) throw new UserFacingError(`Não foi possível criar o assunto “${name}”: ${ins.error.message}`, "db_rule");
          id = ex.id as string;
        } else id = ins.data.id as string;
      }
      cache.set(key, id);
    }
    parent = id;
  }
  return parent;
}

async function ensureBoard(l: Lookups, name: string): Promise<string> {
  const hit = findBoard(l, name);
  if (hit) return hit.slug;
  const db = createAdminClient();
  const slug = slugify(name).replace(/-/g, "_").slice(0, 32) || "outra";
  const { error } = await db.from("exam_boards").insert({ slug, name: name.slice(0, 120), sort_order: 100 });
  if (error && error.code !== "23505") throw new UserFacingError(`Não foi possível cadastrar a banca “${name}”: ${error.message}`, "db_rule");
  l.boards.push({ slug, name });
  return slug;
}

async function ensureExamAndSource(staff: BankStaff, l: Lookups, q: ParsedBankQuestion, cache: Map<string, { exam: string; source: string; board: string }>) {
  const key = fold(`${q.board}|${q.year}|${q.exam}|${q.organ ?? ""}|${q.role ?? ""}`);
  const got = cache.get(key);
  if (got) return got;
  const db = createAdminClient();
  const board = await ensureBoard(l, q.board!);
  let examId: string | null = null;
  {
    let s = db.from("exams").select("id").eq("name", q.exam!).eq("board_slug", board).eq("year", q.year!);
    s = q.organ ? s.eq("organ", q.organ) : s;
    const { data } = await s.limit(1).maybeSingle();
    examId = (data?.id as string) ?? null;
  }
  if (!examId) {
    const ins = await db.from("exams").insert({ name: q.exam!.slice(0, 200), organ: q.organ, role_name: q.role, board_slug: board, year: q.year, created_by: staff.id }).select("id").single();
    if (ins.error) throw new UserFacingError(`Não foi possível cadastrar o concurso “${q.exam}”: ${ins.error.message}`, "db_rule");
    examId = ins.data.id as string;
  }
  const boardName = l.boards.find((b) => b.slug === board)?.name ?? q.board!;
  const sourceName = `Prova ${boardName} ${q.year} — ${q.exam}${q.organ ? ` (${q.organ})` : ""}`.slice(0, 300);
  let sourceId: string | null = null;
  {
    const { data } = await db.from("question_sources").select("id").eq("name", sourceName).eq("kind", "prova_oficial").limit(1).maybeSingle();
    sourceId = (data?.id as string) ?? null;
  }
  if (!sourceId) {
    const ins = await db.from("question_sources").insert({ name: sourceName, kind: "prova_oficial", author_institution: boardName.slice(0, 300), created_by: staff.id }).select("id").single();
    if (ins.error) throw new UserFacingError(`Não foi possível registrar a prova “${sourceName}”: ${ins.error.message}`, "db_rule");
    sourceId = ins.data.id as string;
  }
  const out = { exam: examId, source: sourceId, board };
  cache.set(key, out);
  return out;
}

/** Registra na prova de origem que o administrador autorizou o uso ao catalogar (sem link nem endereço). */
async function authorizeSource(staff: BankStaff, sourceId: string) {
  const db = createAdminClient();
  const { data: cur } = await db.from("question_sources").select("legal_notes, reuse_verified").eq("id", sourceId).maybeSingle();
  if (!cur || cur.reuse_verified) return;
  const stamp = `[${new Date().toISOString().slice(0, 10)}] Uso autorizado pelo administrador ao catalogar as questões por texto.`;
  const { error } = await db
    .from("question_sources")
    .update({ reuse_verified: true, reuse_verified_by: staff.id, reuse_verified_at: new Date().toISOString(), legal_notes: [cur.legal_notes, stamp].filter(Boolean).join("\n").slice(-4000), updated_at: new Date().toISOString() })
    .eq("id", sourceId);
  if (error) throw new UserFacingError(`Não foi possível registrar a autorização da prova: ${error.message}`, "db_rule");
}

export interface BankUploadResult {
  importId: string;
  created: number;
  skipped: number;
  /** Publicadas direto (administrador, com justificativa). */
  published: number;
  codes: string[];
}

/** Cadastra as questões novas do arquivo (as já existentes são ignoradas). */
export async function importBankUpload(staff: BankStaff, text: string, file: { name: string; size: number }): Promise<BankUploadResult> {
  if (!staff.roles.autor) throw new UserFacingError("Somente autores cadastram questões.", "forbidden");
  const a = await analyze(text);
  if (a.summary.errors.length) throw new UserFacingError(a.summary.errors[0]!, "invalid_input");
  if (!a.parsed.questions.length) throw new UserFacingError("Nenhuma questão encontrada no texto.", "invalid_input");
  const db = createAdminClient();
  const sha = createHash("sha256").update(text).digest("hex");
  const imp = await db
    .from("question_imports")
    .insert({ created_by: staff.id, kind: "txt", file_name: file.name.slice(0, 300), file_sha256: sha, file_size: Math.max(1, Math.min(20_000_000, file.size)), status: "processando" })
    .select("id")
    .single();
  if (imp.error) throw new UserFacingError(`Não foi possível registrar o upload: ${imp.error.message}`, "db_rule");
  const importId = imp.data.id as string;

  const topicCache = new Map<string, string>();
  const examCache = new Map<string, { exam: string; source: string; board: string }>();
  const codes: string[] = [];
  let created = 0;
  let skipped = 0;
  let published = 0;
  // Administrador publica direto: sem conferência, revisão ou aprovação separadas.
  const quick = staff.roles.admin;
  const verifiedSources = new Set<string>();
  const items: Array<Record<string, unknown>> = [];
  try {
    for (let i = 0; i < a.parsed.questions.length; i++) {
      const q = a.parsed.questions[i]!;
      const parsed = { ...q, options: q.options.map((o) => ({ ...o, correct: o.label === q.answer })) };
      if (a.dup[i]) {
        skipped++;
        items.push({ import_id: importId, item_number: i + 1, parsed, issues: ["duplicada"], duplicate_of: a.existing.get(a.hashes[i]!) ?? null, similarity: 1, decision: "rejeitado", decided_by: staff.id, decided_at: new Date().toISOString() });
        continue;
      }
      const subject = findSubject(a.l, q.subject)!;
      const topicId = q.topicPath.length ? await ensureTopic(subject.id, q.topicPath, topicCache) : null;
      const real = Boolean(q.exam);
      const ex = real ? await ensureExamAndSource(staff, a.l, q, examCache) : null;
      if (ex && quick && !verifiedSources.has(ex.source)) {
        await authorizeSource(staff, ex.source);
        verifiedSources.add(ex.source);
      }
      const payload = {
        subject_id: subject.id,
        topic_id: topicId ?? "",
        source_id: ex?.source ?? "",
        exam_id: ex?.exam ?? "",
        origin: real ? "prova_anterior" : "autoral_humana",
        question_type: q.type,
        statement: q.statement,
        case_context: q.caseContext ?? "",
        board_slug: ex?.board ?? "",
        board_style: "",
        year: real && q.year ? String(q.year) : "",
        original_number: real ? q.number.slice(0, 20) : "",
        initial_difficulty: q.difficulty,
        correct_answer_true: q.type === "certo_errado" ? q.answer === "certo" : null,
        justification: q.justification ?? "",
        legal_basis: q.legalBasis ?? "",
        // Administrador: catalogar já é a decisão de uso (registrada na fonte); demais autores seguem para conferência.
        usage_rights: real ? (quick ? "autorizado" : "nao_verificado") : "proprio",
        verified_at: "",
        status: "aguardando_conferencia",
        generation_batch_id: "",
        options: q.type === "multipla_escolha" ? q.options.map((o) => ({ label: o.label, text: o.text, is_correct: o.label === q.answer, explanation: o.explanation ?? "" })) : [],
        legal_refs: [],
      };
      const { data, error } = await db.rpc("bank_save_question", { p_actor: staff.id, p_id: null, p: payload });
      if (error) throw new UserFacingError(`Questão ${q.number}: ${error.message.replace(/^.*?ERROR:\s*/, "")}`, "db_rule");
      const qid = data as string;
      created++;
      if (quick) {
        const pub = await db.rpc("bank_quick_publish", { p_actor: staff.id, p_id: qid });
        if (pub.error) throw new UserFacingError(`Questão ${q.number}: cadastrada, mas não publicada (${pub.error.message.replace(/^.*?ERROR:\s*/, "")}).`, "db_rule");
        if (pub.data === "publicada") published++;
      }
      items.push({ import_id: importId, item_number: i + 1, parsed, issues: [], question_id: qid, decision: "aceito", decided_by: staff.id, decided_at: new Date().toISOString() });
    }
  } catch (e) {
    if (items.length) await db.from("question_import_items").insert(items);
    await db.from("question_imports").update({ status: "falhou", error: (e as Error).message.slice(0, 2000), stats: { created, skipped }, updated_at: new Date().toISOString() }).eq("id", importId);
    throw e;
  }
  if (items.length) await db.from("question_import_items").insert(items);
  const ids = items.map((x) => x.question_id).filter(Boolean) as string[];
  if (ids.length) {
    const { data } = await db.from("bank_questions").select("public_code").in("id", ids).order("public_code");
    codes.push(...(data ?? []).map((r) => r.public_code as string));
  }
  await db
    .from("question_imports")
    .update({ status: published === created ? "concluido" : "aguardando_conferencia", stats: { created, skipped, published, total: a.parsed.questions.length }, updated_at: new Date().toISOString() })
    .eq("id", importId);
  await auditLog(db, { actorId: staff.id, userId: null, action: "bank.questions_uploaded", entity: "question_imports", entityId: importId, meta: { created, skipped, fileName: file.name.slice(0, 200) } });
  return { importId, created, skipped, published, codes };
}

// ---------------------------------------------------------------------------
// Importador inteligente (colar texto de uma fonte → revisar → escolher a pasta → importar)
// ---------------------------------------------------------------------------

export type DuplicateState = "inedita" | "ja_cadastrada" | "repetida_no_lote";

export interface SmartAnalysis {
  drafts: Array<SmartDraft & { duplicate: DuplicateState; duplicateCode: string | null; suggestedSubjectId: string | null }>;
  baseTexts: SmartParse["baseTexts"];
}

/** Lê o texto colado e confere duplicidades no banco inteiro. Não grava nada. */
export async function smartAnalyze(staff: BankStaff, text: string): Promise<SmartAnalysis> {
  if (!staff.roles.autor) throw new UserFacingError("Somente autores cadastram questões.", "forbidden");
  const parsed = parseSmart(text);
  if (!parsed.drafts.length) throw new UserFacingError("Não encontrei nenhuma questão no texto colado.", "invalid_input");
  const db = createAdminClient();
  const l = await lookups();
  const hashes = parsed.drafts.map((d) => contentHash(d.statement));
  const existing = new Map<string, string>();
  for (let i = 0; i < hashes.length; i += 200) {
    const { data } = await db.from("bank_questions").select("content_hash, public_code").in("content_hash", hashes.slice(i, i + 200));
    for (const r of data ?? []) existing.set(r.content_hash as string, (r.public_code as string) ?? "");
  }
  const seen = new Set<string>();
  const drafts = parsed.drafts.map((d, i) => {
    const h = hashes[i]!;
    let duplicate: DuplicateState = "inedita";
    if (existing.has(h)) duplicate = "ja_cadastrada";
    else if (seen.has(h)) duplicate = "repetida_no_lote";
    seen.add(h);
    // Banca já cadastrada no banco (inclusive as confirmadas antes) deixa de ser "desconhecida".
    const inDb = Boolean(d.board && findBoard(l, d.board));
    return { ...d, boardKnown: d.boardKnown || inDb, issues: inDb ? d.issues.filter((x) => x !== "banca_desconhecida") : d.issues, duplicate, duplicateCode: existing.get(h) || null, suggestedSubjectId: d.discipline ? (findSubject(l, d.discipline)?.id ?? null) : null };
  });
  return { drafts, baseTexts: parsed.baseTexts };
}

const optionZ = z.object({ label: z.string().regex(/^[A-E]$/), text: z.string().min(1).max(10000) });
export const smartItemSchema = z.object({
  key: z.string().max(20),
  type: z.enum(["multipla_escolha", "certo_errado", "discursiva"]),
  board: z.string().trim().max(120).nullable(),
  year: z.number().int().min(1950).max(2100).nullable(),
  examLine: z.string().trim().max(300).nullable(),
  organ: z.string().trim().max(200).nullable(),
  role: z.string().trim().max(200).nullable(),
  baseTextCode: z.string().trim().max(60).nullable(),
  baseText: z.string().max(60000).nullable(),
  statement: z.string().trim().min(10).max(20000),
  options: z.array(optionZ).max(5),
  answer: z.string().max(10).nullable(),
  answerSource: z.enum(["oficial", "administrador"]).nullable(),
  comment: z.string().max(20000).nullable(),
  raw: z.string().max(80000),
  subjectId: z.string().uuid().nullable(),
  topicId: z.string().uuid().nullable(),
  newTopicName: z.string().trim().min(2).max(200).nullable().optional(),
  confirmBoard: z.boolean(),
  allowDuplicate: z.boolean(),
  duplicate: z.enum(["inedita", "ja_cadastrada", "repetida_no_lote"]),
});
export type SmartItemInput = z.infer<typeof smartItemSchema>;

export interface SmartItemResult {
  key: string;
  status: "importada" | "publicada" | "ignorada" | "erro";
  code: string | null;
  message: string;
}

export interface SmartImportResult {
  importId: string;
  results: SmartItemResult[];
  imported: number;
  published: number;
  ignored: number;
  errors: number;
}

async function ensureBaseText(db: ReturnType<typeof createAdminClient>, staffId: string, code: string, body: string): Promise<string> {
  const { data: hit } = await db.from("bank_base_texts").select("id, body_hash").eq("code", code).limit(50);
  const want = createHash("md5").update(body.trim()).digest("hex");
  const found = (hit ?? []).find((r) => r.body_hash === want);
  if (found) return found.id as string;
  const ins = await db.from("bank_base_texts").insert({ code, body: body.trim(), created_by: staffId }).select("id").single();
  if (ins.error) throw new UserFacingError(`Não foi possível salvar o texto-base ${code}: ${ins.error.message}`, "db_rule");
  return ins.data.id as string;
}

/** Salva as questões revisadas na pasta escolhida. Cada questão tem resultado próprio; uma falha não desfaz as outras. */
export async function smartImport(staff: BankStaff, items: SmartItemInput[], dest: { subjectId: string; topicId: string | null }, origem: string): Promise<SmartImportResult> {
  const topicCache = new Map<string, string>();
  if (!staff.roles.autor) throw new UserFacingError("Somente autores cadastram questões.", "forbidden");
  if (!items.length) throw new UserFacingError("Nenhuma questão selecionada.", "invalid_input");
  const db = createAdminClient();
  const l = await lookups();
  const checkDest = async (subjectId: string, topicId: string | null) => {
    if (!l.subjects.some((s) => s.id === subjectId)) throw new UserFacingError("Matéria de destino inválida.", "invalid_input");
    if (topicId) {
      const { data } = await db.from("subject_topics").select("id").eq("id", topicId).eq("subject_id", subjectId).maybeSingle();
      if (!data) throw new UserFacingError("O assunto escolhido não pertence à matéria de destino.", "invalid_input");
    }
  };
  await checkDest(dest.subjectId, dest.topicId);
  const sha = createHash("sha256").update(JSON.stringify(items.map((i) => i.raw))).digest("hex");
  const imp = await db
    .from("question_imports")
    .insert({ created_by: staff.id, kind: "txt", file_name: "importador-inteligente", file_sha256: sha, file_size: Math.max(1, Math.min(20_000_000, new TextEncoder().encode(items.map((i) => i.raw).join("\n")).length)), status: "processando" })
    .select("id")
    .single();
  if (imp.error) throw new UserFacingError(`Não foi possível registrar a importação: ${imp.error.message}`, "db_rule");
  const importId = imp.data.id as string;

  const examCache = new Map<string, { exam: string; source: string; board: string }>();
  const verified = new Set<string>();
  const quick = staff.roles.admin;
  const results: SmartItemResult[] = [];
  const auditItems: Array<Record<string, unknown>> = [];

  for (let i = 0; i < items.length; i++) {
    const it = items[i]!;
    const done = (r: Omit<SmartItemResult, "key">, qid: string | null = null) => {
      results.push({ key: it.key, ...r });
      auditItems.push({ import_id: importId, item_number: i + 1, parsed: { ...it, destino: dest, resultado: r }, issues: r.status === "erro" ? [r.message] : [], question_id: qid, decision: r.status === "erro" || r.status === "ignorada" ? "rejeitado" : "aceito", decided_by: staff.id, decided_at: new Date().toISOString() });
    };
    try {
      if (it.duplicate !== "inedita" && !it.allowDuplicate) { done({ status: "ignorada", code: null, message: "Possível duplicidade: não importada (você pode liberar a importação na revisão)." }); continue; }
      if (it.type === "discursiva") { done({ status: "erro", code: null, message: "Questão sem alternativas: o banco só aceita múltipla escolha ou certo/errado. Cadastre manualmente." }); continue; }
      if (!it.board || !it.year || !it.examLine) { done({ status: "erro", code: null, message: "Informe banca, ano e concurso (a prova de origem é obrigatória)." }); continue; }
      const boardKnown = Boolean(matchByName(l.boards, it.board)) || KNOWN_BOARDS.some((b) => fold(b) === fold(it.board!.replace(/\s*\(.*\)\s*$/, "")) || fold(b) === fold(it.board!));
      if (!boardKnown && !it.confirmBoard) { done({ status: "erro", code: null, message: `Banca “${it.board}” desconhecida: confirme o nome na revisão.` }); continue; }
      const notes0 = it.type === "multipla_escolha" ? splitCommentByOption(it.comment) : null;
      const answer = it.answer ?? (notes0?.answer && it.options.some((o) => o.label === notes0.answer) ? notes0.answer : null);
      if (it.type === "multipla_escolha") {
        if (it.options.length < 2 || it.options.length > 5) { done({ status: "erro", code: null, message: "Múltipla escolha precisa de 2 a 5 alternativas." }); continue; }
        if (answer && !it.options.some((o) => o.label === answer)) { done({ status: "erro", code: null, message: "O gabarito não corresponde a nenhuma alternativa." }); continue; }
      } else if (it.answer !== "certo" && it.answer !== "errado") {
        done({ status: "erro", code: null, message: "Informe o gabarito (Certo ou Errado): o banco exige para esse tipo de questão." });
        continue;
      }
      const subjectId = it.subjectId ?? dest.subjectId;
      let topicId = it.subjectId ? it.topicId : (it.topicId ?? dest.topicId);
      if (it.subjectId) await checkDest(it.subjectId, it.topicId);
      // Assunto lido do texto que ainda não existe na matéria: cria (ou reaproveita) só quando o administrador deixou marcado.
      if (!topicId && it.newTopicName) topicId = await ensureTopic(subjectId, [it.newTopicName], topicCache);
      const fake: ParsedBankQuestion = { number: String(i + 1), line: 0, subject: "", topicPath: [], board: it.board, year: it.year, exam: it.examLine, organ: it.organ, role: it.role, difficulty: "dificil", type: it.type, caseContext: null, statement: it.statement, options: [], answer: null, justification: null, legalBasis: null };
      const ex = await ensureExamAndSource(staff, l, fake, examCache);
      if (quick && !verified.has(ex.source)) { await authorizeSource(staff, ex.source); verified.add(ex.source); }
      const baseId = it.baseTextCode && it.baseText ? await ensureBaseText(db, staff.id, it.baseTextCode, it.baseText) : null;
      const caseContext = it.baseText && it.baseText.length <= 20000 ? it.baseText : "";
      // Comentário com uma explicação por alternativa: cada trecho vai para a alternativa certa; o resto é o comentário geral.
      const notes = notes0;
      const generalComment = notes ? (notes.rest.length >= 10 ? notes.rest : (it.comment ?? "")) : (it.comment ?? "");
      const payload = {
        subject_id: subjectId, topic_id: topicId ?? "", source_id: ex.source, exam_id: ex.exam, origin: "prova_anterior", question_type: it.type,
        statement: it.statement, case_context: caseContext, board_slug: ex.board, board_style: "", year: String(it.year), original_number: "",
        initial_difficulty: "dificil", correct_answer_true: it.type === "certo_errado" ? it.answer === "certo" : null,
        justification: generalComment, legal_basis: "", usage_rights: quick ? "autorizado" : "nao_verificado", verified_at: "", status: "aguardando_conferencia",
        generation_batch_id: "", options: it.type === "multipla_escolha" ? it.options.map((o) => ({ label: o.label, text: o.text, is_correct: o.label === answer, explanation: notes?.byLabel[o.label] ?? "" })) : [], legal_refs: [],
      };
      const { data, error } = await db.rpc("bank_save_question", { p_actor: staff.id, p_id: null, p: payload });
      if (error) { done({ status: "erro", code: null, message: error.message.replace(/^.*?ERROR:\s*/, "") }); continue; }
      const qid = data as string;
      if (baseId) await db.from("bank_questions").update({ base_text_id: baseId }).eq("id", qid);
      const { data: row } = await db.from("bank_questions").select("public_code").eq("id", qid).maybeSingle();
      const code = (row?.public_code as string) ?? null;
      let status: SmartItemResult["status"] = "importada";
      let message = answer ? "Importada (aguardando conferência)." : "Importada sem gabarito (aguardando conferência).";
      if (quick && answer) {
        const pub = await db.rpc("bank_quick_publish", { p_actor: staff.id, p_id: qid });
        if (!pub.error && pub.data === "publicada") { status = "publicada"; message = "Importada e publicada."; }
        else if (!it.comment || it.comment.trim().length < 10) message = "Importada. Para publicar, falta o comentário/justificativa (mín. 10 caracteres).";
      }
      done({ status, code, message }, qid);
    } catch (e) {
      done({ status: "erro", code: null, message: e instanceof Error ? e.message.slice(0, 300) : "Erro inesperado." });
    }
  }
  if (auditItems.length) await db.from("question_import_items").insert(auditItems);
  const count = (s: SmartItemResult["status"]) => results.filter((r) => r.status === s).length;
  const published = count("publicada");
  const imported = count("importada") + published;
  const ignored = count("ignorada");
  const errors = count("erro");
  await db.from("question_imports").update({ status: errors === items.length ? "falhou" : "concluido", stats: { origem: origem.slice(0, 200), total: items.length, importadas: imported, publicadas: published, ignoradas: ignored, erros: errors, destino: dest }, error: errors ? `${errors} questão(ões) com erro` : null, updated_at: new Date().toISOString() }).eq("id", importId);
  await auditLog(db, { actorId: staff.id, userId: null, action: "bank.smart_import", entity: "question_imports", entityId: importId, meta: { total: items.length, imported, ignored, errors } });
  return { importId, results, imported, published, ignored, errors };
}

export interface SmartHistoryRow {
  id: string;
  createdAt: string;
  by: string;
  status: string;
  stats: Record<string, unknown>;
  destino: string;
}

/** Últimas importações feitas por esta ferramenta. */
export async function smartHistory(staff: BankStaff): Promise<SmartHistoryRow[]> {
  if (!staff.roles.autor) return [];
  const db = createAdminClient();
  const { data } = await db.from("question_imports").select("id, created_at, created_by, status, stats").eq("file_name", "importador-inteligente").order("created_at", { ascending: false }).limit(30);
  const rows = data ?? [];
  const subjectIds = [...new Set(rows.map((r) => (r.stats as { destino?: { subjectId?: string } })?.destino?.subjectId).filter(Boolean) as string[])];
  const names = new Map<string, string>();
  if (subjectIds.length) {
    const { data: s } = await db.from("subjects").select("id, name").in("id", subjectIds);
    for (const x of s ?? []) names.set(x.id as string, x.name as string);
  }
  const users = new Map<string, string>();
  for (const id of new Set(rows.map((r) => r.created_by as string))) {
    const { data: u } = await db.auth.admin.getUserById(id);
    users.set(id, u?.user?.email ?? id.slice(0, 8));
  }
  return rows.map((r) => ({ id: r.id as string, createdAt: r.created_at as string, by: users.get(r.created_by as string) ?? "", status: r.status as string, stats: (r.stats ?? {}) as Record<string, unknown>, destino: names.get((r.stats as { destino?: { subjectId?: string } })?.destino?.subjectId ?? "") ?? "—" }));
}

export interface DestinoTree {
  subjects: Array<{ id: string; name: string; topics: Array<{ id: string; name: string; parentId: string | null }> }>;
}

/** Pastas existentes (matérias e assuntos) para o administrador escolher o destino. */
export async function loadDestinos(): Promise<DestinoTree> {
  const db = createAdminClient();
  const [s, t] = await Promise.all([
    db.from("subjects").select("id, name").eq("status", "ativa").order("sort_order").order("name"),
    db.from("subject_topics").select("id, subject_id, parent_id, name").eq("status", "ativo").order("sort_order").order("name").limit(5000),
  ]);
  return {
    subjects: (s.data ?? []).map((x) => ({
      id: x.id as string,
      name: x.name as string,
      topics: (t.data ?? []).filter((y) => y.subject_id === x.id).map((y) => ({ id: y.id as string, name: y.name as string, parentId: (y.parent_id as string) ?? null })),
    })),
  };
}

/** Grava na hora uma banca confirmada pelo administrador, para não pedir a confirmação de novo. */
export async function saveBoard(staff: BankStaff, name: string): Promise<void> {
  if (!staff.roles.autor) throw new UserFacingError("Somente autores cadastram bancas.", "forbidden");
  const n = z.string().trim().min(2).max(120).parse(name);
  await ensureBoard(await lookups(), n);
}
