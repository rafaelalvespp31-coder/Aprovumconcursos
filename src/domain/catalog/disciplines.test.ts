import { afterEach, describe, expect, it } from "vitest";
import { baseMode, disciplineGuide, disciplineLabel, disciplineSlugs, isDisciplineSlug, isLegalMode, LEGAL_RULES, setCustomDisciplines } from "@/ai/pedagogy";
import { disciplineSlug } from "./discipline-slug";
import { disciplineFrom, parseLessonUpload } from "./upload";
import { parseTopicMeta } from "./topic-meta";

afterEach(() => setCustomDisciplines([]));

describe("matérias cadastradas pela equipe", () => {
  it("identificador estável e sem acento", () => {
    expect(disciplineSlug("Direitos Humanos")).toBe("direitos_humanos");
    expect(disciplineSlug("  Criminologia (2026) ")).toBe("criminologia");
    expect(disciplineSlug("Ética no Serviço Público")).toBe("etica_no_servico_publico");
  });

  it("entram nos rótulos, na validação e na lista (antes de 'outra')", () => {
    expect(isDisciplineSlug("criminologia")).toBe(false);
    setCustomDisciplines([{ slug: "criminologia", label: "Criminologia", base: "direito_penal" }]);
    expect(disciplineLabel("criminologia")).toBe("Criminologia");
    expect(isDisciplineSlug("criminologia")).toBe(true);
    expect(disciplineSlugs().slice(-2)).toEqual(["criminologia", "outra"]);
    expect(disciplineLabel("direito_penal")).toBe("Direito Penal");
  });

  it("seguem o estilo pedagógico da base (jurídica → regras de texto legal)", () => {
    setCustomDisciplines([
      { slug: "criminologia", label: "Criminologia", base: "direito_penal" },
      { slug: "arquivologia", label: "Arquivologia", base: "conhecimentos_especificos" },
    ]);
    expect(baseMode("criminologia")).toBe("direito_penal");
    expect(isLegalMode("criminologia")).toBe(true);
    expect(disciplineGuide("criminologia")).toBe(LEGAL_RULES);
    expect(isLegalMode("arquivologia")).toBe(false);
    expect(baseMode("nao_existe")).toBe("outra");
  });

  it("não deixam sobrescrever uma matéria fixa", () => {
    setCustomDisciplines([{ slug: "direito_penal", label: "Outro nome", base: "matematica" }]);
    expect(disciplineLabel("direito_penal")).toBe("Direito Penal");
  });

  it("o texto da aula reconhece a matéria cadastrada pelo nome", () => {
    setCustomDisciplines([{ slug: "direitos_humanos", label: "Direitos Humanos", base: "direito_constitucional" }]);
    expect(disciplineFrom("Direitos Humanos", null)).toBe("direitos_humanos");
    expect(disciplineFrom("direitos humanos", null)).toBe("direitos_humanos");
    const p = parseLessonUpload("=== AULA ===\nTítulo: Tratados internacionais\nMatéria: Direitos Humanos\nObjetivo: Entender os tratados.\n");
    expect(p.meta.disciplineMode).toBe("direitos_humanos");
    expect(p.errors.join(" ")).not.toMatch(/Não reconheci a matéria/);
  });

  it("trocar a matéria de uma aula aceita só matérias existentes", () => {
    setCustomDisciplines([{ slug: "criminologia", label: "Criminologia", base: "direito_penal" }]);
    const ok = parseTopicMeta({ title: "Escolas penais", kind: "tema", disciplineMode: "criminologia" });
    expect(ok.ok && ok.meta.discipline_mode).toBe("criminologia");
    expect(parseTopicMeta({ title: "Escolas penais", kind: "tema", disciplineMode: "inventada" }).ok).toBe(false);
    const untouched = parseTopicMeta({ title: "Escolas penais", kind: "tema" });
    expect(untouched.ok && "discipline_mode" in untouched.meta).toBe(false);
  });
});
