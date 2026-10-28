import type { VisibleRecommendation } from "@/domain/mentor/history";
import type { MentorItem } from "./types";

/** Recomendação do motor → o que vai para o navegador. */
export function toMentorItem(v: VisibleRecommendation): MentorItem {
  return {
    id: v.storedId,
    key: v.key,
    kind: v.kind,
    title: v.title,
    explanation: v.explanation,
    reason: v.reason,
    href: v.href,
    actionLabel: v.actionLabel,
    subject: v.entity.subject,
    label: v.entity.label,
    progress: v.progress,
    status: v.status,
  };
}
