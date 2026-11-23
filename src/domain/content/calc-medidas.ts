/**
 * Razão e proporção, regra de três composta, unidades de medida, geometria e matemática financeira, escritos linha
 * a linha como no caderno. O app faz todas as contas. Puro.
 */
import { L, P, money, nf, sup, type CadernoLinhas, type Figura, type LinhaCaderno } from "./calc-tipos";

// ───────────────────────── razão e simplificação ─────────────────────────
export function reduzir(a: number, b: number, modo: "razao" | "fracao"): CadernoLinhas | null {
  if (![a, b].every((n) => Number.isInteger(n) && n > 0 && n <= 1e6)) return null;
  const sep = modo === "razao" ? " : " : "/";
  const m = (x: number, y: number) => `${nf(x, 0)}${sep}${nf(y, 0)}`;
  const passos = [modo === "razao"
    ? `Razão é a comparação de dois números por divisão: ${nf(a, 0)} para ${nf(b, 0)}, escrita ${m(a, b)}. Para simplificar, dividimos os dois números pelo mesmo número, quantas vezes der.`
    : `Simplificar uma fração é dividir o numerador e o denominador pelo mesmo número, quantas vezes der. Começamos com ${m(a, b)}.`];
  const linhas: LinhaCaderno[] = [L(0, P(m(a, b), { cel: true }))];
  let x = a, y = b;
  for (let p = 2; p <= Math.min(x, y); p++) {
    while (x % p === 0 && y % p === 0) {
      passos.push(`Os dois são divisíveis por ${p}: ${nf(x, 0)} ÷ ${p} = ${nf(x / p, 0)} e ${nf(y, 0)} ÷ ${p} = ${nf(y / p, 0)}.`);
      x /= p; y /= p;
      linhas.push(L(passos.length - 1, P(`÷ ${p}`, { dim: true }), "=", P(m(x, y), { cel: true })));
    }
  }
  const mudou = x !== a;
  passos.push(mudou ? `Agora ${nf(x, 0)} e ${nf(y, 0)} só têm o 1 como divisor comum: não dá mais para simplificar. Esta é a forma mais simples.` : `${nf(a, 0)} e ${nf(b, 0)} só têm o 1 como divisor comum: já estão na forma mais simples.`);
  linhas.push(L(passos.length - 1, P(m(x, y), { dest: true })));
  const fim = modo === "fracao" && y === 1 ? nf(x, 0) : m(x, y);
  return { titulo: m(a, b), passos, resultado: `${m(a, b)} = ${fim}`, linhas };
}

export function proporcao(a: number, b: number, c: number): CadernoLinhas | null {
  if (![a, b, c].every((n) => Number.isFinite(n) && n > 0)) return null;
  const x = (b * c) / a;
  const passos = [
    `Proporção é a igualdade de duas razões. Aqui: ${nf(a)}/${nf(b)} = ${nf(c)}/x. O x é o valor que falta.`,
    "Propriedade fundamental: multiplicamos em cruz (o produto dos meios é igual ao produto dos extremos).",
    `Calculamos o produto do lado direito: ${nf(b)} · ${nf(c)} = ${nf(b * c)}.`,
    `O ${nf(a)} está multiplicando o x. Para deixar o x sozinho, ele passa dividindo.`,
    `${nf(b * c)} ÷ ${nf(a)} = ${nf(x)}. Conferindo: ${nf(a)} · ${nf(x)} = ${nf(a * x)}, igual a ${nf(b)} · ${nf(c)} = ${nf(b * c)}.`,
  ];
  const linhas = [L(0, P(`${nf(a)}/${nf(b)} = ${nf(c)}/x`, { cel: true })), L(1, `${nf(a)} · x = ${nf(b)} · ${nf(c)}`), L(2, `${nf(a)}x = ${nf(b * c)}`), L(3, `x = ${nf(b * c)} ÷ ${nf(a)}`), L(4, P(`x = ${nf(x)}`, { dest: true }))];
  return { titulo: `${nf(a)}/${nf(b)} = ${nf(c)}/x`, passos, resultado: `x = ${nf(x)}`, linhas };
}

