import type { Origin, QuestionType } from "@/domain/bank/labels";

/** Estado do formulário de questão (compartilhado entre servidor e cliente). */
export interface FormLookups {
  subjects: Array<{ id: string; name: string; status: string }>;
  topics: Array<{ id: string; subject_id: string; name: string; path: string; status: string }>;
  boards: Array<{ slug: string; name: string }>;
  exams: Array<{ id: string; name: string; year: number | null }>;
  sources: Array<{ id: string; name: string; kind: string; status: string; reuse_verified: boolean }>;
}

export interface LegalRefState {
  normName: string;
  normNumber: string;
  normYear: string;
  article: string;
  paragraph: string;
  item: string;
  letter: string;
  officialUrl: string;
  consultedOn: string;
  normVersion: string;
  amendmentNote: string;
  caseLawCourt: string;
  caseLawId: string;
  caseLawThesis: string;
}

export interface QuestionFormState {
  subjectId: string;
  topicId: string;
  origin: Origin;
  questionType: QuestionType;
  statement: string;
  caseContext: string;
  initialDifficulty: string;
  boardStyle: string;
  sourceId: string;
  examId: string;
  boardSlug: string;
  year: string;
  originalNumber: string;
  correctAnswerTrue: "" | "true" | "false";
  options: Array<{ text: string; isCorrect: boolean; explanation: string }>;
  justification: string;
  legalBasis: string;
  usageRights: string;
  verifiedAt: string;
  legalRefs: LegalRefState[];
}

export const today = () => new Date().toISOString().slice(0, 10);
export const emptyRef = (): LegalRefState => ({
  normName: "",
  normNumber: "",
  normYear: "",
  article: "",
  paragraph: "",
  item: "",
  letter: "",
  officialUrl: "",
  consultedOn: today(),
  normVersion: "",
  amendmentNote: "",
  caseLawCourt: "",
  caseLawId: "",
  caseLawThesis: "",
});

export function emptyQuestion(subjectId = ""): QuestionFormState {
  return {
    subjectId,
    topicId: "",
    origin: "autoral_humana",
    questionType: "multipla_escolha",
    statement: "",
    caseContext: "",
    initialDifficulty: "dificil",
    boardStyle: "",
    sourceId: "",
    examId: "",
    boardSlug: "",
    year: "",
    originalNumber: "",
    correctAnswerTrue: "",
    options: Array.from({ length: 5 }, () => ({ text: "", isCorrect: false, explanation: "" })),
    justification: "",
    legalBasis: "",
    usageRights: "proprio",
    verifiedAt: "",
    legalRefs: [],
  };
}

