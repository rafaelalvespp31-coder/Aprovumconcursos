/**
 * Respostas gravadas reaparecem ao reabrir a aula: última resposta, acerto, número de
 * tentativas e gabarito — só para o dono e só das questões já respondidas.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDb, seedLesson, type TestDb } from "./helpers";

const A = "00000000-0000-4000-8000-0000000000da";
const B = "00000000-0000-4000-8000-0000000000db";
let t: TestDb;
let a: Awaited<ReturnType<typeof seedLesson>>;

beforeAll(async () => {
  t = await createTestDb("answer_states");
  if (!t.available) return;
  a = await seedLesson(t.db, A);
  await seedLesson(t.db, B);
}, 60_000);
afterAll(async () => t?.close());

const itDb = (name: string, fn: () => Promise<void>) => it(name, async () => (t.available ? fn() : console.warn(`[db] PULADO: ${name} — ${t.reason}`)));

describe("respostas gravadas da aula", () => {
  itDb("devolve a última resposta com gabarito; nada para quem não é dono", async () => {
    const { db } = t;
    await db.query("begin");
    try {
      const as = (uid: string) => db.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ sub: uid, role: "authenticated" })]);
      await db.query("set local role authenticated");
      await as(A);
      // Ainda sem resposta: nada (o gabarito não vaza).
      expect((await db.query("select * from lesson_answer_states($1)", [a.lesson])).rows).toHaveLength(0);
      await db.query("reset role");
      await db.query("insert into answer_attempts (question_id, user_id, selected_option_id, is_correct, created_at) values ($1,$2,$3,false, now() - interval '1 hour')", [a.question, A, a.wrong]);
      await db.query("insert into answer_attempts (question_id, user_id, selected_option_id, is_correct) values ($1,$2,$3,true)", [a.question, A, a.right]);
      await db.query("set local role authenticated");
      await as(A);
      const rows = (await db.query("select * from lesson_answer_states($1)", [a.lesson])).rows;
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({ question_id: a.question, choice: a.right, correct: true, attempts: 2 });
      expect(rows[0].feedback.justification).toBe("Justificativa");
      expect(rows[0].feedback.options.find((o: { isCorrect: boolean }) => o.isCorrect).id).toBe(a.right);
      // Outro aluno não vê as respostas de A.
      await as(B);
      expect((await db.query("select * from lesson_answer_states($1)", [a.lesson])).rows).toHaveLength(0);
    } finally {
      await db.query("rollback");
    }
  });
});
