import type { RecommendationKind } from "@/domain/mentor/engine";
import type { RecommendationStatus } from "@/domain/mentor/history";

/** Recomendação como chega ao navegador (só o necessário para mostrar e agir). */
export interface MentorItem {
  /** Id gravado no histórico (para marcar visualizada/dispensada). */
  id: string | null;
  key: string;
  kind: RecommendationKind;
  title: string;
  explanation: string;
  reason: string;
  href: string;
  actionLabel: string;
  subject: string | null;
  label: string;
  progress: { pct: number; label: string } | null;
  status: RecommendationStatus;
}

export type MentorCardState =
  | { state: "ok"; name: string | null; items: MentorItem[]; pending: number; completed: number }
  | { state: "vazio"; name: string | null; completed: number }
  | { state: "sem_dados"; name: string | null }
  | { state: "sessao" }
  | { state: "erro" };
