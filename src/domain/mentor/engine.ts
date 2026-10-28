/**
 * Mentor APROVUM — motor de recomendações determinístico (sem IA, sem banco, sem tela).
 *
 * Entrada: um retrato dos dados reais do aluno (MentorSnapshot), montado pela camada de dados.
 * Saída: recomendações explicáveis, com o motivo verificável, a regra que gerou e uma
 * pontuação central e configurável. Mesma entrada → mesma saída.
 *
 * Regras:
 *  A. Aula iniciada e com a leitura não concluída → continuar a aula.
 *  B. Leitura concluída e níveis de questões de fixação ainda não aprovados → fazer as questões
 *     (só se houver questões cadastradas para o próximo nível).
 *  B2. Caderno de questões começado e não terminado → continuar o caderno.
 *  C. Desempenho por assunto com amostra válida mínima: < 70% reforço, 70–84% consolidação,
 *     ≥ 85% manutenção. Amostra insuficiente → praticar mais (nunca "desempenho baixo").
 *  D. Revisão com data real vencida.
 *  E. Sem pendências relevantes → próxima aula liberada (pré-requisitos aprovados).
 */
export const MENTOR_RULES_VERSION = "1.0.0";

export interface MentorConfig {
  /** Abaixo disto (em %), reforço prioritário. */
  reinforceBelow: number;
  /** Abaixo disto (em %), consolidação; daqui para cima, manutenção. */
  consolidateBelow: number;
  /** Respostas válidas mínimas num assunto para dar diagnóstico. */
  minSample: number;
  /** No máximo N recomendações do mesmo tipo (nenhum tipo monopoliza a lista). */
  maxPerKind: number;
  /** Quantas recomendações principais devolver. */
  maxResults: number;
  /** Peso base de cada tipo (maior = mais prioritário). */
  weights: Record<RecommendationKind, number>;
}

export const RECOMMENDATION_KINDS = [
  "aula_pendente",
  "questoes_pendentes",
  "reforco",
  "revisao_vencida",
  "caderno_pendente",
  "consolidacao",
  "praticar_mais",
  "proxima_aula",
  "manutencao",
] as const;
export type RecommendationKind = (typeof RECOMMENDATION_KINDS)[number];

export const DEFAULT_MENTOR_CONFIG: MentorConfig = {
  reinforceBelow: 70,
  consolidateBelow: 85,
  minSample: 10,
  maxPerKind: 2,
  maxResults: 3,
  weights: {
    aula_pendente: 90,
    questoes_pendentes: 80,
    reforco: 70,
    revisao_vencida: 60,
    caderno_pendente: 45,
    consolidacao: 40,
    praticar_mais: 30,
    proxima_aula: 20,
    manutencao: 10,
  },
};

// ---------------------------------------------------------------------------
// Entrada
// ---------------------------------------------------------------------------

export type LessonState =
  | "nao_iniciada"
  | "disponivel"
  | "em_andamento"
  | "aula_concluida"
  | "em_revisao"
  | "aguardando_dominio"
  | "dominada"
  | "necessita_atualizacao"
  | "pendente_validacao";

export interface MentorLesson {
  id: string;
  trailId: string;
  trailTitle: string;
  /** Matéria do estudo (quando conhecida). */
  subject: string | null;
  title: string;
  /** Posição da aula no estudo (1, 2, 3…), para a sequência pedagógica. */
  order: number;
  state: LessonState | null;
  readingDone: boolean;
  /** Níveis de questões aprovados: 0 a 3 (fácil, médio, difícil). */
  levelsPassed: number;
  updatedAt: string | null;
  prerequisiteIds: string[];
  /** Questões de fixação ativas por nível. */
  questionsByLevel: { facil: number; medio: number; dificil: number };
}

export interface MentorAttempt {
  /** null: não dá para saber se acertou (não conta). */
  correct: boolean | null;
  /** Questão desativada/anulada/arquivada: não conta. */
  questionValid: boolean;
  /** Resposta em branco/omitida: não conta. */
  omitted?: boolean;
}

