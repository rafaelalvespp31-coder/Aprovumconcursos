/**
 * Sistema central de permissões com a degustação "O Caveira ficou maluco":
 * plano original + assinatura + concessão promocional válida (conferida no servidor, a cada chamada).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { promoIsValid, promoRemaining, promoRemainingLabel } from "@/domain/plans/promo";

type Row = Record<string, unknown>;
const tables: Record<string, Row[]> = {};
const inserts: Array<{ table: string; row: Row }> = [];

/** Banco em memória com o subconjunto de filtros que os serviços usam. */
function from(table: string) {
  const filters: Array<(r: Row) => boolean> = [];
  let lim = Infinity;
  const q = {
    select: () => q,
    eq: (c: string, v: unknown) => (filters.push((r) => r[c] === v), q),
    neq: (c: string, v: unknown) => (filters.push((r) => r[c] !== v), q),
    gt: (c: string, v: string) => (filters.push((r) => String(r[c]) > v), q),
    gte: (c: string, v: string) => (filters.push((r) => String(r[c]) >= v), q),
    in: (c: string, v: unknown[]) => (filters.push((r) => v.includes(r[c])), q),
    is: (c: string, v: unknown) => (filters.push((r) => (r[c] ?? null) === v), q),
    order: () => q,
    limit: (n: number) => ((lim = n), q),
    rows: () => (tables[table] ?? []).filter((r) => filters.every((f) => f(r))).slice(0, lim),
    maybeSingle: async () => ({ data: q.rows()[0] ?? null, error: null }),
    single: async () => ({ data: q.rows()[0] ?? null, error: null }),
    insert: async (row: Row) => (inserts.push({ table, row }), { error: null }),
    then: (res: (v: { data: Row[]; error: null; count: number }) => unknown) => res({ data: q.rows(), error: null, count: q.rows().length }),
  };
  return q;
}

vi.mock("@/server/supabase", () => ({ createAdminClient: () => ({ from }) }));

const { getMyPlan, getPlanUsage, assertQuota, claimDailyLesson } = await import("@/server/services/plans");

const U = "00000000-0000-4000-8000-00000000aa01";
const iso = (ms: number) => new Date(Date.now() + ms).toISOString();
const DAY = 86_400_000;

function setUser({ plan = "free", end = null as string | null, promoEnd = null as string | null, admin = false } = {}) {
  for (const k of Object.keys(tables)) delete tables[k];
  inserts.length = 0;
  tables.subscriptions = [{ user_id: U, plan_id: plan, status: "active", current_period_end: end }];
  tables.admin_roles = admin ? [{ user_id: U, role: "admin" }] : [];
  tables.promo_grants = promoEnd
    ? [{ id: "g1", user_id: U, campaign_id: "caveira-ficou-maluco", status: "ativo", starts_at: iso(-DAY), expires_at: promoEnd, popup_seen_at: null, promo_campaigns: { name: "O CAVEIRA FICOU MALUCO", plan_id: "premium" } }]
    : [];
  // Limites do gratuito já esgotados hoje.
  tables.bank_attempts = Array.from({ length: 5 }, (_, i) => ({ id: `b${i}`, user_id: U, created_at: iso(-1000) }));
  tables.quiz_attempts = Array.from({ length: 5 }, (_, i) => ({ id: `q${i}`, user_id: U, created_at: iso(-1000) }));
  tables.daily_lesson_access = [{ user_id: U, day: new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date()), lesson_id: "aula-de-hoje" }];
  tables.lessons = [{ id: "aula-de-hoje", title: "Aula de hoje" }];
}

describe("permissões com degustação premium", () => {
  beforeEach(() => setUser());

  it("aluno gratuito SEM concessão continua com os limites do gratuito", async () => {
    const p = await getMyPlan(U);
    expect(p).toMatchObject({ planId: "free", paid: false, unlimited: false, promo: null });
    await expect(assertQuota(U, "questoes")).rejects.toThrow(/5 questões/);
    await expect(assertQuota(U, "jogo")).rejects.toThrow(/Modo Jogo/);
    expect((await claimDailyLesson(U, "outra-aula")).ok).toBe(false);
  });

  it("aluno gratuito COM concessão válida: tudo liberado no servidor, plano original intacto", async () => {
    setUser({ promoEnd: iso(6 * DAY) });
    const p = await getMyPlan(U);
    expect(p).toMatchObject({ planId: "free", paid: false, unlimited: true });
    expect(p.promo?.campaignId).toBe("caveira-ficou-maluco");
    await expect(assertQuota(U, "questoes")).resolves.toBeUndefined();
    await expect(assertQuota(U, "jogo")).resolves.toBeUndefined();
    expect(await claimDailyLesson(U, "outra-aula")).toEqual({ ok: true });
    expect(inserts).toHaveLength(0); // não consome a "aula do dia"
    expect(await getPlanUsage(U)).toMatchObject({ unlimited: true, paid: false, questionsLeft: null, promoUntil: tables.promo_grants![0]!.expires_at });
  });

  it("concessão vencida não vale nada: volta ao plano original na hora, sem rotina agendada", async () => {
    setUser({ promoEnd: iso(-1000) });
    expect(await getMyPlan(U)).toMatchObject({ unlimited: false, promo: null });
    await expect(assertQuota(U, "questoes")).rejects.toThrow();
  });

  it("concessão revogada não vale", async () => {
    setUser({ promoEnd: iso(DAY) });
    tables.promo_grants![0]!.status = "revogado";
    expect((await getMyPlan(U)).unlimited).toBe(false);
  });

  it("pagante mantém a assinatura (paid) com ou sem degustação", async () => {
    setUser({ plan: "pro", end: iso(20 * DAY), promoEnd: iso(6 * DAY) });
    expect(await getMyPlan(U)).toMatchObject({ planId: "pro", paid: true, unlimited: true });
    setUser({ plan: "pro", end: iso(20 * DAY), promoEnd: iso(-1) });
    expect(await getMyPlan(U)).toMatchObject({ planId: "pro", paid: true, unlimited: true, promo: null });
  });
});

describe("contador da degustação", () => {
  const now = new Date("2026-11-08T12:00:00Z");
  it("valida pelo instante de expiração", () => {
    expect(promoIsValid({ expiresAt: "2026-11-08T12:00:01Z" }, now)).toBe(true);
    expect(promoIsValid({ expiresAt: "2026-11-08T12:00:00Z" }, now)).toBe(false);
    expect(promoIsValid(null, now)).toBe(false);
  });
  it("dias e horas restantes", () => {
    expect(promoRemainingLabel("2026-11-15T12:00:00Z", now)).toBe("7 DIAS RESTANTES");
    expect(promoRemainingLabel("2026-11-14T11:00:00Z", now)).toBe("6 DIAS RESTANTES");
    expect(promoRemainingLabel("2026-11-09T11:00:00Z", now)).toBe("23 HORAS RESTANTES");
    expect(promoRemainingLabel("2026-11-09T13:00:00Z", now)).toBe("2 DIAS RESTANTES");
    expect(promoRemainingLabel("2026-11-08T12:30:00Z", now)).toBe("MENOS DE 1 HORA");
    expect(promoRemainingLabel("2026-11-08T11:00:00Z", now)).toBe("DEGUSTAÇÃO ENCERRADA");
    expect(promoRemaining("2026-11-08T11:00:00Z", now).expired).toBe(true);
  });
});
