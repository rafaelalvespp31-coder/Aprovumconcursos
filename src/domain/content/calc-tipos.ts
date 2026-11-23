/** Tipos e utilidades comuns dos cálculos de caderno (linhas escritas passo a passo). Puro. */
export type Parte = { t: string; dest?: boolean; cel?: boolean; dim?: boolean };
/** Linha do caderno: aparece no passo `p` (as linhas anteriores continuam na folha). */
export type LinhaCaderno = { p: number; partes: Parte[] };
export type Figura = { tipo: "retangulo" | "quadrado" | "triangulo" | "circulo" | "paralelogramo" | "trapezio" | "losango" | "pitagoras" | "cubo" | "paralelepipedo" | "cilindro"; rot: Record<string, string> };
export type CadernoLinhas = { titulo: string; passos: string[]; resultado: string; linhas: LinhaCaderno[]; fig?: Figura };

export type Fr = { n: number; d: number };
export const mdc = (a: number, b: number): number => (b ? mdc(b, a % b) : Math.abs(a));
export const fr = (n: number, d = 1): Fr => { if (d < 0) { n = -n; d = -d; } const g = mdc(n, d) || 1; return { n: n / g, d: d / g }; };
export const frAdd = (x: Fr, y: Fr) => fr(x.n * y.d + y.n * x.d, x.d * y.d);
export const frSub = (x: Fr, y: Fr) => fr(x.n * y.d - y.n * x.d, x.d * y.d);
export const frMul = (x: Fr, y: Fr) => fr(x.n * y.n, x.d * y.d);
export const frDiv = (x: Fr, y: Fr): Fr | null => (y.n === 0 ? null : fr(x.n * y.d, x.d * y.n));
export const frVal = (x: Fr) => x.n / x.d;
/** "2,5" / "2.5" / "7" → fração exata. */
export function frDe(txt: string): Fr | null {
  const m = txt.trim().replace(",", ".").match(/^(-?)(\d+)(?:\.(\d{1,6}))?$/);
  if (!m) return null;
  const dec = m[3] ?? "";
  const d = 10 ** dec.length;
  const n = Number(m[2]! + dec);
  return Number.isSafeInteger(n) ? fr(m[1] ? -n : n, d) : null;
}

/** Número em português, com sinal de menos de verdade e no máximo `casas` decimais. */
export const nf = (n: number, casas = 4) => {
  const r = Math.round(n * 10 ** casas) / 10 ** casas;
  return (Object.is(r, -0) ? 0 : r).toLocaleString("pt-BR", { maximumFractionDigits: casas }).replace("-", "−");
};
export const frTxt = (x: Fr) => (x.d === 1 ? nf(x.n) : `${nf(x.n)}/${x.d}`);
export const frDec = (x: Fr) => nf(frVal(x), 4);
export const sup = (n: number) => String(n).replace(/\d/g, (d) => "⁰¹²³⁴⁵⁶⁷⁸⁹"[Number(d)]!).replace("-", "⁻");
export const money = (n: number) => `R$ ${(Math.round(n * 100) / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const P = (t: string, o: Partial<Parte> = {}): Parte => ({ t, ...o });
/** Texto simples → partes (uma só). */
export const L = (p: number, ...partes: (string | Parte)[]): LinhaCaderno => ({ p, partes: partes.map((x) => (typeof x === "string" ? P(x) : x)) });