/** Um assunto com respostas do aluno (de uma aula ou do banco de questões). */
export interface MentorTopicPerformance {
  /** Chave estável do assunto (ex.: "aula:<id>" ou "banco:<topicId>"). */
  key: string;
  label: string;
  subject: string | null;
  /** Para onde praticar este assunto. */
  href: string;
  attempts: MentorAttempt[];
}

export interface MentorReview {
  lessonId: string;
  title: string;
  subject: string | null;
  /** ISO; vazio ou inválido = sem data válida (não vira "vencida"). */
  dueAt: string | null;
}

export interface MentorNotebook {
  id: string;
  title: string;
  answered: number;
  available: number;
}

export interface MentorSnapshot {
  now: string;
  lessons: MentorLesson[];
  performance: MentorTopicPerformance[];
  reviews: MentorReview[];
  notebooks: MentorNotebook[];
}

// ---------------------------------------------------------------------------
// Saída
// ---------------------------------------------------------------------------

export type MentorRule = "A" | "B" | "B2" | "C" | "D" | "E";

export interface Recommendation {
  /** Chave lógica (deduplicação): tipo + entidade. */
  key: string;
  kind: RecommendationKind;
  rule: MentorRule;
  title: string;
  /** O que fazer, em uma frase. */
  explanation: string;
  /** Fato verificável que justifica a recomendação. */
  reason: string;
  priority: number;
  entity: { type: "aula" | "assunto" | "revisao" | "caderno"; id: string; label: string; subject: string | null };
  /** Destino real dentro da aplicação. */
  href: string;
  actionLabel: string;
  /** Progresso real (quando existe). */
  progress: { pct: number; label: string } | null;
  /** Muda quando o contexto realmente muda (nova recomendação no histórico). */
  contextHash: string;
}

export interface TopicStat {
  key: string;
  label: string;
  subject: string | null;
  href: string;
  valid: number;
  correct: number;
  /** null quando não há respostas válidas. */
  pct: number | null;
  band: "reforco" | "consolidacao" | "manutencao" | "amostra_insuficiente" | "sem_dados";
}

export interface MentorResult {
  rulesVersion: string;
  /** Todas as recomendações aplicáveis, já ordenadas (para conciliar o histórico). */
  all: Recommendation[];
  /** As principais (limitadas por tipo e no total). */
  top: Recommendation[];
  topics: TopicStat[];
  /** Não há dados suficientes para recomendar algo concreto. */
  insufficientData: boolean;
  /** O aluno tem dados, mas nenhuma pendência. */
  allDone: boolean;
  /** Aulas concluídas (leitura + 3 níveis). */
  completedLessons: MentorLesson[];
}

// ---------------------------------------------------------------------------
// Utilidades puras
// ---------------------------------------------------------------------------

const LEVELS = [
  { n: 1, key: "facil", label: "fácil" },
  { n: 2, key: "medio", label: "médio" },
  { n: 3, key: "dificil", label: "difícil" },
] as const;

/** Mesmo cálculo do painel: leitura + 3 níveis, cada um vale 1/4. */
export function lessonPct(readingDone: boolean, levelsPassed: number): number {
  return Math.round((((readingDone ? 1 : 0) + Math.min(3, Math.max(0, levelsPassed))) / 4) * 100);
}

export const isLessonComplete = (l: Pick<MentorLesson, "readingDone" | "levelsPassed">) => l.readingDone && l.levelsPassed >= 3;

const STARTED: ReadonlySet<LessonState> = new Set(["em_andamento", "aula_concluida", "em_revisao", "aguardando_dominio", "dominada"]);
/** Iniciada: estado de andamento, leitura feita ou algum nível aprovado. */
export const isLessonStarted = (l: MentorLesson) => (l.state !== null && STARTED.has(l.state)) || l.readingDone || l.levelsPassed > 0;

const validDate = (iso: string | null | undefined): Date | null => {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
};

const where = (subject: string | null, label: string) => (subject && subject !== label ? `${subject} — ${label}` : label);

