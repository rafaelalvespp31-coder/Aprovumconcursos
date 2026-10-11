/**
 * Nível, sequência de estudo (streak) e conquistas — regras puras e determinísticas,
 * derivadas apenas de dados reais do aluno. Não há XP: o nível vem dos temas vencidos.
 */

export interface StudyStats {
  /** Respostas registradas (todas as tentativas). */
  answered: number;
  correct: number;
  /** Dias (AAAA-MM-DD, fuso do aluno) com ao menos uma resposta. Qualquer ordem. */
  activeDays: string[];
  /** Maior número de respostas em um único dia. */
  maxInDay: number;
  /** Temas aprovados (todas as questões, ≥75%, essenciais corretas). */
  themesPassed: number;
  /** Temas com domínio confirmado após revisão espaçada. */
  themesMastered: number;
  /** Matérias (módulos) com todos os temas aprovados. */
  modulesClosed: number;
  /** Data de hoje (AAAA-MM-DD) no fuso do aluno. */
  today: string;
}

const DAY = 86_400_000;
const toTime = (iso: string) => Date.parse(`${iso.slice(0, 10)}T00:00:00Z`);

export interface Streak {
  /** Dias seguidos até hoje (ou até ontem, se ainda não estudou hoje). */
  current: number;
  best: number;
  studiedToday: boolean;
  /** Últimos 7 dias, do mais antigo para hoje. */
  last7: boolean[];
}

export function computeStreak(activeDays: readonly string[], today: string): Streak {
  const t0 = toTime(today);
  const days = new Set(activeDays.map((d) => toTime(d)).filter((t) => t <= t0));
  const studiedToday = days.has(t0);
  let current = 0;
  for (let t = studiedToday ? t0 : t0 - DAY; days.has(t); t -= DAY) current++;
  const sorted = [...days].sort((a, b) => a - b);
  let best = 0;
  let run = 0;
  for (let i = 0; i < sorted.length; i++) {
    run = i > 0 && sorted[i]! - sorted[i - 1]! === DAY ? run + 1 : 1;
    best = Math.max(best, run);
  }
  const last7 = Array.from({ length: 7 }, (_, i) => days.has(t0 - (6 - i) * DAY));
  return { current, best, studiedToday, last7 };
}

/** Temas vencidos necessários para subir um nível. */
export const THEMES_PER_LEVEL = 3;

export interface Level {
  level: number;
  /** Temas vencidos dentro do nível atual. */
  intoLevel: number;
  /** Temas que faltam para o próximo nível. */
  remaining: number;
  /** 0–1 até o próximo nível. */
  progress: number;
}

export function computeLevel(themesPassed: number): Level {
  const n = Math.max(0, Math.floor(themesPassed));
  const intoLevel = n % THEMES_PER_LEVEL;
  return {
    level: 1 + Math.floor(n / THEMES_PER_LEVEL),
    intoLevel,
    remaining: THEMES_PER_LEVEL - intoLevel,
    progress: intoLevel / THEMES_PER_LEVEL,
  };
}

export interface Achievement {
  id: string;
  icon: string;
  title: string;
  /** Regra, em linguagem do aluno. */
  rule: string;
  color: string;
  unlocked: boolean;
  /** 0–1, para mostrar quanto falta. */
  progress: number;
  /** Situação atual (ex.: "4 de 7 dias"). */
  status: string;
}

const ratio = (v: number, goal: number) => Math.max(0, Math.min(1, v / goal));

