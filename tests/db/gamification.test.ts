/**
 * Gamificação: XP só por atividade real, uma vez por missão/dia, bônus único, nível pelo XP,
 * streak e recorde, conquistas verificadas no banco, ranking por XP e isolamento entre alunos.
 */
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDb, seedLesson, type TestDb } from "./helpers";

const A = "00000000-0000-4000-8000-0000000000e1";
const B = "00000000-0000-4000-8000-0000000000e2";
const C = "00000000-0000-4000-8000-0000000000e3";
let t: TestDb;
let la: Awaited<ReturnType<typeof seedLesson>>;
let lb: Awaited<ReturnType<typeof seedLesson>>;
let extraA: string[] = [];

const itDb = (name: string, fn: () => Promise<void>) => it(name, async () => (t.available ? fn() : console.warn(`[db] PULADO: ${name} — ${t.reason}`)));
const sync = async (uid: string, db: pg.Client = t.db) => (await db.query("select public.gamification_sync($1) as s", [uid])).rows[0].s;

async function addQuestions(uid: string, lesson: string, n: number) {
  const node = (await t.db.query("select node_id from questions where lesson_id = $1 limit 1", [lesson])).rows[0].node_id;
  const ids: string[] = [];
  for (let i = 0; i < n; i++) {
    ids.push((await t.db.query("insert into questions (lesson_id, node_id, user_id, type, statement, justification, difficulty, correct_answer_true) values ($1,$2,$3,'certo_errado','E" + i + "','J',2,true) returning id", [lesson, node, uid])).rows[0].id);
  }
  return ids;
}
const answer = (uid: string, q: string, ok: boolean, ctx = "fixacao", ago = "0 seconds") =>
  t.db.query(`insert into answer_attempts (question_id, user_id, answer_bool, is_correct, context, time_spent_seconds, created_at) values ($1,$2,true,$3,$4,30, now() - interval '${ago}')`, [q, uid, ok, ctx]);

beforeAll(async () => {
  t = await createTestDb("gamification");
  if (!t.available) return;
  la = await seedLesson(t.db, A);
  lb = await seedLesson(t.db, B);
  await t.db.query("insert into auth.users (id) values ($1) on conflict do nothing", [C]);
  await t.db.query("insert into profiles (id, display_name) values ($1, 'Rafael Alves Souza'), ($2, 'Bia'), ($3, null) on conflict (id) do update set display_name = excluded.display_name", [A, B, C]);
  // Lançamento = hoje (dias anteriores não rendem XP de missão).
  await t.db.query("update gamification_settings set config = jsonb_set(config, '{start_date}', to_jsonb(((now() at time zone 'America/Sao_Paulo')::date)::text))");
  extraA = await addQuestions(A, la.lesson, 25);
}, 90_000);
afterAll(async () => t?.close());

describe("nível pelo XP (fórmula única)", () => {
  itDb("progressão crescente: 1→2 com 1.100 XP, 2→3 com mais 1.200", async () => {
    const cfg = (await t.db.query("select config from gamification_settings")).rows[0].config;
    const lv = async (xp: number) => (await t.db.query("select public.gamification_level_info($1, $2) as i", [xp, cfg])).rows[0].i;
    expect(await lv(0)).toEqual({ level: 1, floor: 0, next: 1100 });
    expect(await lv(1099)).toMatchObject({ level: 1 });
    expect(await lv(1100)).toEqual({ level: 2, floor: 1100, next: 2300 });
    expect(await lv(2300)).toMatchObject({ level: 3, next: 3600 });
    // Nível 10 exige 13.500 XP.
    expect(await lv(13499)).toMatchObject({ level: 9 });
    expect(await lv(13500)).toMatchObject({ level: 10 });
  });
});

