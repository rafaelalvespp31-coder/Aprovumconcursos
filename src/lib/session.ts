/**
 * Sessão única por conta: ao entrar, as sessões dos outros aparelhos são encerradas.
 * Este é o erro que o aparelho derrubado recebe na próxima requisição.
 */
export function isEndedElsewhere(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false;
  if (error.code === "session_not_found" || error.code === "refresh_token_not_found") return true;
  return /session from session_id claim in jwt does not exist|refresh token not found/i.test(error.message ?? "");
}

/** Motivo exibido na tela de login quando a sessão foi encerrada por outro acesso. */
export const ENDED_ELSEWHERE = "outro-aparelho";
