import { describe, expect, it } from "vitest";
import { MAX_SECTIONS_PER_MODULE, apostilaPages, groupIntoModules, moduleTitle, pageKey } from "./apostila";

const s = (id: string, kind: string, module?: string | null) => ({ id, kind, module });

describe("apostila em módulos", () => {
  it("usa os módulos do catálogo, na ordem, sem perder seções", () => {
    const mods = groupIntoModules([s("a", "introducao", "1. Fundamentos"), s("b", "explicacao", "1. Fundamentos"), s("c", "texto_legal", "2. Texto legal"), s("d", "resumo", null)]);
    expect(mods.map((m) => m.title)).toEqual(["Fundamentos", "Texto legal"]);
    expect(mods.map((m) => m.sections.map((x) => x.id))).toEqual([["a", "b"], ["c", "d"]]);
  });

  it("seção sem módulo no começo abre a Introdução", () => {
    const mods = groupIntoModules([s("a", "objetivo"), s("b", "explicacao", "Módulo 1 - Base")]);
    expect(mods.map((m) => m.title)).toEqual(["Introdução", "Base"]);
  });

  it("sem módulos: agrupa pelos blocos de estudo e mantém todas as seções", () => {
    const secs = [s("a", "introducao"), s("b", "texto_legal"), s("c", "exemplos"), s("d", "pegadinhas"), s("e", "resumo"), s("f", "tipo_desconhecido")];
    const mods = groupIntoModules(secs, { legal: true });
    expect(mods.length).toBeGreaterThan(2);
    expect(mods.flatMap((m) => m.sections.map((x) => x.id)).sort()).toEqual(["a", "b", "c", "d", "e", "f"]);
    expect(mods[0]!.title).toBe("Entenda o conceito");
  });

  it("módulo grande vira partes, para não virar uma rolagem infinita", () => {
    const secs = Array.from({ length: MAX_SECTIONS_PER_MODULE * 2 + 1 }, (_, i) => s(`s${i}`, "explicacao", "Único"));
    const mods = groupIntoModules(secs);
    expect(mods.length).toBe(3);
    expect(mods[0]!.title).toBe("Único (parte 1 de 3)");
    expect(mods.every((m) => m.sections.length <= MAX_SECTIONS_PER_MODULE)).toBe(true);
    expect(mods.flatMap((m) => m.sections).length).toBe(secs.length);
  });

  it("títulos sem numeração e páginas na ordem do PDF", () => {
    expect(moduleTitle("3. Distinções importantes")).toBe("Distinções importantes");
    expect(moduleTitle("Módulo 2: Consumação")).toBe("Consumação");
    expect(apostilaPages(2).map(pageKey)).toEqual(["inicio", "m0", "m1", "questoes", "revisao"]);
  });
});
