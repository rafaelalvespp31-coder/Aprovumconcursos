import { describe, expect, it } from "vitest";
import { AIError, type AIProvider } from "@/ai/provider";
import { buildBankPrompt, generationParamsSchema, toQuestionInput, validateBankQuestions, type AIBankOutput } from "./generation";
import { questionInputSchema } from "./schema";

const TEXT =
  "Art. 121. Matar alguém: Pena - reclusão, de seis a vinte anos. § 1º Se o agente comete o crime impelido por motivo de relevante valor social ou moral, ou sob o domínio de violenta emoção, logo em seguida a injusta provocação da vítima, o juiz pode reduzir a pena de um sexto a um terço. § 2º Se o homicídio é cometido: I - mediante paga ou promessa de recompensa, ou por outro motivo torpe; II - por motivo fútil.";
const params = generationParamsSchema.parse({
  subjectId: "11111111-1111-4111-8111-111111111111",
  difficulty: "muito_dificil",
  questionType: "multipla_escolha",
  count: 3,
  sourceId: "22222222-2222-4222-8222-222222222222",
  sourceText: TEXT,
  justification: "completa",
  ref: { normName: "Código Penal", normNumber: "DL 2.848/1940", article: "121", consultedOn: "2026-10-01" },
});
const opts = (correct = 0) => Array.from({ length: 5 }, (_, i) => ({ text: `Alternativa ${i}`, correct: i === correct, explanation: `Porque ${i}` }));
const q = (over: Partial<AIBankOutput["questions"][number]> = {}) => ({
  statement: "Sobre o homicídio privilegiado, assinale a alternativa correta.",
  options: opts(),
  correctAnswerTrue: null,
  justification: "O § 1º permite reduzir a pena de um sexto a um terço.",
  basis: [{ excerpt: "o juiz pode reduzir a pena de um sexto a um terço", why: "privilégio" }],
  difficultyEstimate: "muito_dificil" as const,
  ambiguityAlerts: [],
  confidence: 0.9,
  ...over,
});

describe("validação das questões geradas por IA", () => {
  it("aceita citação literal (ignorando acentos, aspas e espaços) e rejeita fundamento inventado", () => {
    const out = {
      questions: [
        q({ basis: [{ excerpt: "“O juiz   pode reduzir a pena de um sexto a um terço”", why: "" }] }),
        q({ statement: "Outra questão diferente sobre qualificadoras do homicídio.", basis: [{ excerpt: "conforme o STF no HC 123.456", why: "" }] }),
      ],
    };
    const r = validateBankQuestions(out, params);
    expect(r.accepted).toHaveLength(1);
    expect(r.rejected[0]!.reason).toMatch(/não existe no texto-base|nenhum trecho/);
  });

  it("descarta trechos falsos, mas mantém a questão se houver um verdadeiro, com alerta", () => {
    const r = validateBankQuestions({ questions: [q({ basis: [{ excerpt: "por motivo fútil", why: "" }, { excerpt: "Súmula 999 do STJ", why: "" }] })] }, params);
    expect(r.accepted).toHaveLength(1);
    expect(r.accepted[0]!.validBasis).toHaveLength(1);
    expect(r.accepted[0]!.alerts.join(" ")).toMatch(/descartados/);
  });

  it("exige 5 alternativas, uma correta e sem repetição; certo/errado com gabarito", () => {
    expect(validateBankQuestions({ questions: [q({ options: opts().slice(0, 4) })] }, params).rejected[0]!.reason).toMatch(/5/);
    expect(validateBankQuestions({ questions: [q({ options: opts().map((o) => ({ ...o, correct: true })) })] }, params).rejected).toHaveLength(1);
    const ce = { ...params, questionType: "certo_errado" as const };
    expect(validateBankQuestions({ questions: [q({ options: [], correctAnswerTrue: null })] }, ce).rejected).toHaveLength(1);
    expect(validateBankQuestions({ questions: [q({ options: [], correctAnswerTrue: false })] }, ce).accepted).toHaveLength(1);
  });

  it("rejeita repetição e alegação de procedência (banca/ano)", () => {
    const r = validateBankQuestions({ questions: [q(), q(), q({ statement: "(FGV 2023) Sobre homicídio, assinale a correta." })] }, params, []);
    expect(r.accepted).toHaveLength(1);
    expect(r.rejected.map((x) => x.reason).join(" ")).toMatch(/repetido.*banca|banca.*repetido/s);
  });

  it("alerta quando a IA diverge na dificuldade, declara baixa confiança ou ambiguidade", () => {
    const r = validateBankQuestions({ questions: [q({ difficultyEstimate: "dificil", confidence: 0.4, ambiguityAlerts: ["Depende de interpretação."] })] }, params);
    expect(r.accepted[0]!.alerts.length).toBe(3);
  });

  it("vira um cadastro válido: inédita com IA, conteúdo próprio, com referência", () => {
    const r = validateBankQuestions({ questions: [q()] }, params);
    const input = questionInputSchema.parse(toQuestionInput(r.accepted[0]!, params));
    expect(input.origin).toBe("ia_assistida");
    expect(input.usageRights).toBe("proprio");
    expect(input.options.filter((o) => o.isCorrect)).toHaveLength(1);
    expect(input.legalRefs[0]!.normName).toBe("Código Penal");
  });

  it("prompt isola o texto-base como dado e proíbe fontes externas e procedência", () => {
    const { system, prompt } = buildBankPrompt(params, 2, ["Enunciado anterior"]);
    expect(system).toMatch(/EXCLUSIVAMENTE o TEXTO-BASE/);
    expect(system).toMatch(/Não cite banca, concurso, ano/);
    expect(prompt).toContain("<texto_base>");
    expect(prompt).toContain("Enunciado anterior");
  });

  it("parâmetros: limites de quantidade e de texto-base", () => {
    expect(generationParamsSchema.safeParse({ ...params, count: 11 }).success).toBe(false);
    expect(generationParamsSchema.safeParse({ ...params, sourceText: "curto" }).success).toBe(false);
    expect(generationParamsSchema.safeParse({ ...params, sourceText: "x".repeat(8001) }).success).toBe(false);
  });
});

describe("erros da IA não viram conteúdo", () => {
  it("o erro do provedor é propagado (sem questão fictícia)", async () => {
    const failing: AIProvider = {
      name: "fake",
      model: "m",
      generateStructured: async () => {
        throw new AIError("Limite", "rate_limited", true, undefined, 12);
      },
    };
    const { generateBankChunk } = await import("@/ai/bank-generation");
    await expect(generateBankChunk(failing, params, 2, [])).rejects.toMatchObject({ kind: "rate_limited", retryAfterSec: 12 });
  });
});