/** Desempenho por assunto: só respostas válidas, cada resposta contada uma vez. */
export function topicStats(perf: readonly MentorTopicPerformance[], cfg: MentorConfig = DEFAULT_MENTOR_CONFIG): TopicStat[] {
  return perf.map((t) => {
    const valid = t.attempts.filter((a) => a.questionValid && !a.omitted && a.correct !== null);
    const correct = valid.filter((a) => a.correct === true).length;
    const pct = valid.length ? Math.round((correct / valid.length) * 1000) / 10 : null;
    const band: TopicStat["band"] =
      pct === null ? "sem_dados" : valid.length < cfg.minSample ? "amostra_insuficiente" : pct < cfg.reinforceBelow ? "reforco" : pct < cfg.consolidateBelow ? "consolidacao" : "manutencao";
    return { key: t.key, label: t.label, subject: t.subject, href: t.href, valid: valid.length, correct, pct, band };
  });
}

const fmtPct = (p: number) => `${String(p).replace(".", ",")}%`;

// ---------------------------------------------------------------------------
// Motor
// ---------------------------------------------------------------------------

export function recommend(s: MentorSnapshot, cfg: MentorConfig = DEFAULT_MENTOR_CONFIG): MentorResult {
  const now = validDate(s.now) ?? new Date(0);
  const out: Recommendation[] = [];
  const w = cfg.weights;
  // Dados inconsistentes (ids repetidos) não viram recomendações em dobro.
  const lessons = [...new Map(s.lessons.map((l) => [l.id, l])).values()];
  const byId = new Map(lessons.map((l) => [l.id, l]));

  // A e B — aulas iniciadas e não concluídas.
  for (const l of lessons) {
    if (isLessonComplete(l) || !isLessonStarted(l)) continue;
    const pct = lessonPct(l.readingDone, l.levelsPassed);
    const updated = validDate(l.updatedAt);
    // Mais recente primeiro (até +5): quem parou ontem retoma antes de quem parou há um mês.
    const recency = updated ? Math.max(0, 5 - Math.floor((now.getTime() - updated.getTime()) / 86_400_000 / 7)) : 0;
    const progress = { pct, label: `${pct}% da aula (leitura e ${l.levelsPassed} de 3 níveis de questões)` };
    if (!l.readingDone) {
      out.push({
        key: `aula_pendente:${l.id}`,
        kind: "aula_pendente",
        rule: "A",
        title: "Você tem uma aula para concluir",
        explanation: `Termine a teoria de ${where(l.subject, l.title)}.`,
        reason: `Você iniciou esta aula e a leitura ainda não foi concluída (${pct}% da aula).`,
        priority: w.aula_pendente + recency,
        entity: { type: "aula", id: l.id, label: l.title, subject: l.subject },
        href: `/aula/${l.id}`,
        actionLabel: "Continuar aula",
        progress,
        contextHash: `r0-l${l.levelsPassed}`,
      });
      continue;
    }
    const next = LEVELS.find((x) => x.n === l.levelsPassed + 1);
    if (!next) continue;
    const available = l.questionsByLevel[next.key];
    // Não recomenda questões que não existem.
    if (available <= 0) continue;
    out.push({
      key: `questoes_pendentes:${l.id}`,
      kind: "questoes_pendentes",
      rule: "B",
      title: "Faltam as questões de fixação",
      explanation: `Resolva as questões do nível ${next.label} de ${where(l.subject, l.title)}.`,
      reason: `A leitura está concluída e ${l.levelsPassed === 0 ? "nenhum nível de questões foi aprovado ainda" : `você aprovou ${l.levelsPassed} de 3 níveis`}; o nível ${next.label} tem ${available} ${available === 1 ? "questão" : "questões"}.`,
      priority: w.questoes_pendentes + recency,
      entity: { type: "aula", id: l.id, label: l.title, subject: l.subject },
      href: `/aula/${l.id}#questoes`,
      actionLabel: `Fazer questões (${next.label})`,
      progress,
      contextHash: `r1-l${l.levelsPassed}`,
    });
  }

  // B2 — cadernos começados e não terminados.
  for (const n of s.notebooks) {
    if (n.answered <= 0 || n.available <= 0 || n.answered >= n.available) continue;
    const left = n.available - n.answered;
    out.push({
      key: `caderno_pendente:${n.id}`,
      kind: "caderno_pendente",
      rule: "B2",
      title: "Caderno de questões em andamento",
      explanation: `Continue o caderno "${n.title}" de onde parou.`,
      reason: `Você respondeu ${n.answered} de ${n.available} questões deste caderno; faltam ${left}.`,
      priority: w.caderno_pendente + Math.min(5, Math.round((n.answered / n.available) * 5)),
      entity: { type: "caderno", id: n.id, label: n.title, subject: null },
      href: `/questoes/cadernos/${n.id}`,
      actionLabel: "Continuar caderno",
      progress: { pct: Math.round((n.answered / n.available) * 100), label: `${n.answered} de ${n.available} questões` },
      contextHash: "andamento",
    });
  }

  // C — desempenho por assunto (só com amostra válida).
  const topics = topicStats(s.performance, cfg);
  for (const t of topics) {
    if (t.pct === null) continue;
    const base = { entity: { type: "assunto" as const, id: t.key, label: t.label, subject: t.subject }, href: t.href, progress: null };
    if (t.band === "amostra_insuficiente") {
      const missing = cfg.minSample - t.valid;
      out.push({
        ...base,
        key: `praticar_mais:${t.key}`,
        kind: "praticar_mais",
        rule: "C",
        title: "Pratique mais antes do diagnóstico",
        explanation: `Resolva mais ${missing} ${missing === 1 ? "questão" : "questões"} de ${where(t.subject, t.label)}.`,
        reason: `Você tem ${t.valid} ${t.valid === 1 ? "resposta válida" : "respostas válidas"} neste assunto; o diagnóstico precisa de pelo menos ${cfg.minSample}.`,
        priority: w.praticar_mais + Math.min(5, t.valid),
        actionLabel: "Praticar",
        contextHash: "amostra",
      });
      continue;
    }
    const pct = t.pct;
    const facts = `${t.correct} de ${t.valid} respostas válidas certas (${fmtPct(pct)})`;
    if (t.band === "reforco")
      out.push({
        ...base,
        key: `reforco:${t.key}`,
        kind: "reforco",
        rule: "C",
        title: "Assunto que precisa de reforço",
        explanation: `Reforce ${where(t.subject, t.label)}: releia a teoria e refaça as questões.`,
        reason: `${facts}, abaixo de ${cfg.reinforceBelow}%.`,
        priority: w.reforco + Math.min(10, Math.round((cfg.reinforceBelow - pct) / 7)),
        actionLabel: "Reforçar",
        contextHash: "reforco",
      });
    else if (t.band === "consolidacao")
      out.push({
        ...base,
        key: `consolidacao:${t.key}`,
        kind: "consolidacao",
        rule: "C",
        title: "Consolide este assunto",
        explanation: `Pratique mais ${where(t.subject, t.label)} para passar de ${cfg.consolidateBelow}%.`,
        reason: `${facts}, entre ${cfg.reinforceBelow}% e ${cfg.consolidateBelow}%.`,
        priority: w.consolidacao + Math.min(5, Math.round((cfg.consolidateBelow - pct) / 3)),
        actionLabel: "Praticar",
        contextHash: "consolidacao",
      });
    else
      out.push({
        ...base,
        key: `manutencao:${t.key}`,
        kind: "manutencao",
        rule: "C",
        title: "Bom desempenho: mantenha com revisão",
        explanation: `Mantenha ${where(t.subject, t.label)} com revisões espaçadas.`,
        reason: `${facts}, a partir de ${cfg.consolidateBelow}%.`,
        priority: w.manutencao,
        actionLabel: "Ver assunto",
        contextHash: "manutencao",
      });
  }

  // D — revisões efetivamente vencidas (só com data válida).
  for (const r of s.reviews) {
    const due = validDate(r.dueAt);
    if (!due || due.getTime() > now.getTime()) continue;
    const days = Math.floor((now.getTime() - due.getTime()) / 86_400_000);
    out.push({
      key: `revisao_vencida:${r.lessonId}`,
      kind: "revisao_vencida",
      rule: "D",
      title: "Revisão vencida",
      explanation: `Revise ${where(r.subject, r.title)}.`,
      reason: days === 0 ? "A revisão programada vence hoje." : `A revisão programada venceu há ${days} ${days === 1 ? "dia" : "dias"}.`,
      priority: w.revisao_vencida + Math.min(10, days),
      entity: { type: "revisao", id: r.lessonId, label: r.title, subject: r.subject },
      href: `/aula/${r.lessonId}?revisao=1#questoes`,
      actionLabel: "Revisar agora",
      progress: null,
      contextHash: due.toISOString().slice(0, 10),
    });
  }

  // E — próxima aula, só quando não há pendência relevante.
  const relevant = out.some((r) => r.kind === "aula_pendente" || r.kind === "questoes_pendentes" || r.kind === "reforco" || r.kind === "revisao_vencida");
  if (!relevant) {
    for (const l of nextLessons(lessons, byId)) {
      out.push({
        key: `proxima_aula:${l.id}`,
        kind: "proxima_aula",
        rule: "E",
        title: "Próxima aula",
        explanation: `Comece ${where(l.subject, l.title)}.`,
        reason: `É a próxima aula de "${l.trailTitle}" na sequência, e os pré-requisitos estão aprovados.`,
        priority: w.proxima_aula,
        entity: { type: "aula", id: l.id, label: l.title, subject: l.subject },
        href: `/aula/${l.id}`,
        actionLabel: "Começar aula",
        progress: null,
        contextHash: "proxima",
      });
    }
  }

  const all = sortRecommendations(out);
  const top = pickTop(all, cfg);

  const hasData = lessons.length > 0 || topics.some((t) => t.valid > 0) || s.notebooks.some((n) => n.answered > 0);
  const pending = all.some((r) => r.kind !== "manutencao");
  return {
    rulesVersion: MENTOR_RULES_VERSION,
    all,
    top,
    topics,
    insufficientData: !hasData,
    allDone: hasData && !pending,
    completedLessons: lessons.filter(isLessonComplete),
  };
}

