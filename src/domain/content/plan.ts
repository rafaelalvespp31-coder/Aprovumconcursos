/**
 * Estrutura do planejamento de aulas (Etapa 5), independente de quem o produziu
 * (IA ou correção automática). Sempre validado por `auditPlan` antes de ser aceito.
 */

export interface SupplementaryItem {
  /** Assunto incluído como apoio pedagógico, fora do escopo informado. */
  title: string;
  justification: string;
}

export interface PlannedLesson {
  key: string;
  title: string;
  objective: string;
  /** Chaves de nós do mapa ensinadas DIRETAMENTE nesta aula. */
  nodeKeys: string[];
  /** Pré-requisitos complementares (não constam do conteúdo informado). */
  supplementary: SupplementaryItem[];
  /** Aulas que precisam vir antes desta. */
  prerequisiteLessonKeys: string[];
  /** Estimativa — sempre exibida como estimativa. */
  estimatedMinutes: number;
}

export interface PlannedModule {
  key: string;
  title: string;
  lessons: PlannedLesson[];
}

export interface LessonPlan {
  modules: PlannedModule[];
}

export function orderedLessons(plan: LessonPlan): PlannedLesson[] {
  return plan.modules.flatMap((m) => m.lessons);
}
