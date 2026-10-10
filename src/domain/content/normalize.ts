/**
 * Etapa 1 — Normalização.
 * Preserva títulos, numeração e hierarquia (quebras de linha), removendo apenas ruído
 * tipográfico. O texto original é guardado à parte para auditoria.
 */

export interface NormalizationResult {
  original: string;
  normalized: string;
  stats: {
    originalLength: number;
    normalizedLength: number;
    lines: number;
  };
}

const ZERO_WIDTH = /[\u200B-\u200D\u2060\uFEFF\u00AD]/g;
// Espaços especiais (NBSP, en/em space, etc.) viram espaço comum.
const SPECIAL_SPACES = /[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000\t\f\v]/g;
// Caracteres de controle que não sejam \n.
const CONTROL_CHARS = /[\u0000-\u0008\u000B-\u001F\u007F]/g;

export function normalizeContent(input: string): NormalizationResult {
  const original = input;
  let text = input.normalize("NFC");
  text = text.replace(/\r\n?/g, "\n");
  text = text.replace(ZERO_WIDTH, "");
  text = text.replace(SPECIAL_SPACES, " ");
  text = text.replace(CONTROL_CHARS, "");
  // Hifenização de quebra de linha vinda de PDF: "constitu-\ncional" → "constitucional".
  text = text.replace(/([a-záéíóúâêôãõç])-\n([a-záéíóúâêôãõç])/g, "$1$2");
  // Bullets tipográficos variados → "• " (preserva a marcação de lista).
  text = text.replace(/^[ ]*[▪◦●○■□➢►]\s*/gm, "• ");
  text = text
    .split("\n")
    .map((line) => line.replace(/ {2,}/g, " ").trim())
    .join("\n");
  text = text.replace(/\n{3,}/g, "\n\n").trim();

  return {
    original,
    normalized: text,
    stats: {
      originalLength: original.length,
      normalizedLength: text.length,
      lines: text === "" ? 0 : text.split("\n").length,
    },
  };
}
