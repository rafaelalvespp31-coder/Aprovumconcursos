/**
 * Trava de rolagem da página com contador. Vários modais/telas podem travar ao mesmo tempo
 * (ex.: mapa imersivo + popup); a rolagem só volta quando o ÚLTIMO libera.
 * Antes cada componente guardava o "overflow anterior" e o restaurava ao sair: se dois se sobrepunham,
 * o segundo guardava "hidden" como anterior e a página ficava sem barra de rolagem até o F5.
 */
let locks = 0;

function apply(hidden: boolean) {
  if (typeof document === "undefined") return;
  const v = hidden ? "hidden" : "";
  document.documentElement.style.overflow = v;
  document.body.style.overflow = v;
}

/** Trava a rolagem e devolve a função que libera (idempotente: pode ser chamada mais de uma vez). */
export function lockScroll(): () => void {
  locks += 1;
  if (locks === 1) apply(true);
  let released = false;
  return () => {
    if (released) return;
    released = true;
    locks = Math.max(0, locks - 1);
    if (locks === 0) apply(false);
  };
}

/** Rede de segurança: sem nenhuma trava ativa, nada pode manter a página presa (troca de rota, voltar do cache). */
export function releaseStaleScrollLock() {
  if (locks === 0) apply(false);
}
