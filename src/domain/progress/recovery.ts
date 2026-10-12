/**
 * Recuperação de nível: só as questões erradas são refeitas, por meio de questões
 * novas no mesmo item. Regra pura (sem I/O), espelhada em `lesson_level_outcome` no banco.
 */
export interface RecoveryQuestionRow {
  id: string;
  node_id: string;
  statement: string;
  recovery_of: string | null;
}

/**
 * Questões oficiais de um nível cuja resposta mais recente (na própria questão ou em
 * qualquer recuperação dela) está errada.
 */
export function wrongRoots(
  questions: readonly RecoveryQuestionRow[],
  attempts: ReadonlyArray<{ question_id: string; is_correct: boolean; created_at: string }>,
): { wrong: RecoveryQuestionRow[]; unanswered: RecoveryQuestionRow[] } {
  const official = questions.filter((q) => !q.recovery_of);
  const rootOf = new Map(questions.map((q) => [q.id, q.recovery_of ?? q.id]));
  const latest = new Map<string, { at: string; ok: boolean }>();
  const answeredOfficial = new Set<string>();
  for (const a of attempts) {
    const root = rootOf.get(a.question_id);
    if (!root) continue;
    if (a.question_id === root) answeredOfficial.add(root);
    const cur = latest.get(root);
    if (!cur || a.created_at > cur.at) latest.set(root, { at: a.created_at, ok: a.is_correct });
  }
  return {
    wrong: official.filter((q) => answeredOfficial.has(q.id) && latest.get(q.id)?.ok === false),
    unanswered: official.filter((q) => !answeredOfficial.has(q.id)),
  };
}

