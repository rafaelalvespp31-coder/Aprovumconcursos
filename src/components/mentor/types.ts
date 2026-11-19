import type { MentorLesson, MentorResult } from "@/domain/mentor/engine";
import type { VisibleRecommendation } from "@/domain/mentor/history";
import type { StudyPlan } from "@/domain/mentor/plan";
import type { ResumoConcursos } from "@/domain/concursos-aviso";

/** Dados do Mentor como chegam ao navegador (uma vez por carregamento; o chat responde em cima deles). */
export interface MentorData {
  name: string | null;
  result: MentorResult;
  visible: VisibleRecommendation[];
  lessons: MentorLesson[];
  /** Raio-X publicados ainda não abertos pelo aluno. */
  notices?: MentorNotice[];
  /** Concurso que o aluno quer passar (resposta dele ao Mentor) e o plano semanal feito para ele. */
  goal?: { contest: string } | null;
  plan?: StudyPlan | null;
  /** Concursos abertos e previstos agora (faixa diária no Mentor). */
  concursos?: ResumoConcursos | null;
}

export interface MentorNotice {
  prepId: string;
  title: string;
  href: string;
}

export type MentorPanelState = ({ state: "ok" } & MentorData) | { state: "sessao" } | { state: "erro" };
