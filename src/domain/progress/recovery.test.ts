import { describe, expect, it } from "vitest";
import { wrongRoots } from "./recovery";

const q = (id: string, recovery_of: string | null = null) => ({ id, node_id: `n-${id}`, statement: `Q ${id}`, recovery_of });
const a = (question_id: string, is_correct: boolean, t: number) => ({ question_id, is_correct, created_at: `2026-10-11T10:00:${String(t).padStart(2, "0")}Z` });

describe("recuperação de nível", () => {
  it("aponta só as questões oficiais erradas e as ainda não respondidas", () => {
    const r = wrongRoots([q("a"), q("b"), q("c")], [a("a", true, 1), a("b", false, 2)]);
    expect(r.wrong.map((x) => x.id)).toEqual(["b"]);
    expect(r.unanswered.map((x) => x.id)).toEqual(["c"]);
  });

  it("acertar a recuperação resolve a questão original; errar de novo mantém pendente", () => {
    const qs = [q("a"), q("b"), q("r1", "b")];
    expect(wrongRoots(qs, [a("a", true, 1), a("b", false, 2), a("r1", true, 3)]).wrong).toHaveLength(0);
    expect(wrongRoots(qs, [a("a", true, 1), a("b", false, 2), a("r1", false, 3)]).wrong.map((x) => x.id)).toEqual(["b"]);
  });

  it("vale a resposta mais recente da cadeia (nova recuperação depois de outra errada)", () => {
    const qs = [q("b"), q("r1", "b"), q("r2", "b")];
    const r = wrongRoots(qs, [a("b", false, 1), a("r1", false, 2), a("r2", true, 3)]);
    expect(r.wrong).toHaveLength(0);
    expect(r.unanswered).toHaveLength(0);
  });

  it("responder só a recuperação não conta como ter respondido a questão oficial", () => {
    const r = wrongRoots([q("b"), q("r1", "b")], [a("r1", true, 1)]);
    expect(r.unanswered.map((x) => x.id)).toEqual(["b"]);
  });
});
