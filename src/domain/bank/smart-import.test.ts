import { describe, expect, it } from "vitest";
import { estimateQuestions, parseSmart } from "./smart-import";

const A = `IGEDUC — 2026 — Professor (Prefeitura de Calçado)/Educação Infantil
Assinale a alternativa em que todas as palavras estão corretamente escritas.
- exceção, previlégio, beneficente
- excessão, privilégio, beneficente
- exceção, privilégio, beneficente
- exceção, privilégio, beneficiente`;

const B = `AVANÇASP — 2026 — Professor (Prefeitura de Aparecida)/Educação Infantil
Assinale a alternativa em cuja frase todas as palavras atendem às normas vigentes de ortografia em Língua Portuguesa.
- Primeira frase.
- Segunda frase.
- Terceira frase.
- Quarta frase.
- Quinta frase.`;

const C = `CEBRASPE (CESPE) — 2024 — Analista de Sistemas
Texto CB2A1
Rubem Braga

— Você viu? — perguntou ele.

Era uma tarde de domingo, com adaptações.

Julgue o item subsequente, em relação a estruturas linguísticas do texto CB2A1.
Certo
Errado
Gabarito: Certo`;

describe("importador inteligente", () => {
  it("TESTE A — IGEDUC, 4 alternativas, sem gabarito", () => {
    const [q] = parseSmart(A).drafts;
    expect(q!.board).toBe("IGEDUC");
    expect(q!.year).toBe(2026);
    expect(q!.type).toBe("multipla_escolha");
    expect(q!.options.map((o) => o.label)).toEqual(["A", "B", "C", "D"]);
    expect(q!.answer).toBeNull();
    expect(q!.issues).toContain("gabarito_ausente");
    expect(q!.organ).toBe("Prefeitura de Calçado");
    expect(q!.statement.startsWith("Assinale a alternativa em que")).toBe(true);
  });
  it("TESTE B — AVANÇASP, 5 alternativas preservadas", () => {
    const [q] = parseSmart(B).drafts;
    expect(q!.board).toBe("AVANÇASP");
    expect(q!.options).toHaveLength(5);
    expect(q!.options[4]).toEqual({ label: "E", text: "Quinta frase." });
    expect(q!.comment).toBeNull();
  });
  it("TESTE C — CEBRASPE, certo/errado com texto-base CB2A1", () => {
    const [q] = parseSmart(C).drafts;
    expect(q!.board).toBe("CEBRASPE (CESPE)");
    expect(q!.boardKnown).toBe(true);
    expect(q!.type).toBe("certo_errado");
    expect(q!.baseTextCode).toBe("Texto CB2A1");
    expect(q!.baseText).toContain("Rubem Braga");
    expect(q!.baseText).toContain("— Você viu? — perguntou ele.");
    expect(q!.baseText).toContain("com adaptações");
    expect(q!.statement).toBe("Julgue o item subsequente, em relação a estruturas linguísticas do texto CB2A1.");
    expect(q!.options).toHaveLength(0);
    expect(q!.answer).toBe("certo");
    expect(q!.answerSource).toBe("oficial");
  });
  it("lote com várias questões e texto-base compartilhado", () => {
    const next = `CEBRASPE (CESPE) — 2024 — Analista de Sistemas\nCom relação ao texto CB2A1, julgue o item a seguir.\nCerto\nErrado`;
    const r = parseSmart(`${C}\n\n${next}\n\n${A}`);
    expect(r.drafts).toHaveLength(3);
    expect(r.drafts[1]!.baseTextCode).toBe("Texto CB2A1");
    expect(r.baseTexts).toEqual([expect.objectContaining({ code: "Texto CB2A1", questions: 2 })]);
    expect(estimateQuestions(`${C}\n\n${next}\n\n${A}`)).toBe(3);
  });
  it("gabarito oficial, comentário e alternativas com letras", () => {
    const t = `FCC — 2023 — Analista (TRT)\nQual é a capital da França?\nA) Roma\nB) Paris\nC) Lisboa\nD) Madri\nGabarito: B\nComentário: Paris é a capital desde sempre.`;
    const [q] = parseSmart(t).drafts;
    expect(q!.options.map((o) => o.label)).toEqual(["A", "B", "C", "D"]);
    expect(q!.answer).toBe("B");
    expect(q!.comment).toBe("Paris é a capital desde sempre.");
    expect(q!.issues).not.toContain("gabarito_ausente");
  });
  it("banca desconhecida e metadados incompletos viram pendência", () => {
    const [q] = parseSmart(`Banca Inventada X — 2022 — Cargo (Órgão Y)\nQual o resultado de 2 + 2?\n- 3\n- 4`).drafts;
    expect(q!.issues).toContain("banca_desconhecida");
    const [m] = parseSmart(`Qual o resultado de 2 + 2?\n- 3\n- 4\n- 5`).drafts;
    expect(m!.issues).toEqual(expect.arrayContaining(["banca_ausente", "ano_ausente", "concurso_ausente"]));
  });
  it("preserva acentos, travessões e citações do enunciado", () => {
    const [q] = parseSmart(`FGV — 2021 — Técnico (Prefeitura de São João)\nLeia: “Não há — nem haverá — dúvida”. Sobre a pontuação, é correto afirmar:\nA. há erro\nB. não há erro`).drafts;
    expect(q!.statement).toContain("“Não há — nem haverá — dúvida”");
    expect(q!.options).toHaveLength(2);
  });
  it("sem alternativas vai para revisão como discursiva", () => {
    const [q] = parseSmart(`FGV — 2021 — Técnico (Prefeitura X)\nDiscorra sobre o princípio da legalidade.`).drafts;
    expect(q!.type).toBe("discursiva");
    expect(q!.issues).toContain("sem_alternativas");
  });
  it("não inventa gabarito para letra inexistente", () => {
    const [q] = parseSmart(`FGV — 2021 — Técnico (Prefeitura X)\nQual?\nA) um\nB) dois\nGabarito: E`).drafts;
    expect(q!.answer).toBeNull();
  });
});
