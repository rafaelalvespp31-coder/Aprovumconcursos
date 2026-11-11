import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseProgrammaticText } from "./parser";

describe("conteúdo programático em texto corrido (PMERJ)", () => {
  const r = parseProgrammaticText(readFileSync(join(__dirname, "fixtures/pmerj.txt"), "utf8"));
  const titles = r.disciplines[0]!.topics.map((t) => t.title);

  it("separa dezenas de assuntos, não só 2", () => {
    expect(titles.length).toBeGreaterThanOrEqual(35);
  });
  it("não corta em 'nº' nem dentro de leis", () => {
    expect(titles).toContain("Consórcio Público: Lei Federal nº 11.107/2005");
    expect(titles.some((t) => /^\d/.test(t) || /^Federal/.test(t))).toBe(false);
  });
  it("mantém assuntos conhecidos separados", () => {
    expect(titles).toContain("Entidades do Terceiro Setor");
    expect(titles).toContain("Contratos administrativos");
    expect(titles).toContain("Improbidade Administrativa");
  });
});
