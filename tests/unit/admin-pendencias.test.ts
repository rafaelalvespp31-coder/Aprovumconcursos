/** Notificações do admin: soma o que depende da equipe e só o admin consegue ler. */
import { beforeEach, describe, expect, it, vi } from "vitest";

type Row = Record<string, unknown>;
const tables: Record<string, Row[]> = {};
let admin = true;

function from(table: string) {
  const filters: Array<(r: Row) => boolean> = [];
  const rows = () => (tables[table] ?? []).filter((r) => filters.every((f) => f(r))).sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  const q = {
    select: () => q,
    eq: (c: string, v: unknown) => (filters.push((r) => r[c] === v), q),
    gt: (c: string, v: string) => (filters.push((r) => String(r[c] ?? "") > v), q),
    not: () => q,
    in: () => q,
    order: () => q,
    limit: () => q,
    maybeSingle: async () => ({ data: rows()[0] ?? null, error: null }),
    then: (res: (v: { count: number; data: Row[]; error: null }) => unknown) => res({ count: rows().length, data: rows(), error: null }),
  };
  return q;
}

vi.mock("@/server/supabase", () => ({ createAdminClient: () => ({ from }) }));
vi.mock("@/server/auth", () => ({ getSessionUser: async () => ({ id: "u1", email: null }), isAdmin: async () => admin }));

const { getAdminPendencias, resetAdminPendenciasCache } = await import("@/server/services/admin-pendencias");
const { GET } = await import("@/app/api/admin/pendencias/route");

beforeEach(() => {
  for (const k of Object.keys(tables)) delete tables[k];
  admin = true;
  resetAdminPendenciasCache();
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
    tables.edital_preparations = [{ strategic_exam_id: "e1", created_at: "2026-11-10T12:00:00Z" }];
    const r = await getAdminPendencias();
    expect(Object.fromEntries(r.items.map((i) => [i.key, i.count]))).toEqual({ planos: 2, avatares: 1, pagamentos: 0, feedbacks: 0, indicacoes: 0, parceiros: 0, raiox: 1 });
    expect(r.total).toBe(4);
    expect(r.items.find((i) => i.key === "planos")?.latestAt).toBe("2026-11-10T11:00:00Z");
  });
  it("compra aprovada, feedback, recompensa e venda de parceiro entram como novidade; o que já foi visto não", async () => {
    tables.mp_payments = [
      { status: "aprovado", approved_at: "2026-11-20T10:00:00Z" },
      { status: "aprovado", approved_at: "2026-11-01T10:00:00Z" },
      { status: "pendente", approved_at: null },
    ];
    tables.lesson_feedbacks = [{ status: "enviado", created_at: "2026-11-20T09:00:00Z" }, { status: "dispensado", created_at: "2026-11-20T09:30:00Z" }];
    tables.referral_rewards = [{ status: "pendente", created_at: "2026-11-19T09:00:00Z" }, { status: "enviado", created_at: "2026-11-18T09:00:00Z" }];
    tables.partner_coupon_redemptions = [{ status: "aprovado", approved_at: "2026-11-20T11:00:00Z" }, { status: "iniciado", approved_at: null }];
    tables.admin_visto = [{ feature: "pagamentos", seen_at: "2026-11-15T00:00:00Z" }];
    const r = await getAdminPendencias();
    const n = Object.fromEntries(r.items.map((i) => [i.key, i.count]));
    expect(n).toMatchObject({ pagamentos: 1, feedbacks: 1, indicacoes: 1, parceiros: 1 });
    expect(r.items.find((i) => i.key === "pagamentos")?.latestAt).toBe("2026-11-20T10:00:00Z");
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
