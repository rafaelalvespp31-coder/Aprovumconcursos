import type { MentorLesson, MentorResult } from "@/domain/mentor/engine";
import type { VisibleRecommendation } from "@/domain/mentor/history";

/** Dados do Mentor como chegam ao navegador (uma vez por carregamento; o chat responde em cima deles). */
export interface MentorData {
  name: string | null;
  result: MentorResult;
  visible: VisibleRecommendation[];
  lessons: MentorLesson[];
}

export type MentorPanelState = ({ state: "ok" } & MentorData) | { state: "sessao" } | { state: "erro" };
