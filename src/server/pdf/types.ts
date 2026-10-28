/**
 * Retrato congelado do conteúdo estudado, gravado junto com cada PDF (study_pdfs.snapshot).
 * O PDF é sempre renderizado a partir dele: baixar de novo um PDF antigo devolve o mesmo
 * conteúdo, mesmo que a aula ou as questões mudem depois.
 */
export interface PdfSnapshot {
  schema: 1;
  generatedAt: string;
  student: { name: string | null };
  content: {
    trailId: string;
    title: string;
    board: string;
    contentTypeLabel: string;
    subject: string | null;
    scopeStatement: string | null;
    outOfScope: string[];
    legalReferences: Array<{ norm: string; provisions: string }>;
    /** Subtemas organizados pela IA (quando o aluno informou um pedido breve). */
    aiOutline: string | null;
    /** Texto informado pelo aluno (versão usada). */
    sourceText: string;
    sourceVersion: number;
    sourceCreatedAt: string;
    sourceSha256: string;
  };
  units: Array<{
    id: string;
    title: string;
    objective: string;
    generatedAt: string | null;
    verificationPending: boolean;
    unverifiedClaims: string[];
    sections: Array<{ kind: string; title: string; body: string; verificationStatus: string }>;
    references: Array<{ kind: string; citation: string; verified: boolean }>;
    levelsPassed: number;
  }>;
  questions: Array<{
    id: string;
    unitTitle: string;
    level: "facil" | "medio" | "dificil";
    recovery: boolean;
    type: string;
    statement: string;
    topic: string | null;
    options: Array<{ label: string; text: string; correct: boolean; explanation: string }>;
    correctAnswerTrue: boolean | null;
    justification: string;
    /** Última resposta do aluno. */
    answer: { label: string | null; bool: boolean | null; correct: boolean; at: string };
    attempts: number;
    everWrong: boolean;
  }>;
  /** Pontos de revisão: itens com erro em alguma tentativa. */
  review: Array<{ topic: string; unitTitle: string; wrongAttempts: number }>;
}
