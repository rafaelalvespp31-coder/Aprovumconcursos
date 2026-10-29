import { describe, expect, it } from "vitest";
import { buildSubtopicPrompt, buildSubtopicPromptParts, SUBTOPIC_PROMPT_MAX } from "./subtopic-prompt";
import { lessonSlug } from "./upload-preview";
import { existingForUpload, slugMatchIsSameLesson } from "./topic-group";
import { parseOutline } from "./topic-group";
import { prepareLessonUpload } from "./upload-preview";

const outline = parseOutline(`tópico: Ilicitude
4.1. Causas de exclusão da ilicitude
* 4.1.1. Conceito de ilicitude ou antijuridicidade.
* 4.1.2. Estado de necessidade.
* 4.1.3. Legítima defesa.
4.2. Excesso punível
* 4.2.1. Conceito de excesso punível.`);
const group = outline.groups[0]!;
const sub = group.subtopics[0]!;

/** Resposta como o ChatGPT devolveria seguindo o comando: o esqueleto preenchido. */
function fakeAnswer(prompt: string): string {
  const start = prompt.indexOf("=== AULA ===");
  const end = prompt.indexOf("=== REFERÊNCIAS ===");
  const text = "Texto de exemplo da seção, com **termo-chave** e explicação suficiente para o aluno.";
  const lines = prompt.slice(start, end).split("\n");
  const out: string[] = [];
  lines.forEach((l, i) => {
    if (/^\(.*\)$/.test(l.trim())) return; // instruções entre parênteses não entram
    if (/^Sinônimos:/.test(l)) return out.push("Sinônimos: excludentes");
    if (/^Tempo estimado:/.test(l)) return out.push("Tempo estimado: 60");
    if (/^Objetivo:/.test(l)) return out.push("Objetivo: Dominar as causas de exclusão da ilicitude.");
    if (/^Resumo:/.test(l)) return out.push("Resumo: Aula sobre as excludentes.");
    out.push(l);
    // Conteúdo logo depois da linha da seção (ou do "Itens:" que vem em seguida).
    const next = lines[i + 1] ?? "";
    if (/^--- SEÇÃO:/.test(l) && !/^Itens:/.test(next)) out.push(text);
    if (/^Itens:/.test(l)) out.push(text);
  });
  const q = (lv: string, item: string, i: number) =>
    `--- QUESTÃO ---\nTipo: certo ou errado\nItem: ${item}\nEssencial: ${i < 3 ? "sim" : "não"}\nDificuldade: ${lv === "FÁCIL" ? 1 : lv === "MÉDIO" ? 3 : 4}\nEnunciado: Afirmação ${i + 1} de nível ${lv} sobre o item ${item} para julgar.\nGabarito: Certo\nJustificativa: Certo. Explicação objetiva da resposta ${i + 1}.`;
  const items = ["4.1.1", "4.1.2", "4.1.3"];
  const levels = ["FÁCIL", "MÉDIO", "DIFÍCIL"].map((lv) => `=== QUESTÕES: ${lv} ===\n\n${Array.from({ length: 10 }, (_, i) => q(lv, items[i % 3]!, i)).join("\n\n")}`);
  return `${out.join("\n")}\n=== REFERÊNCIAS ===\nLei: Código Penal, arts. 23 a 25\n\n${levels.join("\n\n")}`;
}

const many = (n: number) => ({ code: "4.1", title: "Causas de exclusão da ilicitude", items: Array.from({ length: n }, (_, i) => ({ code: `4.1.${i + 1}`, title: `Item número ${i + 1} com um nome de tamanho realista do edital` })) });

