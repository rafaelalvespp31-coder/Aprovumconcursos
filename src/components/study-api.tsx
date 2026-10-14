"use client";

import { createContext, useContext, type ReactNode } from "react";
import {
  addQuestionComment,
  answerQuestion,
  askClarification,
  createAnnotation,
  deleteAnnotation,
  deleteQuestionComment,
  listQuestionComments,
  reportQuestionComment,
  reviewAnsweredQuestion,
  searchStudy,
  toggleQuestionMark,
  updateAnnotation,
} from "@/app/(app)/study-actions";
import { completeReadingAction, evaluateQuizAction, generateRecoveryAction, startLessonAction } from "@/app/(app)/aula/[id]/actions";

/**
 * Ações usadas pelos componentes interativos de estudo.
 * Em produção, são as ações de servidor reais. A galeria de desenvolvimento injeta
 * uma implementação em memória para que as interações possam ser testadas sem backend.
 */
export interface StudyApi {
  answerQuestion: typeof answerQuestion;
  toggleQuestionMark: typeof toggleQuestionMark;
  reviewAnsweredQuestion: typeof reviewAnsweredQuestion;
  createAnnotation: typeof createAnnotation;
  updateAnnotation: typeof updateAnnotation;
  deleteAnnotation: typeof deleteAnnotation;
  askClarification: typeof askClarification;
  startLesson: typeof startLessonAction;
  completeReading: typeof completeReadingAction;
  evaluateQuiz: typeof evaluateQuizAction;
  search: typeof searchStudy;
  generateRecovery: typeof generateRecoveryAction;
  listComments: typeof listQuestionComments;
  addComment: typeof addQuestionComment;
  deleteComment: typeof deleteQuestionComment;
  reportComment: typeof reportQuestionComment;
}

export const serverStudyApi: StudyApi = {
  answerQuestion,
  toggleQuestionMark,
  reviewAnsweredQuestion,
  createAnnotation,
  updateAnnotation,
  deleteAnnotation,
  askClarification,
  startLesson: startLessonAction,
  completeReading: completeReadingAction,
  evaluateQuiz: evaluateQuizAction,
  search: searchStudy,
  generateRecovery: generateRecoveryAction,
  listComments: listQuestionComments,
  addComment: addQuestionComment,
  deleteComment: deleteQuestionComment,
  reportComment: reportQuestionComment,
};

const Ctx = createContext<StudyApi>(serverStudyApi);

export function StudyApiProvider({ api, children }: { api: StudyApi; children: ReactNode }) {
  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useStudyApi(): StudyApi {
  return useContext(Ctx);
}