/** Regra de três composta: `nomes` (n grandezas, a última é a do x), `v1` (n valores), `v2` (n−1 valores) e a relação de cada grandeza com a do x. */
export function regra3Composta(nomes: string[], v1: number[], v2: number[], rel: ("direta" | "inversa")[]): CadernoLinhas | null {
  const n = nomes.length;
  if (n < 3 || n > 4 || v1.length !== n || v2.length !== n - 1 || rel.length !== n - 1) return null;
  if (![...v1, ...v2].every((x) => Number.isFinite(x) && x > 0)) return null;
  const frs = rel.map((r, i) => (r === "direta" ? [v1[i]!, v2[i]!] : [v2[i]!, v1[i]!]));
  const num = frs.reduce((acc, f) => acc * f[0]!, 1), den = frs.reduce((acc, f) => acc * f[1]!, 1);
  const c1 = v1[n - 1]!;
  const x = (c1 * den) / num;
  if (!Number.isFinite(x)) return null;
  const last = nomes[n - 1]!;
  const tabela = (vals: (string | number)[]) => L(0, ...vals.map((v) => P(typeof v === "number" ? nf(v) : v, { cel: true })));
  const passos = [
    "Montamos a tabela: cada coluna é uma grandeza e cada linha é uma situação. O x é o valor que queremos descobrir.",
    `Comparamos cada grandeza com a do x (${last}). Direta: as duas crescem juntas. Inversa: quando uma cresce, a outra diminui.`,
    `Montamos a proporção: a razão do x é igual ao produto das razões das outras grandezas. Nas inversas, invertemos a fração.`,
    "Multiplicamos as frações: numeradores com numeradores e denominadores com denominadores.",
    `Multiplicação em cruz: ${nf(num)} · x = ${nf(c1)} · ${nf(den)}.`,
    `Isolamos o x: x = ${nf(c1 * den)} ÷ ${nf(num)} = ${nf(x)}.`,
  ];
  const linhas: LinhaCaderno[] = [
    tabela(nomes), tabela([...v1]), tabela([...v2, "x"]),
    L(1, ...rel.map((r, i) => P(`${nomes[i]}: ${r === "direta" ? "direta ⇄" : "inversa ⇅"}`, { dest: r === "inversa" }))),
    L(2, `${nf(c1)}/x = ${frs.map((f) => `${nf(f[0]!)}/${nf(f[1]!)}`).join(" × ")}`),
    L(3, `${nf(c1)}/x = ${nf(num)}/${nf(den)}`),
    L(4, `${nf(num)}x = ${nf(c1 * den)}`),
    L(5, P(`x = ${nf(x)}`, { dest: true })),
  ];
  return { titulo: "Regra de três composta", passos, resultado: `x = ${nf(x)}`, linhas };
}

// ───────────────────────── unidades de medida ─────────────────────────
const ESCADAS: Record<string, { u: string[]; f: number; nome: string }> = {
  comprimento: { u: ["km", "hm", "dam", "m", "dm", "cm", "mm"], f: 10, nome: "comprimento" },
  massa: { u: ["kg", "hg", "dag", "g", "dg", "cg", "mg"], f: 10, nome: "massa" },
  capacidade: { u: ["kl", "hl", "dal", "l", "dl", "cl", "ml"], f: 10, nome: "capacidade" },
  area: { u: ["km²", "hm²", "dam²", "m²", "dm²", "cm²", "mm²"], f: 100, nome: "área" },
  volume: { u: ["km³", "hm³", "dam³", "m³", "dm³", "cm³", "mm³"], f: 1000, nome: "volume" },
};
const TEMPO: Record<string, number> = { dia: 86400, h: 3600, min: 60, s: 1 };
const norm = (u: string) => u.toLowerCase().replace(/^litros?$/, "l").replace(/^(km|hm|dam|m|dm|cm|mm)2$/, "$1²").replace(/^(km|hm|dam|m|dm|cm|mm)3$/, "$1³").replace(/^dias$/, "dia");
const grupoDe = (u: string) => Object.entries(ESCADAS).find(([, g]) => g.u.includes(u))?.[0] ?? null;

