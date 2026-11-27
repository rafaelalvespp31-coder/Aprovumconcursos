/** Esqueletos dos demais assuntos do catálogo: conjuntos numéricos, propriedades, frações, decimais, divisibilidade, porcentagem, razão e proporção, e conceitos de lógica. */
import { c, fmt, fr, gcd, montarLinhas, type Bloco, type Esqueleto, type TipoEsqueleto } from "./quadro-esqueleto-base";
import type { Medidor } from "./quadro-motor";

const arred = (x: number) => Math.round(x * 1e6) / 1e6;
const P = (titulo: string, texto: string, porque: string, dica: string) => ({ titulo, texto, porque, dica });
const SN = ["SIM", "NÃO"];
const sn = (b: boolean) => (b ? "SIM" : "NÃO");
const op = (v: string, o: string[]) => ({ c: v, opcoes: o });
/** Quebra um texto longo em linhas curtas (a lousa é estreita no celular). */
const quebrar = (t: string, max = 24): string[][] => {
  const out: string[] = []; let l = "";
  for (const w of t.split(" ")) { if ((l + " " + w).trim().length > max) { out.push(l); l = w; } else l = (l + " " + w).trim(); }
  if (l) out.push(l);
  return out.map((x) => [x]);
};

// ------------------------------------------------------------------ valores numéricos escritos como o aluno lê
export function lerNumero(s: string): number | null {
  const t = s.trim().replace(/\s+/g, "");
  let m = /^(-?)(\d+),?(\d*)$/.exec(t);
  if (m && /^-?\d+(,\d+)?$/.test(t)) return (m[1] ? -1 : 1) * Number(`${m[2]}.${m[3] || "0"}`);
  m = /^(-?)(\d+)\/(\d+)$/.exec(t);
  if (m && Number(m[3]) > 0) return ((m[1] ? -1 : 1) * Number(m[2])) / Number(m[3]);
  return null;
}
const ehInteiro = (x: number) => Math.abs(x - Math.round(x)) < 1e-9;
const ehIrracional = (t: string): boolean => /^π$/.test(t) || (/^√\d+$/.test(t) && !ehInteiro(Math.sqrt(Number(t.slice(1)))));

const POOL_ORDEM = ["0,5;-2;3/4;1,2;-1,5", "1/2;0,3;-1;2/5;0,75", "-3;-0,5;1/4;2;-7/2", "1,25;5/4;0,8;-0,2;1"];
const POOL_CLASS = ["7;-3;0,5;√2;2/3", "0;√9;π;-4;1,25", "√16;√5;3/4;-1;10", "5;-2,5;√7;8/2;0"];
const POOL_PROP = [
  { t: "A Terra gira em torno do Sol.", prop: true, v: true, motivo: "é uma afirmação que dá para julgar como V ou F" },
  { t: "Que horas são?", prop: false, motivo: "é uma pergunta (interrogativa): não afirma nada" },
  { t: "Feche a porta.", prop: false, motivo: "é uma ordem (imperativa): não afirma nada" },
  { t: "2 + 3 = 7.", prop: true, v: false, motivo: "afirma algo que dá para julgar: aqui, falso" },
  { t: "x + 5 = 9.", prop: false, motivo: "é sentença aberta: depende do valor de x, então não é V nem F" },
  { t: "Que dia lindo!", prop: false, motivo: "é uma exclamação: expressa emoção, não afirma algo julgável" },
  { t: "O Brasil fica na América do Sul.", prop: true, v: true, motivo: "afirma algo que dá para julgar: aqui, verdadeiro" },
  { t: "Ele é policial.", prop: false, motivo: "o sujeito \"ele\" é indefinido (sentença aberta)" },
];
const POOL_PRINC = [
  { t: "Toda proposição é verdadeira ou falsa: não existe um terceiro valor.", r: "TERCEIRO EXCLUÍDO" },
  { t: "Nenhuma proposição pode ser verdadeira e falsa ao mesmo tempo.", r: "NÃO CONTRADIÇÃO" },
  { t: "Uma proposição verdadeira é sempre verdadeira, e uma falsa é sempre falsa.", r: "IDENTIDADE" },
  { t: "Ou o dia está claro, ou não está: não há meio-termo.", r: "TERCEIRO EXCLUÍDO" },
  { t: "É impossível chover e não chover ao mesmo tempo no mesmo lugar.", r: "NÃO CONTRADIÇÃO" },
  { t: "Se p é verdadeira, p continua verdadeira em todo o raciocínio.", r: "IDENTIDADE" },
];
const POOL_SIMCOMP = [
  { t: "Hoje chove.", comp: false },
  { t: "Hoje chove e faz frio.", comp: true, con: "E", simb: "p∧q", n: 2 },
  { t: "Se estudo, então passo.", comp: true, con: "SE...ENTÃO", simb: "p→q", n: 2 },
  { t: "Não é verdade que ele corre.", comp: true, con: "NÃO", simb: "~p", n: 1 },
  { t: "Estudo ou trabalho.", comp: true, con: "OU", simb: "p∨q", n: 2 },
  { t: "Passo se e somente se estudo.", comp: true, con: "SE E SOMENTE SE", simb: "p↔q", n: 2 },
  { t: "O céu é azul.", comp: false },
];

