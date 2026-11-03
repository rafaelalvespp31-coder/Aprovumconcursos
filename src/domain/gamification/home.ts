/**
 * Home gamificada: tipos do estado vindo do banco (gamification_sync / gamification_performance)
 * e cálculos puros de exibição. Nenhum número é inventado: sem dado, o valor é null e a tela
 * mostra um estado vazio.
 */

export type MissionKey = "estudar" | "combater" | "revisar";

export interface MissionState {
  progress: number;
  target: number;
  done: boolean;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  criterion: string;
  unlockedAt: string | null;
}

export interface GamificationState {
  today: string;
  xp: number;
  level: number;
  levelFloor: number;
  levelNext: number;
  missions: { day: string; completed: number } & Record<MissionKey, MissionState>;
  missionXp: Record<MissionKey | "bonus", number>;
  xpToday: number;
  streak: { current: number; best: number; lastDay: string | null; week: string[]; milestones: number[] };
  ranking: { position: number | null; total: number; previous: number | null };
  achievements: Achievement[];
  levelUps: number[];
}

export interface PerformanceState {
  answered: number;
  correct: number;
  wrong: number;
  seconds: number;
  week: { answered: number; correct: number; prevAnswered: number; prevCorrect: number };
  subjects: Array<{ name: string; answered: number; correct: number }>;
}

export const MISSION_ORDER: MissionKey[] = ["estudar", "combater", "revisar"];

/** Parte do nível atual já percorrida (0–100). */
export function levelPct(s: Pick<GamificationState, "xp" | "levelFloor" | "levelNext">): number {
  const span = s.levelNext - s.levelFloor;
  if (span <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round(((s.xp - s.levelFloor) / span) * 100)));
}

/** XP já ganho hoje e XP que ainda dá para ganhar (missões pendentes + bônus se ainda não veio). */
export function missionXp(s: Pick<GamificationState, "missions" | "missionXp">) {
  let earned = 0;
  let available = 0;
  for (const k of MISSION_ORDER) {
    if (s.missions[k].done) earned += s.missionXp[k];
    else available += s.missionXp[k];
  }
  if (s.missions.completed === 3) earned += s.missionXp.bonus;
  else available += s.missionXp.bonus;
  return { earned, available };
}

/** Próxima meta de disciplina (7, 15, 30, 60…) acima da sequência atual; null se já passou de todas. */
export function nextMilestone(current: number, milestones: readonly number[]): number | null {
  return [...milestones].sort((a, b) => a - b).find((m) => m > current) ?? null;
}

/** Semana atual (segunda a domingo) com o estado de cada dia. */
export function weekDays(today: string, active: readonly string[]): Array<{ day: string; label: string; state: "feito" | "perdido" | "hoje" | "futuro" }> {
  const t = new Date(`${today}T12:00:00Z`);
  const monday = new Date(t);
  monday.setUTCDate(t.getUTCDate() - ((t.getUTCDay() + 6) % 7));
  const set = new Set(active);
  const labels = ["S", "T", "Q", "Q", "S", "S", "D"];
  return labels.map((label, i) => {
    const d = new Date(monday);
    d.setUTCDate(monday.getUTCDate() + i);
    const day = d.toISOString().slice(0, 10);
    const state = set.has(day) ? "feito" : day === today ? "hoje" : day > today ? "futuro" : "perdido";
    return { day, label, state };
  });
}

/** Taxa de acerto em %, ou null sem respostas. */
export function accuracy(correct: number, answered: number): number | null {
  return answered > 0 ? Math.round((correct / answered) * 100) : null;
}

/** Mínimo de respostas em cada semana para comparar evolução. */
export const MIN_WEEK_ANSWERS = 10;

/** Evolução da taxa de acerto (pontos percentuais) desta semana sobre a anterior; null sem dados suficientes. */
export function weeklyEvolution(w: PerformanceState["week"]): number | null {
  if (w.answered < MIN_WEEK_ANSWERS || w.prevAnswered < MIN_WEEK_ANSWERS) return null;
  return Math.round((w.correct / w.answered) * 100 - (w.prevCorrect / w.prevAnswered) * 100);
}

/** Matérias fortes (≥ 70%) e que precisam de atenção (< 70%), já ordenadas pelo banco. */
export function subjectSplit(subjects: PerformanceState["subjects"], limit = 2) {
  const withPct = subjects.map((s) => ({ ...s, pct: Math.round((s.correct / s.answered) * 100) }));
  return {
    best: withPct.filter((s) => s.pct >= 70).slice(0, limit),
    attention: withPct.filter((s) => s.pct < 70).sort((a, b) => a.pct - b.pct).slice(0, limit),
  };
}

/** "48h", "3h 20min", "15min"; null quando não há tempo registrado. */
export function formatStudyTime(seconds: number): string | null {
  if (seconds < 60) return null;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h === 0) return `${m}min`;
  if (h >= 10 || m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}

/** Variação da posição no ranking (positivo = subiu). */
export function rankTrend(r: GamificationState["ranking"]): number | null {
  if (r.position == null || r.previous == null) return null;
  return r.previous - r.position;
}

/** Dias até a prova (data no fuso de Brasília); null sem data confirmada ou prova passada. */
export function daysUntil(examDate: string | null, confirmed: boolean, today: string): number | null {
  if (!examDate || !confirmed) return null;
  const diff = Math.round((Date.parse(`${examDate}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000);
  return diff >= 0 ? diff : null;
}

export const CONTEST_STATUS: Record<string, string> = {
  previsto: "Previsto",
  autorizado: "Autorizado",
  edital_publicado: "Edital publicado",
  inscricoes_abertas: "Inscrições abertas",
  inscricoes_encerradas: "Inscrições encerradas",
  prova_realizada: "Prova realizada",
  encerrado: "Encerrado",
};
