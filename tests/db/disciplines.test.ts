/**
 * Matérias cadastradas (catalog_disciplines): só o servidor lê e grava. O navegador (anon ou
 * aluno logado) não lê nem altera; o identificador e o nome são validados pelo banco.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDb, type TestDb } from "./helpers";

const A = "00000000-0000-4000-8000-0000000000d7";
let t: TestDb;

beforeAll(async () => {
  t = await createTestDb("disciplines");
  if (!t.available) return;
  await t.db.query("insert into auth.users (id, email) values ($1, 'd7@t.dev') on conflict do nothing", [A]);
  await t.db.query("insert into catalog_disciplines (slug, label, base_mode) values ('criminologia', 'Criminologia', 'direito_penal')");
}, 60_000);
afterAll(async () => t?.close());

const itDb = (name: string, fn: () => Promise<void>) => it(name, async () => (t.available ? fn() : console.warn(`[db] PULADO: ${name} — ${t.reason}`)));

async function as<T>(role: "authenticated" | "anon", fn: () => Promise<T>): Promise<T> {
  await t.db.query("begin");
  try {
    if (role === "authenticated") await t.db.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ sub: A, role })]);
    await t.db.query(`set local role ${role}`);
    return await fn();
  } finally {
    await t.db.query("rollback");
  }
}

describe("catalog_disciplines", () => {
  itDb("aluno logado e anônimo não leem nem gravam", async () => {
    for (const role of ["authenticated", "anon"] as const) {
      await expect(as(role, () => t.db.query("select * from catalog_disciplines"))).rejects.toThrow(/permission denied/);
      await expect(as(role, () => t.db.query("insert into catalog_disciplines (slug, label, base_mode) values ('x_y', 'XY', 'outra')"))).rejects.toThrow(/permission denied/);
      await expect(as(role, () => t.db.query("delete from catalog_disciplines"))).rejects.toThrow(/permission denied/);
    }
  });

  itDb("identificador, estilo e nome repetido são barrados pelo banco", async () => {
    const bad = async (sql: string) => {
      await t.db.query("begin");
      try {
        await expect(t.db.query(sql)).rejects.toThrow();
      } finally {
        await t.db.query("rollback");
      }
    };
    await bad("insert into catalog_disciplines (slug, label, base_mode) values ('Criminologia!', 'Outra', 'outra')");
    await bad("insert into catalog_disciplines (slug, label, base_mode) values ('nova', 'Nova', 'inventada')");
    await bad("insert into catalog_disciplines (slug, label, base_mode) values ('crim', ' criminologia ', 'outra')");
  });
});
