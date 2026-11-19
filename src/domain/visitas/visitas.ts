import { createHash } from "node:crypto";

/** Robôs e rastreadores não contam como visitantes. */
export function ehRobo(userAgent: string | null | undefined): boolean {
  if (!userAgent) return true;
  return /bot|crawl|spider|slurp|headless|lighthouse|preview|facebookexternalhit|whatsapp|telegram|curl|wget|python-requests|monitor|uptime/i.test(userAgent);
}

/** Data (AAAA-MM-DD) no fuso de Brasília. */
export function diaBrasilia(agora: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(agora);
}

/** Identificador anônimo do dia: não guarda IP nem navegador, e muda todo dia (não permite acompanhar a pessoa). */
export function hashVisitante(ip: string, userAgent: string, dia: string, segredo: string): string {
  return createHash("sha256").update(`${segredo}|${dia}|${ip}|${userAgent}`).digest("hex").slice(0, 32);
}

/** Caminhos que não contam como visita ao site. */
export function caminhoContavel(path: string): boolean {
  if (!path.startsWith("/")) return false;
  return !/^\/(admin|api|dev|business)(\/|$)/.test(path);
}
