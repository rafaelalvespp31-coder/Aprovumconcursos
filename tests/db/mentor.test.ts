/**
 * Histórico do Mentor (mentor_recommendations): cada aluno só lê as próprias linhas; o navegador
 * (anon/authenticated) não insere nem altera nada; a deduplicação é garantida pelo banco.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDb, type TestDb } from "./helpers";

const A = "00000000-0000-4000-8000-0000000000ea";
const B = "00000000-0000-4000-8000-0000000000eb";
let t: TestDb;

beforeAll(async () => {
  t = await createTestDb("mentor");
  if (!t.available) return;
  for (const u of [A, B]) await t.db.query("insert into auth.users (id, email) values ($1, $2) on conflict do nothing", [u, `${u.slice(-2)}@t.dev`]);
  const ins = "insert into mentor_recommendations (user_id, dedupe_key, context_hash, kind, rule, entity_type, entity_id, title, reason, priority, href, rules_version) values ($1, $2, 'h1', 'aula_pendente', 'A', 'aula', 'l1', 'Aula', 'Motivo', 90, '/aula/l1', '1.0.0')";
  await t.db.query(ins, [A, "aula_pendente:l1"]);
  await t.db.query(ins, [B, "aula_pendente:l1"]);
}, 60_000);
afterAll(async () => t?.close());

const itDb = (name: string, fn: () => Promise<void>) => it(name, async () => (t.available ? fn() : console.warn(`[db] PULADO: ${name} — ${t.reason}`)));

async function asUser<T>(role: "authenticated" | "anon", uid: string | null, fn: () => Promise<T>): Promise<T> {
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

describe("mentor_recommendations (RLS)", () => {
  itDb("o aluno A lê só as próprias recomendações", async () => {
    const rows = await asUser("authenticated", A, async () => (await t.db.query("select user_id from mentor_recommendations")).rows);
    expect(rows).toHaveLength(1);
    expect(rows[0].user_id).toBe(A);
  });

  itDb("A não consegue ler a recomendação de B nem filtrando por user_id", async () => {
    const rows = await asUser("authenticated", A, async () => (await t.db.query("select * from mentor_recommendations where user_id = $1", [B])).rows);
    expect(rows).toHaveLength(0);
  });

  itDb("o navegador não insere, não altera e não apaga (nem as próprias)", async () => {
    for (const sql of [
      ["insert into mentor_recommendations (user_id, dedupe_key, context_hash, kind, rule, entity_type, entity_id, title, reason, priority, href, rules_version) values ($1,'x','h','reforco','C','assunto','t','T','R',1,'/questoes','1.0.0')", [A]],
      ["update mentor_recommendations set status = 'concluida' where user_id = $1", [A]],
      ["delete from mentor_recommendations where user_id = $1", [A]],
    ] as const) {
      await expect(asUser("authenticated", A, () => t.db.query(sql[0], [...sql[1]]))).rejects.toThrow(/permission denied/);
    }
  });

  itDb("anônimo não lê nada", async () => {
    await expect(asUser("anon", null, () => t.db.query("select * from mentor_recommendations"))).rejects.toThrow(/permission denied/);
  });

  itDb("a mesma recomendação no mesmo contexto não duplica; link externo é recusado", async () => {
    const dup = "insert into mentor_recommendations (user_id, dedupe_key, context_hash, kind, rule, entity_type, entity_id, title, reason, priority, href, rules_version) values ($1,'aula_pendente:l1','h1','aula_pendente','A','aula','l1','Aula','Motivo',90,$2,'1.0.0')";
    await t.db.query("begin");
    try {
      await t.db.query(dup + " on conflict do nothing", [A, "/aula/l1"]);
      expect((await t.db.query("select count(*)::int n from mentor_recommendations where user_id = $1", [A])).rows[0].n).toBe(1);
    } finally {
      await t.db.query("rollback");
    }
    await t.db.query("begin");
    try {
      await expect(t.db.query(dup.replace("'h1'", "'h2'"), [A, "https://malicioso.example"])).rejects.toThrow(/check/);
    } finally {
      await t.db.query("rollback");
    }
  });
});