function escada(g: string, v: number, de: string, para: string, passos: string[], linhas: LinhaCaderno[]): number {
  const E = ESCADAS[g]!;
  const i = E.u.indexOf(de), j = E.u.indexOf(para), k = j - i;
  const fator = E.f ** Math.abs(k);
  const res = Math.round((k > 0 ? v * fator : v / fator) * 1e9) / 1e9;
  passos.push(`Na escada d${g === "area" ? "a" : "o"} ${E.nome}, cada degrau vale ${nf(E.f, 0)} vezes o vizinho. De ${de} para ${para} andamos ${Math.abs(k)} casa${Math.abs(k) > 1 ? "s" : ""} para a ${k > 0 ? "direita" : "esquerda"}.`);
  linhas.push(L(passos.length - 1, ...E.u.map((x) => P(x, { cel: true, dest: x === de || x === para }))));
  passos.push(`${k > 0 ? "Para a direita multiplicamos" : "Para a esquerda dividimos"} por ${nf(E.f, 0)} em cada casa: ${nf(E.f, 0)}${Math.abs(k) > 1 ? sup(Math.abs(k)) : ""} = ${nf(fator, 0)}. Então ${nf(v, 6)} ${de} ${k > 0 ? "×" : "÷"} ${nf(fator, 0)} = ${nf(res, 6)} ${para}.`);
  linhas.push(L(passos.length - 1, `${nf(v, 6)} ${de} ${k > 0 ? "×" : "÷"} ${nf(fator, 0)} =`, P(`${nf(res, 6)} ${para}`, { dest: true })));
  return res;
}

export function unidade(valor: number, deTxt: string, paraTxt: string): CadernoLinhas | null {
  if (!Number.isFinite(valor) || valor < 0) return null;
  const de = norm(deTxt), para = norm(paraTxt);
  if (de === para) return null;
  const passos: string[] = [], linhas: LinhaCaderno[] = [];
  const titulo = `${nf(valor, 6)} ${de} em ${para}`;
  if (de in TEMPO && para in TEMPO) {
    const r = TEMPO[de]! / TEMPO[para]!;
    const res = Math.round(valor * r * 1e9) / 1e9;
    passos.push("Relações do tempo: 1 dia = 24 h, 1 h = 60 min e 1 min = 60 s.");
    linhas.push(L(0, ...["dia", "h", "min", "s"].map((u) => P(u, { cel: true, dest: u === de || u === para }))));
    passos.push(`1 ${de} = ${nf(r)} ${para}${r < 1 ? ` (porque 1 ${para} = ${nf(1 / r)} ${de})` : ""}. Então ${r >= 1 ? "multiplicamos" : "dividimos"}.`);
    linhas.push(L(1, `1 ${de} = ${nf(r)} ${para}`));
    passos.push(`${nf(valor)} ${de} ${r >= 1 ? `× ${nf(r)}` : `÷ ${nf(1 / r)}`} = ${nf(res)} ${para}.`);
    linhas.push(L(2, `${nf(valor)} ${de} ${r >= 1 ? "×" : "÷"} ${nf(r >= 1 ? r : 1 / r)} =`, P(`${nf(res)} ${para}`, { dest: true })));
    return { titulo, passos, resultado: `${nf(valor)} ${de} = ${nf(res)} ${para}`, linhas };
  }
  const gd = grupoDe(de), gp = grupoDe(para);
  if (!gd || !gp) return null;
  let v = valor;
  if (gd === gp) v = escada(gd, v, de, para, passos, linhas);
  else if (gd === "capacidade" && gp === "volume") {
    if (de !== "l") v = escada("capacidade", v, de, "l", passos, linhas);
    passos.push("Ponte entre capacidade e volume: 1 litro equivale a 1 dm³.");
    linhas.push(L(passos.length - 1, P("1 l = 1 dm³", { dest: true })));
    if (para !== "dm³") v = escada("volume", v, "dm³", para, passos, linhas);
  } else if (gd === "volume" && gp === "capacidade") {
    if (de !== "dm³") v = escada("volume", v, de, "dm³", passos, linhas);
    passos.push("Ponte entre volume e capacidade: 1 dm³ equivale a 1 litro.");
    linhas.push(L(passos.length - 1, P("1 dm³ = 1 l", { dest: true })));
    if (para !== "l") v = escada("capacidade", v, "l", para, passos, linhas);
  } else return null;
  return { titulo, passos, resultado: `${nf(valor, 6)} ${de} = ${nf(v, 6)} ${para}`, linhas };
}

