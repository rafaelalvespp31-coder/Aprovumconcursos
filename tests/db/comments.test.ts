/**
 * Comentários dos alunos nas questões: visíveis para quem respondeu a mesma questão,
 * escritos só por funções, sem expor e-mail/id, com exclusão pelo autor e ocultação por denúncias.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type pg from "pg";
import { createTestDb, errorCode, seedLesson, type TestDb } from "./helpers";

const U = ["a", "b", "c", "d", "e"].map((x) => `00000000-0000-4000-8000-0000000000c${x}`);
let t: TestDb;
const seeds: Array<Awaited<ReturnType<typeof seedLesson>>> = [];

beforeAll(async () => {
  t = await createTestDb("comments");
  if (!t.available) return;
  for (const [i, uid] of U.entries()) {
    seeds.push(await seedLesson(t.db, uid));
    await t.db.query("update profiles set display_name = $2 where id = $1", [uid, ["Ana Souza", "Bruno Lima", "Carla", "Davi Reis", "Eva Melo"][i]]);
  }
}, 60_000);
afterAll(async () => t?.close());

const itDb = (name: string, fn: () => Promise<void>) => it(name, async () => (t.available ? fn() : console.warn(`[db] PULADO: ${name} — ${t.reason}`)));
const answer = (db: pg.Client, i: number) =>
  db.query("insert into answer_attempts (question_id, user_id, selected_option_id, is_correct, context) values ($1,$2,$3,true,'fixacao')", [seeds[i]!.question, U[i], seeds[i]!.right]);

describe("comentários nas questões", () => {
  itDb("só quem respondeu lê e escreve; todos que responderam a mesma questão veem", async () => {
    const { db } = t;
    await db.query("begin");
    try {
      await db.query("savepoint x");
      // Sem responder: bloqueado.
      await db.query("set local role authenticated");
      await db.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ sub: U[0], role: "authenticated" })]);
      expect(await errorCode(db, "select * from list_question_comments($1)", [seeds[0]!.question])).toBe("42501");
      expect(await errorCode(db, "select add_question_comment($1, 'Oi')", [seeds[0]!.question])).toBe("42501");
      // Questão de outro aluno: não encontrada.
      expect(await errorCode(db, "select * from list_question_comments($1)", [seeds[1]!.question])).toBe("P0002");
      // Tabela fechada para acesso direto.
      expect(await errorCode(db, "select * from question_comments")).toBe("42501");
      expect(await errorCode(db, "insert into question_comments (thread_key, user_id, author_name, body) values (md5('x'), $1, 'X', 'oi')", [U[0]])).toBe("42501");
      await db.query("rollback to savepoint x");
      await answer(db, 0);
      await answer(db, 1);
      await db.query("set local role authenticated");
      await db.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ sub: U[0], role: "authenticated" })]);
      expect(await errorCode(db, "select add_question_comment($1, ' ')", [seeds[0]!.question])).toBe("22023");
      expect(await errorCode(db, "select add_question_comment($1, $2)", [seeds[0]!.question, "x".repeat(1001)])).toBe("22023");
      const id = (await db.query("select add_question_comment($1, '  A letra B cai muito na FGV.  ') id", [seeds[0]!.question])).rows[0].id;
      // Outro aluno, com a mesma questão (mesmo enunciado), vê o comentário — sem e-mail/id.
      await db.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ sub: U[1], role: "authenticated" })]);
      const rows = (await db.query("select * from list_question_comments($1)", [seeds[1]!.question])).rows;
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({ id, author: "Ana S.", body: "A letra B cai muito na FGV.", is_mine: false, reported: false });
      expect(Object.keys(rows[0]).sort()).toEqual(["author", "body", "created_at", "id", "is_mine", "reported"]);
      // Não apaga comentário alheio; o autor apaga o próprio.
      expect((await db.query("select delete_question_comment($1) ok", [id])).rows[0].ok).toBe(false);
      await db.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ sub: U[0], role: "authenticated" })]);
      expect((await db.query("select * from list_question_comments($1)", [seeds[0]!.question])).rows[0].is_mine).toBe(true);
      expect((await db.query("select delete_question_comment($1) ok", [id])).rows[0].ok).toBe(true);
      expect((await db.query("select count(*)::int n from list_question_comments($1)", [seeds[0]!.question])).rows[0].n).toBe(0);
    } finally {
      await db.query("rollback");
    }
  });

  itDb("três denúncias de alunos diferentes ocultam o comentário; o autor não se denuncia", async () => {
    const { db } = t;
    await db.query("begin");
    try {
      for (let i = 0; i < 5; i++) await answer(db, i);
      await db.query("set local role authenticated");
      const as = (i: number) => db.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ sub: U[i], role: "authenticated" })]);
      await as(0);
      const id = (await db.query("select add_question_comment($1, 'Comentário ofensivo') id", [seeds[0]!.question])).rows[0].id;
      expect((await db.query("select report_question_comment($1,$2) ok", [seeds[0]!.question, id])).rows[0].ok).toBe(false);
      for (const i of [1, 2]) {
        await as(i);
        expect((await db.query("select report_question_comment($1,$2) ok", [seeds[i]!.question, id])).rows[0].ok).toBe(true);
      }
      await as(3);
      expect((await db.query("select reported from list_question_comments($1)", [seeds[3]!.question])).rows[0].reported).toBe(false);
      await db.query("select report_question_comment($1,$2)", [seeds[3]!.question, id]);
      await as(4);
      expect((await db.query("select count(*)::int n from list_question_comments($1)", [seeds[4]!.question])).rows[0].n).toBe(0);
    } finally {
      await db.query("rollback");
    }
  });

  itDb("enunciados diferentes não compartilham comentários", async () => {
    const { db } = t;
    await db.query("begin");
    try {
      await answer(db, 0);
      await answer(db, 1);
      await db.query("update questions set statement = 'Outro enunciado' where id = $1", [seeds[1]!.question]);
      await db.query("set local role authenticated");
      await db.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ sub: U[0], role: "authenticated" })]);
      await db.query("select add_question_comment($1, 'Só desta questão')", [seeds[0]!.question]);
      await db.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ sub: U[1], role: "authenticated" })]);
      expect((await db.query("select count(*)::int n from list_question_comments($1)", [seeds[1]!.question])).rows[0].n).toBe(0);
    } finally {
      await db.query("rollback");
    }
  });
});