describe("missões diárias", () => {
  itDb("sem atividade: nada concedido, missões pendentes", async () => {
    const s = await sync(A);
    expect(s.xp).toBe(0);
    expect(s.level).toBe(1);
    expect(s.missions).toMatchObject({ completed: 0, estudar: { done: false }, combater: { progress: 0, target: 20 }, revisar: { progress: 0, target: 15 } });
  });

  itDb("abrir a aula não conta; 19 questões não completam; repetir a mesma questão não soma", async () => {
    await t.db.query("insert into learning_progress (user_id, lesson_id, trail_id, state) values ($1,$2,$3,'em_andamento')", [A, la.lesson, la.trail]);
    for (const q of extraA.slice(0, 19)) await answer(A, q, true);
    for (let i = 0; i < 5; i++) await answer(A, extraA[0]!, false);
    const s = await sync(A);
    expect(s.missions.estudar.done).toBe(false);
    expect(s.missions.combater).toMatchObject({ progress: 19, done: false });
    expect(s.xp).toBe(0);
  });

  itDb("20ª questão diferente → +100 XP uma única vez", async () => {
    await answer(A, extraA[19]!, false);
    expect((await sync(A)).xp).toBe(100);
    await answer(A, extraA[20]!, true);
    expect((await sync(A)).xp).toBe(100);
    const tx = await t.db.query("select activity_type, amount from gamification_xp_transactions where user_id = $1", [A]);
    expect(tx.rows).toEqual([{ activity_type: "missao_combater", amount: 100 }]);
  });

  itDb("aula concluída → +100; 15 questões de revisão → +100 e bônus +300 (total 600)", async () => {
    await t.db.query("update learning_progress set state = 'aula_concluida', reading_completed_at = now() where user_id = $1", [A]);
    expect((await sync(A)).xp).toBe(200);
    // Revisão só conta em aula que está na revisão espaçada.
    for (const q of extraA.slice(0, 15)) await answer(A, q, true, "revisao");
    expect((await sync(A)).missions.revisar.done).toBe(false);
    await t.db.query("insert into review_schedules (user_id, lesson_id, trail_id, due_at) values ($1,$2,$3, now())", [A, la.lesson, la.trail]);
    const s = await sync(A);
    expect(s.missions).toMatchObject({ completed: 3, estudar: { done: true }, combater: { done: true }, revisar: { done: true } });
    expect(s.xp).toBe(600);
    expect(s.xpToday).toBe(600);
    expect((await sync(A)).xp).toBe(600);
  });

  itDb("duas sincronizações simultâneas não duplicam recompensa", async () => {
    const url = (t.db as unknown as { connectionParameters: { database: string } }).connectionParameters.database;
    const mk = async () => {
      const c = new pg.Client({ connectionString: `postgres://postgres@localhost:54329/${url}?host=/tmp` });
      await c.connect();
      return c;
    };
    const [c1, c2, c3] = await Promise.all([mk(), mk(), mk()]);
    // Apaga a transação do bônus para que as três disputem o mesmo crédito ao mesmo tempo.
    await t.db.query("delete from gamification_xp_transactions where user_id = $1 and activity_type = 'bonus_operacao'", [A]);
    await Promise.all([sync(A, c1), sync(A, c2), sync(A, c3)]);
    await Promise.all([c1.end(), c2.end(), c3.end()]);
    const n = await t.db.query("select count(*)::int as n, sum(amount)::int as xp from gamification_xp_transactions where user_id = $1", [A]);
    expect(n.rows[0]).toEqual({ n: 4, xp: 600 });
  });

  itDb("atividade de antes do lançamento não rende XP de missão", async () => {
    const qs = await addQuestions(B, lb.lesson, 20);
    for (const q of qs) await answer(B, q, true, "fixacao", "1 day");
    const s = await sync(B);
    expect(s.xp).toBe(0);
    // …mas conta como dia de estudo (histórico real).
    expect(s.streak.best).toBe(1);
  });
});

describe("streak e conquistas", () => {
  itDb("7 dias seguidos: sequência 7, recorde 7, conquistas de disciplina e primeiro combate", async () => {
    for (let i = 1; i <= 6; i++) await answer(A, extraA[22]!, true, "fixacao", `${i} days`);
    const s = await sync(A);
    expect(s.streak).toMatchObject({ current: 7, best: 7 });
    const got = s.achievements.filter((a: { unlockedAt: string | null }) => a.unlockedAt).map((a: { id: string }) => a.id);
    expect(got.sort()).toEqual(["disciplina_7", "primeiro_combate"]);
  });

  itDb("lacuna interrompe a sequência e preserva o recorde; conquista não duplica", async () => {
    // B: 3 dias seguidos há 6, 5 e 4 dias e nada depois → sequência 0, recorde 3 (+ ontem = 1 dia isolado).
    const q = (await t.db.query("select id from questions where user_id = $1 limit 1", [B])).rows[0].id;
    for (const d of [6, 5, 4]) await answer(B, q, false, "fixacao", `${d} days`);
    await t.db.query("delete from answer_attempts where user_id = $1 and created_at > now() - interval '2 days'", [B]);
    await t.db.query("delete from gamification_activity_days where user_id = $1", [B]);
    const s = await sync(B);
    expect(s.streak).toMatchObject({ current: 0, best: 3 });
    await sync(A);
    const n = await t.db.query("select count(*)::int as n from student_achievements where user_id = $1 and achievement_id = 'disciplina_7'", [A]);
    expect(n.rows[0].n).toBe(1);
  });

  itDb("LEVEL UP registrado ao passar de nível e marcado como visto", async () => {
    await t.db.query("insert into gamification_xp_transactions (user_id, amount, reason, activity_type, cycle_day, event_key) values ($1, 600, 'teste de nível', 'bonus_operacao', current_date - 30, 'teste:nivel')", [A]);
    const s = await sync(A);
    expect(s).toMatchObject({ xp: 1200, level: 2, levelFloor: 1100, levelNext: 2300, levelUps: [2] });
    await t.db.query("select public.gamification_ack_levels($1)", [A]);
    expect((await sync(A)).levelUps).toEqual([]);
  });
});