/** As principais: no máximo `maxPerKind` do mesmo tipo e `maxResults` no total (lista já ordenada). */
export function pickTop<T extends Pick<Recommendation, "kind">>(sorted: readonly T[], cfg: MentorConfig = DEFAULT_MENTOR_CONFIG): T[] {
  const perKind = new Map<RecommendationKind, number>();
  const top: T[] = [];
  for (const r of sorted) {
    if (top.length >= cfg.maxResults) break;
    const c = perKind.get(r.kind) ?? 0;
    if (c >= cfg.maxPerKind) continue;
    perKind.set(r.kind, c + 1);
    top.push(r);
  }
  return top;
}

/** Ordem determinística: prioridade ↓, ordem dos tipos, título (pt-BR) e chave. */
export function sortRecommendations(list: readonly Recommendation[]): Recommendation[] {
  const kindRank = new Map(RECOMMENDATION_KINDS.map((k, i) => [k, i]));
  return [...list].sort(
    (a, b) =>
      b.priority - a.priority ||
      (kindRank.get(a.kind) ?? 99) - (kindRank.get(b.kind) ?? 99) ||
      a.entity.label.localeCompare(b.entity.label, "pt-BR") ||
      a.key.localeCompare(b.key),
  );
}

/** Próxima aula de cada estudo: a primeira não iniciada, na ordem, com os pré-requisitos aprovados. */
export function nextLessons(lessons: readonly MentorLesson[], byId = new Map(lessons.map((l) => [l.id, l]))): MentorLesson[] {
  const trails = [...new Set(lessons.map((l) => l.trailId))];
  const outList: MentorLesson[] = [];
  for (const tid of trails) {
    const list = lessons.filter((l) => l.trailId === tid).sort((a, b) => a.order - b.order);
    const next = list.find((l) => !isLessonComplete(l) && !isLessonStarted(l) && l.prerequisiteIds.every((p) => { const pre = byId.get(p); return !pre || isLessonComplete(pre); }));
    if (next) outList.push(next);
  }
  return outList;
}

/** Depois desta aula, qual vem (mesmo estudo, na ordem, ainda não concluída). */
export function lessonAfter(lessons: readonly MentorLesson[], lessonId: string): MentorLesson | null {
  const cur = lessons.find((l) => l.id === lessonId);
  if (!cur) return null;
  return lessons.filter((l) => l.trailId === cur.trailId && l.order > cur.order && !isLessonComplete(l)).sort((a, b) => a.order - b.order)[0] ?? null;
}