export function computeAchievements(s: StudyStats, streak: Streak): Achievement[] {
  const accuracy = s.answered ? s.correct / s.answered : 0;
  const pct = Math.round(accuracy * 100);
  const list: Array<Omit<Achievement, "unlocked"> & { unlocked: boolean }> = [
    {
      id: "primeiro_tema",
      icon: "🌱",
      title: "Primeiro tema vencido",
      rule: "Aprove seu primeiro tema (todas as questões, 75% de acerto).",
      color: "#E10600",
      unlocked: s.themesPassed >= 1,
      progress: ratio(s.themesPassed, 1),
      status: `${Math.min(s.themesPassed, 1)} de 1 tema`,
    },
    {
      id: "em_chamas",
      icon: "🔥",
      title: "Em chamas",
      rule: "Estude 7 dias seguidos.",
      color: "#E10600",
      unlocked: streak.best >= 7,
      progress: ratio(streak.best, 7),
      status: `Melhor sequência: ${streak.best} de 7 dias`,
    },
    {
      id: "atirador",
      icon: "🎯",
      title: "Atirador de elite",
      rule: "Mantenha 80% de acerto com pelo menos 50 respostas.",
      color: "#E10600",
      unlocked: s.answered >= 50 && accuracy >= 0.8,
      progress: s.answered < 50 ? ratio(s.answered, 50) * 0.5 : 0.5 + ratio(accuracy, 0.8) * 0.5,
      status: s.answered < 50 ? `${s.answered} de 50 respostas` : `${pct}% de acerto (meta: 80%)`,
    },
    {
      id: "rapido",
      icon: "⚡",
      title: "Rápido e certeiro",
      rule: "Responda 20 questões em um único dia.",
      color: "#E10600",
      unlocked: s.maxInDay >= 20,
      progress: ratio(s.maxInDay, 20),
      status: `Recorde: ${s.maxInDay} de 20 em um dia`,
    },
    {
      id: "centena",
      icon: "💯",
      title: "Centena",
      rule: "Responda 100 questões.",
      color: "#E10600",
      unlocked: s.answered >= 100,
      progress: ratio(s.answered, 100),
      status: `${Math.min(s.answered, 100)} de 100 respostas`,
    },
    {
      id: "dominio",
      icon: "🧠",
      title: "Domínio confirmado",
      rule: "Confirme o domínio de um tema na revisão espaçada.",
      color: "#E10600",
      unlocked: s.themesMastered >= 1,
      progress: ratio(s.themesMastered, 1),
      status: `${Math.min(s.themesMastered, 1)} de 1 tema dominado`,
    },
    {
      id: "materia",
      icon: "🏁",
      title: "Matéria fechada",
      rule: "Aprove todos os temas de uma matéria.",
      color: "#E10600",
      unlocked: s.modulesClosed >= 1,
      progress: ratio(s.modulesClosed, 1),
      status: `${Math.min(s.modulesClosed, 1)} de 1 matéria`,
    },
    {
      id: "devorador",
      icon: "📚",
      title: "Devorador de temas",
      rule: "Aprove 25 temas.",
      color: "#E10600",
      unlocked: s.themesPassed >= 25,
      progress: ratio(s.themesPassed, 25),
      status: `${Math.min(s.themesPassed, 25)} de 25 temas`,
    },
  ];
  return list;
}

export interface Gamification {
  streak: Streak;
  level: Level;
  achievements: Achievement[];
  unlockedCount: number;
  accuracy: number | null;
}

export function computeGamification(s: StudyStats): Gamification {
  const streak = computeStreak(s.activeDays, s.today);
  const achievements = computeAchievements(s, streak);
  return {
    streak,
    level: computeLevel(s.themesPassed),
    achievements,
    unlockedCount: achievements.filter((a) => a.unlocked).length,
    accuracy: s.answered ? s.correct / s.answered : null,
  };
}

/** Frase curta para a sequência, sem exagero quando ela é pequena. */
export function streakMessage(st: Streak): string {
  if (st.current === 0) return st.best > 0 ? "Responda uma questão hoje para recomeçar" : "Responda uma questão hoje para começar";
  if (!st.studiedToday) return "Estude hoje para não perder a sequência";
  if (st.current >= 7) return "Você está imbatível";
  return `Faltam ${7 - st.current} dia(s) para 7 seguidos`;
}
