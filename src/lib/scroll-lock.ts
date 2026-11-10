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

/**
 * Vigia: se a página ficou presa por algum motivo imprevisto (sem nenhuma trava ativa), a primeira tentativa
 * de rolar (roda do mouse, toque ou teclado) já devolve a rolagem, sem precisar do F5. Devolve a função de remoção.
 */
export function watchStuckScroll(): () => void {
  if (typeof window === "undefined") return () => {};
  const on = () => releaseStaleScrollLock();
  const opts = { passive: true, capture: true } as const;
  window.addEventListener("wheel", on, opts);
  window.addEventListener("touchstart", on, opts);
  window.addEventListener("keydown", on, true);
  window.addEventListener("pageshow", on);
  return () => {
    window.removeEventListener("wheel", on, opts);
    window.removeEventListener("touchstart", on, opts);
    window.removeEventListener("keydown", on, true);
    window.removeEventListener("pageshow", on);
  };
}
