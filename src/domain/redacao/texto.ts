/** Utilidades de texto da redação: contagens, linhas estimadas, parágrafos e localização de trechos. */

export const MAX_CHARS = 12000;
export const MIN_WORDS = 60;

export function contar(text: string) {
  const t = text.trim();
  const words = t ? t.split(/\s+/).length : 0;
  return { words, chars: text.length };
}

/** Estimativa de linhas da folha: ~75 caracteres por linha (NÃO é a contagem oficial de nenhuma prova). */
export function linhasEstimadas(text: string, charsPorLinha = 75): number {
  return text
    .split(/\n/)
    .filter((p) => p.trim())
    .reduce((s, p) => s + Math.max(1, Math.ceil(p.trim().length / charsPorLinha)), 0);
}

/** Índice (0-based) do parágrafo que contém o deslocamento; parágrafos separados por quebra de linha. */
export function paragrafoDe(text: string, offset: number): number {
  let idx = -1;
  let pos = 0;
  for (const part of text.split("\n")) {
    if (part.trim()) idx += 1;
    if (offset <= pos + part.length) return Math.max(0, idx);
    pos += part.length + 1;
  }
  return Math.max(0, idx);
}

export function paragrafos(text: string): string[] {
  return text.split("\n").map((p) => p.trim()).filter(Boolean);
}

export interface Trecho { start: number; end: number }

const norm = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();

/**
 * Localiza o trecho citado pelo professor no texto ORIGINAL. Exato primeiro; depois sem diferença de
 * espaços/maiúsculas. `evitar` impede dois apontamentos no mesmo lugar para o mesmo trecho.
 * Nunca inventa posição: sem correspondência, devolve null (o apontamento é descartado).
 */
export function localizar(text: string, quote: string, evitar: Trecho[] = []): Trecho | null {
  const q = quote.trim();
  if (q.length < 2) return null;
  const livre = (s: number, e: number) => !evitar.some((o) => o.start === s && o.end === e);
  let from = 0;
  while (from <= text.length) {
    const i = text.indexOf(q, from);
    if (i < 0) break;
    if (livre(i, i + q.length)) return { start: i, end: i + q.length };
    from = i + 1;
  }
  // Tolerância a espaços/quebras e caixa: casa por janela deslizante sobre o texto normalizado com mapa de posições.
  const map: number[] = [];
  let flat = "";
  let lastSpace = true;
  for (let i = 0; i < text.length; i++) {
    const ch = text.charAt(i);
    if (/\s/.test(ch)) {
      if (!lastSpace) {
        flat += " ";
        map.push(i);
      }
      lastSpace = true;
    } else {
      flat += ch.toLowerCase();
      map.push(i);
      lastSpace = false;
    }
  }
  const nq = norm(q);
  let f = 0;
  while (nq && f <= flat.length) {
    const j = flat.indexOf(nq, f);
    if (j < 0) break;
    const start = map[j];
    const last = map[j + nq.length - 1];
    if (start !== undefined && last !== undefined && livre(start, last + 1)) return { start, end: last + 1 };
    f = j + 1;
  }
  return null;
}

export type Validacao = { ok: true } | { ok: false; error: string };

/** Conteúdo mínimo para uma avaliação válida. */
export function validarParaEnvio(text: string): Validacao {
  const { words, chars } = contar(text);
  if (chars > MAX_CHARS) return { ok: false, error: `O texto passou do limite de ${MAX_CHARS.toLocaleString("pt-BR")} caracteres.` };
  if (words < MIN_WORDS) return { ok: false, error: `Escreva pelo menos ${MIN_WORDS} palavras para uma avaliação válida (você tem ${words}).` };
  return { ok: true };
}
