import type { PdfSnapshot } from "@/server/pdf/types";

/** Retrato de EXEMPLO para testes do PDF (inclui caracteres que as fontes padrão não têm). */
export const sampleSnapshot: PdfSnapshot = {
  schema: 1,
  generatedAt: "2026-10-11T15:00:00.000Z",
  student: { name: "Aluno de Teste" },
  content: {
    trailId: "00000000-0000-4000-8000-000000000010",
    title: "Prisão em flagrante",
    board: "FGV",
    contentTypeLabel: "Tema livre",
    subject: "Prisão em flagrante (CPP, arts. 301 a 310)",
    scopeStatement: "Conceito, espécies de flagrante, sujeitos, auto de prisão e audiência de custódia.",
    outOfScope: ["Prisão preventiva", "Prisão temporária"],
    legalReferences: [{ norm: "Código de Processo Penal", provisions: "arts. 301 a 310" }],
    aiOutline: "1 Conceito\n2 Espécies\n2.1 Próprio\n2.2 Impróprio\n2.3 Presumido",
    sourceText: "Prisão em flagrante",
    sourceVersion: 1,
    sourceCreatedAt: "2026-10-10T12:00:00.000Z",
    sourceSha256: "a".repeat(64),
  },
  units: [
    {
      id: "u1",
      title: "Prisão em flagrante: conceito e espécies",
      objective: "Distinguir as espécies de flagrante e seus requisitos.",
      generatedAt: "2026-10-10T13:00:00.000Z",
      verificationPending: true,
      unverifiedClaims: ["Entendimento sobre flagrante esperado precisa ser conferido."],
      levelsPassed: 3,
      sections: [
        { kind: "explicacao", title: "Explicação", verificationStatus: "nao_aplicavel", body: "O flagrante **próprio** ocorre quando o agente está cometendo a infração → *certeza visual*. ✓\n\n- Próprio\n- Impróprio (quase flagrante)\n1. Primeiro\n2. Segundo 🎯" },
        { kind: "quadro_comparativo", title: "Quadro comparativo", verificationStatus: "nao_aplicavel", body: "| Espécie | Momento |\n|---|---|\n| Próprio | Durante a infração ou logo após |\n| Presumido | Encontrado com instrumentos que façam presumir a autoria |" },
        { kind: "jurisprudencia", title: "Jurisprudência", verificationStatus: "pendente", body: "> Citação ilustrativa sem número, pendente de verificação." },
      ],
      references: [{ kind: "lei", citation: "Código de Processo Penal, arts. 301 a 310", verified: false }],
    },
  ],
  questions: [
    {
      id: "q1", unitTitle: "Prisão em flagrante", level: "facil", recovery: false, type: "multipla_escolha",
      statement: "Considera-se em flagrante delito quem:", topic: "Espécies",
      options: [
        { label: "A", text: "está cometendo a infração penal", correct: true, explanation: "Flagrante próprio." },
        { label: "B", text: "foi denunciado anonimamente dias depois", correct: false, explanation: "Não há flagrante." },
      ],
      correctAnswerTrue: null, justification: "Art. 302, I, do CPP (conferir na fonte oficial).",
      answer: { label: "B", bool: null, correct: false, at: "2026-10-10T14:00:00.000Z" }, attempts: 1, everWrong: true,
    },
    {
      id: "q2", unitTitle: "Prisão em flagrante", level: "facil", recovery: true, type: "certo_errado",
      statement: "No flagrante próprio, o agente é surpreendido cometendo a infração.", topic: "Espécies",
      options: [], correctAnswerTrue: true, justification: "É a definição do flagrante próprio.",
      answer: { label: null, bool: true, correct: true, at: "2026-10-10T14:05:00.000Z" }, attempts: 1, everWrong: false,
    },
  ],
  review: [{ topic: "Espécies", unitTitle: "Prisão em flagrante: conceito e espécies", wrongAttempts: 1 }],
};
