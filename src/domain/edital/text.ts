/** Normalização de texto do motor interno do APROVUM AI (sem IA externa): puro, sem banco e sem React. */

export const fold = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const STOP = new Set(
  "de da do das dos e a o as os em no na nos nas para por com sem ao aos um uma uns umas sobre entre seu sua seus suas ou que se como mais menos ate pela pelo pelas pelos sob ser ter tem foi sao esta este esse essa isso art arts artigo artigos lei leis n no nº inciso incisos paragrafo paragrafos caput etc inclusive bem alem quando onde cada outros outras outro outra demais respectivo respectiva respectivos respectivas".split(" "),
);

/** Palavras amplas demais para provar que uma aula cobre o assunto (só contam se não sobrar outra). */
const GENERIC = new Set("direito direitos nocoes nocao conceito conceitos principio principios geral gerais aspecto aspectos tipo tipos especie especies regime sistema sistemas teoria tema temas questao questoes estudo analise".split(" "));

/** Radical simples (plural, -ção/-ões, -mente, gênero): suficiente para casar "obrigações"/"obrigação". */
export function stem(w: string): string {
  let t = w;
  if (t.length > 4 && t.endsWith("mente")) t = t.slice(0, -5);
  if (t.endsWith("coes")) t = `${t.slice(0, -4)}cao`;
  else if (t.endsWith("oes")) t = `${t.slice(0, -3)}ao`;
  else if (t.endsWith("aes")) t = `${t.slice(0, -3)}ao`;
  else if (t.endsWith("ais") && t.length > 4) t = `${t.slice(0, -3)}al`;
  else if (t.endsWith("eis") && t.length > 4) t = `${t.slice(0, -3)}el`;
  else if (t.endsWith("is") && t.length > 4) t = `${t.slice(0, -2)}il`;
  else if (t.endsWith("es") && t.length > 4) t = t.slice(0, -2);
  else if (t.endsWith("s") && t.length > 3) t = t.slice(0, -1);
  if (t.length > 4 && /[aoe]$/.test(t) && !/\d/.test(t)) t = t.slice(0, -1);
  return t;
}

export interface Tokens {
  /** Radicais significativos (sem palavras vazias nem genéricas, quando sobra outra). */
  all: string[];
  set: Set<string>;
}

export function tokensOf(text: string): Tokens {
  const raw = fold(text)
    .split(" ")
    .filter((w) => w && !STOP.has(w) && (w.length >= 3 || /^\d+$/.test(w)));
  const specific = raw.filter((w) => !GENERIC.has(w));
  const base = specific.length ? specific : raw;
  const all = [...new Set(base.map(stem))];
  return { all, set: new Set(all) };
}

/** Chave estável de um título de edital (agrupa o mesmo assunto em editais diferentes). */
export const titleKey = (title: string) => fold(title).slice(0, 160);
