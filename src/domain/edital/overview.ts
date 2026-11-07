/**
 * Cálculo puro dos números de "Meus Editais". Usa as MESMAS regras do detalhe de cada edital:
 * - aula estudada (0–100) = leitura + níveis (lessonStudyPct);
 * - tópico concluído = tem aula e todas as aulas vinculadas a 100% (isTopicDone);
 * - % do edital = tópicos concluídos / tópicos do edital;
 * - questões = tentativas do Modo Jogo nas aulas do edital, feitas depois de o edital ser enviado.
 * Cada edital é calculado só com os próprios tópicos: o progresso de um nunca entra no outro.
 */

export interface OvPrep { id: string; createdAt: string; ready: boolean }
export interface OvTopic { id: string; prepId: string; status: string }
export interface OvLink { topicId: string; catalogId: string }
/** Estudo do aluno por aula do catálogo (a melhor entre as cópias dele). */
export interface OvStudy { pct: number; lessonId: string; doneAt: string | null; lastAt: string | null }
export interface OvAttempt { id: string; catalogId: string; createdAt: string }

export interface PrepProgress {
  topics: number;
  topicsDone: number;
  pct: number;
  lessons: number;
  lessonsDone: number;
  questions: number;
  started: boolean;
  lastActivity: string | null;
  /** Próxima aula válida: a primeira não concluída, na ordem do edital, que o aluno já tem em Meus estudos. */
  nextLessonId: string | null;
}

export interface Overview {
  byPrep: Map<string, PrepProgress>;
  analyzed: number;
  /** Média simples do % de conclusão dos editais prontos; null sem editais prontos. */
  avgPct: number | null;
  /** Pontos de conclusão ganhos nos últimos 7 dias; null quando ainda não há aula concluída com data. */
  evolution7d: number | null;
  questions: number;
}

export function computeOverview(
  input: { preps: OvPrep[]; topics: OvTopic[]; links: OvLink[]; study: Map<string, OvStudy>; attempts: OvAttempt[]; isDone: (status: string, pcts: number[]) => boolean },
  now = Date.now(),
): Overview {
  const weekAgo = new Date(now - 7 * 86_400_000).toISOString();
  const linksBy = new Map<string, string[]>();
  for (const l of input.links) linksBy.set(l.topicId, [...(linksBy.get(l.topicId) ?? []), l.catalogId]);
  const topicsBy = new Map<string, OvTopic[]>();
  for (const t of input.topics) topicsBy.set(t.prepId, [...(topicsBy.get(t.prepId) ?? []), t]);
  const attemptsBy = new Map<string, OvAttempt[]>();
  for (const a of input.attempts) attemptsBy.set(a.catalogId, [...(attemptsBy.get(a.catalogId) ?? []), a]);

  const byPrep = new Map<string, PrepProgress>();
  const countedAttempts = new Set<string>();
  const pctNow: number[] = [];
  const pctBefore: number[] = [];
  let anyDated = false;

  for (const p of input.preps) {
    if (!p.ready) continue;
    const topics = topicsBy.get(p.id) ?? [];
    const lessonIds = new Set<string>();
    let done = 0, doneBefore = 0;
    let next: string | null = null;
    let nextInProgress: string | null = null;
    for (const t of topics) {
      const cids = linksBy.get(t.id) ?? [];
      cids.forEach((c) => lessonIds.add(c));
      const st = cids.map((c) => input.study.get(c));
      if (input.isDone(t.status, st.map((s) => s?.pct ?? 0))) {
        done++;
        // Concluído há mais de 7 dias = todas as aulas já estavam concluídas antes disso.
        const dates = st.map((s) => s?.doneAt ?? null);
        if (dates.every((d) => d !== null)) anyDated = true;
        if (dates.every((d) => d !== null && d < weekAgo)) doneBefore++;
      }
      for (const s of st) {
        if (!s || s.pct >= 100) continue;
        if (!next) next = s.lessonId;
        if (!nextInProgress && s.pct > 0) nextInProgress = s.lessonId;
      }
    }
    let lessonsDone = 0, started = false, last: string | null = null, questions = 0;
    for (const c of lessonIds) {
      const s = input.study.get(c);
      if (s && s.pct >= 100) lessonsDone++;
      if (s && s.pct > 0) started = true;
      if (s?.lastAt && (!last || s.lastAt > last)) last = s.lastAt;
      for (const a of attemptsBy.get(c) ?? []) {
        if (a.createdAt < p.createdAt) continue;
        questions++;
        countedAttempts.add(a.id);
        if (!last || a.createdAt > last) last = a.createdAt;
      }
    }
    if (questions > 0) started = true;
    const pct = topics.length ? Math.round((done / topics.length) * 100) : 0;
    byPrep.set(p.id, { topics: topics.length, topicsDone: done, pct, lessons: lessonIds.size, lessonsDone, questions, started, lastActivity: last, nextLessonId: nextInProgress ?? next });
    pctNow.push(pct);
    // Edital enviado nos últimos 7 dias começa do zero nessa comparação.
    pctBefore.push(p.createdAt < weekAgo && topics.length ? Math.round((doneBefore / topics.length) * 100) : 0);
  }

  const avg = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : null);
  const avgNow = avg(pctNow);
  return {
    byPrep,
    analyzed: pctNow.length,
    avgPct: avgNow,
    evolution7d: anyDated && avgNow !== null ? avgNow - (avg(pctBefore) ?? 0) : null,
    questions: countedAttempts.size,
  };
}
