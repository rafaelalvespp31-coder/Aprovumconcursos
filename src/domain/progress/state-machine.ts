/**
 * Máquina de estados de progresso por unidade (seção 10).
 * Pura e determinística; a persistência fica na camada de servidor.
 *
 * Princípio: leitura concluída ≠ domínio demonstrado.
 *  - Avaliação em três níveis (fácil → médio → difícil), cada um com ≥ 90%.
 *  - "aguardando_dominio": passou no nível difícil → libera a próxima unidade,
 *    mas o domínio só é confirmado após revisão bem-sucedida depois de um intervalo.
 *  - "dominada": confirmada a retenção ao longo do tempo.
 */

export const UNIT_STATES = [
  "nao_iniciada",
  "disponivel",
  "em_andamento",
  "aula_concluida",
  "em_revisao",
  "aguardando_dominio",
  "dominada",
  "necessita_atualizacao",
  "pendente_validacao",
] as const;
export type UnitState = (typeof UNIT_STATES)[number];

export const STATE_LABELS: Record<UnitState, string> = {
  nao_iniciada: "Não iniciada",
  disponivel: "Disponível",
  em_andamento: "Em andamento",
  aula_concluida: "Aula concluída",
  em_revisao: "Em revisão",
  aguardando_dominio: "Aguardando domínio",
  dominada: "Dominada",
  necessita_atualizacao: "Necessita atualização",
  pendente_validacao: "Pendente de validação",
};

export interface MasteryCriteria {
  /** Exige leitura da aula antes de contabilizar questões. */
  requireLessonCompletion: boolean;
  /** Exige responder TODAS as questões de fixação do tema antes de avançar. */
  requireAllQuestions: boolean;
  /** Mínimo de questões distintas respondidas na unidade. */
  minQuestions: number;
  /** Proporção mínima de acertos (0–1) para aprovar cada nível. */
  minAccuracy: number;
  /** Proporção mínima de acertos nas questões marcadas como essenciais. */
  minEssentialAccuracy: number;
  /** Dias mínimos entre a aprovação inicial e a revisão que confirma o domínio. */
  minRetentionDays: number;
  /** Acerto mínimo na revisão de retenção. */
  minReviewAccuracy: number;
}

export const DEFAULT_CRITERIA: MasteryCriteria = {
  requireLessonCompletion: true,
  requireAllQuestions: true,
  minQuestions: 4,
  minAccuracy: 0.9,
  minEssentialAccuracy: 1,
  minRetentionDays: 2,
  minReviewAccuracy: 0.7,
};

export interface QuizOutcome {
  answered: number;
  correct: number;
  essentialAnswered: number;
  /** Questões de fixação disponíveis no tema (quando conhecido). */
  total?: number;
  essentialCorrect: number;
}

export type UnitEvent =
  | { type: "UNLOCK" }
  | { type: "START" }
  | { type: "COMPLETE_READING" }
  /** Resultado de um nível (1 fácil, 2 médio, 3 difícil). Sem `level`, vale o próximo nível. */
  | { type: "QUIZ_EVALUATED"; outcome: QuizOutcome; at: Date; level?: 1 | 2 | 3 }
  | { type: "REVIEW_EVALUATED"; outcome: QuizOutcome; at: Date }
  | { type: "REVIEW_DUE" }
  | { type: "CONTENT_UPDATED" }
  | { type: "VALIDATION_REQUIRED" }
  | { type: "CONTENT_VALIDATED" };

export interface UnitProgress {
  state: UnitState;
  readingCompletedAt: Date | null;
  passedAt: Date | null;
  masteredAt: Date | null;
  /** Níveis aprovados (0–3). O nível 3 aprovado libera a próxima unidade. */
  levelsPassed: number;
  /** Estado a restaurar depois de validação/atualização. */
  resumeState: UnitState | null;
}

export interface Transition {
  progress: UnitProgress;
  /** Explicação para o aluno (nunca bloquear sem dizer o porquê). */
  explanation: string;
  /** Recomendações quando houver dificuldade. */
  recommendations: string[];
  /** A próxima unidade pode ser liberada? */
  unlocksNext: boolean;
}

export class InvalidTransitionError extends Error {
  constructor(from: UnitState, event: UnitEvent["type"]) {
    super(`Transição inválida: ${event} a partir de "${from}".`);
    this.name = "InvalidTransitionError";
  }
}

