import { describe, expect, it } from "vitest";
import { splitLessons } from "./bulk";

const L = (t: string) => `=== AULA ===\nTítulo: ${t}\nMatéria: Direito Penal\n\n=== TEXTO-BASE ===\n1 Item`;

describe("divisão do arquivo em massa", () => {
  it("separa uma aula por === AULA ===, também dentro de blocos de código", () => {
    const raw = "Aqui estão as aulas:\n```text\n" + L("A") + "\n```\n\n```text\n" + L("B") + "\n```\n" + L("C");
    const r = splitLessons(raw);
    expect(r.map((c) => c.index)).toEqual([1, 2, 3]);
    expect(r[0]!.text).toContain("Título: A");
    expect(r[0]!.text).not.toContain("Título: B");
    expect(r[2]!.text).toContain("Título: C");
    expect(r[1]!.line).toBeGreaterThan(r[0]!.line);
  });
  it("aceita o marcador em negrito ou com #", () => {
    expect(splitLessons("**=== AULA ===**\nTítulo: A\n### === AULA ===\nTítulo: B").length).toBe(2);
  });
  it("sem marcador, vira uma aula só; vazio, nenhuma", () => {
    expect(splitLessons("Título: A").length).toBe(1);
    expect(splitLessons("  \n ")).toEqual([]);
  });
});
