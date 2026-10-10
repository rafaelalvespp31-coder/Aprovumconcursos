/**
 * Fluxo de persistência ponta a ponta no PostgreSQL, usando o motor de domínio real
 * e os mesmos payloads que o servidor envia ao Supabase.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import pg from "pg";
import { normalizeContent } from "@/domain/content/normalize";
import { extractStructure } from "@/domain/content/extract";
import { auditPlan } from "@/domain/content/audit";
import type { LessonPlan } from "@/domain/content/plan";
import { lessonPayload, nodesPayload, planPayload, rowsToNodes, NODE_COLUMNS } from "@/server/repos/payloads";
import { EDITAL_INLINE } from "../fixtures/samples";

const ADMIN_URL = process.env.TEST_DATABASE_URL ?? "postgres://postgres@localhost:54329/postgres?host=/tmp";
const DB = `na_persist_${process.pid}`;
const root = path.resolve(import.meta.dirname, "../..");
const U = "00000000-0000-4000-8000-0000000000c1";
const OTHER = "00000000-0000-4000-8000-0000000000c2";

let admin: pg.Client;
let db: pg.Client;
let available = true;
let reason = "";
let trailId = "";
let versionId = "";

const norm = normalizeContent(EDITAL_INLINE).normalized;
const ex = extractStructure(norm);

beforeAll(async () => {
  admin = new pg.Client({ connectionString: ADMIN_URL });
  try {
    await admin.connect();
  } catch (e) {
    available = false;
    reason = `PostgreSQL de teste indisponível (${(e as Error).message}).`;
    console.warn(`[db] ${reason} Testes PULADOS.`);
    return;
  }
  await admin.query(`drop database if exists ${DB}`);
  await admin.query(`create database ${DB}`);
  const url = new URL(ADMIN_URL);
  url.pathname = `/${DB}`;
  db = new pg.Client({ connectionString: url.toString() });
  await db.connect();
  await db.query(readFileSync(path.join(root, "tests/db/supabase-shim.sql"), "utf8"));
  const dir = path.join(root, "supabase/migrations");
  for (const f of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
    await db.query(readFileSync(path.join(dir, f), "utf8"));
  }
  await db.query("insert into auth.users (id) values ($1), ($2)", [U, OTHER]);
  trailId = (await db.query("insert into study_trails (user_id, title, board_slug, content_type) values ($1,'T','cebraspe','edital') returning id", [U])).rows[0].id;
  const doc = (await db.query("insert into source_documents (trail_id, user_id) values ($1,$2) returning id", [trailId, U])).rows[0].id;
  versionId = (await db.query(
    "insert into source_document_versions (document_id, user_id, version, original_text, normalized_text, char_count, sha256) values ($1,$2,1,$3,$4,$5,'h') returning id",
    [doc, U, EDITAL_INLINE, norm, norm.length],
  )).rows[0].id;
  // Executa as funções como o servidor (service_role).
  await db.query("set role service_role");
});

afterAll(async () => {
  if (!available) return;
  await db?.end();
  await admin.query(`drop database if exists ${DB}`);
  await admin.end();
});

const itDb = (name: string, fn: () => Promise<void>) =>
  it(name, async (ctx) => {
    if (!available) ctx.skip(reason);
    await fn();
  });

const required = ex.nodes.filter((n) => n.requiresDirectCoverage).map((n) => n.key);
const plan: LessonPlan = {
  modules: [{
    key: "C1-M1",
    title: "Português e Constitucional",
    lessons: [
      { key: "C1-L1", title: "Aula 1", objective: "Objetivo 1", nodeKeys: required.slice(0, 5), supplementary: [{ title: "Classes de palavras", justification: "Base necessária para entender coesão." }], prerequisiteLessonKeys: [], estimatedMinutes: 40 },
      { key: "C1-L2", title: "Aula 2", objective: "Objetivo 2", nodeKeys: required.slice(5), supplementary: [], prerequisiteLessonKeys: ["C1-L1"], estimatedMinutes: 40 },
    ],
  }],
};

describe("persistência do mapa e do plano", () => {
  itDb("grava e reconstrói o mapa de cobertura sem perdas", async () => {
    const r = await db.query("select replace_trail_nodes($1,$2,$3,$4) n", [trailId, U, versionId, JSON.stringify(nodesPayload(ex.nodes))]);
    expect(r.rows[0].n).toBe(ex.nodes.length);
    const rows = (await db.query(`select ${NODE_COLUMNS} from content_nodes where trail_id = $1`, [trailId])).rows;
    const back = rowsToNodes(rows);
    expect(back.map((n) => [n.key, n.parentKey, n.order, n.sourceText])).toEqual(
      ex.nodes.map((n) => [n.key, n.parentKey, n.order, n.sourceText]),
    );
    // Regravar é idempotente.
    await db.query("select replace_trail_nodes($1,$2,$3,$4)", [trailId, U, versionId, JSON.stringify(nodesPayload(ex.nodes))]);
    expect((await db.query("select count(*)::int c from content_nodes where trail_id = $1", [trailId])).rows[0].c).toBe(ex.nodes.length);
  });

  itDb("recusa gravar na trilha de outro usuário", async () => {
    await db.query("begin");
    const err = await db.query("select replace_trail_nodes($1,$2,$3,'[]')", [trailId, OTHER, versionId]).catch((e) => e);
    await db.query("rollback");
    expect(err.code).toBe("P0002");
  });

  itDb("grava plano, vínculos tópico↔aula, pré-requisitos e auditoria", async () => {
    const audit = auditPlan({ normalizedText: norm, nodes: ex.nodes, unassigned: ex.unassigned, plan });
    await db.query("select persist_trail_plan($1,$2,$3)", [trailId, U, JSON.stringify(planPayload({
      plan, audit, repairs: [], ambiguities: [], disciplineMode: "lingua_portuguesa",
      analysis: [{ key: required[0]!, relevance: "alta", prerequisiteKeys: [], needsExternalVerification: true }],
    }))]);
    const links = await db.query("select count(*)::int c from lesson_nodes ln join lessons l on l.id = ln.lesson_id where l.trail_id = $1", [trailId]);
    expect(links.rows[0].c).toBe(required.length);
    const pre = await db.query("select count(*)::int c from lesson_prerequisites");
    expect(pre.rows[0].c).toBe(1);
    const t = await db.query("select audit_report->'summary'->>'structurallyComplete' ok, discipline_mode from study_trails where id = $1", [trailId]);
    expect(t.rows[0]).toEqual({ ok: "true", discipline_mode: "lingua_portuguesa" });
    const v = await db.query("select verification_status from content_nodes where trail_id = $1 and key = $2", [trailId, required[0]]);
    expect(v.rows[0].verification_status).toBe("pendente");
  });

  itDb("cobertura: planejado ≠ ensinado; só conta ensinado após a aula gerada", async () => {
    const before = await db.query("select bool_and(planned) p, bool_or(taught) t from topic_coverage where trail_id = $1 and requires_direct_coverage", [trailId]);
    expect(before.rows[0]).toEqual({ p: true, t: false });

    const lesson = (await db.query("select id from lessons where trail_id = $1 and key = 'C1-L1'", [trailId])).rows[0].id;
    const keys = plan.modules[0]!.lessons[0]!.nodeKeys;
    await db.query("select save_lesson_content($1,$2,$3)", [lesson, U, JSON.stringify(lessonPayload({
      title: "Aula 1 — Compreensão de textos",
      objective: "x",
      sections: [
        { kind: "explicacao", title: "Explicação", bodyMarkdown: "Texto da aula.", nodeKeys: keys.slice(0, 3) },
        { kind: "doutrina", title: "Doutrina", bodyMarkdown: "Entendimento doutrinário.", nodeKeys: [keys[0]!] },
      ],
      taughtNodeKeys: keys.slice(0, 3),
      references: [{ kind: "texto_informado", citation: "Edital colado" }],
      unverifiedClaims: [],
      verificationPending: true,
    }, "pending_validation"))]);

    const cov = await db.query("select key, taught from topic_coverage where trail_id = $1 and key = any($2) order by key", [trailId, keys]);
    expect(cov.rows.filter((r) => r.taught).map((r) => r.key)).toEqual(keys.slice(0, 3));
    const l = await db.query("select status, verification_pending from lessons where id = $1", [lesson]);
    expect(l.rows[0]).toEqual({ status: "pending_validation", verification_pending: true });
    const s = await db.query("select kind, verification_status from lesson_sections where lesson_id = $1 order by sort_order", [lesson]);
    expect(s.rows.map((r) => r.verification_status)).toEqual(["nao_aplicavel", "pendente"]);
  });
});

describe("questões e correção", () => {
  let lesson = "";
  let mcq = "";
  let ce = "";

  itDb("grava questões originais e descarta tópico fora da aula", async () => {
    lesson = (await db.query("select id from lessons where trail_id = $1 and key = 'C1-L1'", [trailId])).rows[0].id;
    const keys = plan.modules[0]!.lessons[0]!.nodeKeys;
    const opts = (correct: number) => ["A", "B", "C", "D"].map((label, i) => ({ label, text: `Alt ${label}`, correct: i === correct, explanation: `Explica ${label}` }));
    const n = await db.query("select save_lesson_questions($1,$2,'CEBRASPE',$3) n", [lesson, U, JSON.stringify([
      { type: "multipla_escolha", statement: "Q1", options: opts(2), justification: "J1", nodeKey: keys[0], difficulty: 2, essential: true, dependsOnExternalSource: false },
      { type: "certo_errado", statement: "Q2", options: [], correctAnswerTrue: false, justification: "J2", nodeKey: keys[1], difficulty: 1, essential: false, dependsOnExternalSource: false },
      { type: "multipla_escolha", statement: "Fora", options: opts(0), justification: "J", nodeKey: required.at(-1), difficulty: 1, essential: false, dependsOnExternalSource: false },
    ])]);
    expect(n.rows[0].n).toBe(2);
    const qs = await db.query("select id, type, origin from questions where lesson_id = $1 and active order by statement", [lesson]);
    expect(qs.rows.every((r) => r.origin === "original")).toBe(true);
    mcq = qs.rows.find((r) => r.type === "multipla_escolha").id;
    ce = qs.rows.find((r) => r.type === "certo_errado").id;
  });

  itDb("corrige no banco e devolve explicações de todas as alternativas", async () => {
    const wrong = (await db.query("select id from question_options where question_id = $1 and label = 'A'", [mcq])).rows[0].id;
    const r1 = (await db.query("select submit_answer($1,$2,$3,null) r", [U, mcq, wrong])).rows[0].r;
    expect(r1.correct).toBe(false);
    expect(r1.options).toHaveLength(4);
    expect(r1.options.find((o: { isCorrect: boolean }) => o.isCorrect).label).toBe("C");

    const right = (await db.query("select id from question_options where question_id = $1 and label = 'C'", [mcq])).rows[0].id;
    expect((await db.query("select submit_answer($1,$2,$3,null) r", [U, mcq, right])).rows[0].r.correct).toBe(true);
    expect((await db.query("select submit_answer($1,$2,null,false) r", [U, ce])).rows[0].r.correct).toBe(true);
  });

  itDb("desempenho considera a última tentativa de cada questão", async () => {
    const o = (await db.query("select lesson_quiz_outcome($1,$2) o", [U, lesson])).rows[0].o;
    expect(o).toEqual({ answered: 2, correct: 2, essentialAnswered: 1, essentialCorrect: 1 });
  });

  itDb("rejeita alternativa de outra questão e questão de outro usuário", async () => {
    const optOfMcq = (await db.query("select id from question_options where question_id = $1 limit 1", [mcq])).rows[0].id;
    await db.query("begin");
    const e1 = await db.query("select submit_answer($1,$2,$3,null)", [U, ce, optOfMcq]).catch((e) => e);
    await db.query("rollback");
    expect(e1.code).toBe("22023");
    await db.query("begin");
    const e2 = await db.query("select submit_answer($1,$2,null,true)", [OTHER, ce]).catch((e) => e);
    await db.query("rollback");
    expect(e2.code).toBe("P0002");
  });
});