describe("comando do subtópico", () => {
  const prompt = buildSubtopicPrompt({ disciplineMode: "direito_penal", group, sub });

  it("traz o cabeçalho do tópico e um módulo por item", () => {
    expect(prompt).toContain("Tópico: 4. Ilicitude");
    expect(prompt).toContain("Subtópico: 4.1 Causas de exclusão da ilicitude");
    expect(prompt).toContain("=== MÓDULO: 4.1.2 Estado de necessidade ===");
    expect(prompt).toContain("=== QUESTÕES: DIFÍCIL ===");
    expect(prompt).not.toContain("Excesso punível\n");
  });

  it("segue a lógica da aula de Homicídio: lei seca, aprofundamento, combinações, casos, doutrina/jurisprudência/bancas e revisão", () => {
    for (const m of ["=== MÓDULO: Visão geral e lei seca ===", "--- SEÇÃO: texto legal |", "=== MÓDULO: Aprofundamento e temas ligados ===", "--- SEÇÃO: quadro comparativo |", "=== MÓDULO: Casos práticos e pegadinhas ===", "--- SEÇÃO: jurisprudência |", "--- SEÇÃO: interpretação da banca |", "--- SEÇÃO: flashcards |"]) expect(prompt).toContain(m);
  });

  it("exige atualização até 2026, exemplos óbvios e a revisão do próprio comando e da aula", () => {
    expect(prompt).toContain("ATUALIZAÇÃO ATÉ 2026");
    expect(prompt).toContain("Lei 14.994/2024");
    expect(prompt).toContain("Lei 15.384/2026");
    expect(prompt).toContain("EXEMPLO ÓBVIO");
    expect(prompt).toContain("Revise ESTE COMANDO");
    expect(prompt).toContain("Revise a SUA AULA");
    expect(prompt).toContain("=== A CONFERIR ===");
  });

  it("serve para qualquer matéria: fora do Direito não pede lei seca nem jurisprudência", () => {
    const p = buildSubtopicPrompt({ disciplineMode: "lingua_portuguesa", group: { code: "2", title: "Concordância" }, sub: { code: "2.1", title: "Concordância verbal", items: [{ code: "2.1.1", title: "Regra geral" }] } as never });
    expect(p).not.toContain("--- SEÇÃO: texto legal");
    expect(p).not.toContain("--- SEÇÃO: jurisprudência");
    expect(p).toContain("Novo Acordo Ortográfico");
  });

  it("todo comando tem no máximo 12 mil caracteres e no máximo 30 seções", () => {
    for (const mode of ["direito_penal", "direito_constitucional", "lingua_portuguesa", "informatica"])
      for (const n of [0, 1, 3, 5, 7, 8, 10, 14, 15, 20, 30, 45]) {
        const p = buildSubtopicPrompt({ disciplineMode: mode, group, sub: many(n) as never });
        expect(p.length, `${mode} com ${n} itens`).toBeLessThanOrEqual(SUBTOPIC_PROMPT_MAX);
        expect((p.match(/^--- SEÇÃO:/gm) ?? []).length).toBeLessThanOrEqual(30);
      }
  });

  it("a resposta no formato do comando é catalogada dentro do tópico, sem erros", () => {
    const p = prepareLessonUpload(fakeAnswer(prompt));
    expect(p.errors).toEqual([]);
    expect(p.parsed.meta).toMatchObject({ title: "Causas de exclusão da ilicitude", topicGroup: "Ilicitude", topicGroupCode: "4", subtopicCode: "4.1", disciplineMode: "direito_penal" });
    expect(p.slug).toBe("ilicitude-4-1-causas-de-exclusao-da-ilicitude");
    const modules = [...new Set(p.built.lesson.sections.map((s) => s.module))];
    expect(modules).toEqual([
      "Visão geral e lei seca",
      "4.1.1 Conceito de ilicitude ou antijuridicidade",
      "4.1.2 Estado de necessidade",
      "4.1.3 Legítima defesa",
      "Aprofundamento e temas ligados",
      "Combinações, figuras próximas e consequências",
      "Casos práticos e pegadinhas",
      "Doutrina, jurisprudência e bancas",
      "Revisão final",
    ]);
    expect(p.built.lesson.sections.length).toBeLessThanOrEqual(30);
    expect(p.built.lesson.taughtNodeKeys).toHaveLength(3);
    expect(p.built.questions).toHaveLength(30);
  });

  it("sem tópico, a aula continua avulsa (como hoje)", () => {
    const p = prepareLessonUpload(fakeAnswer(prompt).replace(/^Tópico:.*\n^Subtópico:.*\n/m, ""));
    expect(p.parsed.meta).toMatchObject({ topicGroup: null, subtopicCode: null });
    expect(p.slug).toBe("causas-de-exclusao-da-ilicitude");
  });
});

