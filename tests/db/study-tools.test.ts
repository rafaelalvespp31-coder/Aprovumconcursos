import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { asUser, createTestDb, errorCode, seedLesson, type TestDb } from "./helpers";

const A = "00000000-0000-4000-8000-0000000000d1";
const B = "00000000-0000-4000-8000-0000000000d2";
let t: TestDb;
let a: Awaited<ReturnType<typeof seedLesson>>;
let b: Awaited<ReturnType<typeof seedLesson>>;

beforeAll(async () => {
  t = await createTestDb("na_tools");
  if (!t.available) return;
  a = await seedLesson(t.db, A);
  b = await seedLesson(t.db, B);
});
afterAll(async () => t?.close());

const itDb = (name: string, fn: () => Promise<void>) =>
  it(name, async (ctx) => {
    if (!t.available) ctx.skip(t.reason);
    await fn();
  });

describe("anotações da aula", () => {
  itDb("aluno cria, edita e apaga as próprias notas, dúvidas e marcações", async () => {
    await asUser(t.db, A, async (c) => {
      const ins = await c.query("insert into lesson_annotations (lesson_id, kind, body, section_title) values ($1,'nota','Lembrar do prazo','Explicação') returning id, user_id", [a.lesson]);
      expect(ins.rows[0].user_id).toBe(A);
      const id = ins.rows[0].id;
      expect((await c.query("update lesson_annotations set body = 'Atualizada' where id = $1", [id])).rowCount).toBe(1);
      await c.query("insert into lesson_annotations (lesson_id, kind) values ($1,'duvida'), ($1,'revisar')", [a.lesson]);
      expect((await c.query("select count(*)::int n from lesson_annotations")).rows[0].n).toBe(3);
      expect((await c.query("delete from lesson_annotations where id = $1", [id])).rowCount).toBe(1);
    });
  });

  itDb("não anota em aula de outro usuário nem forja o dono", async () => {
    await asUser(t.db, A, async (c) => {
      expect(await errorCode(c, "insert into lesson_annotations (lesson_id, kind) values ($1,'nota')", [b.lesson])).toBe("23503");
      expect(await errorCode(c, "insert into lesson_annotations (user_id, lesson_id, kind) values ($1,$2,'nota')", [B, b.lesson])).toBe("42501");
    });
  });

  itDb("não lê nem altera anotações de outro usuário", async () => {
    await t.db.query("insert into lesson_annotations (user_id, lesson_id, kind, body) values ($1,$2,'nota','privada de B')", [B, b.lesson]);
    await asUser(t.db, A, async (c) => {
      expect((await c.query("select * from lesson_annotations where user_id = $1", [B])).rowCount).toBe(0);
      expect((await c.query("update lesson_annotations set body = 'x' where user_id = $1", [B])).rowCount).toBe(0);
      expect((await c.query("delete from lesson_annotations where user_id = $1", [B])).rowCount).toBe(0);
    });
    expect((await t.db.query("select body from lesson_annotations where user_id = $1", [B])).rows[0].body).toBe("privada de B");
  });
});

describe("resolver depois", () => {
  itDb("marca e desmarca a própria questão; não marca a de outro", async () => {
    await asUser(t.db, A, async (c) => {
      await c.query("insert into question_marks (question_id) values ($1)", [a.question]);
      expect((await c.query("select count(*)::int n from question_marks")).rows[0].n).toBe(1);
      expect(await errorCode(c, "insert into question_marks (question_id) values ($1)", [b.question])).toBe("23503");
      expect((await c.query("delete from question_marks where question_id = $1", [a.question])).rowCount).toBe(1);
    });
  });
});

describe("respostas com confiança e tempo; revisão do gabarito", () => {
  itDb("grava confiança e tempo; conta tentativas", async () => {
    await t.db.query("set role service_role");
    const r1 = (await t.db.query("select submit_answer($1,$2,$3,null,'fixacao',3::smallint,42) r", [A, a.question, a.wrong])).rows[0].r;
    const r2 = (await t.db.query("select submit_answer($1,$2,$3,null,'simulado',1::smallint,10) r", [A, a.question, a.right])).rows[0].r;
    await t.db.query("reset role");
    expect([r1.correct, r2.correct, r2.attempts]).toEqual([false, true, 2]);
    const row = (await t.db.query("select confidence, time_spent_seconds from answer_attempts where user_id = $1 order by created_at limit 1", [A])).rows[0];
    expect(row).toEqual({ confidence: 3, time_spent_seconds: 42 });
  });

  itDb("rever gabarito só depois de ter respondido, e só as próprias", async () => {
    await asUser(t.db, A, async (c) => {
      const own = (await c.query("select answered_question_review($1) r", [a.question])).rows[0].r;
      expect(own.options.find((o: { isCorrect: boolean }) => o.isCorrect).label).toBe("A");
      expect((await c.query("select answered_question_review($1) r", [b.question])).rows[0].r).toBeNull();
    });
    await asUser(t.db, B, async (c) => {
      // B ainda não respondeu a própria questão: gabarito continua oculto.
      expect((await c.query("select answered_question_review($1) r", [b.question])).rows[0].r).toBeNull();
    });
  });

  itDb("métricas diárias refletem só as tentativas do próprio aluno", async () => {
    await asUser(t.db, A, async (c) => {
      const rows = (await c.query("select * from my_daily_activity(7)")).rows;
      expect(rows).toHaveLength(7);
      const today = rows.at(-1);
      expect([today.correct, today.wrong]).toEqual([1, 1]);
    });
    await asUser(t.db, B, async (c) => {
      const rows = (await c.query("select sum(correct + wrong)::int n from my_daily_activity(7)")).rows;
      expect(rows[0].n).toBe(0);
    });
  });
});

describe("esclarecimentos e cotas", () => {
  itDb("cliente só lê esclarecimentos; servidor grava", async () => {
    await t.db.query("insert into concept_clarifications (user_id, lesson_id, question, answer_markdown) values ($1,$2,'O que é?','Resposta')", [A, a.lesson]);
    await asUser(t.db, A, async (c) => {
      expect((await c.query("select count(*)::int n from concept_clarifications")).rows[0].n).toBe(1);
      expect(await errorCode(c, "insert into concept_clarifications (user_id, lesson_id, question, answer_markdown) values ($1,$2,'xxx','y')", [A, a.lesson])).toBe("42501");
    });
    await asUser(t.db, B, async (c) => {
      expect((await c.query("select count(*)::int n from concept_clarifications")).rows[0].n).toBe(0);
    });
  });

  itDb("cota de esclarecimentos respeita o plano", async () => {
    const limit = (await t.db.query("select max_clarifications_per_month l from plans where id = 'free'")).rows[0].l as number;
    let allowed = 0;
    for (let i = 0; i < limit + 2; i++) {
      if ((await t.db.query("select consume_quota($1,'clarification',1) r", [A])).rows[0].r.allowed) allowed++;
    }
    expect(allowed).toBe(limit);
  });

  itDb("aluno define as próprias metas", async () => {
    await asUser(t.db, A, async (c) => {
      expect((await c.query("update profiles set daily_questions_goal = 20, weekly_lessons_goal = 5 where id = $1", [A])).rowCount).toBe(1);
      expect(await errorCode(c, "update profiles set daily_questions_goal = 0 where id = $1", [A])).toBe("23514");
    });
  });
});
