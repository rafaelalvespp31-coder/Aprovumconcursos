import { describe, expect, it } from "vitest";
import { agruparCatalogo, classificarConcurso, dividirPorGrupo, fatiasDeAssuntos, filtrarMaterias, formatarDuracao, grupoDaMateria, type MateriaCatalogo } from "./materias";

describe("agruparCatalogo", () => {
  const nomes: Record<string, string> = { a: "Direito Penal", b: "Informática" };
  it("agrupa por matéria e assunto, do maior para o menor", () => {
    const r = agruparCatalogo(
      [
        { discipline_mode: "a", topic_group: "Crimes", estimated_minutes: 40 },
        { discipline_mode: "a", topic_group: "Crimes", estimated_minutes: 50 },
        { discipline_mode: "a", topic_group: "Penas", estimated_minutes: 30 },
        { discipline_mode: "b", topic_group: null },
      ],
      (s) => nomes[s],
      new Map([["a", 33]]),
    );
    expect(r).toEqual([
      { slug: "a", nome: "Direito Penal", aulas: 3, assuntos: [{ titulo: "Crimes", aulas: 2 }, { titulo: "Penas", aulas: 1 }], minutos: 120, progresso: 33 },
      { slug: "b", nome: "Informática", aulas: 1, assuntos: [{ titulo: "Aulas avulsas", aulas: 1 }], minutos: 0, progresso: 0 },
    ]);
  });
  it("sem progresso apurado, a matéria fica com progresso nulo (não vira 0%)", () => {
    expect(agruparCatalogo([{ discipline_mode: "a", topic_group: "G" }], (x) => nomes[x])[0]!.progresso).toBeNull();
  });
  it("matéria sem rótulo vira 'Outras matérias'", () => {
    expect(agruparCatalogo([{ discipline_mode: "x", topic_group: "G" }], () => undefined)[0]!.nome).toBe("Outras matérias");
  });
});

const m = (slug: string, nome: string, assuntos: string[]): MateriaCatalogo => ({ slug, nome, aulas: assuntos.length, assuntos: assuntos.map((t) => ({ titulo: t, aulas: 1 })), minutos: 0, progresso: null });

describe("grupos e busca", () => {
  it("separa básicas e específicas", () => {
    expect(grupoDaMateria("lingua_portuguesa")).toBe("basicas");
    expect(grupoDaMateria("informatica")).toBe("basicas");
    expect(grupoDaMateria("direito_penal")).toBe("especificas");
    expect(grupoDaMateria("ctb_codigo_de_transito_brasileiro")).toBe("especificas");
    expect(grupoDaMateria("qualquer_nova")).toBe("especificas");
    const g = dividirPorGrupo([m("matematica", "Matemática", ["a"]), m("direito_penal", "Direito Penal", ["b"])]);
    expect(g.basicas.map((x) => x.slug)).toEqual(["matematica"]);
    expect(g.especificas.map((x) => x.slug)).toEqual(["direito_penal"]);
  });
  it("busca pelo nome ou por assunto, sem acento e em qualquer ordem", () => {
    const todas = [m("lingua_portuguesa", "Língua Portuguesa", ["Sintaxe", "Crase"]), m("direito_penal", "Direito Penal", ["Crimes contra a pessoa"])];
    expect(filtrarMaterias(todas, "").length).toBe(2);
    expect(filtrarMaterias(todas, "LINGUA").map((x) => x.slug)).toEqual(["lingua_portuguesa"]);
    expect(filtrarMaterias(todas, "pessoa crimes").map((x) => x.slug)).toEqual(["direito_penal"]);
    expect(filtrarMaterias(todas, "crase penal")).toEqual([]);
  });
  it("fatias da barra somam 1 e juntam o resto", () => {
    const f = fatiasDeAssuntos(Array.from({ length: 10 }, (_, i) => ({ titulo: `t${i}`, aulas: 1 })), 7);
    expect(f.length).toBe(8);
    expect(f.reduce((a, b) => a + b, 0)).toBeCloseTo(1);
    expect(fatiasDeAssuntos([], 7)).toEqual([]);
  });
});

describe("formatarDuracao", () => {
  it("escreve horas e minutos", () => {
    expect(formatarDuracao(510)).toBe("8h 30min");
    expect(formatarDuracao(60)).toBe("1h");
    expect(formatarDuracao(40)).toBe("40min");
    expect(formatarDuracao(0)).toBe("0min");
  });
});

describe("classificarConcurso", () => {
  it("separa polícia, militar, jurídico e administrativo pelo texto", () => {
    expect(classificarConcurso("Polícia Federal Agente")).toBe("policia");
    expect(classificarConcurso("Polícia Penal MG SEJUSP-MG")).toBe("policia");
    expect(classificarConcurso("PRF 2027 Polícia Rodoviária Federal")).toBe("policia");
    expect(classificarConcurso("PM SP 2025 Polícia Militar de São Paulo")).toBe("militar");
    expect(classificarConcurso("Corpo de Bombeiros")).toBe("militar");
    expect(classificarConcurso("TRT 3ª Região Analista")).toBe("juridico");
    expect(classificarConcurso("Prefeitura de Belo Horizonte")).toBe("administrativo");
  });
});
