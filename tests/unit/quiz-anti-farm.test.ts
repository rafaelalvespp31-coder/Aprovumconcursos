/** Modo Jogo: responder de novo a mesma pergunta não rende XP nem conta como nova resposta (cada pergunta vale uma vez por aluno). */
import { beforeEach, describe, expect, it, vi } from "vitest";

type Row = Record<string, unknown>;
const tables: Record<string, Row[]> = {};
const inserts: Row[] = [];

function from(table: string) {
  const filters: Array<(r: Row) => boolean> = [];
  const q = {
    select: () => q,
    eq: (c: string, v: unknown) => (filters.push((r) => r[c] === v), q),
    gte: (c: string, v: string) => (filters.push((r) => String(r[c]) >= v), q),
    order: () => q,
    limit: () => q,
    insert: async (row: Row) => {
      inserts.push(row);
      (tables[table] ??= []).push({ ...row, created_at: new Date().toISOString() });
      return { error: null };
    },
    then: (res: (v: { data: Row[]; error: null; count: number }) => unknown) => {
      const rows = (tables[table] ?? []).filter((r) => filters.every((f) => f(r)));
      return res({ data: rows, error: null, count: rows.length });
    },
  };
  return q;
}

const U = "00000000-0000-4000-8000-00000000aa01";
const TOPIC = "00000000-0000-4000-8000-0000000000t1".replace("t", "a");

vi.mock("@/server/supabase", () => ({ createAdminClient: () => ({ from }), createUserClient: async () => ({ from }) }));
vi.mock("@/server/auth", () => ({ requireUser: async () => ({ id: U, email: null }) }));
vi.mock("@/server/services/plans", () => ({ assertQuota: async () => undefined }));
vi.mock("@/server/services/disciplines", () => ({ ensureDisciplines: async () => undefined }));
vi.mock("@/server/services/trails", () => ({ enforceRateLimit: async () => undefined, UserFacingError: class extends Error { code = "x"; } }));
vi.mock("@/server/queries", () => ({ getStudyStats: async () => ({}) }));
vi.mock("@/domain/quiz/cloze", async (orig) => {
  const real = await orig<typeof import("@/domain/quiz/cloze")>();
  return { ...real, buildAll: () => [{ nodeKey: "N0001", answers: ["certo"], parts: [], ref: "Art. 1º", context: "" }], checkCloze: (_i: unknown, given: string[]) => given.map((g) => g === "certo") };
});

const { checkAnswer } = await import("@/server/services/quiz");

beforeEach(() => {
  inserts.length = 0;
  for (const k of Object.keys(tables)) delete tables[k];
  tables.catalog_topics = [{ id: TOPIC, title: "Tema", discipline_mode: "penal", law_code: null, nodes: [], lesson: {}, status: "publicado" }];
});

describe("checkAnswer: anti-farm de XP", () => {
  it("o primeiro acerto rende XP e é gravado", async () => {
    const r = await checkAnswer(TOPIC, "N0001", ["certo"], 1);
    expect(r.correct).toBe(true);
    expect(r.xp).toBeGreaterThan(0);
    expect(inserts).toHaveLength(1);
  });
  it("repetir o acerto no mesmo item não rende XP e não grava nova resposta", async () => {
    await checkAnswer(TOPIC, "N0001", ["certo"], 1);
    const again = await checkAnswer(TOPIC, "N0001", ["certo"], 1);
    expect(again.correct).toBe(true);
    expect(again.xp).toBe(0);
    expect(inserts).toHaveLength(1);
  });
  it("errar continua sendo gravado (sem XP)", async () => {
    const r = await checkAnswer(TOPIC, "N0001", ["errado"], 1);
    expect(r.correct).toBe(false);
    expect(r.xp).toBe(0);
    expect(inserts).toHaveLength(1);
  });
});
