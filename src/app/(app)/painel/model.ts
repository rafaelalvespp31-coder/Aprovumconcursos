/**
 * Modelo do painel "Leveza Pastel": transforma dados reais em números dos cards.
 * Puro (sem I/O) para ser testado e reaproveitado pela galeria.
 */
import type { UnitState } from "@/domain/progress/state-machine";

export const PASSED_STATES: ReadonlySet<UnitState> = new Set(["aguardando_dominio", "dominada"]);

export interface PlanLesson {
  id: string;
  state: UnitState | null;
  title: string;
}
export interface PlanModule {
  id: string;
  title: string;
  lessons: PlanLesson[];
}

export interface TrailCard {
  id: string;
  title: string;
  icon: string;
  color: string;
  color2: string;
  totalLessons: number;
  passedLessons: number;
  /** 0–100, temas aprovados sobre o total. */
  progress: number;
  nextLessonId: string | null;
  modules: Array<{ id: string; title: string; passed: number; total: number; nextLessonId: string | null }>;
}

/** Paleta da marca APROVUM (preto, branco e vermelho), atribuída em ordem às trilhas. */
export const TRAIL_PALETTE = [
  { color: "#FF1E1E", color2: "#B30000" },
  { color: "#0A0A0A", color2: "#5C5C5C" },
  { color: "#E10600", color2: "#5C0000" },
  { color: "#8C8C8C", color2: "#3A3A3A" },
] as const;

/** Ícone pela disciplina da trilha (não pelo nome do concurso, para não sugerir o que não é). */
export function trailIcon(disciplineMode: string | null | undefined): string {
  if (!disciplineMode) return "📘";
  if (disciplineMode.startsWith("direito_") || disciplineMode === "legislacao_especial") return "⚖️";
  if (disciplineMode === "lingua_portuguesa") return "✍️";
  if (disciplineMode === "matematica" || disciplineMode === "raciocinio_logico") return "🧩";
  if (disciplineMode === "informatica") return "💻";
  return "📘";
}

/** Próximo tema: o primeiro não aprovado que já esteja liberado; senão, o primeiro não aprovado. */
export function nextLesson(lessons: readonly PlanLesson[]): PlanLesson | null {
  const open = lessons.filter((l) => !(l.state && PASSED_STATES.has(l.state)));
  return open.find((l) => l.state && l.state !== "nao_iniciada") ?? open[0] ?? null;
}

export function trailCard(
  t: { id: string; title: string; disciplineMode?: string | null },
  plan: readonly PlanModule[],
  index: number,
): TrailCard {
  const all = plan.flatMap((m) => m.lessons);
  const passed = all.filter((l) => l.state && PASSED_STATES.has(l.state)).length;
  const palette = TRAIL_PALETTE[index % TRAIL_PALETTE.length]!;
  return {
    id: t.id,
    title: t.title,
    icon: trailIcon(t.disciplineMode),
    ...palette,
    totalLessons: all.length,
    passedLessons: passed,
    progress: all.length ? Math.round((passed / all.length) * 100) : 0,
    nextLessonId: nextLesson(all)?.id ?? null,
    modules: plan
      .filter((m) => m.lessons.length > 0)
      .map((m) => ({
        id: m.id,
        title: m.title,
        total: m.lessons.length,
        passed: m.lessons.filter((l) => l.state && PASSED_STATES.has(l.state)).length,
        nextLessonId: nextLesson(m.lessons)?.id ?? null,
      })),
  };
}

export type Stage = "ensino" | "fixacao" | "revisao";

/** Etapa do tema atual: ensino (lendo) → fixação (questões) → revisão. */
export function stageOf(state: UnitState, reviewDue: boolean): Stage {
  if (reviewDue || state === "em_revisao") return "revisao";
  if (state === "aula_concluida") return "fixacao";
  return "ensino";
}

export const STAGE_LABELS: Record<Stage, string> = { ensino: "Ensino", fixacao: "Fixação", revisao: "Revisão" };

/** Mensagem do anel de meta, sem inventar meta quando o aluno não definiu uma. */
export function goalHint(done: number, goal: number | null, unit: string): string {
  if (!goal) return "defina sua meta";
  if (done >= goal) return "meta batida! 🎉";
  return `faltam ${goal - done} ${unit}`;
}

export function overdueDays(dueAt: string, now = new Date()): number {
  return Math.max(0, Math.floor((now.getTime() - new Date(dueAt).getTime()) / 86_400_000));
}
