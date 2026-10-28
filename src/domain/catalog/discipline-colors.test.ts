import { afterEach, describe, expect, it } from "vitest";
import { setCustomDisciplines } from "@/ai/pedagogy";
import { DISCIPLINE_PALETTE, disciplineColor } from "./discipline-colors";

const lum = (hex: string) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0]! + 0.7152 * c[1]! + 0.0722 * c[2]!;
};
const contrastWithWhite = (hex: string) => 1.05 / (lum(hex) + 0.05);

afterEach(() => setCustomDisciplines([]));

describe("cores das matérias", () => {
  it("todas diferentes (fixas e extras) e legíveis com texto branco", () => {
    const all = [...Object.values(DISCIPLINE_PALETTE.fixed), ...DISCIPLINE_PALETTE.extra].map((c) => c.toLowerCase());
    expect(new Set(all).size).toBe(all.length);
    for (const c of all) expect(contrastWithWhite(c)).toBeGreaterThanOrEqual(4.5);
  });

  it("matérias cadastradas ganham cores próprias, diferentes das fixas", () => {
    setCustomDisciplines([
      { slug: "criminologia", label: "Criminologia", base: "direito_penal" },
      { slug: "direitos_humanos", label: "Direitos Humanos", base: "direito_constitucional" },
    ]);
    const fixed = new Set(Object.values(DISCIPLINE_PALETTE.fixed));
    const a = disciplineColor("criminologia");
    const b = disciplineColor("direitos_humanos");
    expect(a).not.toBe(b);
    expect(fixed.has(a) || fixed.has(b)).toBe(false);
    expect(disciplineColor("direito_penal")).toBe("#C62828");
  });
});
