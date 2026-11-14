/**
 * Texto legal da aula: organiza a lei em dispositivos (artigo, parágrafo, inciso, alínea) e
 * escolhe o que destacar em vermelho (regra, proibição, prazo, pena) ou em azul (condição,
 * exceção, quem faz), sem dizer ao aluno o que é "importante": a cor só guia o olho.
 */
const LABEL = /^(Art\.?\s*\d+[.\d]*\s*[º°o]?(?:\s*-\s*[A-Z])?\s*[.:–-]?|§\s*\d+[.\d]*\s*[º°o]?(?:\s*-\s*[A-Z])?|Par[áa]grafo [úu]nico\.?|[IVXLC]{1,6}\s*[-–—.]|[a-z]\)|\d{1,2}\s*[-–.)])(?=\s|$)/i;
/** Marca (invisível ao aluno) entre o dispositivo e a sua pena. */
export const PENA_MARK = "⁂PENA⁂";
const PENA = /^(?:\*\*|__)?\s*penas?\b\s*(?:\*\*|__)?\s*[:–—-]/i;
const TITLE = /^Art\.?\s*\d+[^.:]{0,8}:\s*$/i;

export type LegalLevel = "titulo" | "artigo" | "paragrafo" | "inciso" | "alinea" | "texto";

export function legalLevel(label: string): LegalLevel {
  if (/^art/i.test(label)) return "artigo";
  if (/^§|^par/i.test(label)) return "paragrafo";
  if (/^[IVXLC]{1,6}\s*[-–—.]/.test(label)) return "inciso";
  if (/^[a-z]\)/i.test(label) || /^\d/.test(label)) return "alinea";
  return "texto";
}

/** Separa "Art. 245." / "§ 1º" / "I -" do resto da linha. */
export function splitLegalLabel(text: string): { label: string; rest: string } | null {
  const m = LABEL.exec(text.trimStart());
  if (!m) return null;
  const label = m[1]!.trim().replace(/\s*[.:–-]$/, (x) => (/^art/i.test(m[1]!) ? "" : x));
  return { label: label.replace(/\s+/g, " "), rest: text.trimStart().slice(m[0].length).trim() };
}

/** Cada dispositivo vira um parágrafo; linhas quebradas no meio da frase são juntadas. */
export function legalParagraphs(md: string): string {
  const out: string[] = [];
  let prevBlank = true;
  for (const raw of md.split("\n")) {
    const l = raw.replace(/^>\s?/, "").trim();
    if (!l) { prevBlank = true; continue; }
    const starts = LABEL.test(l) || TITLE.test(l);
    const last = out.at(-1);
    // A pena fica no mesmo card do dispositivo que ela pune (nunca solta, em card próprio).
    if (PENA.test(l) && last !== undefined && !TITLE.test(last)) { out[out.length - 1] = `${last} ${PENA_MARK}${l}`; prevBlank = false; continue; }
    if (!starts && !prevBlank && last !== undefined && !TITLE.test(last)) out[out.length - 1] = `${last} ${l}`;
    else out.push(l);
    prevBlank = false;
  }
  return out.join("\n\n");
}

// Vermelho: a regra em si (obrigação, proibição, prazo, pena, valor).
const RED = /\b(vedad[oa]s?|proibid[oa]s?|é\s+vedado|ser[áa]\s+(?:arrombad|preso|punid|obrigad|nul)\w*|nul[oa]s?|obrigat[óo]ri[oa]s?|inviol[áa]vel|ilegal|ilícit[oa]s?|crime|reclus[ãa]o|deten[çc][ãa]o|multa|pris[ãa]o|\d+\s*(?:\(\w+\)\s*)?(?:horas?|dias?|meses|m[êe]s|anos?)|R\$\s?[\d.,]+|(?:um|dois|três|quatro|cinco|seis|dez|vinte|trinta)\s+(?:horas?|dias?|meses|anos?)|sob pena|imediatamente|em regra)\b/gi;
// Azul: condições, exceções e agentes.
const BLUE = /\b(salvo|exceto|somente|apenas|desde que|mediante|quando|se\s+houver|caso|autoridade(?:\s+\w+)?|mandado|flagrante|fundada suspeita|consentimento|consentir|juiz|delegado|Minist[ée]rio P[úu]blico|a\s+qualquer\s+hora|de\s+dia|[àa]\s+noite)\b/gi;

export type Piece = { t: string; k: "r" | "a" | null };

/** Quebra o texto em pedaços marcados com "r" (vermelho), "a" (azul) ou nada. Vermelho vence azul. */
export function highlightLegal(text: string): Piece[] {
  const marks: Array<[number, number, "r" | "a"]> = [];
  for (const m of text.matchAll(RED)) marks.push([m.index!, m.index! + m[0].length, "r"]);
  for (const m of text.matchAll(BLUE)) {
    const s = m.index!, e = s + m[0].length;
    if (!marks.some(([a, b]) => s < b && e > a)) marks.push([s, e, "a"]);
  }
  marks.sort((x, y) => x[0] - y[0]);
  const out: Piece[] = [];
  let pos = 0;
  for (const [s, e, k] of marks) {
    if (s < pos) continue;
    if (s > pos) out.push({ t: text.slice(pos, s), k: null });
    out.push({ t: text.slice(s, e), k });
    pos = e;
  }
  if (pos < text.length) out.push({ t: text.slice(pos), k: null });
  return out;
}