// ───────────────────────── geometria ─────────────────────────
type Etapa = [string, ...(string | ReturnType<typeof P>)[][]];
const PI = 3.14;

export function geometria(forma: string, n: number[], un = ""): CadernoLinhas | null {
  if (!n.every((x) => Number.isFinite(x) && x > 0)) return null;
  const u = un, u2 = un ? `${un}²` : "", u3 = un ? `${un}³` : "";
  const com = (x: number, s: string) => `${nf(x)}${s ? ` ${s}` : ""}`;
  const [a = 0, b = 0, c = 0] = n;
  const etapas: Etapa[] = [];
  let fig: Figura | undefined;
  let resultado = "";
  const pt = (s: string) => [P(s)];
  switch (forma) {
    case "retangulo": {
      if (n.length !== 2) return null;
      fig = { tipo: "retangulo", rot: { b: com(a, u), h: com(b, u) } };
      etapas.push(
        ["Área do retângulo: base × altura.", pt("A = b × h")],
        [`Trocamos b por ${nf(a)} e h por ${nf(b)}.`, pt(`A = ${nf(a)} × ${nf(b)}`)],
        [`Multiplicamos: ${nf(a)} × ${nf(b)} = ${nf(a * b)}.`, [P(`A = ${com(a * b, u2)}`, { dest: true })]],
        ["Perímetro é a soma dos quatro lados: dois lados iguais à base e dois iguais à altura, ou seja, 2 × (b + h).", pt("P = 2 × (b + h)")],
        [`Trocamos pelos valores e resolvemos primeiro a soma dentro dos parênteses: ${nf(a)} + ${nf(b)} = ${nf(a + b)}.`, pt(`P = 2 × (${nf(a)} + ${nf(b)})`), pt(`P = 2 × ${nf(a + b)}`)],
        [`Multiplicamos: 2 × ${nf(a + b)} = ${nf(2 * (a + b))}.`, [P(`P = ${com(2 * (a + b), u)}`, { dest: true })]],
      );
      resultado = `A = ${com(a * b, u2)} e P = ${com(2 * (a + b), u)}`;
      break;
    }
    case "quadrado": {
      if (n.length !== 1) return null;
      fig = { tipo: "quadrado", rot: { l: com(a, u) } };
      etapas.push(
        ["Área do quadrado: lado × lado.", pt("A = l × l")],
        [`O lado vale ${nf(a)}.`, pt(`A = ${nf(a)} × ${nf(a)}`)],
        [`${nf(a)} × ${nf(a)} = ${nf(a * a)}.`, [P(`A = ${com(a * a, u2)}`, { dest: true })]],
        ["Perímetro: o quadrado tem 4 lados iguais, então multiplicamos o lado por 4.", pt(`P = 4 × ${nf(a)}`), [P(`P = ${com(4 * a, u)}`, { dest: true })]],
      );
      resultado = `A = ${com(a * a, u2)} e P = ${com(4 * a, u)}`;
      break;
    }
    case "triangulo": {
      if (n.length !== 2) return null;
      fig = { tipo: "triangulo", rot: { b: com(a, u), h: com(b, u) } };
      etapas.push(
        ["Área do triângulo: base × altura ÷ 2. O triângulo é metade de um retângulo de mesma base e altura.", pt("A = b × h ÷ 2")],
        [`Trocamos pelos valores.`, pt(`A = ${nf(a)} × ${nf(b)} ÷ 2`)],
        [`Primeiro multiplicamos: ${nf(a)} × ${nf(b)} = ${nf(a * b)}.`, pt(`A = ${nf(a * b)} ÷ 2`)],
        [`Depois dividimos por 2: ${nf(a * b)} ÷ 2 = ${nf((a * b) / 2)}.`, [P(`A = ${com((a * b) / 2, u2)}`, { dest: true })]],
      );
      resultado = `A = ${com((a * b) / 2, u2)}`;
      break;
    }
    case "circulo": {
      if (n.length !== 1) return null;
      fig = { tipo: "circulo", rot: { r: com(a, u) } };
      etapas.push(
        [`Área do círculo: π × r². Vamos usar π ≈ 3,14.`, pt("A = π × r²")],
        [`O raio é ${nf(a)}. Primeiro a potência: ${nf(a)}² = ${nf(a * a)}.`, pt(`A = 3,14 × ${nf(a)}²`), pt(`A = 3,14 × ${nf(a * a)}`)],
        [`Multiplicamos: 3,14 × ${nf(a * a)} = ${nf(PI * a * a)}.`, [P(`A = ${com(PI * a * a, u2)}`, { dest: true })]],
        ["Comprimento da circunferência: 2 × π × r.", pt("C = 2 × π × r"), pt(`C = 2 × 3,14 × ${nf(a)}`)],
        [`2 × 3,14 = 6,28 e 6,28 × ${nf(a)} = ${nf(2 * PI * a)}.`, [P(`C = ${com(2 * PI * a, u)}`, { dest: true })]],
      );
      resultado = `A = ${com(PI * a * a, u2)} e C = ${com(2 * PI * a, u)}`;
      break;
    }
    case "trapezio": {
      if (n.length !== 3) return null;
      fig = { tipo: "trapezio", rot: { B: com(a, u), b: com(b, u), h: com(c, u) } };
      etapas.push(
        ["Área do trapézio: (base maior + base menor) × altura ÷ 2.", pt("A = (B + b) × h ÷ 2")],
        [`Trocamos pelos valores e somamos as bases dentro dos parênteses: ${nf(a)} + ${nf(b)} = ${nf(a + b)}.`, pt(`A = (${nf(a)} + ${nf(b)}) × ${nf(c)} ÷ 2`), pt(`A = ${nf(a + b)} × ${nf(c)} ÷ 2`)],
        [`Multiplicamos: ${nf(a + b)} × ${nf(c)} = ${nf((a + b) * c)}.`, pt(`A = ${nf((a + b) * c)} ÷ 2`)],
        [`Dividimos por 2: ${nf((a + b) * c)} ÷ 2 = ${nf(((a + b) * c) / 2)}.`, [P(`A = ${com(((a + b) * c) / 2, u2)}`, { dest: true })]],
      );
      resultado = `A = ${com(((a + b) * c) / 2, u2)}`;
      break;
    }
    case "paralelogramo": {
      if (n.length !== 2) return null;
      fig = { tipo: "paralelogramo", rot: { b: com(a, u), h: com(b, u) } };
      etapas.push(
        ["Área do paralelogramo: base × altura (a altura é a distância reta entre as bases, não o lado inclinado).", pt("A = b × h")],
        [`Trocamos pelos valores: ${nf(a)} × ${nf(b)} = ${nf(a * b)}.`, pt(`A = ${nf(a)} × ${nf(b)}`), [P(`A = ${com(a * b, u2)}`, { dest: true })]],
      );
      resultado = `A = ${com(a * b, u2)}`;
      break;
    }
    case "losango": {
      if (n.length !== 2) return null;
      fig = { tipo: "losango", rot: { D: com(a, u), d: com(b, u) } };
      etapas.push(
        ["Área do losango: diagonal maior × diagonal menor ÷ 2.", pt("A = D × d ÷ 2")],
        [`Trocamos pelos valores e multiplicamos: ${nf(a)} × ${nf(b)} = ${nf(a * b)}.`, pt(`A = ${nf(a)} × ${nf(b)} ÷ 2`), pt(`A = ${nf(a * b)} ÷ 2`)],
        [`Dividimos por 2: ${nf(a * b)} ÷ 2 = ${nf((a * b) / 2)}.`, [P(`A = ${com((a * b) / 2, u2)}`, { dest: true })]],
      );
      resultado = `A = ${com((a * b) / 2, u2)}`;
      break;
    }
    case "cubo": {
      if (n.length !== 1) return null;
      fig = { tipo: "cubo", rot: { a: com(a, u) } };
      etapas.push(
        ["Volume do cubo: aresta × aresta × aresta.", pt("V = a × a × a")],
        [`A aresta vale ${nf(a)}.`, pt(`V = ${nf(a)} × ${nf(a)} × ${nf(a)}`)],
        [`${nf(a)} × ${nf(a)} = ${nf(a * a)} e ${nf(a * a)} × ${nf(a)} = ${nf(a ** 3)}.`, [P(`V = ${com(a ** 3, u3)}`, { dest: true })]],
        ["Área total: o cubo tem 6 faces quadradas iguais.", pt(`A = 6 × ${nf(a)}²`), pt(`A = 6 × ${nf(a * a)}`), [P(`A = ${com(6 * a * a, u2)}`, { dest: true })]],
      );
      resultado = `V = ${com(a ** 3, u3)} e A = ${com(6 * a * a, u2)}`;
      break;
    }
    case "paralelepipedo": {
      if (n.length !== 3) return null;
      fig = { tipo: "paralelepipedo", rot: { a: com(a, u), b: com(b, u), c: com(c, u) } };
      etapas.push(
        ["Volume do paralelepípedo (caixa): comprimento × largura × altura.", pt("V = a × b × c")],
        [`Trocamos pelos valores. Primeiro ${nf(a)} × ${nf(b)} = ${nf(a * b)}.`, pt(`V = ${nf(a)} × ${nf(b)} × ${nf(c)}`), pt(`V = ${nf(a * b)} × ${nf(c)}`)],
        [`${nf(a * b)} × ${nf(c)} = ${nf(a * b * c)}.`, [P(`V = ${com(a * b * c, u3)}`, { dest: true })]],
      );
      resultado = `V = ${com(a * b * c, u3)}`;
      break;
    }
    case "cilindro": {
      if (n.length !== 2) return null;
      fig = { tipo: "cilindro", rot: { r: com(a, u), h: com(b, u) } };
      etapas.push(
        ["Volume do cilindro: área da base (círculo) × altura. Usamos π ≈ 3,14.", pt("V = π × r² × h")],
        [`Primeiro a potência: ${nf(a)}² = ${nf(a * a)}.`, pt(`V = 3,14 × ${nf(a)}² × ${nf(b)}`), pt(`V = 3,14 × ${nf(a * a)} × ${nf(b)}`)],
        [`3,14 × ${nf(a * a)} = ${nf(PI * a * a)} e ${nf(PI * a * a)} × ${nf(b)} = ${nf(PI * a * a * b)}.`, [P(`V = ${com(PI * a * a * b, u3)}`, { dest: true })]],
      );
      resultado = `V = ${com(PI * a * a * b, u3)}`;
      break;
    }
    case "pitagoras": {
      if (n.length !== 2) return null;
      fig = { tipo: "pitagoras", rot: { a: com(a, u), b: com(b, u), c: "c" } };
      const s = a * a + b * b, r = Math.sqrt(s);
      etapas.push(
        ["Teorema de Pitágoras: no triângulo retângulo, hipotenusa² = cateto² + cateto².", pt("c² = a² + b²")],
        [`Trocamos pelos catetos: ${nf(a)} e ${nf(b)}.`, pt(`c² = ${nf(a)}² + ${nf(b)}²`)],
        [`Potências: ${nf(a)}² = ${nf(a * a)} e ${nf(b)}² = ${nf(b * b)}.`, pt(`c² = ${nf(a * a)} + ${nf(b * b)}`)],
        [`Somamos: ${nf(a * a)} + ${nf(b * b)} = ${nf(s)}.`, pt(`c² = ${nf(s)}`)],
        [Number.isInteger(r) ? `Tiramos a raiz quadrada: √${nf(s)} = ${nf(r)}.` : `√${nf(s)} não é exata; valor aproximado: ${nf(r, 3)}.`, [P(Number.isInteger(r) ? `c = ${com(r, u)}` : `c = √${nf(s)} ≈ ${com(r, u)}`.replace(/(\d)(?=,?\d*$)/, "$1"), { dest: true })]],
      );
      resultado = Number.isInteger(r) ? `c = ${com(r, u)}` : `c = √${nf(s)} ≈ ${com(r, u)}`;
      break;
    }
    default: return null;
  }
  const passos: string[] = [];
  const linhas: LinhaCaderno[] = [];
  etapas.forEach((e, i) => {
    passos.push(e[0]);
    for (const l of e.slice(1) as ReturnType<typeof P>[][]) linhas.push({ p: i, partes: l });
  });
  const nomes: Record<string, string> = { retangulo: "Retângulo", quadrado: "Quadrado", triangulo: "Triângulo", circulo: "Círculo", trapezio: "Trapézio", paralelogramo: "Paralelogramo", losango: "Losango", cubo: "Cubo", paralelepipedo: "Paralelepípedo", cilindro: "Cilindro", pitagoras: "Pitágoras" };
  return { titulo: nomes[forma]!, passos, resultado, linhas, fig };
}

