import { describe, expect, it } from "vitest";
import { filterPagesByRole } from "./role-filter";
import { parseProgrammaticText } from "./parser";

const OPTS = ["Guarda Civil Municipal", "Agente Administrativo", "Fiscal de Posturas", "Técnico de Enfermagem", "Motorista"];
const EDITAL = `CONTEÚDO PROGRAMÁTICO
CARGO: GUARDA CIVIL MUNICIPAL
DIREITO PENAL
1. Princípios do Direito Penal
2. Aplicação da lei penal
LÍNGUA PORTUGUESA
1. Compreensão e interpretação de textos
CARGO: AGENTE ADMINISTRATIVO
INFORMÁTICA
1. Conceitos de internet
2. Planilhas eletrônicas
LÍNGUA PORTUGUESA
1. Ortografia oficial
CARGO: MOTORISTA
LEGISLAÇÃO DE TRÂNSITO
1. Código de Trânsito Brasileiro
CARGO: TÉCNICO DE ENFERMAGEM
ENFERMAGEM
1. Biossegurança
CARGO: FISCAL DE POSTURAS
DIREITO ADMINISTRATIVO
1. Poder de polícia`;

const names = (text: string) => parseProgrammaticText(text).disciplines.map((d) => d.name);

describe("separação do conteúdo por cargo", () => {
  it("5 cargos, escolhendo só um: nada dos outros entra", () => {
    const r = filterPagesByRole([EDITAL], "Guarda Civil Municipal", OPTS);
    expect(r.applied).toBe(true);
    expect(r.removedLines).toBeGreaterThan(8);
    const out = r.pages.join("\n");
    expect(out).toContain("DIREITO PENAL");
    expect(out).not.toMatch(/INFORMÁTICA|TRÂNSITO|ENFERMAGEM|Poder de polícia|Ortografia/);
    expect(names(out)).toEqual(["DIREITO PENAL", "LÍNGUA PORTUGUESA"]);
  });
  it("cada cargo recebe só o seu conteúdo, inclusive disciplina de mesmo nome", () => {
    const adm = names(filterPagesByRole([EDITAL], "Agente Administrativo", OPTS).pages.join("\n"));
    expect(adm).toEqual(["INFORMÁTICA", "LÍNGUA PORTUGUESA"]);
    const lp = parseProgrammaticText(filterPagesByRole([EDITAL], "Agente Administrativo", OPTS).pages.join("\n")).disciplines.find((d) => d.name === "LÍNGUA PORTUGUESA")!;
    expect(lp.topics.map((t) => t.title)).toEqual(["Ortografia oficial"]);
  });
  it("cargo digitado de forma abreviada ainda acha o cargo do edital", () => {
    const r = filterPagesByRole([EDITAL], "guarda civil", OPTS);
    expect(r.target).toBe("Guarda Civil Municipal");
    expect(r.pages.join("\n")).toContain("DIREITO PENAL");
  });
  it("conteúdo comum a todos os cargos fica para todos", () => {
    const txt = "CARGO: MOTORISTA\nLEGISLAÇÃO DE TRÂNSITO\n1. CTB\nTODOS OS CARGOS\nLÍNGUA PORTUGUESA\n1. Interpretação de textos\n2. Ortografia oficial\nCARGO: GUARDA CIVIL MUNICIPAL\nDIREITO PENAL\n1. Princípios do Direito Penal";
    const out = filterPagesByRole([txt], "Guarda Civil Municipal", OPTS).pages.join("\n");
    expect(out).toContain("LÍNGUA PORTUGUESA");
    expect(out).toContain("DIREITO PENAL");
    expect(out).not.toContain("TRÂNSITO");
  });
  it("edital sem títulos de cargo: não remove nada e avisa que não separou", () => {
    const txt = "DIREITO PENAL\n1. Princípios\n2. Aplicação da lei penal";
    const r = filterPagesByRole([txt], "Motorista", OPTS);
    expect(r.applied).toBe(false);
    expect(r.pages[0]).toBe(txt);
  });
  it("assunto que cita o cargo no meio da disciplina não vira título de cargo", () => {
    const txt = "CARGO: GUARDA CIVIL MUNICIPAL\nDIREITO ADMINISTRATIVO\n1. Atribuições do Motorista e do Agente Administrativo na estrutura municipal\n2. Poder de polícia";
    const out = filterPagesByRole([txt], "Guarda Civil Municipal", OPTS).pages.join("\n");
    expect(out).toContain("Poder de polícia");
    expect(out).toContain("Atribuições do Motorista");
  });
});
