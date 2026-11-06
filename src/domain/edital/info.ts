import { fold } from "./text";

export interface ContestInfo {
  contestName: string | null;
  board: string | null;
  year: number | null;
}

const SMALL = new Set(["de", "da", "do", "das", "dos", "e", "em", "no", "na", "nos", "nas", "a", "o", "para", "por", "com"]);
const KEEP_UPPER = new Set(["MG", "SP", "RJ", "DF", "PM", "PC", "PF", "PRF", "TJ", "TRF", "TRT", "TRE", "MP", "STF", "STJ", "TCU", "TCE", "INSS", "CGU", "SEFAZ", "II", "III", "IV", "I"]);

/** "POLÍCIA CIVIL DE MINAS GERAIS" → "Polícia Civil de Minas Gerais". */
export function titleCasePt(s: string): string {
  const words = s.trim().replace(/\s+/g, " ").split(" ");
  return words
    .map((w, i) => {
      const up = w.toUpperCase();
      if (KEEP_UPPER.has(up) && w === up) return up;
      const lower = w.toLowerCase();
      if (i > 0 && SMALL.has(lower)) return lower;
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(" ");
}

const BOARDS: Array<[RegExp, string]> = [
  [/\bcebraspe\b|\bcespe\b/, "Cebraspe"],
  [/\bfgv\b|funda[cç][aã]o getulio vargas/, "FGV"],
  [/\bvunesp\b/, "Vunesp"],
  [/\bfcc\b|funda[cç][aã]o carlos chagas/, "FCC"],
  [/\bibfc\b/, "IBFC"],
  [/\baocp\b/, "Instituto AOCP"],
  [/\bidecan\b/, "Idecan"],
  [/\bfumarc\b/, "Fumarc"],
  [/\bconsulpam\b/, "Consulpam"],
  [/\bquadrix\b/, "Quadrix"],
  [/\bfepese\b/, "Fepese"],
  [/\bcomperve\b/, "Comperve"],
  [/\bconsulplan\b/, "Consulplan"],
  [/\bfunrio\b/, "Funrio"],
  [/\bobjetiva\b/, "Objetiva"],
  [/\bselecon\b/, "Selecon"],
  [/\bfundatec\b/, "Fundatec"],
  [/\bfuncab\b/, "Funcab"],
  [/\bcrs\b.*ufpr|\bnc[- ]ufpr\b/, "NC-UFPR"],
];

const ORG = [
  "pol[ií]cia (?:civil|militar|penal|federal|rodovi[aá]ria federal|cient[ií]fica|legislativa)",
  "corpo de bombeiros(?: militar)?",
  "(?:prefeitura|c[aâ]mara) (?:municipal )?de",
  "tribunal (?:de justi[cç]a|regional (?:federal|do trabalho|eleitoral)|de contas|superior [a-z ]+|militar)",
  "minist[eé]rio p[uú]blico",
  "defensoria p[uú]blica",
  "assembleia legislativa",
  "secretaria (?:de estado )?(?:de|da|do) [a-zà-ú ]+",
  "pol[ií]cia legislativa",
  "instituto nacional do seguro social|inss",
  "receita federal",
  "banco (?:do brasil|central)",
  "caixa econ[oô]mica federal",
  "superior tribunal|supremo tribunal",
  "guarda (?:civil )?municipal",
  "departamento de (?:pol[ií]cia|tr[aâ]nsito|estradas)",
];

const REGION = /\b(?:de|do|da)\s+(?:minas gerais|s[aã]o paulo|rio de janeiro|bahia|paran[aá]|santa catarina|rio grande do sul|rio grande do norte|esp[ií]rito santo|goi[aá]s|mato grosso(?: do sul)?|par[aá]|pernambuco|cear[aá]|maranh[aã]o|piau[ií]|para[ií]ba|alagoas|sergipe|amazonas|acre|amap[aá]|rond[oô]nia|roraima|tocantins|distrito federal)\b/i;

/** Descobre nome do concurso, banca e ano pelo texto das primeiras páginas do edital (sem IA). */
export function detectContestInfo(pages: string[]): ContestInfo {
  const head = pages.slice(0, 3).join("\n");
  const lines = head.split(/\n+/).map((l) => l.replace(/\s+/g, " ").trim()).filter((l) => l.length > 3 && l.length < 200);
  const flat = fold(head);

  let board: string | null = null;
  for (const [re, name] of BOARDS) if (re.test(flat)) { board = name; break; }

  let contestName: string | null = null;
  const orgRe = new RegExp(`(?:${ORG.join("|")})`, "i");
  for (const line of lines.slice(0, 60)) {
    const m = orgRe.exec(line);
    if (!m) continue;
    let tail = line.slice(m.index);
    // Corta no que não faz parte do nome do órgão.
    tail = tail.split(/\s+[-–—]\s+|\s*\(|,|\bEDITAL\b|\bCONCURSO\b|\bN[ºo°.]\b|\bPROCESSO\b|\bABERTURA\b|\bDE\s+\d{1,2}\s+DE\b|\bTORNA\b|\bFAZ\b/i)[0]!.trim();
    const hasRegion = REGION.test(tail);
    if (tail.length < 8) continue;
    // Prefere a linha que traz órgão + estado; senão guarda a primeira boa.
    if (hasRegion) { contestName = tail; break; }
    contestName ??= tail;
  }
  if (contestName) contestName = titleCasePt(contestName.replace(/[.:;\s]+$/, "")).slice(0, 120);

  const ym = /\b(20[1-4]\d)\b/.exec(head.slice(0, 2500));
  const year = ym ? Number(ym[1]) : null;
  return { contestName, board, year };
}

/** Título de exibição quando ainda não há nome: nunca mostra o UUID do arquivo. */
export function displayTitle(contestName: string | null, fileName: string): string {
  if (contestName) return contestName;
  const base = fileName.replace(/\.pdf$/i, "").replace(/[_-]+/g, " ").trim();
  if (!base || /^[0-9a-f]{8}\b/i.test(base) || /^\d[\d\s]{12,}$/.test(base) || base.replace(/[0-9a-f\s]/gi, "").length < 3) return "Edital enviado";
  return base;
}
