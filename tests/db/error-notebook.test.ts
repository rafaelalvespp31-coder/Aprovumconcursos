/**
 * Caderno de erros editável (error_notebook_entries): cada aluno só lê e escreve o próprio texto,
 * e só em cadernos dele; anônimo não acessa nada.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDb, type TestDb } from "./helpers";

const A = "00000000-0000-4000-8000-0000000000fa";
const B = "00000000-0000-4000-8000-0000000000fb";
let t: TestDb;
let nbA: string;
let nbB: string;
let q: string;

beforeAll(async () => {
  t = await createTestDb("error_notebook");
  if (!t.available) return;
  const { db } = t;
  for (const u of [A, B]) await db.query("insert into auth.users (id, email) values ($1, $2) on conflict do nothing", [u, `${u.slice(-2)}@t.dev`]);
  await db.query("insert into auth.users (id, email) values ('00000000-0000-4000-8000-0000000000fc', 'autor@t.dev') on conflict do nothing");
  const sid = (await db.query("select id from subjects order by slug limit 1")).rows[0].id;
  q = (await db.query("insert into bank_questions (subject_id, origin, question_type, statement, initial_difficulty, correct_answer_true, created_by) values ($1, 'autoral_humana', 'certo_errado', 'Enunciado fictício de teste.', 'dificil', true, '00000000-0000-4000-8000-0000000000fc') returning id", [sid])).rows[0].id;
  nbA = (await db.query("insert into question_notebooks (user_id, title) values ($1, 'Caderno A') returning id", [A])).rows[0].id;
  nbB = (await db.query("insert into question_notebooks (user_id, title) values ($1, 'Caderno B') returning id", [B])).rows[0].id;
  await db.query("insert into error_notebook_entries (user_id, notebook_id, question_id, content_html) values ($1, $2, $3, '<p>texto de B</p>')", [B, nbB, q]);
}, 60_000);
afterAll(async () => t?.close());

const itDb = (name: string, fn: () => Promise<void>) => it(name, async () => (t.available ? fn() : console.warn(`[db] PULADO: ${name} — ${t.reason}`)));

async function as<T>(role: "authenticated" | "anon", uid: string | null, fn: () => Promise<T>): Promise<T> {
  const { db } = t;
  await db.query("begin");
  try {
    if (uid) await db.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ sub: uid, role })]);
    await db.query(`set local role ${role}`);
    return await fn();
  } finally {
    await db.query("rollback");
  }
}

describe("error_notebook_entries (RLS)", () => {
  itDb("o dono grava, altera, lê e apaga o próprio texto no próprio caderno", async () => {
    await as("authenticated", A, async () => {
      await t.db.query("insert into error_notebook_entries (user_id, notebook_id, question_id, content_html) values ($1, $2, $3, '<p>meu</p>')", [A, nbA, q]);
      await t.db.query("update error_notebook_entries set content_html = '<p><b>editado</b></p>' where notebook_id = $1", [nbA]);
      const rows = (await t.db.query("select content_html from error_notebook_entries")).rows;
      expect(rows).toEqual([{ content_html: "<p><b>editado</b></p>" }]);
      await t.db.query("delete from error_notebook_entries where notebook_id = $1", [nbA]);
      expect((await t.db.query("select 1 from error_notebook_entries")).rows).toHaveLength(0);
    });
  });

  itDb("A não lê, não altera e não apaga o texto de B", async () => {
    await as("authenticated", A, async () => {
      expect((await t.db.query("select * from error_notebook_entries where user_id = $1", [B])).rows).toHaveLength(0);
      expect((await t.db.query("update error_notebook_entries set content_html = 'x' where user_id = $1", [B])).rowCount).toBe(0);
      expect((await t.db.query("delete from error_notebook_entries where user_id = $1", [B])).rowCount).toBe(0);
    });
    expect((await t.db.query("select content_html from error_notebook_entries where user_id = $1", [B])).rows[0].content_html).toBe("<p>texto de B</p>");
  });

  itDb("A não grava em nome de B nem no caderno de B", async () => {
    await expect(as("authenticated", A, () => t.db.query("insert into error_notebook_entries (user_id, notebook_id, question_id, content_html) values ($1, $2, $3, 'x')", [B, nbB, q]))).rejects.toThrow(/row-level security/);
    await expect(as("authenticated", A, () => t.db.query("insert into error_notebook_entries (user_id, notebook_id, question_id, content_html) values ($1, $2, $3, 'x')", [A, nbB, q]))).rejects.toThrow(/row-level security/);
  });

  itDb("anônimo não acessa", async () => {
    await expect(as("anon", null, () => t.db.query("select * from error_notebook_entries"))).rejects.toThrow(/permission denied/);
  });

  itDb("apagar o caderno apaga as anotações dele", async () => {
    await t.db.query("begin");
    try {
      await t.db.query("delete from question_notebooks where id = $1", [nbB]);
      expect((await t.db.query("select 1 from error_notebook_entries where notebook_id = $1", [nbB])).rows).toHaveLength(0);
    } finally {
      await t.db.query("rollback");
    }
  });
});
