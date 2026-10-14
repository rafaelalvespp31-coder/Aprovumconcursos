import { describe, expect, it } from "vitest";
import { groupIntoModules } from "@/domain/content/modules";

const S = (id: string, kind: string, module?: string) => ({ id, kind, module });

describe("módulos da aula", () => {
  it("usa os módulos definidos pela equipe, em blocos consecutivos", () => {
    const m = groupIntoModules([S("a", "introducao", "Visão geral"), S("b", "texto_legal", "Visão geral"), S("c", "explicacao", "Autarquias"), S("d", "explicacao", "Autarquias"), S("e", "resumo", "Revisão final")]);
    expect(m.map((x) => [x.n, x.title, x.sectionIds.length])).toEqual([[1, "Visão geral", 2], [2, "Autarquias", 2], [3, "Revisão final", 1]]);
    expect(m[2]!.icon).toBe("revisoes");
  });
  it("sem módulos definidos, agrupa pelo tipo sem mudar a ordem", () => {
    const m = groupIntoModules([S("a", "introducao"), S("b", "esquema"), S("c", "texto_legal"), S("d", "explicacao"), S("e", "esquema"), S("f", "doutrina"), S("g", "exemplos"), S("h", "pegadinhas"), S("i", "resumo")]);
    expect(m.map((x) => x.title)).toEqual(["Visão geral", "Lei seca", "Teoria e conceitos", "Doutrina e jurisprudência", "Prática e pegadinhas", "Revisão final"]);
    expect(m.flatMap((x) => x.sectionIds).join("")).toBe("abcdefghi");
  });
});
