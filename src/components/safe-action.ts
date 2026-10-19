/**
 * Chamada segura de uma ação do servidor a partir do navegador.
 * - Depois de uma nova publicação, uma aba aberta antes dela chama ações que não existem
 *   mais no servidor: nesse caso a página é recarregada (pega a versão nova) e o aluno
 *   é avisado, em vez de o clique "não fazer nada".
 * - Qualquer outra falha vira uma mensagem visível.
 */
export function isStaleActionError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e ?? "");
  return /Server Action/i.test(msg) && /not found|was not found|failed to find/i.test(msg);
}

export async function callAction<T>(fn: () => Promise<T>, onError: (message: string) => void): Promise<T | null> {
  try {
    return await fn();
  } catch (e) {
    if (isStaleActionError(e)) {
      onError("O app foi atualizado. Recarregando a página… Tente de novo em seguida.");
      setTimeout(() => window.location.reload(), 1200);
    } else {
      onError("Não foi possível concluir agora. Verifique sua conexão e tente de novo.");
    }
    return null;
  }
}