export function initialProgress(unlocked: boolean): UnitProgress {
  return {
    state: unlocked ? "disponivel" : "nao_iniciada",
    readingCompletedAt: null,
    passedAt: null,
    masteredAt: null,
    levelsPassed: 0,
    resumeState: null,
  };
}

const LEVEL_NAMES = ["", "fácil", "médio", "difícil"] as const;

export interface QuizVerdict {
  passed: boolean;
  accuracy: number;
  reasons: string[];
}

export function evaluateQuiz(o: QuizOutcome, c: MasteryCriteria, minAccuracy = c.minAccuracy): QuizVerdict {
  const reasons: string[] = [];
  const accuracy = o.answered ? o.correct / o.answered : 0;
  if (c.requireAllQuestions && o.total !== undefined && o.answered < o.total) {
    reasons.push(`Responda todas as ${o.total} questões de fixação do tema (faltam ${o.total - o.answered}).`);
  } else if (o.answered < (o.total !== undefined ? Math.min(c.minQuestions, o.total) : c.minQuestions)) {
    // Com o total conhecido, responder todas basta (um nível pode ter menos questões que o mínimo geral).
    reasons.push(`Responda pelo menos ${c.minQuestions} questões (você respondeu ${o.answered}).`);
  }
  if (accuracy < minAccuracy) {
    reasons.push(
      `Acerto de ${Math.round(accuracy * 100)}%; o mínimo para avançar é ${Math.round(minAccuracy * 100)}%.`,
    );
  }
  if (o.essentialAnswered > 0) {
    const ess = o.essentialCorrect / o.essentialAnswered;
    if (ess < c.minEssentialAccuracy) {
      reasons.push("Há conceitos essenciais da unidade que ainda não foram acertados.");
    }
  }
  return { passed: reasons.length === 0, accuracy, reasons };
}

const DIFFICULTY_TIPS = [
  "Veja uma explicação alternativa do conceito.",
  "Estude os exemplos adicionais da aula.",
  "Resolva novas questões sobre os pontos em que errou.",
];

const DAY = 24 * 60 * 60 * 1000;

