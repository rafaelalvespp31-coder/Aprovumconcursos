import { describe, expect, it } from "vitest";
import { resumeIndex } from "./resume";

const ids = Array.from({ length: 40 }, (_, i) => `q${i + 1}`);
const done = (n: number) => new Set(ids.slice(0, n));

describe("continuar o caderno de onde parou", () => {
  it("fez 22 de 40 e fechou: volta na 23ª", () => {
    expect(resumeIndex(ids, "q22", done(22))).toBe(22);
  });
  it("estava olhando uma questão sem responder: volta nela", () => {
    expect(resumeIndex(ids, "q30", done(22))).toBe(29);
  });
  it("respondeu fora de ordem: vai para a próxima não respondida depois da atual", () => {
    const ans = new Set(["q1", "q2", "q10", "q11"]);
    expect(resumeIndex(ids, "q10", ans)).toBe(11);
  });
  it("respondeu a última, mas faltaram questões antes: volta na primeira que faltou", () => {
    const ans = new Set(ids.filter((x) => x !== "q5"));
    expect(resumeIndex(ids, "q40", ans)).toBe(4);
  });
  it("tudo respondido: fica na questão em que estava", () => {
    expect(resumeIndex(ids, "q17", done(40))).toBe(16);
  });
  it("sem posição salva: primeira não respondida (ou a primeira, se nada foi feito)", () => {
    expect(resumeIndex(ids, null, done(3))).toBe(3);
    expect(resumeIndex(ids, null, new Set())).toBe(0);
    expect(resumeIndex(ids, "nao-existe", done(2))).toBe(2);
    expect(resumeIndex([], "q1", new Set())).toBe(0);
  });
});
