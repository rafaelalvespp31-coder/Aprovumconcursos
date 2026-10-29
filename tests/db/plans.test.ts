/**
 * Planos e pagamentos: o aluno lê só os próprios pagamentos e não grava nada (nem plano, nem
 * pagamento, nem uso diário); conta nova começa no gratuito.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDb, type TestDb } from "./helpers";

const A = "00000000-0000-4000-8000-0000000000c7";
const B = "00000000-0000-4000-8000-0000000000c8";
let t: TestDb;

beforeAll(async () => {
  t = await createTestDb("plans");
  if (!t.available) return;
  for (const u of [A, B]) await t.db.query("insert into auth.users (id, email) values ($1, $2) on conflict do nothing", [u, `${u.slice(-2)}@t.dev`]);
  await t.db.query("insert into subscription_payments (user_id, plan_id, period, amount_cents, period_end) values ($1, 'premium', 'mensal', 2990, now() + interval '1 month')", [B]);
  await t.db.query("insert into daily_lesson_access (user_id, day, lesson_id) values ($1, current_date, gen_random_uuid())", [A]);
}, 60_000);
afterAll(async () => t?.close());

const itDb = (name: string, fn: () => Promise<void>) => it(name, async () => (t.available ? fn() : console.warn(`[db] PULADO: ${name} — ${t.reason}`)));

async function as<T>(uid: string | null, fn: () => Promise<T>): Promise<T> {
  await t.db.query("begin");
  try {
    if (uid) await t.db.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ sub: uid, role: "authenticated" })]);
    await t.db.query(`set local role ${uid ? "authenticated" : "anon"}`);
    return await fn();
  } finally {
    await t.db.query("rollback");
  }
}

describe("planos e pagamentos (RLS)", () => {
  itDb("conta nova começa no plano gratuito", async () => {
    const r = await t.db.query("select plan_id, status, current_period_end, billing_period from subscriptions where user_id = $1", [A]);
    expect(r.rows[0]).toMatchObject({ plan_id: "free", status: "active", current_period_end: null, billing_period: null });
  });

  itDb("o aluno lê só os próprios pagamentos", async () => {
    expect((await as(B, () => t.db.query("select amount_cents from subscription_payments"))).rows).toEqual([{ amount_cents: 2990 }]);
    expect((await as(A, () => t.db.query("select * from subscription_payments"))).rows).toHaveLength(0);
  });

  itDb("o aluno não muda o próprio plano nem registra pagamento", async () => {
    await expect(as(A, () => t.db.query("update subscriptions set plan_id = 'premium' where user_id = $1", [A]))).rejects.toThrow(/permission denied/);
    await expect(as(A, () => t.db.query("insert into subscription_payments (user_id, plan_id, period, period_end) values ($1, 'premium', 'anual', now())", [A]))).rejects.toThrow(/permission denied/);
  });

  itDb("uso diário de aulas é só do servidor", async () => {
    await expect(as(A, () => t.db.query("select * from daily_lesson_access"))).rejects.toThrow(/permission denied/);
    await expect(as(A, () => t.db.query("delete from daily_lesson_access"))).rejects.toThrow(/permission denied/);
    await expect(as(null, () => t.db.query("select * from subscription_payments"))).rejects.toThrow(/permission denied/);
  });

  itDb("período e valor são validados pelo banco", async () => {
    await t.db.query("begin");
    try {
      await expect(t.db.query("insert into subscription_payments (user_id, plan_id, period, period_end) values ($1, 'premium', 'bimestral', now())", [A])).rejects.toThrow(/check/);
    } finally {
      await t.db.query("rollback");
    }
  });
});