describe("comando dividido em 2 (comando 1 = aula, comando 2 = questões)", () => {
  it("cada parte cabe no limite, a 1 sem questões e a 2 só com questões", () => {
    for (const n of [3, 10, 19, 30, 45]) {
      const { part1, part2 } = buildSubtopicPromptParts({ disciplineMode: "informatica", group, sub: many(n) as never });
      expect(part1.length, `parte 1 com ${n} itens`).toBeLessThanOrEqual(SUBTOPIC_PROMPT_MAX);
      expect(part2.length, `parte 2 com ${n} itens`).toBeLessThanOrEqual(SUBTOPIC_PROMPT_MAX);
      expect(part1).toContain("=== AULA ===");
      expect(part1).not.toContain("=== QUESTÕES: FÁCIL ===");
      expect(part1).toContain("COMANDO 2");
      expect(part2).toContain("=== QUESTÕES: FÁCIL ===");
      expect(part2).not.toContain("=== TEXTO-BASE ===");
      expect(part2).not.toContain("--- SEÇÃO:");
    }
  });

  it("as duas respostas coladas juntas viram uma aula só, sem erros", () => {
    const { part1 } = buildSubtopicPromptParts({ disciplineMode: "direito_penal", group, sub });
    const whole = fakeAnswer(part1.replace(/NÃO escreva questões agora[\s\S]*$/, "=== REFERÊNCIAS ==="));
    const p = prepareLessonUpload(whole);
    expect(p.errors).toEqual([]);
    expect(p.built.questions).toHaveLength(30);
  });
});

describe("endereço da aula com tópico de nome longo", () => {
  const longGroup = "Conceitos e Modos de Utilização de Tecnologias, Ferramentas, Aplicativos e Procedimentos Associados à Internet/Intranet";
  const meta = (code: string, title: string) => ({ kind: "tema", lawCode: null, articles: [], title, topicGroup: longGroup, subtopicCode: code });

  it("subtópicos diferentes do mesmo tópico longo nunca têm o mesmo endereço", () => {
    const a = lessonSlug(meta("2.1", "Ferramentas e Aplicativos Comerciais de Navegação"));
    const c = lessonSlug(meta("2.3", "Acesso a Distância a Computadores"));
    expect(a).not.toBe(c);
    expect(a.length).toBeLessThanOrEqual(100);
    expect(a).toContain("2-1");
    expect(c).toContain("2-3");
    expect(lessonSlug(meta("2.1", "Ferramentas e Aplicativos Comerciais de Navegação"))).toBe(a);
  });

  it("tópico curto mantém o endereço de sempre", () => {
    expect(lessonSlug({ kind: "tema", lawCode: null, articles: [], title: "Cookies e cache", topicGroup: "Navegadores de internet", subtopicCode: "1.8" })).toBe("navegadores-de-internet-1-8-cookies-e-cache");
  });

  it("endereço antigo repetido de OUTRO subtópico não faz uma aula sobrescrever a outra", () => {
    const old = { id: "x", slug: "conceitos-e-modos-de-utilizacao-a-", title: "Ferramentas…", status: "publicado", topicGroup: longGroup, subtopicCode: "2.1" };
    expect(slugMatchIsSameLesson({ topicGroup: longGroup, subtopicCode: "2.3" }, old)).toBe(false);
    expect(existingForUpload({ title: "Acesso a Distância", topicGroup: longGroup, topicGroupCode: "2", subtopicCode: "2.3" }, old.slug, [old])).toBeNull();
    expect(existingForUpload({ title: "Ferramentas (nova versão)", topicGroup: longGroup, topicGroupCode: "2", subtopicCode: "2.1" }, "outro-endereco", [old])?.row.id).toBe("x");
  });
});
