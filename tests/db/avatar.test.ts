/** Avatar: o aluno lê só o próprio; ninguém grava pelo navegador (só o servidor, que valida). */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDb, type TestDb } from "./helpers";

const A = "00000000-0000-4000-8000-0000000000b1";
const B = "00000000-0000-4000-8000-0000000000b2";
let t: TestDb;

beforeAll(async () => {
  t = await createTestDb("avatar");
  if (!t.available) return;
  for (const u of [A, B]) await t.db.query("insert into auth.users (id, email) values ($1, $2) on conflict do nothing", [u, `${u.slice(-2)}@t.dev`]);
  await t.db.query("insert into avatar_profiles (user_id, gender, skin, hair_color, equipped) values ($1, 'm', 'morena', 'preto', '{\"camiseta\":\"camiseta_oficial\"}'), ($2, 'f', 'clara', 'loiro', '{}')", [A, B]);
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

describe("avatar (RLS)", () => {
  itDb("catálogo inicial com modelos masculino e feminino e requisitos de nível", async () => {
    const r = await as(A, () => t.db.query("select id, min_level from avatar_items where slot = 'base' or id = 'uniforme_prf' order by id"));
    expect(r.rows).toEqual([
      { id: "base_feminino", min_level: 1 },
      { id: "base_masculino", min_level: 1 },
      { id: "uniforme_prf", min_level: 20 },
    ]);
  });

  itDb("cada aluno lê só o próprio avatar", async () => {
    const r = await as(A, () => t.db.query("select user_id from avatar_profiles"));
    expect(r.rows).toEqual([{ user_id: A }]);
  });

  itDb("o navegador não grava avatar (nem o próprio, nem o de outro) nem mexe no catálogo", async () => {
    await expect(as(A, () => t.db.query("update avatar_profiles set skin = 'negra' where user_id = $1", [A]))).rejects.toThrow(/permission denied/);
    await expect(as(A, () => t.db.query("update avatar_profiles set skin = 'negra' where user_id = $1", [B]))).rejects.toThrow(/permission denied/);
    await expect(as(A, () => t.db.query("insert into avatar_profiles (user_id, gender, skin, hair_color) values ($1, 'm', 'clara', 'preto')", [B]))).rejects.toThrow(/permission denied/);
    await expect(as(A, () => t.db.query("update avatar_items set min_level = 1 where id = 'uniforme_prf'"))).rejects.toThrow(/permission denied/);
  });

  itDb("valores fora da lista são recusados pelo banco", async () => {
    await expect(t.db.query("update avatar_profiles set skin = 'azul' where user_id = $1", [A])).rejects.toThrow(/check/);
    await expect(t.db.query("update avatar_profiles set gender = 'x' where user_id = $1", [A])).rejects.toThrow(/check/);
  });
});
