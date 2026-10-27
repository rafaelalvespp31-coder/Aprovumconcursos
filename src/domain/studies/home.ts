/**
 * Página de Estudos: agregação dos dados reais do aluno (regra pura, sem I/O).
 * Tudo o que aparece na tela sai daqui — nada é estimado ou inventado: o que não existe
 * no banco vira estado vazio.
 */

export interface StudyCard {
  id: string;
  title: string;
  /** Matéria (do catálogo) ou pasta do aluno; null quando não há nenhuma das duas. */
  discipline: string | null;
  answered: number;
  totalQuestions: number;
  lessonsDone: number;
  lessonsTotal: number;
  lastStudiedAt: string | null;
  /** Estudo da aula em andamento (destaque "EM ANDAMENTO"). */
  inProgress: boolean;
  ready: boolean;
}

export interface CurrentLesson {
  trailId: string;
  trailTitle: string;
  lessonId: string;
  lessonTitle: string;
  objective: string;
  minutes: number;
  discipline: string | null;
  lessonsDone: number;
  lessonsTotal: number;
}

export interface SubjectSummary {
  discipline: string;
  /** Aulas publicadas no catálogo. */
  topics: number;
  /** Questões revisadas do banco do catálogo. */
  questions: number;
  /** Aulas do catálogo que o aluno concluiu (três níveis aprovados). */
  done: number;
}

/** Tema do catálogo para o seletor "Escolha seu novo estudo", com o andamento do aluno (se já estuda). */
export interface ThemeCard {
  id: string;
  title: string;
  discipline: string;
  questions: number;
  minutes: number;
  /** Estudo do aluno que usa este tema (o mais recente); null quando ainda não começou. */
  study: { trailId: string; answered: number; totalQuestions: number; lessonsDone: number; lessonsTotal: number; lastStudiedAt: string | null; pct: number; done: boolean } | null;
  /** Tópico do edital que agrupa a aula (ex.: 4. Ilicitude › 4.1); ausente = aula avulsa. */
  group?: ThemeGroup | null;
}

export interface ThemeGroup {
  title: string;
  code: string | null;
  sub: string | null;
}

export interface StudiesHome {
  name: string | null;
  overall: { answered: number; total: number };
  streak: { current: number; last7: boolean[] };
  lessons: { done: number; total: number };
  /** Soma do tempo registrado nas respostas (segundos). */
  questionSeconds: number;
  lastAccess: string | null;
  current: CurrentLesson | null;
  studies: StudyCard[];
  subjects: SubjectSummary[];
  /** Temas publicados do catálogo (com título), por matéria e título. */
  themes: ThemeCard[];
}

export interface StudiesRaw {
  name: string | null;
  streak: { current: number; last7: boolean[] };
  trails: Array<{ id: string; title: string; status: string; last_studied_at: string | null; updated_at: string; folder_id: string | null; catalogTopicIds: string[] }>;
  folders: Array<{ id: string; name: string }>;
  lessons: Array<{ id: string; trail_id: string; title: string; objective: string; estimated_minutes: number; sort_order: number }>;
  progress: Array<{ lesson_id: string; trail_id: string; state: string; levels_passed: number; updated_at: string }>;
  questions: Array<{ id: string; lesson_id: string }>;
  attempts: Array<{ question_id: string; created_at: string; time_spent_seconds: number | null }>;
  catalog: Array<{ id: string; discipline: string; questions: number; title?: string; minutes?: number; group?: ThemeGroup | null }>;
}

const ACTIVE_STATES = new Set(["em_andamento", "aula_concluida", "em_revisao", "disponivel", "aguardando_dominio"]);

