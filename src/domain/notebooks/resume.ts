/**
 * Onde o caderno continua quando o aluno volta — regra pura.
 *  - Estava numa questão e ainda não respondeu: volta exatamente nela.
 *  - Já respondeu a questão em que estava: vai para a próxima não respondida depois dela
 *    (se não houver, a próxima não respondida desde o começo; se tudo foi feito, fica nela).
 *  - Nunca abriu (ou a questão saiu do caderno): a primeira não respondida.
 */
export function resumeIndex(ids: readonly string[], lastQuestionId: string | null, answered: ReadonlySet<string>): number {
  if (!ids.length) return 0;
  const firstOpen = (from: number) => {
    for (let k = from; k < ids.length; k++) if (!answered.has(ids[k]!)) return k;
    return -1;
  };
  const at = lastQuestionId ? ids.indexOf(lastQuestionId) : -1;
  if (at >= 0) {
    if (!answered.has(ids[at]!)) return at;
    const next = firstOpen(at + 1);
    if (next >= 0) return next;
    const before = firstOpen(0);
    return before >= 0 ? before : at;
  }
  const open = firstOpen(0);
  return open >= 0 ? open : 0;
}
