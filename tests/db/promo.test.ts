/**
 * Campanha "O Caveira ficou maluco": concessão única por aluno, sem reinício, idempotente sob
 * concorrência, expiração pelo relógio do banco, RLS e cotas mensais durante a degustação.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import pg from "pg";
import { createTestDb, type TestDb } from "./helpers";

const C = "caveira-ficou-maluco";
const FREE = "00000000-0000-4000-8000-0000000000d1";
const PAGO = "00000000-0000-4000-8000-0000000000d2";
const ADM = "00000000-0000-4000-8000-0000000000d3";
const OUTRO = "00000000-0000-4000-8000-0000000000d4";
const NOVO = "00000000-0000-4000-8000-0000000000d5";
const CORRIDA = "00000000-0000-4000-8000-0000000000d6";
const DEPOIS = "00000000-0000-4000-8000-0000000000d7";
let t: TestDb;

beforeAll(async () => {
  t = await createTestDb("promo");
  if (!t.available) return;
  for (const u of [FREE, PAGO, ADM, OUTRO]) await t.db.query("insert into auth.users (id, email) values ($1, $2)", [u, `${u.slice(-2)}@t.dev`]);
  await t.db.query("update subscriptions set plan_id = 'pro', current_period_end = now() + interval '30 days', billing_period = 'mensal' where user_id = $1", [PAGO]);
  await t.db.query("insert into admin_roles (user_id, role) values ($1, 'admin')", [ADM]);
}, 60_000);
afterAll(async () => t?.close());

const itDb = (name: string, fn: () => Promise<void>) => it(name, async () => (t.available ? fn() : console.warn(`[db] PULADO: ${name} — ${t.reason}`)));
const grants = async (uid: string) => (await t.db.query("select * from promo_grants where user_id = $1", [uid])).rows;

async function as<T>(uid: string, fn: () => Promise<T>): Promise<T> {
  await t.db.query("begin");
  try {
    await t.db.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ sub: uid, role: "authenticated" })]);
    await t.db.query("set local role authenticated");
    return await fn();
  } finally {
    await t.db.query("rollback");
  }
}

describe("campanha O Caveira ficou maluco", () => {
  itDb("nasce desativada: ninguém recebe nada antes do admin ativar", async () => {
    const c = (await t.db.query("select active, duration_days, plan_id from promo_campaigns where id = $1", [C])).rows[0];
    expect(c).toMatchObject({ active: false, duration_days: 7, plan_id: "premium" });
    expect((await t.db.query("select * from promo_ensure($1)", [FREE])).rows).toHaveLength(0);
    expect(await grants(FREE)).toHaveLength(0);
  });

  itDb("ativar concede 7 dias a todas as contas existentes (exceto admin), com auditoria", async () => {
    const n = (await t.db.query("select promo_set_active($1, true, $2) as n", [C, ADM])).rows[0].n;
    expect(n).toBe(3); // FREE, PAGO, OUTRO
    const g = (await grants(FREE))[0];
    expect(g).toMatchObject({ campaign_id: C, source: "global", status: "ativo", popup_seen_at: null });
    const dias = (new Date(g.expires_at).getTime() - new Date(g.starts_at).getTime()) / 86_400_000;
    expect(dias).toBe(7);
    expect(await grants(ADM)).toHaveLength(0);
    expect((await t.db.query("select count(*)::int as n from audit_logs where action = 'promo.ativada'")).rows[0].n).toBe(1);
  });

  itDb("pagante recebe a degustação sem mudar a assinatura", async () => {
    expect(await grants(PAGO)).toHaveLength(1);
    const s = (await t.db.query("select plan_id, billing_period from subscriptions where user_id = $1", [PAGO])).rows[0];
    expect(s).toEqual({ plan_id: "pro", billing_period: "mensal" });
  });

  itDb("conta nova durante a campanha recebe no cadastro", async () => {
    await t.db.query("insert into auth.users (id, email) values ($1, 'novo@t.dev')", [NOVO]);
    const g = await grants(NOVO);
    expect(g).toHaveLength(1);
    expect(g[0]).toMatchObject({ source: "cadastro", status: "ativo" });
  });

  itDb("novo login, outro aparelho e reativar a campanha não reiniciam o prazo", async () => {
    const antes = (await grants(FREE))[0];
    const e = (await t.db.query("select * from promo_ensure($1)", [FREE])).rows;
    expect(e).toHaveLength(1);
    expect(e[0].expires_at).toEqual(antes.expires_at);
    await t.db.query("select promo_set_active($1, true, $2)", [C, ADM]);
    await t.db.query("select * from promo_grant($1, $2, 'login')", [C, FREE]);
    const depois = await grants(FREE);
    expect(depois).toHaveLength(1);
    expect(depois[0].expires_at).toEqual(antes.expires_at);
    expect(depois[0].starts_at).toEqual(antes.starts_at);
  });

  itDb("dois logins simultâneos criam uma concessão só", async () => {
    await t.db.query("insert into auth.users (id, email) values ($1, 'corrida@t.dev')", [CORRIDA]);
    await t.db.query("delete from promo_grants where user_id = $1", [CORRIDA]); // simula falha da concessão no cadastro
    const url = (t.db as unknown as { connectionParameters: { database: string } }).connectionParameters.database;
    const conns = await Promise.all(
      Array.from({ length: 6 }, async () => {
        const c = new pg.Client({ connectionString: `postgres://postgres@localhost:54329/${url}?host=/tmp` });
        await c.connect();
        return c;
      }),
    );
    try {
      const r = await Promise.all(conns.map((c) => c.query("select * from promo_ensure($1)", [CORRIDA])));
      expect(new Set(r.map((x) => x.rows[0]?.grant_id))).toHaveProperty("size", 1);
      expect(await grants(CORRIDA)).toHaveLength(1);
    } finally {
      await Promise.all(conns.map((c) => c.end()));
    }
  });

  itDb("o aluno só lê a própria concessão e não altera prazo nem cria concessão", async () => {
    const gid = (await grants(FREE))[0].id as string;
    expect((await as(FREE, () => t.db.query("select user_id from promo_grants"))).rows).toEqual([{ user_id: FREE }]);
    await expect(as(FREE, () => t.db.query("update promo_grants set expires_at = now() + interval '1 year'"))).rejects.toThrow(/permission denied/);
    await expect(as(FREE, () => t.db.query("insert into promo_grants (campaign_id, user_id, expires_at, source) values ($1, $2, now() + interval '1 year', 'manual')", [C, FREE]))).rejects.toThrow(/permission denied/);
    await expect(as(FREE, () => t.db.query("select * from promo_campaigns"))).rejects.toThrow(/permission denied/);
    await expect(as(FREE, () => t.db.query("select * from promo_ensure($1)", [FREE]))).rejects.toThrow(/permission denied/);
    await expect(as(FREE, () => t.db.query("select promo_set_active($1, false, $2)", [C, FREE]))).rejects.toThrow(/permission denied/);
    await expect(as(FREE, () => t.db.query("select * from promo_extend($1, 30, $2)", [gid, FREE]))).rejects.toThrow(/permission denied/);
  });

  itDb("cotas mensais: degustação usa os limites do Premium; ao vencer volta ao gratuito", async () => {
    const free = (await t.db.query("select max_trail_builds_per_month as n from plans where id = 'free'")).rows[0].n as number;
    const premium = (await t.db.query("select max_trail_builds_per_month as n from plans where id = 'premium'")).rows[0].n as number;
    const q = async () => (await t.db.query("select consume_quota($1, 'trail_build', 1) as r", [FREE])).rows[0].r;
    expect(await q()).toMatchObject({ allowed: true, limit: premium, plan: "premium" });
    await t.db.query("update promo_grants set starts_at = now() - interval '7 days', expires_at = now() - interval '1 second' where user_id = $1", [FREE]);
    expect(await q()).toMatchObject({ allowed: true, limit: free, plan: "free" });
    expect((await t.db.query("select * from promo_ensure($1)", [FREE])).rows).toHaveLength(0);
    // Vencida, não volta a conceder (uma vez por aluno e por campanha) e o registro fica no histórico.
    expect(await grants(FREE)).toHaveLength(1);
  });

  itDb("rotina de status marca vencidas como expiradas (só informativo)", async () => {
    expect((await t.db.query("select promo_refresh_status() as n")).rows[0].n).toBeGreaterThanOrEqual(1);
    expect((await grants(FREE))[0].status).toBe("expirado");
  });

  itDb("desativar impede novas concessões mas mantém os períodos já concedidos", async () => {
    const antes = (await grants(OUTRO))[0];
    await t.db.query("select promo_set_active($1, false, $2)", [C, ADM]);
    expect((await t.db.query("select * from promo_ensure($1)", [OUTRO])).rows[0].expires_at).toEqual(antes.expires_at);
    await t.db.query("insert into auth.users (id, email) values ($1, 'depois@t.dev')", [DEPOIS]);
    expect(await grants(DEPOIS)).toHaveLength(0);
    expect((await t.db.query("select * from promo_ensure($1)", [DEPOIS])).rows).toHaveLength(0);
    expect((await t.db.query("select promo_grant_all($1, $2) as n", [C, ADM])).rows[0].n).toBe(0);
  });

  itDb("concessão e extensão manuais pelo admin ficam auditadas", async () => {
    const g = (await t.db.query("select * from promo_grant($1, $2, 'manual', $3)", [C, DEPOIS, ADM])).rows[0];
    expect(g).toMatchObject({ source: "manual", granted_by: ADM });
    const ext = (await t.db.query("select * from promo_extend($1, 3, $2)", [g.id, ADM])).rows[0];
    expect(new Date(ext.expires_at).getTime() - new Date(g.expires_at).getTime()).toBe(3 * 86_400_000);
    const acoes = (await t.db.query("select action from audit_logs where user_id = $1 order by id", [DEPOIS])).rows.map((r) => r.action);
    expect(acoes).toEqual(["promo.concessao_manual", "promo.extensao"]);
    await expect(t.db.query("select * from promo_extend($1, 365, $2)", [g.id, ADM])).rejects.toThrow(/dias inválidos/);
  });

  itDb("excluir dados de estudo nunca acontece: a concessão só referencia o aluno", async () => {
    const fks = (await t.db.query("select confrelid::regclass::text as t from pg_constraint where conrelid = 'public.promo_grants'::regclass and contype = 'f'")).rows.map((r) => r.t);
    expect(fks.sort()).toEqual(["auth.users", "auth.users", "promo_campaigns"]);
  });
});
