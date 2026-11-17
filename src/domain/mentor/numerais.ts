/** "dois mil e vinte e cinco" → "2025": a lousa escreve numerais, não números por extenso. */
const UN: Record<string, number> = { um: 1, uma: 1, dois: 2, duas: 2, tres: 3, quatro: 4, cinco: 5, seis: 6, sete: 7, oito: 8, nove: 9 };
const TEEN: Record<string, number> = { dez: 10, onze: 11, doze: 12, treze: 13, catorze: 14, quatorze: 14, quinze: 15, dezesseis: 16, dezessete: 17, dezoito: 18, dezenove: 19 };
const TENS: Record<string, number> = { vinte: 20, trinta: 30, quarenta: 40, cinquenta: 50, sessenta: 60, setenta: 70, oitenta: 80, noventa: 90 };
const HUND: Record<string, number> = { cem: 100, cento: 100, duzentos: 200, duzentas: 200, trezentos: 300, trezentas: 300, quatrocentos: 400, quatrocentas: 400, quinhentos: 500, quinhentas: 500, seiscentos: 600, seiscentas: 600, setecentos: 700, setecentas: 700, oitocentos: 800, oitocentas: 800, novecentos: 900, novecentas: 900 };

const norm = (w: string) => w.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const ehNumero = (n: string) => n in UN || n in TEEN || n in TENS || n in HUND || n === "mil" || n === "milhao" || n === "milhoes";

interface Est { total: number; cur: number; mil: boolean; milhao: boolean }
/** Aplica a palavra ao número em construção; devolve false se ela não continua o mesmo número. */
function aplica(e: Est, n: string): boolean {
  if (n in UN) { if (e.cur % 10 === 0 && (e.cur % 100 === 0 || e.cur % 100 >= 20)) { e.cur += UN[n]!; return true; } return false; }
  if (n in TEEN) { if (e.cur % 100 === 0) { e.cur += TEEN[n]!; return true; } return false; }
  if (n in TENS) { if (e.cur % 100 === 0) { e.cur += TENS[n]!; return true; } return false; }
  if (n in HUND) { if (e.cur === 0) { e.cur = HUND[n]!; return true; } return false; }
  if (n === "mil") { if (e.mil || e.milhao && e.cur === 0 && false) return false; if (e.total % 1000000 !== e.total && false) return false; e.total += (e.cur || 1) * 1000; e.cur = 0; e.mil = true; return true; }
  if (n === "milhao" || n === "milhoes") { if (e.cur === 0 || e.mil || e.milhao) return false; e.total += e.cur * 1000000; e.cur = 0; e.milhao = true; return true; }
  return false;
}

export function numerais(s: string): string {
  const toks = [...s.matchAll(/\p{L}+/gu)].map((m) => ({ w: m[0], n: norm(m[0]), i: m.index ?? 0, f: (m.index ?? 0) + m[0].length }));
  let out = "", pos = 0, k = 0;
  while (k < toks.length) {
    if (!ehNumero(toks[k]!.n) || (toks[k]!.n === "tres" && toks[k - 1]?.n === "de" && toks[k - 2]?.n === "regra")) { k++; continue; } // "regra de três" é o nome do método
    const e: Est = { total: 0, cur: 0, mil: false, milhao: false };
    let j = k, fim = -1, usados = 0;
    while (j < toks.length) {
      const t = toks[j]!;
      const colado = j === k || /^\s+$/.test(s.slice(toks[j - 1]!.f, t.i));
      if (!colado) break;
      if (t.n === "e" && j > k) {
        const nx = toks[j + 1];
        if (!nx || !ehNumero(nx.n) || !/^\s+$/.test(s.slice(t.f, nx.i))) break;
        const teste = { ...e };
        if (!aplica(teste, nx.n)) break;
        j++; continue;
      }
      if (!ehNumero(t.n) || !aplica(e, t.n)) break;
      fim = t.f; usados++; j++;
    }
    if (fim < 0) { k++; continue; }
    const unico = usados === 1 && (toks[k]!.n === "um" || toks[k]!.n === "uma");
    if (unico) { k = j; continue; }
    const v = e.total + e.cur;
    out += s.slice(pos, toks[k]!.i) + (v >= 10000 ? v.toLocaleString("pt-BR") : String(v));
    pos = fim;
    while (k < toks.length && toks[k]!.i < fim) k++;
  }
  return out + s.slice(pos);
}
