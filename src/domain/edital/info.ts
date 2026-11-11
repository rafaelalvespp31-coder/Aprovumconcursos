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

const ROLE_STOP = /\s*(?:[,;:()\[\]]|\.\s|\s[-–—]\s|\bdo quadro\b|\bda carreira\b|\bn[ií]vel\b|\bcom\b|\bpara\b|\bconforme\b|\bsob\b|\blotad|\bc[oó]digo\b|\bvagas?\b|\bjornada\b|\bcarga hor|\bremunera|\bvencimento|\bsal[aá]rio|\bescolaridade|\brequisito|\bregime\b|\bmediante\b|\bem\s+(?:car[aá]ter|regime)|\bdo munic[ií]pio|\bdo estado|\bda prefeitura|\bdeste\b|\bdesta\b|\bnos termos|\be (?:forma[cç][aã]o|cadastro)|\bpor meio|\bconstantes?\b|\bprevist|\ba que\b|\bque\b|\bse\b|\s[eé]\s+de\b|\bser[aá]\b|\bna forma\b|\bdever)/i;
const ROLE_GENERIC = /^(?:efetivos?|p[uú]blicos?|de provimento efetivo|provimento efetivo|n[ií]vel (?:superior|m[eé]dio|fundamental|t[eé]cnico)|diversos|v[aá]rios|abaixo|a seguir|relacionados?|ofertados?|indicados?|vagos|e empregos?|do edital|o cargo|cargos?|pretendido|escolhido|optado|para o qual.*|que .*|em quest[aã]o|.*\bedital\b.*)$/i;

/** Todos os cargos que o texto das primeiras páginas do edital cita (sem IA), do mais citado ao menos citado. */
export function detectRoles(pages: string[]): string[] {
  const text = pages.slice(0, 4).join("\n");
  const found = new Map<string, string>();
  const seen = new Map<string, number>();
  const take = (raw: string) => {
    let r = raw.replace(/\s+/g, " ").trim();
    r = r.split(ROLE_STOP)[0]!.replace(/^(?:de|do|da|o|a)\s+/i, "").replace(/[.\s]+$/, "").trim();
    // Quebra de linha no PDF deixa "INVESTIGADOR DE" / "Guarda Municipal 6ª": tira o pedaço solto do fim.
    r = r.replace(/(?:\s+(?:de|do|da|dos|das|e|\d+[ªºa]?))+$/i, "").trim();
    if (r.length < 4 || r.length > 70 || /\d{2,}/.test(r) || ROLE_GENERIC.test(r)) return;
    if (r.split(" ").length > 8) return;
    const key = fold(r);
    if (!found.has(key)) found.set(key, titleCasePt(r));
    seen.set(key, (seen.get(key) ?? 0) + 1);
  };
  // "CARGO: GUARDA CIVIL MUNICIPAL" / "CARGO – SOLDADO"
  for (const m of text.matchAll(/(?:^|\n)\s*cargo\s*(?:[:–—-]|\bde\b)\s*([^\n]{3,90})/gi)) take(m[1]!);
  // "... para o cargo de Agente de Polícia ..." / "provimento do cargo de ..."
  for (const m of text.matchAll(/\bcargos?(?:\s+(?:efetivos?|p[uú]blicos?)){0,2}\s+de\s+([^\n]{3,90})/gi)) take(m[1]!);
  // "Investigador" e "Investigador de Polícia I" são o mesmo cargo: agrupa pelo começo do nome e fica o mais completo/citado.
  const keys = [...found.keys()].sort((a, b) => a.length - b.length);
  const roots = keys.filter((k) => !keys.some((o) => o !== k && k.startsWith(`${o} `)));
  return roots
    .map((root) => {
      const group = keys.filter((k) => k === root || k.startsWith(`${root} `));
      const best = group.sort((a, b) => (seen.get(b)! - seen.get(a)!) || b.length - a.length)[0]!;
      return { name: found.get(best)!, n: group.reduce((t, k) => t + (seen.get(k) ?? 0), 0) };
    })
    .sort((a, b) => b.n - a.n)
    .map((x) => x.name);
}

/** Cargo pretendido pelo texto do edital (sem IA). Só devolve quando há UM cargo claro; com vários, o aluno escolhe. */
export function detectRole(pages: string[]): string | null {
  const roles = detectRoles(pages);
  return roles.length === 1 ? roles[0]! : null;
}
