/**
 * Modelo do painel "Leveza Pastel": transforma dados reais em números dos cards.
 * Puro (sem I/O) para ser testado e reaproveitado pela galeria.
 */
import type { UnitState } from "@/domain/progress/state-machine";
import type { StudyStatus } from "@/domain/studies/subjects-menu";

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

// ---------------------------------------------------------------------------
// Painel (layout de referência): matérias, aulas recentes e atividades — tudo derivado
// de dados reais do aluno. Funções puras, testadas em model.test.ts.
// ---------------------------------------------------------------------------

export interface ProgressRow {
  lessonId: string;
  trailId: string;
  state: string;
  levelsPassed: number;
  readingCompletedAt: string | null;
  updatedAt: string;
  lessonTitle: string;
}

export interface SubjectProgress {
  name: string;
  /** Assunto mais recente da matéria (linha secundária). */
  detail: string;
  /** Aulas (unidades) aprovadas nos três níveis / total de aulas da matéria. */
  done: number;
  total: number;
  pct: number;
  status: StudyStatus;
  /** Estudo a abrir (leva direto à aula atual). */
  studyId: string;
}

export interface RecentLesson {
  lessonId: string;
  title: string;
  subject: string;
  /** Posição da aula no estudo (1 = primeira). */
  position: number | null;
  pct: number;
  at: string;
}

export type ActivityKind = "aula" | "leitura" | "questoes";
export interface Activity {
  kind: ActivityKind;
  title: string;
  detail: string;
  at: string;
  href: string;
}

/** Andamento de uma aula: leitura concluída + três níveis aprovados (cada etapa vale 25%). */
export function lessonPct(readingDone: boolean, levelsPassed: number): number {
  return Math.round((((readingDone ? 1 : 0) + Math.min(3, Math.max(0, levelsPassed))) / 4) * 100);
}

/** "agora", "há 5 min", "há 2 horas", "há 1 dia"… */
export function timeAgo(iso: string, now = new Date()): string {
  const s = Math.max(0, (now.getTime() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "agora";
  const m = Math.floor(s / 60);
  if (m < 60) return `há ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `há ${h} hora${h > 1 ? "s" : ""}`;
  const d = Math.floor(h / 24);
  if (d < 30) return `há ${d} dia${d > 1 ? "s" : ""}`;
  const mo = Math.floor(d / 30);
  return `há ${mo} ${mo > 1 ? "meses" : "mês"}`;
}

/** Situação da matéria a partir da situação dos assuntos. */
export function subjectStatus(statuses: StudyStatus[]): StudyStatus {
  if (statuses.length && statuses.every((s) => s === "concluido")) return "concluido";
  return statuses.some((s) => s !== "nao_iniciado") ? "andamento" : "nao_iniciado";
}

export function buildSubjects(
  groups: Array<{ name: string; studies: Array<{ id: string; title: string; status: StudyStatus }> }>,
  lessonsByTrail: Map<string, number>,
  doneByTrail: Map<string, number>,
): SubjectProgress[] {
  return groups
    .filter((g) => g.studies.length > 0)
    .map((g) => {
      const total = g.studies.reduce((s, t) => s + (lessonsByTrail.get(t.id) ?? 0), 0);
      const done = g.studies.reduce((s, t) => s + Math.min(lessonsByTrail.get(t.id) ?? 0, doneByTrail.get(t.id) ?? 0), 0);
      const first = g.studies.find((t) => t.status === "andamento") ?? g.studies.find((t) => t.status === "nao_iniciado") ?? g.studies[0]!;
      return {
        name: g.name,
        detail: g.studies.length > 1 ? `${first.title} e mais ${g.studies.length - 1}` : first.title,
        done,
        total,
        pct: total ? Math.round((done / total) * 100) : 0,
        status: subjectStatus(g.studies.map((t) => t.status)),
        studyId: first.id,
      };
    });
}

/**
 * Linha do tempo do aluno: aulas acessadas, leituras concluídas e blocos de questões
 * respondidas (agrupados por aula e por dia). Mais recentes primeiro.
 */
export function buildActivities(
  progress: ProgressRow[],
  attempts: Array<{ at: string; correct: boolean; lessonId: string; lessonTitle: string }>,
  subjectOfTrail: Map<string, string>,
  trailOfLesson: Map<string, string>,
  now = new Date(),
  base = "",
  limit = 4,
): Activity[] {
  const out: Activity[] = [];
  for (const p of progress) {
    const subject = subjectOfTrail.get(p.trailId);
    const where = subject ? ` (${subject})` : "";
    if (p.readingCompletedAt) {
      out.push({ kind: "leitura", title: `Você concluiu a aula ${p.lessonTitle}${where}`, detail: timeAgo(p.readingCompletedAt, now), at: p.readingCompletedAt, href: `${base}/aula/${p.lessonId}` });
    }
    const touched = new Date(p.updatedAt).getTime();
    const sameAsReading = p.readingCompletedAt && Math.abs(touched - new Date(p.readingCompletedAt).getTime()) < 120_000;
    if (!sameAsReading && p.state !== "nao_iniciada") {
      out.push({ kind: "aula", title: `Aula: ${p.lessonTitle}${where}`, detail: `Acessada ${timeAgo(p.updatedAt, now)}`, at: p.updatedAt, href: `${base}/aula/${p.lessonId}` });
    }
  }
  const blocks = new Map<string, { lessonId: string; title: string; n: number; ok: number; at: string }>();
  for (const a of attempts) {
    const key = `${a.lessonId}|${a.at.slice(0, 10)}`;
    const b = blocks.get(key) ?? { lessonId: a.lessonId, title: a.lessonTitle, n: 0, ok: 0, at: a.at };
    b.n += 1;
    b.ok += a.correct ? 1 : 0;
    if (a.at > b.at) b.at = a.at;
    blocks.set(key, b);
  }
  for (const b of blocks.values()) {
    const subject = subjectOfTrail.get(trailOfLesson.get(b.lessonId) ?? "");
    out.push({
      kind: "questoes",
      title: `Você respondeu ${b.n} ${b.n === 1 ? "questão" : "questões"} de ${b.title}${subject ? ` (${subject})` : ""}`,
      detail: `${b.ok} ${b.ok === 1 ? "acerto" : "acertos"} · ${timeAgo(b.at, now)}`,
      at: b.at,
      href: `${base}/aula/${b.lessonId}`,
    });
  }
  return out.sort((a, b) => b.at.localeCompare(a.at)).slice(0, limit);
}