describe("ranking", () => {
  itDb("ordena por XP; quem não tem XP não ganha posição inventada; nomes abreviados", async () => {
    const a = await sync(A);
    expect(a.ranking).toMatchObject({ position: 1, total: 1 });
    const c = await sync(C);
    expect(c.ranking.position).toBeNull();
    await t.db.query("insert into gamification_xp_transactions (user_id, amount, reason, activity_type, cycle_day, event_key) values ($1, 5000, 'teste', 'bonus_operacao', current_date - 30, 'teste:rank')", [B]);
    expect((await sync(B)).ranking).toMatchObject({ position: 1, total: 2 });
    expect((await sync(A)).ranking).toMatchObject({ position: 2, total: 2 });
    const top = await t.db.query("select * from public.gamification_top(10)");
    expect(top.rows).toEqual([
      { pos: 1, name: "Bia", level: 5, xp: "5000" },
      { pos: 2, name: "Rafael S.", level: 2, xp: "1200" },
    ]);
  });
});

describe("segurança (RLS e permissões)", () => {
  const as = async <T>(uid: string, fn: () => Promise<T>) => {
    await t.db.query("begin");
    try {
      await t.db.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ sub: uid, role: "authenticated" })]);
      await t.db.query("set local role authenticated");
      return await fn();
    } finally {
      await t.db.query("rollback");
    }
  };

  itDb("cada aluno lê só o próprio XP, dias, conquistas e ranking", async () => {
    for (const tbl of ["gamification_xp_transactions", "gamification_activity_days", "student_achievements", "gamification_level_ups", "gamification_rank_snapshots"]) {
      const r = await as(B, () => t.db.query(`select distinct user_id from ${tbl}`));
      expect(r.rows.every((x) => x.user_id === B)).toBe(true);
    }
  });

  itDb("o navegador não concede XP, não muda nível, missão, streak, conquista nem chama a sincronização", async () => {
    await expect(as(A, () => t.db.query("insert into gamification_xp_transactions (user_id, amount, reason, activity_type, event_key) values ($1, 9999, 'hack', 'bonus_operacao', 'hack:1')", [A]))).rejects.toThrow(/permission denied/);
    await expect(as(A, () => t.db.query("update gamification_xp_transactions set amount = 9999 where user_id = $1", [A]))).rejects.toThrow(/permission denied/);
    await expect(as(A, () => t.db.query("insert into student_achievements (user_id, achievement_id) values ($1, 'caveira_elite')", [A]))).rejects.toThrow(/permission denied/);
    await expect(as(A, () => t.db.query("insert into gamification_activity_days (user_id, day) values ($1, current_date - 100)", [A]))).rejects.toThrow(/permission denied/);
    await expect(as(A, () => t.db.query("update gamification_settings set config = '{}'"))).rejects.toThrow(/permission denied/);
    await expect(as(A, () => t.db.query("select public.gamification_sync($1)", [A]))).rejects.toThrow(/permission denied/);
    await expect(as(A, () => t.db.query("select public.gamification_top(10)"))).rejects.toThrow(/permission denied/);
    await expect(as(A, () => t.db.query("select public.gamification_performance($1)", [B]))).rejects.toThrow(/permission denied/);
    await expect(as(A, () => t.db.query("insert into contest_catalog (name, institution, source_name) values ('X', 'Y', 'Z')"))).rejects.toThrow(/permission denied/);
  });

  itDb("concursos: aluno vê só os ativos", async () => {
    await t.db.query("insert into contest_catalog (name, institution, source_name, active) values ('Ativo', 'Órgão', 'Fonte', true), ('Inativo', 'Órgão', 'Fonte', false)");
    const r = await as(A, () => t.db.query("select name from contest_catalog"));
    expect(r.rows).toEqual([{ name: "Ativo" }]);
  });
});

describe("desempenho", () => {
  itDb("acertos, erros, taxa e tempo registrado (com limite por resposta) só do próprio aluno", async () => {
    const p = (await t.db.query("select public.gamification_performance($1) as p", [B])).rows[0].p;
    // B ficou com 3 respostas erradas (a matéria só entra no ranking de matérias com 5+ respostas).
    expect(p).toMatchObject({ answered: 3, correct: 0, wrong: 3, seconds: 90, subjects: [] });
    const q = (await t.db.query("select id from questions where user_id = $1 limit 1", [B])).rows[0].id;
    for (let i = 0; i < 3; i++) await answer(B, q, true, "fixacao", "3 days");
    await t.db.query("update answer_attempts set time_spent_seconds = 4000 where user_id = $1", [B]);
    const p2 = (await t.db.query("select public.gamification_performance($1) as p", [B])).rows[0].p;
    expect(p2.seconds).toBe(6 * 600);
    expect(p2.subjects).toEqual([{ name: "T", answered: 6, correct: 3 }]);
  });
});