export function buildStudiesHome(r: StudiesRaw): StudiesHome {
  const trailIds = new Set(r.trails.map((t) => t.id));
  const lessons = r.lessons.filter((l) => trailIds.has(l.trail_id));
  const lessonTrail = new Map(lessons.map((l) => [l.id, l.trail_id]));
  const passed = new Set(r.progress.filter((p) => p.levels_passed >= 3).map((p) => p.lesson_id));
  const questions = r.questions.filter((q) => lessonTrail.has(q.lesson_id));
  const answeredIds = new Set(r.attempts.map((a) => a.question_id));
  const catalogDiscipline = new Map(r.catalog.map((c) => [c.id, c.discipline]));
  const folderName = new Map(r.folders.map((f) => [f.id, f.name]));
  const disciplineOf = (t: StudiesRaw["trails"][number]) =>
    t.catalogTopicIds.map((id) => catalogDiscipline.get(id)).find(Boolean) ?? (t.folder_id ? folderName.get(t.folder_id) ?? null : null);

  // Aula em andamento: a atualizada mais recentemente, de um estudo ativo, ainda não concluída nos 3 níveis.
  const latest = [...r.progress]
    .filter((p) => trailIds.has(p.trail_id) && ACTIVE_STATES.has(p.state) && p.levels_passed < 3)
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))[0];
  const curLesson = latest ? lessons.find((l) => l.id === latest.lesson_id) : undefined;
  const curTrail = curLesson ? r.trails.find((t) => t.id === curLesson.trail_id) : undefined;
  const perTrail = (id: string) => {
    const ls = lessons.filter((l) => l.trail_id === id);
    const qs = questions.filter((q) => lessonTrail.get(q.lesson_id) === id);
    return {
      lessonsTotal: ls.length,
      lessonsDone: ls.filter((l) => passed.has(l.id)).length,
      totalQuestions: qs.length,
      answered: qs.filter((q) => answeredIds.has(q.id)).length,
    };
  };

  const studies: StudyCard[] = r.trails
    .map((t) => ({
      id: t.id,
      title: t.title,
      discipline: disciplineOf(t),
      ...perTrail(t.id),
      lastStudiedAt: t.last_studied_at,
      inProgress: !!curTrail && curTrail.id === t.id,
      ready: t.status === "active",
    }))
    .sort((a, b) => Number(b.inProgress) - Number(a.inProgress) || (b.lastStudiedAt ?? "").localeCompare(a.lastStudiedAt ?? ""));

  // Catálogo por matéria, com o que o aluno já concluiu de cada uma.
  const doneTopics = new Set<string>();
  for (const t of r.trails) {
    const p = perTrail(t.id);
    if (p.lessonsTotal > 0 && p.lessonsDone === p.lessonsTotal) for (const id of t.catalogTopicIds) doneTopics.add(id);
  }
  const bySubject = new Map<string, SubjectSummary>();
  for (const c of r.catalog) {
    const s = bySubject.get(c.discipline) ?? { discipline: c.discipline, topics: 0, questions: 0, done: 0 };
    s.topics++;
    s.questions += c.questions;
    if (doneTopics.has(c.id)) s.done++;
    bySubject.set(c.discipline, s);
  }
  const subjects = [...bySubject.values()].sort((a, b) => b.topics - a.topics || a.discipline.localeCompare(b.discipline, "pt-BR"));

  // Temas do catálogo com o andamento do estudo correspondente (o estudado mais recentemente).
  const studyByTopic = new Map<string, StudiesRaw["trails"][number]>();
  for (const t of [...r.trails].sort((a, b) => (a.last_studied_at ?? a.updated_at).localeCompare(b.last_studied_at ?? b.updated_at)))
    for (const id of t.catalogTopicIds) studyByTopic.set(id, t);
  const themes: ThemeCard[] = r.catalog
    .filter((c): c is typeof c & { title: string } => !!c.title)
    .map((c) => {
      const t = studyByTopic.get(c.id);
      const p = t ? perTrail(t.id) : null;
      return {
        id: c.id,
        title: c.title,
        discipline: c.discipline,
        questions: c.questions,
        minutes: c.minutes ?? 0,
        group: c.group ?? null,
        study:
          t && p
            ? {
                trailId: t.id,
                ...p,
                lastStudiedAt: t.last_studied_at,
                pct: p.totalQuestions ? pct(p.answered, p.totalQuestions) : pct(p.lessonsDone, p.lessonsTotal),
                done: p.lessonsTotal > 0 && p.lessonsDone === p.lessonsTotal,
              }
            : null,
      };
    })
    .sort((a, b) => a.discipline.localeCompare(b.discipline, "pt-BR") || a.title.localeCompare(b.title, "pt-BR"));

  const times = [...r.attempts.map((a) => a.created_at), ...r.trails.map((t) => t.last_studied_at).filter((x): x is string => !!x)];
  const cur = curTrail ? perTrail(curTrail.id) : null;
  return {
    name: r.name,
    overall: { answered: questions.filter((q) => answeredIds.has(q.id)).length, total: questions.length },
    streak: r.streak,
    lessons: { done: lessons.filter((l) => passed.has(l.id)).length, total: lessons.length },
    questionSeconds: r.attempts.reduce((s, a) => s + (a.time_spent_seconds ?? 0), 0),
    lastAccess: times.length ? times.reduce((a, b) => (a > b ? a : b)) : null,
    current:
      curLesson && curTrail && cur
        ? {
            trailId: curTrail.id,
            trailTitle: curTrail.title,
            lessonId: curLesson.id,
            lessonTitle: curLesson.title,
            objective: curLesson.objective,
            minutes: curLesson.estimated_minutes,
            discipline: disciplineOf(curTrail),
            lessonsDone: cur.lessonsDone,
            lessonsTotal: cur.lessonsTotal,
          }
        : null,
    studies,
    subjects,
    themes,
  };
}

/** "2h 30min", "45min", "—" (sem registro). */
export function formatDuration(seconds: number): string {
  if (seconds < 60) return seconds > 0 ? "< 1min" : "—";
  const m = Math.round(seconds / 60);
  const h = Math.floor(m / 60);
  return h ? `${h}h ${String(m % 60).padStart(2, "0")}min` : `${m}min`;
}

/** "Hoje, 10:24", "Ontem, 18:02", "12/10, 09:15". */
export function formatLastAccess(iso: string | null, now = new Date()): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const tz = "America/Sao_Paulo";
  const day = (x: Date) => x.toLocaleDateString("pt-BR", { timeZone: tz });
  const time = d.toLocaleTimeString("pt-BR", { timeZone: tz, hour: "2-digit", minute: "2-digit" });
  const y = new Date(now.getTime() - 86400000);
  if (day(d) === day(now)) return `Hoje, ${time}`;
  if (day(d) === day(y)) return `Ontem, ${time}`;
  return `${d.toLocaleDateString("pt-BR", { timeZone: tz, day: "2-digit", month: "2-digit" })}, ${time}`;
}

/** "agora", "há 2h", "há 3 dias". */
export function timeAgo(iso: string | null, now = new Date()): string {
  if (!iso) return "ainda não estudado";
  const s = Math.max(0, (now.getTime() - new Date(iso).getTime()) / 1000);
  if (s < 600) return "agora";
  if (s < 3600) return `há ${Math.floor(s / 60)} min`;
  if (s < 86400) return `há ${Math.floor(s / 3600)}h`;
  const d = Math.floor(s / 86400);
  return d === 1 ? "há 1 dia" : `há ${d} dias`;
}

export const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0);
