/** Notificações do admin: soma o que depende da equipe e só o admin consegue ler. */
import { beforeEach, describe, expect, it, vi } from "vitest";

type Row = Record<string, unknown>;
const tables: Record<string, Row[]> = {};
let admin = true;
let raio: Array<{ createdAt: string }> = [];

function from(table: string) {
  const filters: Array<(r: Row) => boolean> = [];
  const rows = () => (tables[table] ?? []).filter((r) => filters.every((f) => f(r))).sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  const q = {
    select: () => q,
    eq: (c: string, v: unknown) => (filters.push((r) => r[c] === v), q),
    order: () => q,
    limit: () => q,
    maybeSingle: async () => ({ data: rows()[0] ?? null, error: null }),
    then: (res: (v: { count: number; data: Row[]; error: null }) => unknown) => res({ count: rows().length, data: rows(), error: null }),
  };
  return q;
}

vi.mock("@/server/supabase", () => ({ createAdminClient: () => ({ from }) }));
vi.mock("@/server/services/strategic", () => ({ listRaioXRequests: async () => raio }));
vi.mock("@/server/auth", () => ({ getSessionUser: async () => ({ id: "u1", email: null }), isAdmin: async () => admin }));

const { getAdminPendencias } = await import("@/server/services/admin-pendencias");
const { GET } = await import("@/app/api/admin/pendencias/route");

beforeEach(() => {
  for (const k of Object.keys(tables)) delete tables[k];
  admin = true;
  raio = [];
});

describe("pendências da equipe", () => {
  it("sem pedidos: total 0", async () => {
    expect((await getAdminPendencias()).total).toBe(0);
  });
  it("soma pedidos de plano novos, avatares enviados e Raio-X; ignora o que já foi atendido", async () => {
    tables.plan_requests = [
      { status: "novo", created_at: "2026-11-10T10:00:00Z" },
      { status: "novo", created_at: "2026-11-10T11:00:00Z" },
      { status: "atendido", created_at: "2026-11-09T11:00:00Z" },
    ];
    tables.avatar_requests = [
      { status: "enviada", created_at: "2026-11-10T09:00:00Z" },
      { status: "em_producao", created_at: "2026-11-10T08:00:00Z" },
      { status: "concluida", created_at: "2026-11-09T08:00:00Z" },
    ];
    raio = [{ createdAt: "2026-11-10T12:00:00Z" }];
    const r = await getAdminPendencias();
    expect(Object.fromEntries(r.items.map((i) => [i.key, i.count]))).toEqual({ planos: 2, avatares: 1, raiox: 1 });
    expect(r.total).toBe(4);
    expect(r.items.find((i) => i.key === "planos")?.latestAt).toBe("2026-11-10T11:00:00Z");
  });
  it("a rota recusa quem não é admin", async () => {
    admin = false;
    expect((await GET()).status).toBe(403);
  });
  it("a rota devolve as pendências ao admin, sem cache", async () => {
    tables.plan_requests = [{ status: "novo", created_at: "2026-11-10T11:00:00Z" }];
    const res = await GET();
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect((await res.json()).total).toBe(1);
  });
});