export function transition(
  progress: UnitProgress,
  event: UnitEvent,
  criteria: MasteryCriteria = DEFAULT_CRITERIA,
): Transition {
  const p = { ...progress };
  const ok = (explanation: string, extra: Partial<Transition> = {}): Transition => ({
    progress: p,
    explanation,
    recommendations: [],
    unlocksNext: false,
    ...extra,
  });
  const s = progress.state;

  // Eventos de integridade do conteúdo valem em qualquer estado.
  if (event.type === "VALIDATION_REQUIRED") {
    if (s !== "pendente_validacao") p.resumeState = s === "necessita_atualizacao" ? p.resumeState : s;
    p.state = "pendente_validacao";
    return ok("O conteúdo desta unidade está em validação. Você pode consultá-lo, mas ele será revisado.");
  }
  if (event.type === "CONTENT_UPDATED") {
    if (s !== "necessita_atualizacao") p.resumeState = s === "pendente_validacao" ? p.resumeState : s;
    p.state = "necessita_atualizacao";
    return ok("O conteúdo foi atualizado. Revise a aula para manter seu progresso em dia.");
  }
  if (event.type === "CONTENT_VALIDATED") {
    if (s !== "pendente_validacao" && s !== "necessita_atualizacao") throw new InvalidTransitionError(s, event.type);
    // Após atualização, um domínio anterior precisa ser reconfirmado.
    const back = p.resumeState ?? "disponivel";
    p.state = s === "necessita_atualizacao" && back === "dominada" ? "aguardando_dominio" : back;
    p.resumeState = null;
    return ok("Conteúdo validado.", { unlocksNext: p.state === "aguardando_dominio" || p.state === "dominada" });
  }

  switch (event.type) {
    case "UNLOCK":
      if (s !== "nao_iniciada") return ok("Unidade já liberada.");
      p.state = "disponivel";
      return ok("Unidade liberada.");

    case "START":
      if (s === "nao_iniciada") throw new InvalidTransitionError(s, event.type);
      if (s === "disponivel") p.state = "em_andamento";
      // Revisitar conteúdo já concluído nunca rebaixa o progresso.
      return ok("Bons estudos!");

    case "COMPLETE_READING":
      if (s === "nao_iniciada") throw new InvalidTransitionError(s, event.type);
      p.readingCompletedAt ??= new Date();
      if (s === "disponivel" || s === "em_andamento") p.state = "aula_concluida";
      return ok("Leitura concluída. Agora resolva as questões para demonstrar o aprendizado.");

    case "QUIZ_EVALUATED": {
      if (s === "nao_iniciada" || s === "disponivel") throw new InvalidTransitionError(s, event.type);
      if (criteria.requireLessonCompletion && !p.readingCompletedAt) {
        return ok("Conclua a leitura da aula antes das questões de verificação.", {
          recommendations: ["Leia a aula até o fim e marque como concluída."],
        });
      }
      if (s === "aguardando_dominio" || s === "dominada") {
        return ok("Prática registrada.", { unlocksNext: true });
      }
      const passed = p.levelsPassed ?? 0;
      const level = event.level ?? Math.min(3, passed + 1);
      if (level <= passed) {
        return ok(`O nível ${LEVEL_NAMES[level]} já foi aprovado. Esta prática não altera seu progresso.`);
      }
      if (level > passed + 1) {
        return ok(`Conclua o nível ${LEVEL_NAMES[passed + 1]} antes do nível ${LEVEL_NAMES[level]}.`);
      }
      const v = evaluateQuiz(event.outcome, criteria);
      const pct = Math.round(v.accuracy * 100);
      if (v.passed && level < 3) {
        p.levelsPassed = level;
        return ok(`Nível ${LEVEL_NAMES[level]} aprovado com ${pct}%. O nível ${LEVEL_NAMES[level + 1]} foi liberado.`);
      }
      if (v.passed) {
        p.levelsPassed = 3;
        p.state = "aguardando_dominio";
        p.passedAt = event.at;
        return ok(
          `Nível difícil aprovado com ${pct}%. Você concluiu os três níveis desta unidade e a próxima foi liberada. O domínio será confirmado em uma revisão daqui a ${criteria.minRetentionDays} dia(s).`,
          { unlocksNext: true },
        );
      }
      // Reprovação no nível: nada é reiniciado; os exercícios de recuperação cobrem os erros.
      return ok(`Ainda não é hora de avançar no nível ${LEVEL_NAMES[level]}. ${v.reasons.join(" ")}`, {
        recommendations: [
          "Faça os exercícios de recuperação: eles substituem só as questões que você errou.",
          ...DIFFICULTY_TIPS,
        ],
      });
    }

    case "REVIEW_EVALUATED": {
      if (s === "em_revisao") {
        const v = evaluateQuiz(event.outcome, criteria);
        if (v.passed) {
          p.state = "aguardando_dominio";
          p.passedAt = event.at;
          p.levelsPassed = 3;
          return ok("Revisão aprovada. A próxima unidade foi liberada.", { unlocksNext: true });
        }
        return ok(`Continue revisando. ${v.reasons.join(" ")}`, { recommendations: DIFFICULTY_TIPS });
      }
      if (s === "aguardando_dominio" || s === "dominada") {
        const v = evaluateQuiz(
          { ...event.outcome },
          // Revisão usa uma amostra: não exige todas as questões.
          { ...criteria, requireAllQuestions: false, minQuestions: Math.min(criteria.minQuestions, 2) },
          criteria.minReviewAccuracy,
        );
        const waited = p.passedAt ? (event.at.getTime() - p.passedAt.getTime()) / DAY : 0;
        if (v.passed && s === "aguardando_dominio" && waited >= criteria.minRetentionDays) {
          p.state = "dominada";
          p.masteredAt = event.at;
          return ok("Domínio confirmado: você manteve o conhecimento ao longo do tempo.", { unlocksNext: true });
        }
        if (v.passed) {
          return ok(
            s === "dominada"
              ? "Revisão em dia. Domínio mantido."
              : "Boa revisão. O domínio será confirmado após o intervalo mínimo de retenção.",
            { unlocksNext: true },
          );
        }
        // Esquecimento: volta para revisão, mas a unidade seguinte continua liberada.
        p.state = "em_revisao";
        p.masteredAt = null;
        return ok("Parte do conteúdo foi esquecida. Vamos revisar — seu progresso nas próximas unidades está preservado.", {
          recommendations: DIFFICULTY_TIPS,
          unlocksNext: true,
        });
      }
      throw new InvalidTransitionError(s, event.type);
    }

    case "REVIEW_DUE":
      return ok("Há uma revisão programada para esta unidade.");
  }
}
