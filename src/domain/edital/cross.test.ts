import { describe, expect, it } from "vitest";
import { detectRoles, detectRole } from "./info";
import { crossSources } from "./cross";
import { parseProgrammaticText } from "./parser";

const TXT_A = "DIREITO PENAL\n1. Princípios do Direito Penal\n1.1 Legalidade e anterioridade\n2. Aplicação da lei penal\n2.1 Lei penal no tempo\n2.2 Lei penal no espaço\n\nLÍNGUA PORTUGUESA\n1. Compreensão e interpretação de textos\n2. Ortografia oficial\n3. Acentuação gráfica";
const TXT_B = "DIREITO PENAL\n1. Princípios do Direito Penal\n1.1 Legalidade e anterioridade\n2. Aplicação da lei penal\n2.1 Lei penal no tempo\n2.2 Lei penal no espaço\n\nINFORMÁTICA\n1. Conceitos de internet\n2. Navegadores";

describe("cargos do edital", () => {
  it("vários cargos: lista todos e não escolhe sozinho", () => {
    const pages = ["EDITAL Nº 1\nCARGO: GUARDA CIVIL MUNICIPAL\nCARGO: AGENTE ADMINISTRATIVO\nCARGO: MOTORISTA"];
    expect(detectRoles(pages).sort()).toEqual(["Agente Administrativo", "Guarda Civil Municipal", "Motorista"]);
    expect(detectRole(pages)).toBeNull();
  });
  it("um só cargo: seleciona automaticamente", () => {
    const pages = ["EDITAL\nCARGO: INVESTIGADOR DE POLÍCIA\nVagas: 10"];
    expect(detectRoles(pages)).toEqual(["Investigador de Polícia"]);
    expect(detectRole(pages)).toBe("Investigador de Polícia");
  });
  it("sem cargo claro: lista vazia (o aluno digita)", () => {
    expect(detectRoles(["Texto sem nenhum cargo citado de forma clara."])).toEqual([]);
  });
});

describe("cruzamento PDF × texto colado", () => {
  const text = parseProgrammaticText(TXT_A);
  const pdf = parseProgrammaticText(TXT_B);
  it("sem texto do aluno: usa só o PDF", () => {
    const r = crossSources(pdf, null);
    expect(r.used).toEqual({ pdf: true, text: false });
    expect(r.parsed).toBe(pdf);
  });
  it("PDF sem a seção: usa o texto colado", () => {
    const r = crossSources({ found: false, confidence: 0, sectionPages: null, disciplines: [], warnings: [] }, text);
    expect(r.used).toEqual({ pdf: false, text: true });
    expect(r.parsed.disciplines.map((d) => d.name)).toContain("LÍNGUA PORTUGUESA");
  });
  it("texto traz o que o PDF não leu: usa o texto e não perde disciplina", () => {
    const r = crossSources({ found: true, confidence: 1, sectionPages: [1, 1], disciplines: pdf.disciplines.slice(0, 1), warnings: [] }, text);
    expect(r.parsed.disciplines.length).toBe(2);
  });
  it("divergência é sinalizada, sem inventar nem esconder", () => {
    const r = crossSources(pdf, text);
    expect(r.used).toEqual({ pdf: true, text: true });
    expect(r.divergences.join(" ")).toMatch(/INFORMÁTICA.*PDF.*não no texto/i);
    expect(r.divergences.join(" ")).toMatch(/LÍNGUA PORTUGUESA.*texto colado.*não no PDF/i);
  });
  it("texto muito extenso não perde nenhum trecho", () => {
    const names = ["DIREITO PENAL", "DIREITO CIVIL", "DIREITO CONSTITUCIONAL", "DIREITO ADMINISTRATIVO", "LÍNGUA PORTUGUESA", "MATEMÁTICA", "INFORMÁTICA", "DIREITO PROCESSUAL PENAL"];
    const big = names.map((n, d) => `${n}\n` + Array.from({ length: 90 }, (_, t) => `${t + 1}. Assunto ${d + 1}-${t + 1} do conteúdo programático`).join("\n")).join("\n\n");
    expect(big.length).toBeGreaterThan(30000);
    const r = parseProgrammaticText(big);
    expect(r.disciplines.length).toBe(names.length);
    expect(r.disciplines.reduce((n, d) => n + d.topics.length, 0)).toBe(names.length * 90);
  });
});