// ───────────────────────── matemática financeira ─────────────────────────
export function financeira(modo: "simples" | "composto", C: number, taxa: number, t: number): CadernoLinhas | null {
  if (![C, taxa, t].every((x) => Number.isFinite(x) && x > 0) || !Number.isInteger(t) || t > 12) return null;
  const i = taxa / 100;
  const passos: string[] = [], linhas: LinhaCaderno[] = [];
  passos.push(modo === "simples"
    ? "Juros simples: o juro de cada período é sempre calculado sobre o capital inicial (C). Fórmula: J = C × i × t, com a taxa i na forma decimal."
    : "Juros compostos: o juro de cada período incide sobre o valor do período anterior (juro sobre juro). A cada período, multiplicamos por (1 + i).");
  linhas.push(L(0, P(`C = ${money(C)}   i = ${nf(taxa)}%   t = ${t}`, { cel: true })));
  passos.push(`Transformamos a taxa em decimal: ${nf(taxa)}% = ${nf(taxa)} ÷ 100 = ${nf(i, 6)}.`);
  linhas.push(L(1, `i = ${nf(taxa)} ÷ 100 =`, P(nf(i, 6), { dest: true })));
  if (modo === "simples") {
    const J = C * i * t;
    passos.push(`Trocamos as letras pelos valores: J = ${money(C)} × ${nf(i, 6)} × ${t}.`);
    linhas.push(L(2, `J = ${nf(C, 2)} × ${nf(i, 6)} × ${t}`));
    passos.push(`Multiplicamos: ${nf(C, 2)} × ${nf(i, 6)} = ${nf(C * i, 4)} e ${nf(C * i, 4)} × ${t} = ${nf(J, 4)}.`);
    linhas.push(L(3, "J =", P(money(J), { dest: true })));
    passos.push(`Montante é o capital mais os juros: M = C + J = ${money(C)} + ${money(J)} = ${money(C + J)}.`);
    linhas.push(L(4, `M = ${nf(C, 2)} + ${nf(J, 2)} =`, P(money(C + J), { dest: true })));
    return { titulo: `Juros simples: ${money(C)} a ${nf(taxa)}% por ${t} períodos`, passos, resultado: `J = ${money(J)} e M = ${money(C + J)}`, linhas };
  }
  passos.push(`O fator de cada período é 1 + i = 1 + ${nf(i, 6)} = ${nf(1 + i, 6)}.`);
  linhas.push(L(2, `1 + i = ${nf(1 + i, 6)}`));
  let v = C;
  for (let k = 1; k <= t; k++) {
    const nv = v * (1 + i);
    passos.push(`Período ${k}: ${money(v)} × ${nf(1 + i, 6)} = ${money(nv)}.`);
    linhas.push(L(passos.length - 1, `M${k} = ${nf(v, 2)} × ${nf(1 + i, 6)} =`, P(money(nv), { dest: k === t })));
    v = nv;
  }
  passos.push(`Os juros são o montante final menos o capital: J = ${money(v)} − ${money(C)} = ${money(v - C)}. (Os valores são mostrados com 2 casas; a conta segue com a precisão completa.)`);
  linhas.push(L(passos.length - 1, `J = ${nf(v, 2)} − ${nf(C, 2)} =`, P(money(v - C), { dest: true })));
  return { titulo: `Juros compostos: ${money(C)} a ${nf(taxa)}% por ${t} períodos`, passos, resultado: `M = ${money(v)} e J = ${money(v - C)}`, linhas };
}
