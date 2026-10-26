import "server-only";
import { createHash } from "node:crypto";
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
  for (const name of path) {
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
        const ins = await db.from("subject_topics").insert({ subject_id: subjectId, parent_id: parent, slug, name: name.slice(0, 200) }).select("id").single();
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

export interface BankUploadResult {
  importId: string;
  created: number;
  skipped: number;
  codes: string[];
}

/** Cadastra as questões novas do arquivo (as já existentes são ignoradas). */
export async function importBankUpload(staff: BankStaff, text: string, file: { name: string; size: number; pdf: boolean }): Promise<BankUploadResult> {
  if (!staff.roles.autor) throw new UserFacingError("Somente autores cadastram questões.", "forbidden");
  const a = await analyze(text);
  if (a.summary.errors.length) throw new UserFacingError(a.summary.errors[0]!, "invalid_input");
  if (!a.parsed.questions.length) throw new UserFacingError("Nenhuma questão encontrada no arquivo.", "invalid_input");
  const db = createAdminClient();
  const sha = createHash("sha256").update(text).digest("hex");
  const imp = await db
    .from("question_imports")
    .insert({ created_by: staff.id, kind: file.pdf ? "pdf_prova" : "txt", file_name: file.name.slice(0, 300), file_sha256: sha, file_size: Math.max(1, Math.min(20_000_000, file.size)), status: "processando" })
    .select("id")
    .single();
  if (imp.error) throw new UserFacingError(`Não foi possível registrar o upload: ${imp.error.message}`, "db_rule");
  const importId = imp.data.id as string;

  const topicCache = new Map<string, string>();
  const examCache = new Map<string, { exam: string; source: string; board: string }>();
  const codes: string[] = [];
  let created = 0;
  let skipped = 0;
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
        usage_rights: real ? "nao_verificado" : "proprio",
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
  await db.from("question_imports").update({ status: "aguardando_conferencia", stats: { created, skipped, total: a.parsed.questions.length }, updated_at: new Date().toISOString() }).eq("id", importId);
  await auditLog(db, { actorId: staff.id, userId: null, action: "bank.questions_uploaded", entity: "question_imports", entityId: importId, meta: { created, skipped, fileName: file.name.slice(0, 200) } });
  return { importId, created, skipped, codes };
}