export function aleatorioMais2(tipo: TipoEsqueleto, rnd: () => number = Math.random): { nums: number[]; entrada?: string } | null {
  const pick = <T,>(a: T[]) => a[Math.floor(rnd() * a.length)]!;
  const ent = (a: number, b: number) => a + Math.floor(rnd() * (b - a + 1));
  switch (tipo) {
    case "ordem": return { nums: [], entrada: pick(POOL_ORDEM) };
    case "classnum": return { nums: [], entrada: pick(POOL_CLASS) };
    case "decimal": return { nums: [], entrada: pick(["2,35+1,4", "4,75-1,3", "2,5×1,2", "0,6×0,4", "3,2+0,85", "7,5-2,25", "1,5×2,4"]) };
    case "proposicao": return { nums: [], entrada: String(ent(0, POOL_PROP.length - 1)) };
    case "principios": return { nums: [], entrada: String(ent(0, POOL_PRINC.length - 1)) };
    case "simcomp": return { nums: [], entrada: String(ent(0, POOL_SIMCOMP.length - 1)) };
    case "propr": return { nums: [ent(2, 9), ent(2, 9), ent(2, 9)] };
    case "convfd": return rnd() < 0.5 ? { nums: [pick([1, 3, 7, 9, 11]), pick([2, 4, 5, 8, 20, 25]), 0] } : { nums: [pick([75, 25, 125, 6, 35]), pick([2, 2, 3, 1]), 1] };
    case "classfrac": return { nums: pick([[3, 5], [7, 4], [12, 4], [9, 2], [2, 9], [15, 6]]) };
    case "fraceq": return { nums: pick([[6, 8, 2, 3], [4, 10, 3, 5], [9, 12, 5, 7], [10, 15, 7, 10]]) };
    case "fracs": return { nums: pick([[3, 4, 1, 6], [5, 6, 1, 4], [2, 3, 1, 4], [7, 8, 1, 2], [3, 5, 1, 2]]) };
    case "fracde": { const b = ent(2, 9); return { nums: [ent(1, b - 1), b, b * ent(3, 12)] }; }
    case "divisib": return { nums: [pick([2340, 1260, 4725, 3618, 5400, 7056, 8190])] };
    case "divisores": return { nums: [pick([12, 18, 20, 24, 30, 36, 28]), ent(3, 9)] };
    case "primo": return { nums: [pick([29, 51, 91, 97, 119, 143, 221, 17, 49])] };
    case "pctqto": return { nums: pick([[20, 80], [15, 60], [18, 24], [9, 36], [30, 120]]) };
    case "sucessivas": return { nums: [pick([10, 20, 25, 50]), ent(0, 1), pick([10, 20, 25]), ent(0, 1)] };
    case "taxa": { const C = pick([1000, 2000, 500, 800]), i = pick([2, 3, 5, 10]), t = ent(2, 6); return { nums: [C, (C * i * t) / 100, t] }; }
    case "proporcao": return { nums: pick([[2, 3, 4, 6], [3, 5, 6, 10], [4, 6, 6, 9], [2, 5, 3, 7], [8, 12, 2, 3], [3, 4, 9, 10]]) };
    case "regra3i": { const a = ent(2, 8), b = ent(2, 12), tot = a * b; const ds = Array.from({ length: tot }, (_, i) => i + 1).filter((d) => tot % d === 0 && d > a && d < 40); return { nums: [a, b, ds.length ? pick(ds) : tot] }; }
    case "regra3c": { const m1 = ent(2, 5), d1 = ent(2, 6), p1 = m1 * d1 * ent(2, 6); return { nums: [m1, d1, p1, m1 + ent(1, 4), d1 + ent(1, 4)].map((x) => x) }; }
    case "variacao": { const a = pick([50, 80, 100, 200, 250, 400]), p = pick([10, 20, 50]); return { nums: [a, a + (a * p) / 100] }; }
    default: return null;
  }
}

export function validarMais2(tipo: TipoEsqueleto, n: number[], entrada: string): string | null | undefined {
  const todos = (min: number, max: number) => n.every((v) => Number.isInteger(v) && v >= min && v <= max);
  switch (tipo) {
    case "ordem": { const l = entrada.split(";").map(lerNumero); return l.length >= 3 && l.length <= 6 && l.every((x) => x !== null && ehInteiro(Math.round(x * 1e4) / 1) && Math.abs(Math.round(x * 1e4) - x * 1e4) < 1e-6) ? null : "Digite de 3 a 6 números separados por ; (inteiros, decimais com vírgula ou frações). Ex.: 0,5;-2;3/4"; }
    case "classnum": { const l = entrada.split(";").map((x) => x.trim()); return l.length >= 2 && l.length <= 6 && l.every((x) => ehIrracional(x) || /^√\d+$/.test(x) || lerNumero(x) !== null) ? null : "Digite de 2 a 6 números separados por ; (ex.: 7;-3;0,5;√2;2/3;π)"; }
    case "decimal": return /^\d+(,\d+)?[+\-×x*]\d+(,\d+)?$/.test(entrada.replace(/\s/g, "")) ? null : "Digite a conta, ex.: 2,35+1,4  ou  2,5×1,2  ou  4,75-1,3";
    case "proposicao": case "principios": case "simcomp": return "Use o botão Novo para sortear outra frase.";
    case "propr": return n.length === 3 && todos(1, 99) ? null : "Digite 3 números, ex.: 3, 4, 5";
    case "convfd": return n.length === 3 && (n[2] === 0 ? n[0]! >= 1 && [2, 4, 5, 8, 10, 20, 25, 50, 100].includes(n[1]!) : n[2] === 1 && n[0]! >= 1 && n[1]! >= 1 && n[1]! <= 3) ? null : "Fração→decimal: a, b, 0 (b = 2, 4, 5, 8, 10, 20, 25…). Decimal→fração: número sem vírgula, casas, 1 (75, 2, 1 = 0,75)";
    case "classfrac": return n.length === 2 && todos(1, 99) ? null : "Digite numerador e denominador, ex.: 7, 4";
    case "fraceq": return n.length === 4 && todos(1, 99) ? null : "Digite a, b, c, d para comparar a/b com c/d";
    case "fracs": return n.length === 4 && todos(1, 99) && n[0]! * n[3]! > n[2]! * n[1]! ? null : "Digite a, b, c, d para a/b − c/d (a primeira fração maior)";
    case "fracde": return n.length === 3 && todos(1, 9999) && n[2]! % n[1]! === 0 ? null : "Digite a, b e o número (divisível por b), ex.: 3, 5, 40";
    case "divisib": return n.length === 1 && n[0]! >= 10 && n[0]! <= 999999 ? null : "Digite um número de 10 a 999999";
    case "divisores": return n.length === 2 && n[0]! >= 2 && n[0]! <= 200 && n[1]! >= 2 && n[1]! <= 20 ? null : "Digite o número (até 200) e outro para os múltiplos. Ex.: 12, 5";
    case "primo": return n.length === 1 && n[0]! >= 4 && n[0]! <= 400 ? null : "Digite um número de 4 a 400";
    case "pctqto": return n.length === 2 && todos(1, 9999) && n[0]! <= n[1]! && (n[0]! * 100) % n[1]! === 0 ? null : "Digite a parte e o total (conta exata), ex.: 20, 80";
    case "sucessivas": return n.length === 4 && n[0]! >= 1 && n[0]! <= 100 && n[2]! >= 1 && n[2]! <= 100 && (n[1] === 0 || n[1] === 1) && (n[3] === 0 || n[3] === 1) ? null : "Digite %1, 1/0 (1 = aumento, 0 = desconto), %2, 1/0. Ex.: 10, 1, 20, 0";
    case "taxa": return n.length === 3 && todos(1, 99999) && (n[1]! * 100) % (n[0]! * n[2]!) === 0 ? null : "Digite capital, juros e tempo (taxa exata). Ex.: 1000, 300, 6";
    case "proporcao": return n.length === 4 && todos(1, 99) ? null : "Digite a, b, c, d para a/b e c/d";
    case "regra3i": return n.length === 3 && todos(1, 999) && (n[0]! * n[1]!) % n[2]! === 0 ? null : "Digite a, b, c (a×b divisível por c). Ex.: 6, 10, 4";
    case "regra3c": return n.length === 5 && todos(1, 999) && (n[2]! * n[3]! * n[4]!) % (n[0]! * n[1]!) === 0 ? null : "Digite m1, d1, p1, m2, d2 (resposta exata). Ex.: 3, 4, 120, 5, 6";
    case "variacao": return n.length === 2 && todos(1, 99999) && n[1]! > n[0]! && ((n[1]! - n[0]!) * 100) % n[0]! === 0 ? null : "Digite valor inicial e final (maior), conta exata. Ex.: 80, 100";
    default: return undefined;
  }
}

