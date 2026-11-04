import { createHash } from "node:crypto";

const norm = (s: string) => s.normalize("NFC").toLowerCase().replace(/\s+/g, " ").trim();

/**
 * Chave do cache de explicações: o trecho selecionado + o começo do contexto em volta (o sentido pode
 * depender dele). Pura: o mesmo trecho no mesmo contexto sempre gera a mesma chave.
 */
export function explainCacheKey(selection: string, around: string): string {
  return createHash("sha256").update(`${norm(selection).slice(0, 600)}\u0001${norm(around).slice(0, 300)}`).digest("hex");
}
