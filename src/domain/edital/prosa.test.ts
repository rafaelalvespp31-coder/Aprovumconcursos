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

describe("itens numerados colados em texto corrido", () => {
  const r = parseProgrammaticText(readFileSync(join(__dirname, "fixtures/lingua-portuguesa.txt"), "utf8"));
  const t = r.disciplines[0]!.topics;
  it("separa tópicos e subtópicos, mesmo com número no fim da linha", () => {
    expect(t.map((x) => x.code)).toEqual(["1","2","3","4","4.1","4.2","5","5.1","5.2","5.3","5.4","5.5","5.6","5.7","5.8","6","6.1","6.2","6.3","6.4","7","7.1","7.2","7.3","7.4"]);
    expect(t.find((x) => x.code === "7")!.title).toMatch(/^Correspondência oficial/);
    expect(t.find((x) => x.code === "4.1")!.title).toMatch(/^Emprego de elementos de referenciação/);
  });
});

describe("várias matérias na mesma linha (PRF)", () => {
  const r = parseProgrammaticText(readFileSync(join(__dirname, "fixtures/prf.txt"), "utf8"));
  it("lê todas as matérias, não só a primeira", () => {
    const names = r.disciplines.map((d) => d.name);
    expect(names).toEqual(["LÍNGUA PORTUGUESA", "RACIOCÍNIO LÓGICO", "INFORMÁTICA", "DIREITO CONSTITUCIONAL", "DIREITO PENAL"]);
    expect(r.disciplines[1]!.topics.map((t) => t.code)).toEqual(["1", "2", "2.1", "3"]);
    expect(r.disciplines[3]!.topics.length).toBe(3);
  });
});
