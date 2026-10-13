import { describe, expect, it } from "vitest";
import { buildAll, buildCloze, checkCloze, cleanLegalText, type LawNode } from "./cloze";

const N = (key: string, kind: string, marker: string | null, sourceText: string, parentKey: string | null = null): LawNode => ({ key, kind, marker, sourceText, parentKey, path: marker ?? key });

const nodes: LawNode[] = [
  N("N1", "artigo", "Art. 10", "Art. 10. O inquérito deverá terminar no prazo de 10 dias, se o indiciado tiver sido preso em flagrante, ou no prazo de 30 dias, quando estiver solto."),
  N("N2", "artigo", "Art. 17", "Art. 17. A autoridade policial não poderá mandar arquivar autos de inquérito."),
  N("N3", "artigo", "Art. 6º", "Art. 6º Logo que tiver conhecimento da prática da infração penal, a autoridade policial deverá:"),
  N("N4", "inciso", "IV", "IV - ouvir o ofendido;", "N3"),
  N("N5", "paragrafo", "§ 7º", "§ 7º (revogado pela Lei nº 14.994/2024)."),
  N("N6", "paragrafo", "§ 6º", "§ 6º A pena é aumentada de 1/3 (um terço) até a metade se o crime for praticado por milícia privada."),
  N("N7", "paragrafo", "§ 1º", "§ 1º O investigado deverá ser citado, podendo constituir defensor no prazo de até 48 (quarenta e oito) horas. (Incluído pela Lei nº 13.964, de 2019)"),
];

describe("Complete a lei", () => {
  it("cria lacunas nos termos que a banca troca e confere a resposta", () => {
    const it10 = buildCloze(nodes[0]!, nodes, "t")!;
    expect(it10.answers.length).toBeGreaterThanOrEqual(1);
    expect(it10.answers.length).toBeLessThanOrEqual(2);
    for (const a of it10.answers) expect(it10.bank).toContain(a);
    expect(new Set(it10.bank).size).toBe(it10.bank.length);
    expect(checkCloze(it10, it10.answers)).toEqual(it10.answers.map(() => true));
    expect(checkCloze(it10, it10.answers.map(() => "errado")).every((x) => !x)).toBe(true);
    const text = it10.parts.map((p) => ("text" in p ? p.text : `[${it10.answers[p.blank]}]`)).join("");
    expect(text.replace(/[[\]]/g, "")).toBe("O inquérito deverá terminar no prazo de 10 dias, se o indiciado tiver sido preso em flagrante, ou no prazo de 30 dias, quando estiver solto.");
  });

  it("é determinístico (o servidor recria a mesma lacuna para conferir)", () => {
    expect(buildCloze(nodes[1]!, nodes, "t")).toEqual(buildCloze(nodes[1]!, nodes, "t"));
  });

  it("ignora maiúsculas e acentos ao conferir", () => {
    const it17 = buildCloze(nodes[1]!, nodes, "t")!;
    expect(checkCloze(it17, it17.answers.map((a) => a.toUpperCase().normalize("NFD").replace(/\p{Diacritic}/gu, "")))).toEqual(it17.answers.map(() => true));
  });

  it("inciso traz o caput como contexto e a referência completa", () => {
    const it4 = buildCloze(nodes[3]!, nodes, "t")!;
    expect(it4.context).toMatch(/^Art\. 6º/);
    expect(it4.ref).toBe("Art. 6º, IV");
    expect(it4.answers).toEqual(["ofendido"]);
  });

  it("não usa dispositivo revogado nem número já escrito por extenso", () => {
    expect(buildCloze(nodes[4]!, nodes, "t")).toBeNull();
    const it6 = buildCloze(nodes[5]!, nodes, "t")!;
    expect(it6.answers).not.toContain("1/3");
    const it7 = buildCloze(nodes[6]!, nodes, "t")!;
    expect(it7.answers).not.toContain("48");
  });

  it("remove notas de redação do texto", () => {
    expect(cleanLegalText("ouvir o ofendido; (Redação dada pela Lei nº 8.862, de 1994)")).toBe("ouvir o ofendido;");
    expect(buildAll(nodes, "t").every((i) => i.parts.every((p) => !("text" in p) || !/Inclu[íi]do/.test(p.text)))).toBe(true);
  });
});
