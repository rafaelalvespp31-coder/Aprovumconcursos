/** Redação por IA: plano gratuito = 1 envio por dia; pago/degustação = limite geral; admin sem limite. */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { redacaoDailyLimit, redacaoIaLimit } from "@/domain/plans/limits";

type Row = Record<string, unknown>;
const tables: Record<string, Row[]> = {};
let plan = { unlimited: false };
let admin = false;

function from(table: string) {
  const filters: Array<(r: Row) => boolean> = [];
  const q = {
    select: () => q,
    eq: (c: string, v: unknown) => (filters.push((r) => r[c] === v), q),
    gte: (c: string, v: string) => (filters.push((r) => String(r[c]) >= v), q),
    in: (c: string, v: unknown[]) => (filters.push((r) => v.includes(r[c])), q),
    order: () => q,
    limit: () => q,
    maybeSingle: async () => ({ data: rows()[0] ?? null, error: null }),
    single: async () => ({ data: { id: "eval-1" }, error: null }),
    insert: (row: Row) => ((tables[table] ??= []).push(row), q),
    update: () => q,
    then: (res: (v: { data: Row[]; error: null; count: number }) => unknown) => res({ data: rows(), error: null, count: rows().length }),
  };
  const rows = () => (tables[table] ?? []).filter((r) => filters.every((f) => f(r)));
  return q;
}

vi.mock("@/server/supabase", () => ({ createAdminClient: () => ({ from }), createUserClient: async () => ({ from }) }));
vi.mock("@/server/auth", () => ({ isAdmin: async () => admin, getSessionUser: async () => null }));
vi.mock("@/server/services/plans", () => ({ getMyPlan: async () => plan }));
vi.mock("@/server/services/trails", () => ({ enforceRateLimit: async () => undefined, UserFacingError: class extends Error { code: string; constructor(m: string, c = "x") { super(m); this.code = c; } } }));
vi.mock("@/ai", async (orig) => ({ ...(await orig<Record<string, unknown>>()), aiIsConfigured: () => true }));
vi.mock("@/server/services/redacao-ia", () => ({ limiteDiario: () => 5, exigirIA: () => undefined, chamarIA: async () => ({}), USER_FACING_AI: "" }));

const { submitForCorrection, askTeacher } = await import("@/server/services/redacao");

const U = "00000000-0000-4000-8000-00000000aa01";
const SUB = "00000000-0000-4000-8000-00000000bb01";
const body = Array.from({ length: 400 }, () => "palavra").join(" ");
const today = () => new Date().toISOString();

beforeEach(() => {
  for (const k of Object.keys(tables)) delete tables[k];
  plan = { unlimited: false };
  admin = false;
  tables.writing_submissions = [{ id: SUB, user_id: U, body, modality: "dissertativa", status: "rascunho" }];
});

describe("limite diário de redação", () => {
  it("regra: gratuito 1, pago/degustação o limite geral", () => {
    expect(redacaoDailyLimit({ unlimited: false }, 5)).toBe(1);
    expect(redacaoDailyLimit({ unlimited: true }, 5)).toBe(5);
  });
  it("gratuito: o primeiro envio do dia passa", async () => {
    await expect(submitForCorrection(U, SUB)).resolves.toMatchObject({ created: true });
  });
  it("gratuito: o segundo envio no mesmo dia é barrado", async () => {
    tables.writing_submissions!.push({ id: "outra", user_id: U, status: "concluida", submitted_at: today() });
    await expect(submitForCorrection(U, SUB)).rejects.toThrow(/plano gratuito libera 1 redação por dia/);
  });
  it("pago: com 1 envio hoje ainda pode enviar", async () => {
    plan = { unlimited: true };
    tables.writing_submissions!.push({ id: "outra", user_id: U, status: "concluida", submitted_at: today() });
    await expect(submitForCorrection(U, SUB)).resolves.toMatchObject({ created: true });
  });
  it("admin não tem limite", async () => {
    admin = true;
    for (let i = 0; i < 6; i++) tables.writing_submissions!.push({ id: `o${i}`, user_id: U, status: "concluida", submitted_at: today() });
    await expect(submitForCorrection(U, SUB)).resolves.toMatchObject({ created: true });
  });
});

describe("cota diária dos demais usos de IA da redação", () => {
  const chat = { messages: [{ role: "user" as const, content: "Como melhorar minha coesão?" }] };
  const usos = (n: number) => Array.from({ length: n }, () => ({ user_id: U, kind: "redacao.chat", ok: true, created_at: today() }));
  it("limites: gratuito x pago", () => {
    expect(redacaoIaLimit("redacao.chat", { unlimited: false })).toBe(10);
    expect(redacaoIaLimit("redacao.chat", { unlimited: true })).toBe(60);
    expect(redacaoIaLimit("redacao.tema", { unlimited: false })).toBe(1);
  });
  it("gratuito: com 10 mensagens hoje, a 11ª é barrada no chat", async () => {
    tables.writing_usage = usos(10);
    await expect(askTeacher(U, chat)).rejects.toThrow(/plano gratuito libera 10 usos por dia/);
  });
  it("pago: com 10 mensagens hoje ainda passa da cota (segue para a IA)", async () => {
    plan = { unlimited: true };
    tables.writing_usage = usos(10);
    // passa pela cota; a chamada de IA é um mock vazio, então falha depois, em outro ponto — não na cota
    await expect(askTeacher(U, chat)).rejects.not.toThrow(/libera|limite de/);
  });
  it("admin não tem cota", async () => {
    admin = true;
    tables.writing_usage = usos(500);
    await expect(askTeacher(U, chat)).rejects.not.toThrow(/libera|limite de/);
  });
});
