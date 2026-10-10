import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import pg from "pg";

const ADMIN_URL = process.env.TEST_DATABASE_URL ?? "postgres://postgres@localhost:54329/postgres?host=/tmp";
const root = path.resolve(import.meta.dirname, "../..");

export interface TestDb {
  db: pg.Client;
  available: boolean;
  reason: string;
  close: () => Promise<void>;
}

/** Cria um banco temporário com o shim do Supabase + todas as migrações de produção. */
export async function createTestDb(name: string): Promise<TestDb> {
  const admin = new pg.Client({ connectionString: ADMIN_URL });
  try {
    await admin.connect();
  } catch (e) {
    const reason = `PostgreSQL de teste indisponível (${(e as Error).message}).`;
    console.warn(`[db] ${reason} Testes PULADOS.`);
    return { db: null as unknown as pg.Client, available: false, reason, close: async () => {} };
  }
  const dbName = `${name}_${process.pid}`;
  await admin.query(`drop database if exists ${dbName}`);
  await admin.query(`create database ${dbName}`);
  const url = new URL(ADMIN_URL);
  url.pathname = `/${dbName}`;
  const db = new pg.Client({ connectionString: url.toString() });
  await db.connect();
  await db.query(readFileSync(path.join(root, "tests/db/supabase-shim.sql"), "utf8"));
  const dir = path.join(root, "supabase/migrations");
  for (const f of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
    await db.query(readFileSync(path.join(dir, f), "utf8"));
  }
  return {
    db,
    available: true,
    reason: "",
    close: async () => {
      await db.end();
      await admin.query(`drop database if exists ${dbName}`);
      await admin.end();
    },
  };
}

export async function asUser<T>(db: pg.Client, uid: string, fn: (c: pg.Client) => Promise<T>): Promise<T> {
  await db.query("begin");
  try {
    await db.query("set local role authenticated");
    await db.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ sub: uid, role: "authenticated" })]);
    return await fn(db);
  } finally {
    await db.query("rollback");
  }
}

export async function errorCode(c: pg.Client, sql: string, params: unknown[] = []): Promise<string | null> {
  await c.query("savepoint s");
  try {
    await c.query(sql, params);
    await c.query("release savepoint s");
    return null;
  } catch (e) {
    await c.query("rollback to savepoint s");
    return (e as { code?: string }).code ?? "unknown";
  }
}

/** Cria usuário com trilha, aula e uma questão de múltipla escolha. */
export async function seedLesson(db: pg.Client, uid: string) {
  await db.query("insert into auth.users (id) values ($1) on conflict do nothing", [uid]);
  const t = (await db.query("insert into study_trails (user_id, title, board_slug, content_type, status) values ($1,'T','fgv','edital','active') returning id", [uid])).rows[0].id;
  const doc = (await db.query("insert into source_documents (trail_id, user_id) values ($1,$2) returning id", [t, uid])).rows[0].id;
  const ver = (await db.query("insert into source_document_versions (document_id, user_id, version, original_text, normalized_text, char_count, sha256) values ($1,$2,1,'x','x',1,'h') returning id", [doc, uid])).rows[0].id;
  const node = (await db.query("insert into content_nodes (trail_id, version_id, user_id, key, kind, title, source_text, span_start, span_end, depth, sort_order, path, requires_direct_coverage) values ($1,$2,$3,'N0001','topico','T','T',0,1,0,0,'1',true) returning id", [t, ver, uid])).rows[0].id;
  const mod = (await db.query("insert into learning_modules (trail_id, user_id, key, title, sort_order) values ($1,$2,'M1','M',0) returning id", [t, uid])).rows[0].id;
  const lesson = (await db.query("insert into lessons (trail_id, module_id, user_id, key, title, objective, sort_order, estimated_minutes, status) values ($1,$2,$3,'L1','Aula','Obj',0,30,'ready') returning id", [t, mod, uid])).rows[0].id;
  const q = (await db.query("insert into questions (lesson_id, node_id, user_id, type, statement, justification, difficulty) values ($1,$2,$3,'multipla_escolha','Enunciado','Justificativa',2) returning id", [lesson, node, uid])).rows[0].id;
  await db.query("insert into question_options (question_id, user_id, label, text, is_correct, explanation, sort_order) values ($1,$2,'A','Certa',true,'Porque sim',0), ($1,$2,'B','Errada',false,'Porque não',1)", [q, uid]);
  const right = (await db.query("select id from question_options where question_id = $1 and label = 'A'", [q])).rows[0].id;
  const wrong = (await db.query("select id from question_options where question_id = $1 and label = 'B'", [q])).rows[0].id;
  return { trail: t as string, lesson: lesson as string, question: q as string, right: right as string, wrong: wrong as string };
}