export function montarMais2(tipo: TipoEsqueleto, n: number[], entrada: string, larg: number, med: Medidor, alt: number): Esqueleto | null {
  const M = (titulo: string, resposta: string, blocos: Bloco[]): Esqueleto => montarLinhas(tipo, n, titulo, resposta, blocos, larg, med, alt, TIPOS_COM_TEXTO.has(tipo) ? entrada : undefined);
  switch (tipo) {
    case "ordem": {
      const toks = entrada.split(";"), vals = toks.map((t) => lerNumero(t)!), dec = vals.map((x) => fmt(arred(x)));
      const ord = [...vals].map((x, i) => ({ x, d: dec[i]! })).sort((a, b) => a.x - b.x);
      return M("Ordenar números", `Em ordem: ${ord.map((o) => o.d).join(" < ")}`, [
        { linhas: [[`Ordenar: ${toks.join(" ; ")}`]] },
        { passo: P("Tudo em decimal", "Para comparar, escreva todos os números na forma decimal (fração: divida o numerador pelo denominador). Escreva cada um.", dec.map((d, i) => `${toks[i]} = ${d}`).join("; ") + ".", "Fração vira decimal dividindo; os negativos continuam negativos."), linhas: toks.map((t, i) => [`${t} = `, c(dec[i]!)]) },
        { passo: P("Ordem crescente", "Escreva do MENOR para o MAIOR, separados por < (na reta numérica, os da esquerda são menores; negativos ficam antes dos positivos). Dentro dos negativos, o de maior módulo é o menor.", `Na reta numérica, da esquerda para a direita: ${ord.map((o) => o.d).join(" < ")}.`, "Primeiro os negativos (o mais afastado do zero é o menor), depois o zero, depois os positivos."), linhas: [[c(ord.map((o) => o.d).join("<"))]] },
      ]);
    }
    case "classnum": {
      const toks = entrada.split(";").map((t) => t.trim());
      const cls = (t: string): { k: string; porque: string } => {
        if (ehIrracional(t)) return { k: "I", porque: `${t} tem infinitas casas decimais sem repetição: é IRRACIONAL.` };
        const raiz = /^√(\d+)$/.exec(t);
        const v = raiz ? Math.sqrt(Number(raiz[1])) : lerNumero(t)!;
        if (ehInteiro(v)) return v >= 0 ? { k: "N", porque: `${t} = ${fmt(v)} é um inteiro não negativo: NATURAL (e também inteiro, racional e real).` } : { k: "Z", porque: `${t} é inteiro negativo: INTEIRO (não é natural).` };
        return { k: "Q", porque: `${t} = ${fmt(arred(v))}: pode ser escrito como fração, então é RACIONAL.` };
      };
      return M("Conjuntos numéricos", toks.map((t) => `${t}: ${cls(t).k}`).join("; "), [
        { linhas: [["N naturais  Z inteiros"], ["Q racionais  I irracionais"]] },
        ...toks.map((t): Bloco => ({ passo: P(`Classifique ${t}`, `Toque no MENOR conjunto a que ${t} pertence (N dentro de Z dentro de Q; irracional é à parte).`, cls(t).porque, "Veja: tem vírgula ou fração? Tem raiz que não é exata? É negativo?"), linhas: [[`${t} é `, op(cls(t).k, ["N", "Z", "Q", "I"])]] })),
      ]);
    }
    case "propr": {
      const [a, b, cc] = n as [number, number, number];
      return M("Propriedades das operações", "Propriedades conferidas", [
        { linhas: [[`a = ${a}   b = ${b}   c = ${cc}`]] },
        { passo: P("Comutativa", "Trocar a ordem não muda o resultado (soma e multiplicação). Calcule os dois lados.", `${a} + ${b} = ${a + b} e ${b} + ${a} = ${a + b}: iguais.`, "Some nas duas ordens."), linhas: [[`${a} + ${b} = `, c(a + b)], [`${b} + ${a} = `, c(a + b)]] },
        { passo: P("Associativa", "Agrupar de outro jeito não muda o resultado. Calcule (a + b) + c e a + (b + c).", `(${a} + ${b}) + ${cc} = ${a + b} + ${cc} = ${a + b + cc}; ${a} + (${b} + ${cc}) = ${a} + ${b + cc} = ${a + b + cc}.`, "Resolva primeiro o que está no parêntese."), linhas: [[`(${a}+${b})+${cc} = `, c(a + b + cc)], [`${a}+(${b}+${cc}) = `, c(a + b + cc)]] },
        { passo: P("Distributiva", "Multiplicar uma soma é multiplicar cada parcela e somar. Calcule a × b e a × c.", `${a} × (${b} + ${cc}) = ${a} × ${b} + ${a} × ${cc} = ${a * b} + ${a * cc} = ${a * (b + cc)}.`, "Multiplique o número de fora por cada parcela de dentro."), linhas: [[`${a} × ${b} = `, c(a * b)], [`${a} × ${cc} = `, c(a * cc)], [`${a * b} + ${a * cc} = `, c(a * (b + cc))]] },
        { passo: P("Elemento neutro", "Somar 0 e multiplicar por 1 não mudam o número.", `${a} + 0 = ${a} (neutro da soma) e ${a} × 1 = ${a} (neutro da multiplicação).`, "Qual número não altera a soma? E a multiplicação?"), linhas: [[`${a} + 0 = `, c(a)], [`${a} × 1 = `, c(a)]] },
      ]);
    }
    case "convfd": {
      const [a, b, modo] = n as [number, number, number];
      if (modo === 0) {
        let k = 1; while (![10, 100, 1000].includes(b * k) && k < 1000) k++;
        const val = fmt(arred(a / b));
        return M(`${a}/${b} em decimal`, `${a}/${b} = ${val}`, [
          { linhas: [[fr([String(a)], [String(b)]), " = ?"]] },
          { passo: P("Denominador 10, 100 ou 1000", `Descubra por qual número multiplicar o denominador ${b} para virar 10, 100 ou 1000.`, `${b} × ${k} = ${b * k}.`, `Procure k tal que ${b} × k seja 10, 100 ou 1000.`), linhas: [[`${b} × `, c(k), ` = ${b * k}`]] },
          { passo: P("Mesma conta em cima", "Multiplique o numerador pelo mesmo número (para a fração não mudar de valor).", `${a} × ${k} = ${a * k}, então ${a}/${b} = ${a * k}/${b * k}.`, "O que faz embaixo faz em cima."), linhas: [[fr([String(a)], [String(b)]), " = ", fr([c(a * k)], [String(b * k)])]] },
          { passo: P("Vírgula", `Denominador ${b * k}: coloque a vírgula contando os zeros (${String(b * k).length - 1} casa${String(b * k).length > 2 ? "s" : ""}).`, `${a * k}/${b * k} = ${val}.`, "Tantos zeros no denominador, tantas casas depois da vírgula."), linhas: [["= ", c(val)]] },
        ]);
      }
      const den = 10 ** b, g = gcd(a, den), dec = fmt(arred(a / den));
      return M(`${dec} em fração`, `${dec} = ${a / g}/${den / g}`, [
        { linhas: [[`${dec} = ?`]] },
        { passo: P("Sem vírgula sobre 10, 100…", `Escreva o número sem a vírgula no numerador e, no denominador, 1 seguido de tantos zeros quantas são as casas depois da vírgula (${b}).`, `${dec} = ${a}/${den}.`, "Casas decimais = quantidade de zeros do denominador."), linhas: [[`${dec} = `, fr([c(a)], [c(den)])]] },
        { passo: P("Simplifique", "Divida em cima e embaixo pelo maior divisor comum.", g > 1 ? `${a} ÷ ${g} = ${a / g} e ${den} ÷ ${g} = ${den / g}.` : "Já está simplificada.", `Procure o MDC de ${a} e ${den}.`), linhas: [[fr([String(a)], [String(den)]), " = ", fr([c(a / g)], [c(den / g)])]] },
      ]);
    }
    case "decimal": {
      const m = /^(\d+(?:,\d+)?)([+\-×x*])(\d+(?:,\d+)?)$/.exec(entrada.replace(/\s/g, ""))!;
      const [sa, sb] = [m[1]!, m[3]!], o = m[2] === "x" || m[2] === "*" ? "×" : m[2]!;
      const da = (sa.split(",")[1] ?? "").length, db = (sb.split(",")[1] ?? "").length;
      const ia = Number(sa.replace(",", "")), ib = Number(sb.replace(",", ""));
      if (o === "×") {
        const r = ia * ib, d = da + db, val = fmt(arred(r / 10 ** d));
        return M(`${sa} × ${sb}`, `${sa} × ${sb} = ${val}`, [
          { linhas: [[`${sa} × ${sb} = ?`]] },
          { passo: P("Ignore as vírgulas", "Multiplique como se fossem números inteiros.", `${ia} × ${ib} = ${r}.`, "Tire as vírgulas e multiplique."), linhas: [[`${ia} × ${ib} = `, c(r)]] },
          { passo: P("Conte as casas decimais", "Some as casas decimais dos dois números.", `${da} + ${db} = ${d} casa${d === 1 ? "" : "s"}.`, "Conte quantos algarismos há depois de cada vírgula."), linhas: [[`${da} + ${db} = `, c(d)]] },
          { passo: P("Coloque a vírgula", `Conte ${d} casa${d === 1 ? "" : "s"} da direita para a esquerda no ${r} e coloque a vírgula.`, `${val}.`, "Se faltar algarismo, complete com zeros à esquerda."), linhas: [["= ", { c: val, alt: d > 0 ? (r / 10 ** d).toFixed(d).replace(".", ",") : undefined }]] },
        ]);
      }
      const d = Math.max(da, db), A = Math.round(Number(sa.replace(",", ".")) * 10 ** d), B = Math.round(Number(sb.replace(",", ".")) * 10 ** d), r = o === "+" ? A + B : A - B, val = fmt(arred(r / 10 ** d));
      const bl: Bloco[] = [{ linhas: [[`${sa} ${o === "+" ? "+" : "-"} ${sb} = ?`]] }];
      if (da !== db) { const menor = da < db ? sa : sb, nov = (menor.includes(",") ? menor : menor + ",").padEnd((menor.split(",")[0] ?? "").length + 1 + d, "0"); bl.push({ passo: P("Igualar as casas", `Complete com zeros o número que tem menos casas decimais (${menor}) para os dois terem ${d}.`, `${menor} = ${nov}.`, `Acrescente zeros à direita até ter ${d} casas.`), linhas: [[`${menor} = `, c(nov)]] }); }
      bl.push({ passo: P("Sem vírgula", `Faça a conta como se fossem inteiros (alinhando as vírgulas).`, `${A} ${o === "+" ? "+" : "−"} ${B} = ${r}.`, "Tire as vírgulas e faça a conta."), linhas: [[`${A} ${o === "+" ? "+" : "-"} ${B} = `, c(r)]] },
        { passo: P("Vírgula de volta", `Coloque a vírgula deixando ${d} casa${d === 1 ? "" : "s"} decimal${d === 1 ? "" : "is"}.`, `${val}.`, "A vírgula volta no mesmo lugar em que estava."), linhas: [["= ", { c: val, alt: d > 0 ? (r / 10 ** d).toFixed(d).replace(".", ",") : undefined }]] });
      return M(`${sa} ${o} ${sb}`, `${sa} ${o} ${sb} = ${val}`, bl);
    }
    case "classfrac": {
      const [a, b] = n as [number, number], k = a < b ? "PRÓPRIA" : a % b === 0 ? "APARENTE" : "IMPRÓPRIA", q = Math.floor(a / b), r = a % b;
      const bl: Bloco[] = [
        { linhas: [[fr([String(a)], [String(b)])]] },
        { passo: P("Tipo da fração", "Compare numerador e denominador: numerador MENOR = própria; MAIOR = imprópria; e se for divisível pelo denominador = aparente (é um número inteiro).", k === "PRÓPRIA" ? `${a} < ${b}: própria (vale menos que 1).` : k === "APARENTE" ? `${a} ÷ ${b} = ${q} exato: aparente (é o inteiro ${q}).` : `${a} > ${b} e não é divisível: imprópria (vale mais que 1).`, "Compare o de cima com o de baixo."), linhas: [[fr([String(a)], [String(b)]), " é ", op(k, ["PRÓPRIA", "IMPRÓPRIA", "APARENTE"])]] },
      ];
      if (k === "IMPRÓPRIA") bl.push({ passo: P("Número misto", "Divida o numerador pelo denominador: o quociente é a parte inteira e o resto vira o numerador.", `${a} ÷ ${b} = ${q}, resto ${r}: ${q} e ${r}/${b}.`, `Calcule ${a} ÷ ${b} (quociente e resto).`), linhas: [[fr([String(a)], [String(b)]), " = ", c(q), " ", fr([c(r)], [String(b)])]] });
      if (k === "APARENTE") bl.push({ passo: P("Valor inteiro", "Divida o numerador pelo denominador.", `${a} ÷ ${b} = ${q}.`, "Faça a divisão."), linhas: [[fr([String(a)], [String(b)]), " = ", c(q)]] });
      return M(`Fração ${a}/${b}`, `${a}/${b} é ${k}`, bl);
    }
    case "fraceq": {
      const [a, b, cc, d] = n as [number, number, number, number], g = gcd(a, b), x = a * d, y = cc * b, sinal = x < y ? "<" : x > y ? ">" : "=";
      return M("Equivalência e comparação", `${a}/${b} ${sinal} ${cc}/${d}`, [
        { linhas: [[fr([String(a)], [String(b)]), " e ", fr([String(cc)], [String(d)])]] },
        { passo: P("Divisor comum", `Para simplificar ${a}/${b}, ache o maior número que divide ${a} e ${b} (MDC).`, `MDC(${a}, ${b}) = ${g}.`, "Liste os divisores dos dois números."), linhas: [[`MDC(${a},${b}) = `, c(g)]] },
        { passo: P("Simplifique", "Divida o numerador e o denominador pelo MDC. A fração nova vale o mesmo (é equivalente).", `${a} ÷ ${g} = ${a / g} e ${b} ÷ ${g} = ${b / g}: ${a}/${b} = ${a / g}/${b / g}.`, "Divida cima e baixo pelo mesmo número."), linhas: [[fr([String(a)], [String(b)]), " = ", fr([c(a / g)], [c(b / g)])]] },
        { passo: P("Multiplique em cruz", `Para comparar ${a}/${b} com ${cc}/${d}, multiplique em cruz: ${a} × ${d} e ${cc} × ${b}.`, `${a} × ${d} = ${x} e ${cc} × ${b} = ${y}.`, "Numerador de uma com o denominador da outra."), linhas: [[`${a} × ${d} = `, c(x)], [`${cc} × ${b} = `, c(y)]] },
        { passo: P("Compare", "O maior produto indica a maior fração (o que está do lado do numerador). Toque no sinal.", `${x} ${sinal} ${y}, então ${a}/${b} ${sinal} ${cc}/${d}.`, `Compare ${x} com ${y}.`), linhas: [[fr([String(a)], [String(b)]), " ", op(sinal, ["<", ">", "="]), " ", fr([String(cc)], [String(d)])]] },
      ]);
    }
    case "fracs": {
      const [a, b, cc, d] = n as [number, number, number, number], m = (b * d) / gcd(b, d), na = a * (m / b), nc = cc * (m / d), sn2 = na - nc, g = gcd(sn2, m);
      return M(`${a}/${b} − ${cc}/${d}`, `${a}/${b} − ${cc}/${d} = ${sn2 / g}/${m / g}`, [
        { linhas: [[fr([String(a)], [String(b)]), " - ", fr([String(cc)], [String(d)]), " = ?"]] },
        { passo: P("Denominador comum", `Os denominadores (${b} e ${d}) são diferentes: calcule o MMC deles.`, `MMC(${b}, ${d}) = ${m}.`, "Liste os múltiplos até achar o primeiro em comum."), linhas: [[`MMC(${b},${d}) = `, c(m)]] },
        { passo: P("Frações equivalentes", `Deixe as duas com denominador ${m}: divida ${m} pelo denominador antigo e multiplique o numerador.`, `${a} × ${m / b} = ${na} e ${cc} × ${m / d} = ${nc}.`, "O que faz embaixo faz em cima."), linhas: [[fr([String(a)], [String(b)]), " = ", fr([c(na)], [c(m)])], [fr([String(cc)], [String(d)]), " = ", fr([c(nc)], [c(m)])]] },
        { passo: P("Subtraia os numeradores", "Com denominadores iguais, subtraia só os numeradores.", `${na} − ${nc} = ${sn2}; o denominador ${m} continua.`, "Só os de cima se subtraem."), linhas: [[fr([String(na)], [String(m)]), " - ", fr([String(nc)], [String(m)]), " = ", fr([c(sn2)], [c(m)])]] },
        { passo: P("Simplifique", "Simplifique pelo maior divisor comum (se não der, repita).", g > 1 ? `${sn2} ÷ ${g} = ${sn2 / g} e ${m} ÷ ${g} = ${m / g}.` : "Já está simplificada.", `Procure o MDC de ${sn2} e ${m}.`), linhas: [[fr([String(sn2)], [String(m)]), " = ", fr([c(sn2 / g)], [c(m / g)])]] },
      ]);
    }
    case "fracde": {
      const [a, b, N] = n as [number, number, number], q = N / b, r = q * a;
      return M(`${a}/${b} de ${N}`, `${a}/${b} de ${N} = ${r}`, [
        { linhas: [[fr([String(a)], [String(b)]), ` de ${N} = ?`]] },
        { passo: P("Divida pelo denominador", `Para achar ${a}/${b} de ${N}, divida ${N} em ${b} partes iguais (o denominador diz em quantas partes).`, `${N} ÷ ${b} = ${q}: cada parte vale ${q}.`, `Calcule ${N} ÷ ${b}.`), linhas: [[`${N} ÷ ${b} = `, c(q)]] },
        { passo: P("Multiplique pelo numerador", `Pegue ${a} dessas partes (o numerador diz quantas).`, `${q} × ${a} = ${r}.`, `Calcule ${q} × ${a}.`), linhas: [[`${q} × ${a} = `, c(r)]] },
      ]);
    }
    case "divisib": {
      const N = n[0]!, ds = String(N).split("").map(Number), soma = ds.reduce((s, x) => s + x, 0), u = ds[ds.length - 1]!, ult2 = Number(String(N).slice(-2));
      const B = (titulo: string, texto: string, porque: string, linhas: Bloco["linhas"]): Bloco => ({ passo: P(titulo, texto, porque, "Releia o critério e confira o número."), linhas });
      return M(`Divisibilidade de ${N}`, `${N}: ${[2, 3, 4, 5, 9, 10].filter((d) => N % d === 0).join(", ") || "nenhum"}`, [
        { linhas: [[`Número: ${N}`]] },
        B("Por 2", "Divisível por 2 se o último algarismo for par (0, 2, 4, 6, 8).", `O último é ${u}: ${u % 2 === 0 ? "par, divisível por 2" : "ímpar, não é divisível por 2"}.`, [[`termina em ${u}: `, op(sn(N % 2 === 0), SN)]]),
        B("Por 3", "Divisível por 3 se a SOMA dos algarismos for divisível por 3. Calcule a soma e responda.", `${ds.join(" + ")} = ${soma}: ${soma % 3 === 0 ? "divisível por 3" : "não é divisível por 3"}.`, [[`${ds.join("+")} = `, c(soma)], ["divisível por 3? ", op(sn(N % 3 === 0), SN)]]),
        B("Por 4", "Divisível por 4 se os DOIS últimos algarismos formarem número divisível por 4 (ou forem 00).", `Os dois últimos formam ${ult2}: ${ult2 % 4 === 0 ? "divisível por 4" : "não é divisível por 4"}.`, [[`dois últimos: `, c(String(ult2).padStart(2, "0")), "  por 4? ", op(sn(N % 4 === 0), SN)]]),
        B("Por 5", "Divisível por 5 se terminar em 0 ou 5.", `Termina em ${u}: ${u === 0 || u === 5 ? "divisível por 5" : "não é divisível por 5"}.`, [[`termina em ${u}: `, op(sn(N % 5 === 0), SN)]]),
        B("Por 9", "Divisível por 9 se a SOMA dos algarismos for divisível por 9.", `A soma é ${soma}: ${soma % 9 === 0 ? "divisível por 9" : "não é divisível por 9"}.`, [[`soma = `, c(soma), "  por 9? ", op(sn(N % 9 === 0), SN)]]),
        B("Por 10", "Divisível por 10 se terminar em 0.", `Termina em ${u}: ${u === 0 ? "divisível por 10" : "não é divisível por 10"}.`, [[`termina em ${u}: `, op(sn(N % 10 === 0), SN)]]),
      ]);
    }
    case "divisores": {
      const [N, k] = n as [number, number], dv = Array.from({ length: N }, (_, i) => i + 1).filter((d) => N % d === 0), mult = [1, 2, 3, 4, 5].map((i) => i * k);
      return M(`Divisores de ${N}`, `${dv.length} divisores: ${dv.join(", ")}`, [
        { linhas: [[`Número: ${N}   Múltiplos de: ${k}`]] },
        { passo: P("Divisores", `Divisor é quem divide ${N} sem deixar resto. Teste 1, 2, 3… (os divisores vêm em pares: se 2 divide, ${N / 2} também). Escreva todos em ordem, separados por vírgula.`, `Divisores de ${N}: ${dv.join(", ")}.`, `Teste cada número de 1 até ${Math.floor(Math.sqrt(N))} e anote também o par correspondente.`), linhas: [[c(dv.join(","))]] },
        { passo: P("Quantos são?", "Conte quantos divisores você achou.", `São ${dv.length} divisores.`, "Conte os números da lista."), linhas: [["quantidade = ", c(dv.length)]] },
        { passo: P(`Múltiplos de ${k}`, `Múltiplos são o resultado de ${k} vezes 1, 2, 3, 4, 5… Escreva os 5 primeiros.`, `${k}×1, ${k}×2, ${k}×3, ${k}×4, ${k}×5 = ${mult.join(", ")}.`, `Some ${k} a cada passo.`), linhas: [[c(mult.join(","))]] },
      ]);
    }
    case "primo": {
      const N = n[0]!, lim = Math.floor(Math.sqrt(N)), ps = [2, 3, 5, 7, 11, 13, 17, 19].filter((p) => p <= lim);
      const bl: Bloco[] = [
        { linhas: [[`Número: ${N}`]] },
        { passo: P("Até onde testar", `Para saber se ${N} é primo, basta dividir pelos primos até a raiz quadrada de ${N}. Quanto vale a raiz (parte inteira)?`, `√${N} ≈ ${Math.sqrt(N).toFixed(1).replace(".", ",")}: testamos os primos até ${lim}.`, `Procure o número que vezes ele mesmo chega perto de ${N}.`), linhas: [[`√${N} ≈ `, c(lim)]] },
      ];
      let achou = 0;
      for (const p of ps) { if (achou) break; const div = N % p === 0; if (div) achou = p; bl.push({ passo: P(`Teste do ${p}`, `${N} é divisível por ${p}? (divisão exata, sem resto)`, div ? `${N} ÷ ${p} = ${N / p}: divide! Então ${N} NÃO é primo.` : `${N} ÷ ${p} deixa resto ${N % p}: não divide.`, `Faça ${N} ÷ ${p}.`), linhas: [[`${N} ÷ ${p}: `, op(sn(div), SN)]] }); }
      const primo = !achou;
      bl.push({ passo: P("Conclusão", "Se nenhum primo dividiu, o número é primo; se algum dividiu, é composto.", primo ? `Nenhum primo até ${lim} divide ${N}: ${N} é PRIMO.` : `${achou} divide ${N}: ${N} é COMPOSTO (${achou} × ${N / achou}).`, "Basta UM divisor (além de 1 e dele mesmo) para ser composto."), linhas: [[`${N} é `, op(primo ? "PRIMO" : "COMPOSTO", ["PRIMO", "COMPOSTO"])]] });
      return M(`${N} é primo?`, `${N} é ${primo ? "PRIMO" : "COMPOSTO"}`, bl);
    }
    case "pctqto": {
      const [p, t] = n as [number, number], pr = (p * 100) / t;
      return M(`${p} é quantos % de ${t}?`, `${p} é ${pr}% de ${t}`, [
        { linhas: [[`${p} é quantos % de ${t}?`]] },
        { passo: P("Monte a fração", "A parte dividida pelo todo: a parte vai em cima e o total embaixo.", `${p}/${t}.`, "Parte sobre total."), linhas: [[fr([c(p)], [c(t)])]] },
        { passo: P("Vire porcentagem", "Multiplique por 100 (e divida pelo total).", `${p} × 100 = ${p * 100}; ${p * 100} ÷ ${t} = ${pr}.`, `Calcule ${p} × 100 ÷ ${t}.`), linhas: [[`${p} × 100 ÷ ${t} = `, c(pr), "%"]] },
      ]);
    }
    case "sucessivas": {
      const [x1, s1, x2, s2] = n as [number, number, number, number], f1 = arred(1 + (s1 ? x1 : -x1) / 100), f2 = arred(1 + (s2 ? x2 : -x2) / 100), fp = arred(f1 * f2), v = arred((fp - 1) * 100);
      return M("Variações sucessivas", `Variação total: ${fmt(Math.abs(v))}% de ${v >= 0 ? "aumento" : "desconto"}`, [
        { linhas: [[`1º: ${s1 ? "aumento" : "desconto"} de ${x1}%`], [`2º: ${s2 ? "aumento" : "desconto"} de ${x2}%`]] },
        { passo: P("Fatores", "Cada variação vira um fator: aumento = 1 + taxa; desconto = 1 − taxa (taxa em decimal).", `Fator 1 = 1 ${s1 ? "+" : "−"} ${fmt(x1 / 100)} = ${fmt(f1)}; fator 2 = 1 ${s2 ? "+" : "−"} ${fmt(x2 / 100)} = ${fmt(f2)}.`, "Aumento soma 1; desconto subtrai de 1."), linhas: [["fator 1 = ", c(fmt(f1))], ["fator 2 = ", c(fmt(f2))]] },
        { passo: P("Multiplique os fatores", "Variações sucessivas se MULTIPLICAM (não se somam).", `${fmt(f1)} × ${fmt(f2)} = ${fmt(fp)}.`, "Multiplique os dois fatores."), linhas: [[`${fmt(f1)} × ${fmt(f2)} = `, c(fmt(fp))]] },
        { passo: P("Variação total", "Fator − 1, vezes 100: se der positivo é aumento; negativo, desconto.", `(${fmt(fp)} − 1) × 100 = ${fmt(v)}%: ${v >= 0 ? "aumento" : "desconto"} de ${fmt(Math.abs(v))}%.`, "Tire 1 do fator e multiplique por 100."), linhas: [[op(v >= 0 ? "AUMENTO" : "DESCONTO", ["AUMENTO", "DESCONTO"]), " de ", c(fmt(Math.abs(v))), "%"]] },
      ]);
    }
    case "taxa": {
      const [C, J, t] = n as [number, number, number], ct = C * t, i = (J * 100) / ct;
      return M(`Taxa: C=${C}, J=${J}, t=${t}`, `Taxa = ${i}% por período`, [
        { linhas: [[`C = ${C}   J = ${J}   t = ${t}`], ["i = J × 100 ÷ (C × t)"]] },
        { passo: P("Capital × tempo", "Multiplique o capital pelo tempo.", `${C} × ${t} = ${ct}.`, `Calcule ${C} × ${t}.`), linhas: [[`${C} × ${t} = `, c(ct)]] },
        { passo: P("Juros × 100", "Multiplique os juros por 100.", `${J} × 100 = ${J * 100}.`, "Acrescente dois zeros aos juros."), linhas: [[`${J} × 100 = `, c(J * 100)]] },
        { passo: P("Divida", "Divida o resultado de cima pelo de baixo: é a taxa em %.", `${J * 100} ÷ ${ct} = ${i}%.`, `Calcule ${J * 100} ÷ ${ct}.`), linhas: [["i = ", c(i), "%"]] },
      ]);
    }
    case "proporcao": {
      const [a, b, cc, d] = n as [number, number, number, number], g = gcd(a, b), x = a * d, y = b * cc, ok = x === y;
      return M(`Razão ${a}:${b} e proporção`, `${a}/${b} e ${cc}/${d} ${ok ? "são" : "não são"} proporcionais`, [
        { linhas: [[`razão ${a} : ${b}`], [`será que ${a}/${b} = ${cc}/${d}?`]] },
        { passo: P("Simplifique a razão", `Razão é a divisão de dois números (${a}/${b}). Simplifique pelo MDC.`, `MDC(${a}, ${b}) = ${g}; ${a}/${b} = ${a / g}/${b / g}.`, "Divida os dois pelo maior divisor comum."), linhas: [[`MDC = `, c(g), "   ", fr([c(a / g)], [c(b / g)])]] },
        { passo: P("Extremos e meios", `Na proporção ${a}/${b} = ${cc}/${d}: extremos são ${a} e ${d}; meios são ${b} e ${cc}. Multiplique os extremos e os meios.`, `Extremos: ${a} × ${d} = ${x}. Meios: ${b} × ${cc} = ${y}.`, "Extremos: primeiro e último; meios: os do centro."), linhas: [[`${a} × ${d} = `, c(x)], [`${b} × ${cc} = `, c(y)]] },
        { passo: P("São proporcionais?", "Numa proporção, o produto dos extremos é IGUAL ao produto dos meios.", ok ? `${x} = ${y}: formam proporção.` : `${x} ≠ ${y}: NÃO formam proporção.`, "Compare os dois produtos."), linhas: [["proporcionais? ", op(sn(ok), SN)]] },
      ]);
    }
    case "regra3i": {
      const [a, b, cc] = n as [number, number, number], ab = a * b, xv = ab / cc;
      return M(`Regra de três inversa: ${a}→${b}, ${cc}→x`, `x = ${xv}`, [
        { linhas: [[`${a}  →  ${b}`], [`${cc}  →  x`]] },
        { passo: P("Direta ou inversa?", `Se uma grandeza AUMENTA (${a} → ${cc}) e a outra DIMINUI (${b} → x), são INVERSAMENTE proporcionais. Aqui ${cc} é ${cc > a ? "maior" : "menor"} que ${a}.`, `Com mais ${cc > a ? "" : "menos "}quantidade, o outro valor ${cc > a ? "diminui" : "aumenta"} (mais gente, menos tempo): grandezas INVERSAS.`, "Pergunte: se uma dobra, a outra dobra (direta) ou cai pela metade (inversa)?"), linhas: [["a relação é ", op("INVERSA", ["DIRETA", "INVERSA"])]] },
        { passo: P("Produtos iguais", "Na inversa, o produto das duas grandezas se mantém: multiplique em linha.", `${a} × ${b} = ${ab} e ${cc} × x = ${ab}.`, "Na inversa, multiplica na horizontal."), linhas: [[`${a} × ${b} = `, c(ab)], [c(cc), " × x = ", c(ab)]] },
        { passo: P("Valor de x", `Divida ${ab} por ${cc}.`, `x = ${ab} ÷ ${cc} = ${xv}.`, `Calcule ${ab} ÷ ${cc}.`), linhas: [["x = ", c(xv)]] },
      ]);
    }
    case "regra3c": {
      const [m1, d1, p1, m2, d2] = n as [number, number, number, number, number], num = p1 * m2 * d2, den = m1 * d1, xv = num / den;
      return M("Regra de três composta", `x = ${xv}`, [
        { linhas: [["máquinas  dias  peças"], [`   ${m1}       ${d1}    ${p1}`], [`   ${m2}       ${d2}     x`]] },
        { passo: P("Máquinas × peças", `Mais máquinas produzem mais peças? Compare a grandeza "máquinas" com a que tem o x ("peças").`, "Mais máquinas, mais peças: DIRETA.", "Uma sobe e a outra sobe junto = direta."), linhas: [["máquinas e peças: ", op("DIRETA", ["DIRETA", "INVERSA"])]] },
        { passo: P("Dias × peças", `Mais dias produzem mais peças? Compare "dias" com "peças".`, "Mais dias, mais peças: DIRETA.", "Uma sobe e a outra sobe junto = direta."), linhas: [["dias e peças: ", op("DIRETA", ["DIRETA", "INVERSA"])]] },
        { passo: P("Monte a conta", `Como as duas são diretas, multiplique as razões: x = ${p1} × (${m2}/${m1}) × (${d2}/${d1}). Calcule o numerador (${p1} × ${m2} × ${d2}) e o denominador (${m1} × ${d1}).`, `Numerador ${p1} × ${m2} × ${d2} = ${num}; denominador ${m1} × ${d1} = ${den}.`, "Multiplique tudo o que está em cima e tudo o que está embaixo."), linhas: [["em cima: ", c(num)], ["embaixo: ", c(den)]] },
        { passo: P("Divida", `Divida ${num} por ${den}.`, `x = ${num} ÷ ${den} = ${xv}.`, `Calcule ${num} ÷ ${den}.`), linhas: [["x = ", c(xv)]] },
      ]);
    }
    case "variacao": {
      const [i, f] = n as [number, number], df = f - i, p100 = df * 100, v = p100 / i;
      return M(`Variação de ${i} para ${f}`, `Variação = ${v}%`, [
        { linhas: [[`inicial = ${i}   final = ${f}`], ["variação % = (final - inicial) ÷ inicial × 100"]] },
        { passo: P("Diferença", "Calcule final − inicial.", `${f} − ${i} = ${df}.`, "Subtraia o inicial do final."), linhas: [[`${f} - ${i} = `, c(df)]] },
        { passo: P("Vezes 100", "Multiplique por 100.", `${df} × 100 = ${p100}.`, "Acrescente dois zeros."), linhas: [[`${df} × 100 = `, c(p100)]] },
        { passo: P("Divida pelo inicial", `Divida por ${i}: é a variação percentual (positiva = aumento).`, `${p100} ÷ ${i} = ${v}%.`, `Calcule ${p100} ÷ ${i}.`), linhas: [["variação = ", c(v), "%"]] },
      ]);
    }
    case "proposicao": {
      const q = POOL_PROP[Number(entrada)] ?? POOL_PROP[0]!;
      const bl: Bloco[] = [
        { linhas: quebrar(`"${q.t}"`) },
        { passo: P("É proposição?", "Proposição é uma sentença declarativa (afirma algo) que pode ser julgada verdadeira ou falsa. Perguntas, ordens, exclamações e sentenças abertas NÃO são proposições.", `${q.prop ? "É proposição" : "Não é proposição"}: ${q.motivo}.`, "Dá para dizer se é V ou F? Se for pergunta, ordem ou exclamação, não é."), linhas: [["é proposição? ", op(sn(q.prop), SN)]] },
      ];
      if (q.prop) bl.push({ passo: P("Valor lógico", "Julgue a proposição: ela é verdadeira (V) ou falsa (F)?", `Valor lógico: ${q.v ? "V" : "F"}.`, "Confira se a afirmação é verdadeira."), linhas: [["valor lógico: ", op(q.v ? "V" : "F", ["V", "F"])]] });
      return M("Conceito de proposição", `${q.prop ? "Proposição" : "Não é proposição"}${q.prop ? ` (${q.v ? "V" : "F"})` : ""}`, bl);
    }
    case "principios": {
      const q = POOL_PRINC[Number(entrada)] ?? POOL_PRINC[0]!;
      return M("Princípios da lógica", q.r, [
        { linhas: quebrar(q.t) },
        { passo: P("Qual princípio?", "Os 3 princípios: IDENTIDADE (V continua V, F continua F), NÃO CONTRADIÇÃO (não pode ser V e F ao mesmo tempo) e TERCEIRO EXCLUÍDO (ou é V ou é F, não há terceira opção). Toque no que a frase descreve.", `Esta frase descreve o princípio ${q.r}.`, "Identidade = permanece; não contradição = não os dois; terceiro excluído = só dois valores."), linhas: [[op(q.r, ["IDENTIDADE", "NÃO CONTRADIÇÃO", "TERCEIRO EXCLUÍDO"])]] },
      ]);
    }
    case "simcomp": {
      const q = POOL_SIMCOMP[Number(entrada)] ?? POOL_SIMCOMP[0]!;
      const bl: Bloco[] = [
        { linhas: quebrar(`"${q.t}"`) },
        { passo: P("Simples ou composta?", "Proposição SIMPLES tem uma só afirmação. COMPOSTA junta proposições simples com conectivos (e, ou, se…então, se e somente se) ou tem negação.", q.comp ? "Tem conectivo ou negação: é COMPOSTA." : "Tem uma única afirmação: é SIMPLES.", "Procure e, ou, se…então, se e somente se, não."), linhas: [[op(q.comp ? "COMPOSTA" : "SIMPLES", ["SIMPLES", "COMPOSTA"])]] },
      ];
      if (q.comp) bl.push({ passo: P("Qual conectivo?", "Toque no conectivo que liga as proposições (ou na negação).", `O conectivo é ${q.con}.`, "E = conjunção; OU = disjunção; SE...ENTÃO = condicional; SE E SOMENTE SE = bicondicional; NÃO = negação."), linhas: [[op(q.con!, ["E", "OU", "SE...ENTÃO", "SE E SOMENTE SE", "NÃO"])]] },
        { passo: P("Escreva em símbolos", `Troque as proposições simples por letras (p${q.n === 2 ? ", q" : ""}) e use os símbolos: ∧ (e), ∨ (ou), → (se…então), ↔ (se e somente se), ~ (não).`, `Em símbolos: ${q.simb}.`, "Use o teclado de símbolos."), linhas: [[c(q.simb!)]] });
      return M("Proposições simples e compostas", q.comp ? `Composta: ${q.simb}` : "Simples", bl);
    }
    default: return null;
  }
}
const TIPOS_COM_TEXTO = new Set<TipoEsqueleto>(["ordem", "classnum", "decimal", "proposicao", "principios", "simcomp"]);
