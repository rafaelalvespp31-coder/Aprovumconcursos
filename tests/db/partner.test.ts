/**
 * APROVUM BUSINESS (sócio): os dados do sócio só saem pela partner_dashboard, que confere no
 * banco se a conta é de sócio, se está ativa e quais indicadores estão liberados.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDb, type TestDb } from "./helpers";

const ADMIN = "00000000-0000-4000-8000-0000000000a1";
const SOCIO = "00000000-0000-4000-8000-0000000000a2";
const ALUNO1 = "00000000-0000-4000-8000-0000000000a3";
const ALUNO2 = "00000000-0000-4000-8000-0000000000a4";
const ALUNO3 = "00000000-0000-4000-8000-0000000000a5";
let t: TestDb;

beforeAll(async () => {
  t = await createTestDb("partner");
  if (!t.available) return;
  const { db } = t;
  for (const [u, d] of [[ADMIN, 100], [SOCIO, 50], [ALUNO1, 40], [ALUNO2, 3], [ALUNO3, 0]] as const)
    await db.query("insert into auth.users (id, email, created_at, raw_user_meta_data) values ($1, $2, now() - ($3 || ' days')::interval, '{\"display_name\":\"Aluno Teste\"}') on conflict do nothing", [u, `${u.slice(-2)}@t.dev`, String(d)]);
  await db.query("insert into admin_roles (user_id, role) values ($1, 'admin')", [ADMIN]);
  await db.query("insert into partner_accounts (user_id, permissions) values ($1, array['visualizar_total_cadastrados','visualizar_crescimento','visualizar_usuarios_ativos'])", [SOCIO]);
  // ALUNO1 pagou (mensal, vigente); ALUNO2 pagou e venceu.
  await db.query("update subscriptions set plan_id = 'premium' where user_id = $1", [ALUNO1]);
  await db.query("insert into subscription_payments (user_id, plan_id, period, amount_cents, paid_at, period_end) values ($1, 'premium', 'mensal', 2990, now() - interval '2 days', now() + interval '28 days')", [ALUNO1]);
  await db.query("insert into subscription_payments (user_id, plan_id, period, amount_cents, paid_at, period_end) values ($1, 'premium', 'mensal', 2990, now() - interval '40 days', now() - interval '10 days')", [ALUNO2]);
}, 60_000);
afterAll(async () => t?.close());

const itDb = (name: string, fn: () => Promise<void>) => it(name, async () => (t.available ? fn() : console.warn(`[db] PULADO: ${name} — ${t.reason}`)));

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
const dash = (uid: string, days = 30) => as(uid, async () => (await t.db.query("select public.partner_dashboard($1) as d", [days])).rows[0].d);
const setPerms = (perms: string[], active = true) => t.db.query("update partner_accounts set permissions = $2, active = $3 where user_id = $1", [SOCIO, perms, active]);

describe("APROVUM BUSINESS (RLS e permissões)", () => {
  itDb("sócio vê só o que foi liberado; alunos não contam admin nem sócio", async () => {
    await setPerms(["visualizar_total_cadastrados", "visualizar_crescimento", "visualizar_usuarios_ativos"]);
    const d = await dash(SOCIO);
    expect(d.status).toBe("ok");
    expect(d.total_cadastrados).toBe(3);
    expect(d.serie_cadastros).toHaveLength(30);
    expect(d.serie_base.at(-1).total).toBe(3);
    // Nada comercial nem financeiro: as chaves nem existem (não são zero).
    for (const k of ["pagantes", "assinaturas_mensais", "faturamento_periodo_cents", "lista_pagantes", "historico_pagamentos", "taxa_conversao_pct", "cadastros_hoje", "usuarios_inativos_30d"]) expect(d).not.toHaveProperty(k);
  });

  itDb("ao liberar pagantes, conta só pagamento confirmado e vigente; ao revogar, some na hora", async () => {
    await setPerms(["visualizar_pagantes", "visualizar_assinaturas_vencidas", "visualizar_taxa_conversao"]);
    let d = await dash(SOCIO);
    expect(d.pagantes).toBe(1);
    expect(d.assinaturas_vencidas).toBe(1);
    expect(d.taxa_conversao_pct).toBe(33.3);
    await setPerms(["visualizar_taxa_conversao"]);
    d = await dash(SOCIO);
    expect(d).not.toHaveProperty("pagantes");
    // Conversão sozinha revelaria os pagantes: não sai sem visualizar_pagantes.
    expect(d).not.toHaveProperty("taxa_conversao_pct");
  });

  itDb("histórico sem faturamento não leva valores; com faturamento, leva", async () => {
    await setPerms(["visualizar_historico_pagamentos"]);
    let d = await dash(SOCIO, 90);
    expect(d.historico_pagamentos).toHaveLength(2);
    expect(d.historico_pagamentos[0]).not.toHaveProperty("valor_cents");
    await setPerms(["visualizar_historico_pagamentos", "visualizar_faturamento"]);
    d = await dash(SOCIO, 90);
    expect(d.historico_pagamentos[0].valor_cents).toBe(2990);
    expect(d.faturamento_periodo_cents).toBe(5980);
  });

  itDb("conta desativada não recebe dados (mesmo com a sessão aberta)", async () => {
    await setPerms(["visualizar_total_cadastrados"], false);
    const d = await dash(SOCIO);
    expect(d).toEqual({ status: "desativado" });
    await setPerms(["visualizar_total_cadastrados"], true);
    expect((await dash(SOCIO)).total_cadastrados).toBe(3);
  });

  itDb("quem não é sócio não recebe nada e a tentativa fica na auditoria", async () => {
    expect(await dash(ALUNO1)).toEqual({ status: "sem_acesso" });
    const r = await t.db.query("select count(*)::int n from audit_logs where action = 'partner.acesso_negado' and actor_id = $1", [ALUNO1]);
    expect(r.rows[0].n).toBe(0); // a chamada acima foi desfeita (rollback); confere fora de transação:
    await t.db.query("select set_config('request.jwt.claims', $1, false)", [JSON.stringify({ sub: ALUNO1, role: "authenticated" })]);
    await t.db.query("select public.partner_dashboard(30)");
    await t.db.query("select set_config('request.jwt.claims', '', false)");
    const r2 = await t.db.query("select count(*)::int n from audit_logs where action = 'partner.acesso_negado' and actor_id = $1", [ALUNO1]);
    expect(r2.rows[0].n).toBe(1);
  });

  itDb("o sócio não lê tabelas financeiras nem muda as próprias permissões ou registra pagamento", async () => {
    await as(SOCIO, async () => {
      expect((await t.db.query("select * from subscription_payments")).rows).toHaveLength(0);
      expect((await t.db.query("select * from subscriptions where user_id <> $1", [SOCIO])).rows).toHaveLength(0);
      expect((await t.db.query("select * from audit_logs")).rows).toHaveLength(0);
    });
    await expect(as(SOCIO, () => t.db.query("select * from partner_accounts"))).rejects.toThrow(/permission denied/);
    await expect(as(SOCIO, () => t.db.query("update partner_accounts set permissions = partner_permission_keys()"))).rejects.toThrow(/permission denied/);
    await expect(as(SOCIO, () => t.db.query("insert into subscription_payments (user_id, plan_id, period, period_end) values ($1, 'premium', 'anual', now())", [SOCIO]))).rejects.toThrow(/permission denied/);
    await expect(as(SOCIO, () => t.db.query("insert into admin_roles (user_id, role) values ($1, 'admin')", [SOCIO]))).rejects.toThrow(/permission denied/);
    // Auditoria: o sócio não altera nem apaga registros.
    await expect(as(SOCIO, () => t.db.query("update audit_logs set action = 'x'"))).rejects.toThrow(/permission denied/);
    await expect(as(SOCIO, () => t.db.query("delete from audit_logs"))).rejects.toThrow(/permission denied/);
  });

  itDb("permissão inexistente é recusada pelo banco", async () => {
    await expect(t.db.query("update partner_accounts set permissions = array['ver_tudo'] where user_id = $1", [SOCIO])).rejects.toThrow(/check/);
  });
});
