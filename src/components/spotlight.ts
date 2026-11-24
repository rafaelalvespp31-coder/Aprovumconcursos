import type { PointerEvent } from "react";

/**
 * Luz que acompanha o ponteiro: grava a posição em --mx/--my e o CSS desenha o brilho.
 * Só com mouse/caneta (no toque não há "passar por cima"); `spotlightToque` também serve ao pressionar (onda do toque).
 */
function grava(e: PointerEvent<HTMLElement>) {
  const el = e.currentTarget;
  const r = el.getBoundingClientRect();
  el.style.setProperty("--mx", `${Math.round(e.clientX - r.left)}px`);
  el.style.setProperty("--my", `${Math.round(e.clientY - r.top)}px`);
}
export function spotlight(e: PointerEvent<HTMLElement>) {
  if (e.pointerType === "touch") return;
  grava(e);
}
export function spotlightToque(e: PointerEvent<HTMLElement>) {
  grava(e);
}
