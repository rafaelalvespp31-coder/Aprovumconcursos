import type { MentorLesson, MentorResult } from "@/domain/mentor/engine";
import type { VisibleRecommendation } from "@/domain/mentor/history";

/** Dados do Mentor como chegam ao navegador (uma vez por carregamento; o chat responde em cima deles). */
export interface MentorData {
  name: string | null;
  result: MentorResult;
  visible: VisibleRecommendation[];
  lessons: MentorLesson[];
  /** Raio-X publicados ainda não abertos pelo aluno. */
  notices?: MentorNotice[];
}

export interface MentorNotice {
  prepId: string;
  title: string;
  href: string;
}

export type MentorPanelState = ({ state: "ok" } & MentorData) | { state: "sessao" } | { state: "erro" };
