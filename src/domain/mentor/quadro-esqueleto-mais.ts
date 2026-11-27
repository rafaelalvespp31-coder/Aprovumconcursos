/** Mais esqueletos de Matemática e Raciocínio Lógico (contagem, sequências, conjuntos, geometria, juros, equações…), todos passo a passo. */
import { c, digitos, fmt, fr, gcd, montarLinhas, type Bloco, type Esqueleto, type TipoEsqueleto } from "./quadro-esqueleto-base";
import type { Medidor } from "./quadro-motor";

const arred = (x: number) => Math.round(x * 1e6) / 1e6;
const primos = (n: number): number[] => { const o: number[] = []; for (let p = 2; n > 1 && p <= n; p++) while (n % p === 0) { o.push(p); n /= p; } return o; };
const prod = (a: number[]) => a.reduce((s, x) => s * x, 1);
const prodTxt = (a: number[]) => a.join("×");
const fatorial = (n: number) => prod(Array.from({ length: n }, (_, i) => i + 1));
const termos = (n: number, p: number) => Array.from({ length: p }, (_, i) => n - i);
const P = (titulo: string, texto: string, porque: string, dica: string) => ({ titulo, texto, porque, dica });

export function aleatorioMais(tipo: TipoEsqueleto, rnd: () => number = Math.random): number[] | null {
  const pick = <T,>(a: T[]) => a[Math.floor(rnd() * a.length)]!;
  const ent = (a: number, b: number) => a + Math.floor(rnd() * (b - a + 1));
  switch (tipo) {
    case "pot": return [ent(2, 9), ent(2, 4)];
    case "raiz": return [pick([144, 225, 196, 324, 400, 256, 169, 121, 576])];
    case "fat": return [pick([60, 84, 90, 120, 126, 168, 180, 210, 252, 360])];
    case "expr": { const d = ent(1, 5), cc = d + ent(2, 6); return [ent(2, 20), ent(2, 9), cc, d]; }
    case "fracm": return pick([[2, 3, 3, 4], [1, 2, 4, 5], [3, 4, 2, 9], [5, 6, 3, 10], [2, 5, 5, 8]]);
    case "fracd": return pick([[1, 2, 1, 4], [2, 3, 4, 9], [3, 4, 3, 8], [5, 6, 5, 12], [1, 3, 2, 3]]);
    case "aumdesc": return [pick([80, 120, 200, 400, 500]), pick([10, 15, 20, 25, 30]), ent(0, 1)];
    case "razao": { const a = ent(1, 4), b = ent(2, 5), k = ent(3, 12); return [k * (a + b), a, b]; }
    case "eq2": { const r1 = ent(1, 5); return [r1, r1 + ent(1, 5)]; }
    case "sistema": { const y = ent(1, 8); return [y + ent(1, 8), y]; }
    case "mediap": return pick([[6, 2, 8, 3], [5, 1, 7, 2, 9, 3], [4, 3, 9, 2], [8, 4, 6, 1]]);
    case "mediana": { const n = ent(5, 7); return Array.from({ length: n }, () => ent(1, 20)); }
    case "juros": return [pick([1000, 2000, 5000, 800]), pick([2, 3, 5, 10]), ent(2, 6)];
    case "jurosc": return [pick([1000, 2000, 500]), pick([10, 20]), ent(2, 3)];
    case "area": return [ent(2, 12) * 2, ent(2, 10) * 2, ent(0, 1)];
    case "circ": return [ent(2, 10)];
    case "vol": return [ent(2, 9), ent(2, 9), ent(2, 9)];
    case "pit": return pick([[3, 4], [6, 8], [5, 12], [8, 15], [9, 12], [12, 16]]);
    case "vel": { const t = ent(2, 5); return [t * pick([40, 60, 80, 90, 100]), t]; }
    case "conv": return [ent(2, 30), ent(1, 5)];
    case "pa": return [ent(1, 10), ent(2, 6), ent(6, 12)];
    case "pg": return [ent(1, 5), ent(2, 3), ent(4, 6)];
    case "conj": { const cc = ent(3, 12), a = cc + ent(5, 20), b = cc + ent(5, 20); return [a, b, cc, a + b - cc + ent(5, 20)]; }
    case "prob": return pick([[1, 2], [3, 10], [1, 4], [2, 5], [7, 20], [9, 25], [12, 50]]);
    case "pfc": return pick([[3, 4], [3, 4, 2], [5, 2, 3], [4, 4], [6, 3, 2]]);
    case "perm": return [ent(3, 7)];
    case "arr": { const n = ent(4, 9); return [n, ent(2, 3)]; }
    case "comb": { const n = ent(5, 10); return [n, ent(2, 3)]; }
    default: return null;
  }
}

export function validarMais(tipo: TipoEsqueleto, n: number[]): string | null | undefined {
  const todos = (min: number, max: number) => n.every((v) => Number.isInteger(v) && v >= min && v <= max);
  switch (tipo) {
    case "pot": return n.length === 2 && todos(1, 99) && n[1]! >= 2 && n[1]! <= 6 && n[0]! ** n[1]! <= 999999 ? null : "Digite base e expoente (2 a 6), ex.: 3, 4";
    case "raiz": return n.length === 1 && Number.isInteger(Math.sqrt(n[0]!)) && n[0]! >= 4 && n[0]! <= 10000 ? null : "Digite um quadrado perfeito, ex.: 144";
    case "fat": return n.length === 1 && n[0]! >= 2 && n[0]! <= 999 ? null : "Digite um número de 2 a 999, ex.: 60";
    case "expr": return n.length === 4 && todos(1, 999) && n[2]! > n[3]! ? null : "Digite a, b, c, d para a + b × (c − d), com c maior que d";
    case "fracm": case "fracd": return n.length === 4 && todos(1, 99) ? null : "Digite a, b, c, d para a/b e c/d, ex.: 2, 3, 3, 4";
    case "aumdesc": return n.length === 3 && n[0]! >= 1 && (n[0]! * n[1]!) % 100 === 0 && (n[2] === 0 || n[2] === 1) ? null : "Digite preço, porcentagem e 0 (desconto) ou 1 (acréscimo), conta exata. Ex.: 200, 15, 0";
    case "razao": return n.length === 3 && todos(1, 9999) && n[0]! % (n[1]! + n[2]!) === 0 ? null : "Digite total, parte A e parte B (total divisível por A+B). Ex.: 120, 2, 3";
    case "eq2": return n.length === 2 && todos(1, 20) && n[0]! < n[1]! ? null : "Digite as duas raízes (a menor primeiro), ex.: 2, 5";
    case "sistema": return n.length === 2 && todos(1, 99) && n[0]! > n[1]! ? null : "Digite x e y (x maior), ex.: 7, 3";
    case "mediap": return (n.length === 4 || n.length === 6) && todos(0, 100) ? null : "Digite pares valor, peso: ex.: 6, 2, 8, 3";
    case "mediana": return n.length >= 3 && n.length <= 9 && todos(0, 999) ? null : "Digite de 3 a 9 números, ex.: 7, 3, 9, 1, 5";
    case "juros": return n.length === 3 && todos(1, 99999) && (n[0]! * n[1]! * n[2]!) % 100 === 0 ? null : "Digite capital, taxa (%) e tempo. Ex.: 1000, 5, 3";
    case "jurosc": return n.length === 3 && todos(1, 99999) && n[2]! >= 2 && n[2]! <= 3 && (n[1] === 10 || n[1] === 20) ? null : "Digite capital, taxa (10 ou 20) e tempo (2 ou 3). Ex.: 1000, 10, 2";
    case "area": return n.length === 3 && todos(0, 999) && n[0]! > 0 && n[1]! > 0 && (n[2] === 0 || (n[2] === 1 && (n[0]! * n[1]!) % 2 === 0)) ? null : "Digite base, altura e 0 (retângulo) ou 1 (triângulo). Ex.: 8, 5, 1";
    case "circ": return n.length === 1 && n[0]! >= 1 && n[0]! <= 99 ? null : "Digite o raio, ex.: 5";
    case "vol": return n.length === 3 && todos(1, 99) ? null : "Digite comprimento, largura e altura, ex.: 4, 3, 5";
    case "pit": return n.length === 2 && todos(1, 99) && Number.isInteger(Math.sqrt(n[0]! ** 2 + n[1]! ** 2)) ? null : "Digite os dois catetos de modo que a hipotenusa seja inteira, ex.: 3, 4";
    case "vel": return n.length === 2 && todos(1, 9999) && n[0]! % n[1]! === 0 ? null : "Digite distância (km) e tempo (h), divisão exata. Ex.: 240, 3";
    case "conv": return n.length === 2 && n[0]! >= 1 && n[0]! <= 9999 && n[1]! >= 1 && n[1]! <= UNID.length ? null : `Digite o valor e o tipo de 1 a ${UNID.length}: ${UNID.map((u, i) => `${i + 1}=${u[0]}→${u[1]}`).join(", ")}`;
    case "pa": return n.length === 3 && todos(0, 99) && n[2]! >= 3 && n[2]! <= 20 ? null : "Digite primeiro termo, razão e n (3 a 20). Ex.: 2, 3, 10";
    case "pg": return n.length === 3 && todos(1, 9) && n[1]! >= 2 && n[2]! >= 3 && n[2]! <= 7 ? null : "Digite primeiro termo, razão (2 ou mais) e n (3 a 7). Ex.: 2, 3, 5";
    case "conj": return (n.length === 3 || n.length === 4) && todos(0, 9999) && n[2]! <= Math.min(n[0]!, n[1]!) && (n.length === 3 || n[3]! >= n[0]! + n[1]! - n[2]!) ? null : "Digite n(A), n(B), n(A∩B) e, se quiser, o total U. Ex.: 30, 25, 10, 60";
    case "prob": return n.length === 2 && todos(1, 9999) && n[0]! <= n[1]! && (100 * n[0]!) % n[1]! === 0 ? null : "Digite casos favoráveis e possíveis (porcentagem exata). Ex.: 3, 10";
    case "pfc": return (n.length === 2 || n.length === 3) && todos(1, 99) ? null : "Digite de 2 a 3 quantidades de escolhas, ex.: 3, 4, 2";
    case "perm": return n.length === 1 && n[0]! >= 2 && n[0]! <= 8 ? null : "Digite n (2 a 8), ex.: 5";
    case "arr": case "comb": return n.length === 2 && n[0]! <= 12 && n[1]! >= 2 && n[1]! < n[0]! && n[1]! <= 4 ? null : "Digite n e p (p de 2 a 4, menor que n), ex.: 7, 3";
    default: return undefined;
  }
}

const UNID: [string, string, number][] = [["km", "m", 1000], ["m", "cm", 100], ["L", "mL", 1000], ["h", "min", 60], ["kg", "g", 1000]];

export function montarMais(tipo: TipoEsqueleto, n: number[], larg: number, med: Medidor, alt: number): Esqueleto | null {
  const M = (titulo: string, resposta: string, blocos: Bloco[]): Esqueleto => montarLinhas(tipo, n, titulo, resposta, blocos, larg, med, alt);
  switch (tipo) {
    case "pot": {
      const [a, e] = [n[0]!, n[1]!], r = a ** e;
      return M(`${a}^${e}`, `${a}^${e} = ${r}`, [
        { linhas: [[`${a}^${e} = ?`]] },
        { passo: P("Multiplicação repetida", `O expoente (${e}) diz quantas vezes a base (${a}) aparece multiplicada por ela mesma. Escreva a multiplicação.`, `${a}^${e} = ${prodTxt(Array(e).fill(a))}: a base ${a} aparece ${e} vezes.`, `Escreva o ${a} ${e} vezes, separado por ×.`), linhas: [[`${a}^${e} = `, c(prodTxt(Array(e).fill(a)))]] },
        { passo: P("Calcule", "Faça as multiplicações da esquerda para a direita.", `${prodTxt(Array(e).fill(a))} = ${r}.`, "Multiplique dois a dois: o resultado da primeira vira o começo da próxima."), linhas: [["= ", c(r)]] },
      ]);
    }
    case "raiz": {
      const x = n[0]!, ps = primos(x), um = ps.filter((_, i) => i % 2 === 0), r = Math.sqrt(x);
      return M(`√${x}`, `√${x} = ${r}`, [
        { linhas: [[`√${x} = ?`]] },
        { passo: P("Fatore o número", `Decomponha ${x} em fatores primos (divida pelo menor primo, sempre).`, `${x} = ${prodTxt(ps)}.`, "Divida por 2, 3, 5, 7… até chegar em 1."), linhas: [[`${x} = `, c(prodTxt(ps))]] },
        { passo: P("Um de cada par", "Na raiz quadrada, cada PAR de fatores iguais vira um só fora da raiz. Escreva um fator de cada par.", `Cada par sai da raiz como um só: ${prodTxt(um)}.`, "Forme pares de fatores iguais e escreva só um de cada."), linhas: [[`√${x} = `, c(prodTxt(um))]] },
        { passo: P("Multiplique", "Multiplique os fatores que saíram.", `${prodTxt(um)} = ${r}. Teste: ${r} × ${r} = ${x}.`, "Multiplique os fatores um a um."), linhas: [["= ", c(r)]] },
      ]);
    }
    case "fat": {
      const x = n[0]!; const ps = primos(x); let cur = x;
      const bl: Bloco[] = [{ linhas: [[`Fatorar ${x}`]] }];
      ps.forEach((p, i) => { const nx = cur / p; bl.push({ passo: P(`Divisão ${i + 1}`, `Divida ${cur} pelo menor número primo que o divide. Escreva o primo e o resultado.`, `${cur} ÷ ${p} = ${nx}.`, "Teste os primos 2, 3, 5, 7… o primeiro que dividir é o certo."), linhas: [[`${cur} ÷ `, c(p), " = ", c(nx)]] }); cur = nx; });
      bl.push({ passo: P("Escreva a fatoração", "Junte todos os primos usados, multiplicando.", `${x} = ${prodTxt(ps)}.`, "São os primos que você usou nas divisões."), linhas: [[`${x} = `, c(prodTxt(ps))]] });
      return M(`Fatorar ${x}`, `${x} = ${prodTxt(ps)}`, bl);
    }
    case "expr": {
      const [a, b, cc, d] = n as [number, number, number, number], i = cc - d, m = b * i, r = a + m;
      return M(`${a} + ${b} × (${cc} - ${d})`, `${a} + ${b} × (${cc} - ${d}) = ${r}`, [
        { linhas: [[`${a} + ${b} × (${cc} - ${d})`], ["Ordem: ( ) , potências, × ÷ , + -"]] },
        { passo: P("Primeiro, o parêntese", "Sempre se resolve primeiro o que está dentro dos parênteses.", `${cc} − ${d} = ${i}.`, "Calcule só o que está entre ( )."), linhas: [[`(${cc} - ${d}) = `, c(i)]] },
        { passo: P("Depois, a multiplicação", "Multiplicação e divisão vêm antes da soma e da subtração.", `${b} × ${i} = ${m}.`, `Multiplique ${b} pelo resultado do parêntese.`), linhas: [[`${b} × ${i} = `, c(m)]] },
        { passo: P("Por último, a soma", "Agora some.", `${a} + ${m} = ${r}.`, "Some o que sobrou."), linhas: [[`${a} + ${m} = `, c(r)]] },
      ]);
    }
    case "fracm": {
      const [a, b, cc, d] = n as [number, number, number, number], nu = a * cc, de = b * d, g = gcd(nu, de);
      return M(`${a}/${b} × ${cc}/${d}`, `${a}/${b} × ${cc}/${d} = ${nu / g}/${de / g}`, [
        { linhas: [[fr([String(a)], [String(b)]), " × ", fr([String(cc)], [String(d)]), " = ?"]] },
        { passo: P("Multiplique em linha", "Multiplique numerador com numerador e denominador com denominador.", `${a} × ${cc} = ${nu} e ${b} × ${d} = ${de}.`, "Em cima com em cima, embaixo com embaixo."), linhas: [[fr([String(a)], [String(b)]), " × ", fr([String(cc)], [String(d)]), " = ", fr([c(nu)], [c(de)])]] },
        { passo: P("Simplifique", "Divida em cima e embaixo pelo maior número que divide os dois (se não der, repita).", g > 1 ? `${nu} ÷ ${g} = ${nu / g} e ${de} ÷ ${g} = ${de / g}.` : "Não há divisor comum: já está simplificada.", `Procure o maior divisor comum de ${nu} e ${de}.`), linhas: [[fr([String(nu)], [String(de)]), " = ", fr([c(nu / g)], [c(de / g)])]] },
      ]);
    }
    case "fracd": {
      const [a, b, cc, d] = n as [number, number, number, number], nu = a * d, de = b * cc, g = gcd(nu, de);
      return M(`${a}/${b} ÷ ${cc}/${d}`, `${a}/${b} ÷ ${cc}/${d} = ${nu / g}/${de / g}`, [
        { linhas: [[fr([String(a)], [String(b)]), " ÷ ", fr([String(cc)], [String(d)]), " = ?"]] },
        { passo: P("Inverta a segunda", "Na divisão de frações, copie a primeira, troque o ÷ por × e INVERTA a segunda fração.", `${cc}/${d} invertida vira ${d}/${cc}.`, "Inverter é trocar o numerador com o denominador."), linhas: [[fr([String(a)], [String(b)]), " × ", fr([c(d)], [c(cc)])]] },
        { passo: P("Multiplique", "Agora multiplique em linha: em cima com em cima e embaixo com embaixo.", `${a} × ${d} = ${nu} e ${b} × ${cc} = ${de}.`, "Em cima com em cima, embaixo com embaixo."), linhas: [[fr([c(nu)], [c(de)])]] },
        { passo: P("Simplifique", "Simplifique pelo maior divisor comum (se não der, repita).", g > 1 ? `${nu} ÷ ${g} = ${nu / g} e ${de} ÷ ${g} = ${de / g}.` : "Já está simplificada.", `Procure o maior divisor comum de ${nu} e ${de}.`), linhas: [[fr([String(nu)], [String(de)]), " = ", fr([c(nu / g)], [c(de / g)])]] },
      ]);
    }
    case "aumdesc": {
      const [pr, x, md] = n as [number, number, number], v = (pr * x) / 100, novo = md === 0 ? pr - v : pr + v, nome = md === 0 ? "desconto" : "acréscimo";
      return M(`${md === 0 ? "Desconto" : "Acréscimo"} de ${x}% em ${pr}`, `Novo valor = ${novo}`, [
        { linhas: [[`Preço: ${pr}`], [`${nome}: ${x}%`]] },
        { passo: P(`Valor do ${nome}`, `Calcule ${x}% de ${pr}: multiplique por ${x} e divida por 100.`, `${pr} × ${x} ÷ 100 = ${v}.`, "Porcentagem de um número: multiplique e divida por 100."), linhas: [[`${x}% de ${pr} = `, c(v)]] },
        { passo: P("Novo valor", md === 0 ? "Desconto SUBTRAI do preço." : "Acréscimo SOMA ao preço.", `${pr} ${md === 0 ? "−" : "+"} ${v} = ${novo}.`, md === 0 ? "Preço menos o desconto." : "Preço mais o acréscimo."), linhas: [[`${pr} ${md === 0 ? "-" : "+"} ${v} = `, c(novo)]] },
      ]);
    }
    case "razao": {
      const [t, a, b] = n as [number, number, number], s = a + b, k = t / s;
      return M(`Dividir ${t} em partes ${a} e ${b}`, `Partes: ${a * k} e ${b * k}`, [
        { linhas: [[`Dividir ${t} proporcional a ${a} e ${b}`]] },
        { passo: P("Some as partes", "Some as partes da proporção para saber em quantas partes iguais o total será dividido.", `${a} + ${b} = ${s} partes.`, "Some os dois números da proporção."), linhas: [[`${a} + ${b} = `, c(s)]] },
        { passo: P("Valor de cada parte", "Divida o total pela quantidade de partes.", `${t} ÷ ${s} = ${k}: cada parte vale ${k}.`, `Calcule ${t} ÷ ${s}.`), linhas: [[`${t} ÷ ${s} = `, c(k)]] },
        { passo: P("Valor de cada pessoa", `Multiplique o valor da parte (${k}) por ${a} e por ${b}.`, `${a} × ${k} = ${a * k} e ${b} × ${k} = ${b * k}. Teste: ${a * k} + ${b * k} = ${t}.`, `Multiplique ${k} por ${a} e depois por ${b}.`), linhas: [[`${a} × ${k} = `, c(a * k)], [`${b} × ${k} = `, c(b * k)]] },
      ]);
    }
    case "eq2": {
      const [r1, r2] = n as [number, number], S = r1 + r2, Pp = r1 * r2, dl = (r2 - r1) ** 2, sq = r2 - r1;
      return M(`x^2 - ${S}x + ${Pp} = 0`, `x' = ${r2} e x'' = ${r1}`, [
        { linhas: [[`x^2 - ${S}x + ${Pp} = 0`], ["ax^2 + bx + c = 0"]] },
        { passo: P("Identifique a, b e c", "Compare com ax² + bx + c = 0: a acompanha x², b acompanha x e c é o número sozinho (cuidado com os sinais).", `a = 1, b = −${S}, c = ${Pp}.`, "O sinal fica junto do número: b é negativo aqui."), linhas: [["a = ", c(1), "  b = ", c(`-${S}`), "  c = ", c(Pp)]] },
        { passo: P("Calcule o delta", "Use Δ = b² − 4·a·c.", `Δ = (−${S})² − 4·1·${Pp} = ${S * S} − ${4 * Pp} = ${dl}.`, "Eleve b ao quadrado (o sinal some) e subtraia 4·a·c."), linhas: [["Δ = b^2 - 4ac = ", c(dl)]] },
        { passo: P("Raiz do delta", "Tire a raiz quadrada de Δ.", `√${dl} = ${sq}.`, "Procure o número que multiplicado por ele mesmo dá Δ."), linhas: [[`√${dl} = `, c(sq)]] },
        { passo: P("Valores de x", `Use x = (−b ± √Δ) ÷ 2a. Como −b = ${S}: um x com + e outro com −.`, `x' = (${S} + ${sq}) ÷ 2 = ${r2} e x'' = (${S} − ${sq}) ÷ 2 = ${r1}.`, `Faça (${S} + ${sq}) ÷ 2 e (${S} − ${sq}) ÷ 2.`), linhas: [["x' = ", c(r2)], ["x'' = ", c(r1)]] },
      ]);
    }
    case "sistema": {
      const [x, y] = n as [number, number], S = x + y, D = x - y;
      return M(`x + y = ${S} ; x - y = ${D}`, `x = ${x}, y = ${y}`, [
        { linhas: [[`x + y = ${S}`], [`x - y = ${D}`]] },
        { passo: P("Some as equações", "Some as duas equações membro a membro: o y some (+y com −y).", `(x + x) + (y − y) = ${S} + ${D}, então 2x = ${S + D}.`, "Some só o que está à direita do igual."), linhas: [["2x = ", c(S + D)]] },
        { passo: P("Ache o x", "Divida os dois lados por 2.", `x = ${S + D} ÷ 2 = ${x}.`, `Calcule ${S + D} ÷ 2.`), linhas: [["x = ", c(x)]] },
        { passo: P("Ache o y", `Volte na primeira equação (x + y = ${S}) e troque o x pelo valor achado.`, `${x} + y = ${S}, logo y = ${S} − ${x} = ${y}.`, `Faça ${S} − ${x}.`), linhas: [[`y = ${S} - ${x} = `, c(y)]] },
      ]);
    }
    case "mediap": {
      const pares = Array.from({ length: n.length / 2 }, (_, i) => [n[2 * i]!, n[2 * i + 1]!] as [number, number]);
      const prods = pares.map(([v, p]) => v * p), soma = prods.reduce((s, x) => s + x, 0), pesos = pares.reduce((s, [, p]) => s + p, 0), m = arred(soma / pesos);
      return M(`Média ponderada ${pares.map(([v, p]) => `${v}(p${p})`).join(", ")}`, `Média = ${fmt(m)}`, [
        { linhas: pares.map(([v, p]) => [`valor ${v}, peso ${p}`]) },
        { passo: P("Valor × peso", "Multiplique cada valor pelo seu peso.", pares.map(([v, p]) => `${v} × ${p} = ${v * p}`).join("; ") + ".", "Cada valor vezes o peso dele."), linhas: pares.map(([v, p]) => [`${v} × ${p} = `, c(v * p)]) },
        { passo: P("Some os produtos", "Some todos os resultados.", `${prods.join(" + ")} = ${soma}.`, "Some os produtos que você achou."), linhas: [[`${prods.join(" + ")} = `, c(soma)]] },
        { passo: P("Some os pesos", "Some os pesos.", `${pares.map(([, p]) => p).join(" + ")} = ${pesos}.`, "Some só os pesos."), linhas: [[`${pares.map(([, p]) => p).join(" + ")} = `, c(pesos)]] },
        { passo: P("Divida", "Divida a soma dos produtos pela soma dos pesos.", `${soma} ÷ ${pesos} = ${fmt(m)}.`, `Calcule ${soma} ÷ ${pesos}.`), linhas: [[fr([String(soma)], [String(pesos)]), " = ", c(fmt(m))]] },
      ]);
    }
    case "mediana": {
      const o = [...n].sort((a, b) => a - b), k = o.length;
      const bl: Bloco[] = [
        { linhas: [[`Valores: ${n.join(", ")}`]] },
        { passo: P("Coloque em ordem", "A mediana exige os valores em ordem crescente. Escreva-os separados por vírgula.", `Em ordem: ${o.join(", ")}.`, "Do menor para o maior."), linhas: [[c(o.join(","))]] },
      ];
      let med = 0;
      if (k % 2) { med = o[(k - 1) / 2]!; bl.push({ passo: P("Posição do meio", `São ${k} valores (ímpar): a mediana é o do meio, na posição (${k} + 1) ÷ 2.`, `(${k} + 1) ÷ 2 = ${(k + 1) / 2}ª posição.`, `Calcule (${k} + 1) ÷ 2.`), linhas: [[`(${k}+1) ÷ 2 = `, c((k + 1) / 2)]] }, { passo: P("Mediana", "Pegue o valor que está nessa posição.", `A mediana é ${med}.`, "Conte da esquerda para a direita."), linhas: [["mediana = ", c(med)]] }); }
      else { const a = o[k / 2 - 1]!, b2 = o[k / 2]!; med = arred((a + b2) / 2); bl.push({ passo: P("Os dois do meio", `São ${k} valores (par): a mediana é a média dos dois do meio, nas posições ${k / 2} e ${k / 2 + 1}. Escreva a soma deles.`, `${a} + ${b2} = ${a + b2}.`, "Some os dois valores centrais."), linhas: [[`${a} + ${b2} = `, c(a + b2)]] }, { passo: P("Mediana", "Divida a soma por 2.", `${a + b2} ÷ 2 = ${fmt(med)}.`, "Divida por 2."), linhas: [["mediana = ", c(fmt(med))]] }); }
      return M(`Mediana de ${n.join(", ")}`, `Mediana = ${fmt(med)}`, bl);
    }
    case "juros": {
      const [C, i, t] = n as [number, number, number], J = (C * i * t) / 100;
      return M(`Juros simples: C=${C}, i=${i}%, t=${t}`, `Juros = ${J}; Montante = ${C + J}`, [
        { linhas: [[`C = ${C}   i = ${i}%   t = ${t}`], ["J = C × i × t"]] },
        { passo: P("Taxa como fração", `A taxa de ${i}% vira ${i}/100.`, `${i}% = ${i}/100.`, "Por cento é dividir por 100."), linhas: [[`${i}% = `, fr([c(i)], [c(100)])]] },
        { passo: P("Calcule os juros", "J = capital × taxa × tempo. Multiplique tudo e divida por 100.", `${C} × ${i} × ${t} ÷ 100 = ${J}.`, `Multiplique ${C} × ${i} × ${t} e corte dois zeros.`), linhas: [["J = ", c(J)]] },
        { passo: P("Montante", "Montante = capital + juros.", `${C} + ${J} = ${C + J}.`, "Some o capital e os juros."), linhas: [[`M = ${C} + ${J} = `, c(C + J)]] },
      ]);
    }
    case "jurosc": {
      const [C, i, t] = n as [number, number, number], f = arred(1 + i / 100), ft = arred(f ** t), Mn = arred(C * ft);
      return M(`Juros compostos: C=${C}, i=${i}%, t=${t}`, `Montante = ${fmt(Mn)}`, [
        { linhas: [[`C = ${C}   i = ${i}%   t = ${t}`], ["M = C × (1 + i)^t"]] },
        { passo: P("Fator de crescimento", `Calcule 1 + i, com i = ${i}/100 = ${fmt(i / 100)}.`, `1 + ${fmt(i / 100)} = ${fmt(f)}.`, "Some 1 à taxa em forma decimal."), linhas: [["1 + i = ", c(fmt(f))]] },
        { passo: P("Eleve ao tempo", `Eleve o fator ao tempo (${t}): multiplique ${t} vezes.`, `${fmt(f)}^${t} = ${fmt(ft)}.`, `Multiplique ${fmt(f)} por ele mesmo ${t} vezes.`), linhas: [[`${fmt(f)}^${t} = `, c(fmt(ft))]] },
        { passo: P("Montante", "M = capital × fator.", `${C} × ${fmt(ft)} = ${fmt(Mn)}.`, `Multiplique ${C} por ${fmt(ft)}.`), linhas: [["M = ", c(fmt(Mn))]] },
        { passo: P("Juros", "Juros = montante − capital.", `${fmt(Mn)} − ${C} = ${fmt(arred(Mn - C))}.`, "Tire o capital do montante."), linhas: [["J = ", c(fmt(arred(Mn - C)))]] },
      ]);
    }
    case "area": {
      const [b, h, t] = n as [number, number, number], r = t === 1 ? (b * h) / 2 : b * h;
      return M(`Área do ${t === 1 ? "triângulo" : "retângulo"} (base ${b}, altura ${h})`, `Área = ${r}`, [
        { linhas: [[`base = ${b}   altura = ${h}`], [t === 1 ? "A = (b × h) ÷ 2" : "A = b × h"]] },
        { passo: P("Multiplique base e altura", "Multiplique a base pela altura.", `${b} × ${h} = ${b * h}.`, `Calcule ${b} × ${h}.`), linhas: [[`${b} × ${h} = `, c(b * h)]] },
        ...(t === 1 ? [{ passo: P("Divida por 2", "A área do triângulo é a metade do retângulo: divida por 2.", `${b * h} ÷ 2 = ${r}.`, "Divida por 2."), linhas: [[`${b * h} ÷ 2 = `, c(r)]] }] : []),
      ]);
    }
    case "circ": {
      const r = n[0]!, Cc = arred(2 * 3.14 * r), A = arred(3.14 * r * r);
      return M(`Círculo de raio ${r} (π = 3,14)`, `C = ${fmt(Cc)}; A = ${fmt(A)}`, [
        { linhas: [[`r = ${r}   π = 3,14`], ["C = 2 × π × r   A = π × r^2"]] },
        { passo: P("Comprimento", "Comprimento da circunferência: C = 2 × π × r.", `2 × 3,14 × ${r} = ${fmt(Cc)}.`, `Calcule 2 × 3,14 × ${r}.`), linhas: [["C = ", c(fmt(Cc))]] },
        { passo: P("Raio ao quadrado", "Para a área, primeiro eleve o raio ao quadrado.", `${r}^2 = ${r * r}.`, `Multiplique ${r} por ${r}.`), linhas: [[`${r}^2 = `, c(r * r)]] },
        { passo: P("Área", "A = π × r².", `3,14 × ${r * r} = ${fmt(A)}.`, `Multiplique 3,14 por ${r * r}.`), linhas: [["A = ", c(fmt(A))]] },
      ]);
    }
    case "vol": {
      const [a, b, cc] = n as [number, number, number];
      return M(`Volume ${a} × ${b} × ${cc}`, `Volume = ${a * b * cc}`, [
        { linhas: [[`comprimento ${a}, largura ${b}, altura ${cc}`], ["V = c × l × h"]] },
        { passo: P("Área da base", "Multiplique comprimento por largura.", `${a} × ${b} = ${a * b}.`, `Calcule ${a} × ${b}.`), linhas: [[`${a} × ${b} = `, c(a * b)]] },
        { passo: P("Volume", "Multiplique a área da base pela altura.", `${a * b} × ${cc} = ${a * b * cc}.`, `Calcule ${a * b} × ${cc}.`), linhas: [[`${a * b} × ${cc} = `, c(a * b * cc)]] },
      ]);
    }
    case "pit": {
      const [a, b] = n as [number, number], s = a * a + b * b, h = Math.sqrt(s);
      return M(`Pitágoras: catetos ${a} e ${b}`, `Hipotenusa = ${h}`, [
        { linhas: [[`catetos ${a} e ${b}`], ["h^2 = a^2 + b^2"]] },
        { passo: P("Quadrado dos catetos", "Eleve cada cateto ao quadrado.", `${a}^2 = ${a * a} e ${b}^2 = ${b * b}.`, "Multiplique cada número por ele mesmo."), linhas: [[`${a}^2 = `, c(a * a)], [`${b}^2 = `, c(b * b)]] },
        { passo: P("Some", "A soma dos quadrados dos catetos é o quadrado da hipotenusa.", `${a * a} + ${b * b} = ${s}.`, "Some os dois quadrados."), linhas: [["h^2 = ", c(s)]] },
        { passo: P("Raiz", "Tire a raiz quadrada.", `√${s} = ${h}.`, "Qual número vezes ele mesmo dá esse valor?"), linhas: [["h = ", c(h)]] },
      ]);
    }
    case "vel": {
      const [d, t] = n as [number, number];
      return M(`Velocidade média: ${d} km em ${t} h`, `Velocidade = ${d / t} km/h`, [
        { linhas: [[`distância ${d} km, tempo ${t} h`], ["v = distância ÷ tempo"]] },
        { passo: P("Divida", "Velocidade média é a distância dividida pelo tempo.", `${d} ÷ ${t} = ${d / t} km/h.`, `Calcule ${d} ÷ ${t}.`), linhas: [[fr([String(d)], [String(t)]), " = ", c(d / t)]] },
      ]);
    }
    case "conv": {
      const [v, k] = n as [number, number], [de, para, f] = UNID[k - 1]!;
      return M(`Converter ${v} ${de} em ${para}`, `${v} ${de} = ${v * f} ${para}`, [
        { linhas: [[`${v} ${de} = ? ${para}`]] },
        { passo: P("Fator de conversão", `Quantos ${para} cabem em 1 ${de}? Escreva.`, `1 ${de} = ${f} ${para}.`, `Pense: 1 ${de} tem quantos ${para}?`), linhas: [[`1 ${de} = `, c(f), ` ${para}`]] },
        { passo: P("Multiplique", `Como ${de} → ${para} aumenta o número, multiplique pelo fator.`, `${v} × ${f} = ${v * f} ${para}.`, `Calcule ${v} × ${f}.`), linhas: [[`${v} × ${f} = `, c(v * f)]] },
      ]);
    }
    case "pa": {
      const [a1, r, k] = n as [number, number, number], an = a1 + (k - 1) * r, S = ((a1 + an) * k) / 2;
      return M(`PA: a1=${a1}, r=${r}, n=${k}`, `a${k} = ${an}; S = ${S}`, [
        { linhas: [[`a1 = ${a1}   r = ${r}   n = ${k}`], ["an = a1 + (n-1)·r"]] },
        { passo: P("n − 1", "Calcule n − 1.", `${k} − 1 = ${k - 1}.`, "Tire 1 de n."), linhas: [[`${k} - 1 = `, c(k - 1)]] },
        { passo: P("Multiplique pela razão", "Multiplique (n − 1) pela razão.", `${k - 1} × ${r} = ${(k - 1) * r}.`, `Calcule ${k - 1} × ${r}.`), linhas: [[`${k - 1} × ${r} = `, c((k - 1) * r)]] },
        { passo: P("Último termo", "Some o primeiro termo.", `${a1} + ${(k - 1) * r} = ${an}.`, "Some a1 ao resultado."), linhas: [[`a${k} = ${a1} + ${(k - 1) * r} = `, c(an)]] },
        { passo: P("Soma da PA: a1 + an", "Para a soma dos termos, some o primeiro e o último.", `${a1} + ${an} = ${a1 + an}.`, "Some a1 e an."), linhas: [[`${a1} + ${an} = `, c(a1 + an)]] },
        { passo: P("Multiplique por n", "Multiplique pelo número de termos.", `${a1 + an} × ${k} = ${(a1 + an) * k}.`, `Calcule ${a1 + an} × ${k}.`), linhas: [[`${a1 + an} × ${k} = `, c((a1 + an) * k)]] },
        { passo: P("Divida por 2", "Divida por 2: é a soma dos termos.", `${(a1 + an) * k} ÷ 2 = ${S}.`, "Divida por 2."), linhas: [["S = ", c(S)]] },
      ]);
    }
    case "pg": {
      const [a1, q, k] = n as [number, number, number], pot = q ** (k - 1), an = a1 * pot;
      return M(`PG: a1=${a1}, q=${q}, n=${k}`, `a${k} = ${an}`, [
        { linhas: [[`a1 = ${a1}   q = ${q}   n = ${k}`], ["an = a1 · q^(n-1)"]] },
        { passo: P("Expoente", "O expoente é n − 1.", `${k} − 1 = ${k - 1}.`, "Tire 1 de n."), linhas: [[`${k} - 1 = `, c(k - 1)]] },
        { passo: P("Potência da razão", `Calcule ${q}^${k - 1}.`, `${q}^${k - 1} = ${prodTxt(Array(k - 1).fill(q))} = ${pot}.`, `Multiplique ${q} por ele mesmo ${k - 1} vezes.`), linhas: [[`${q}^${k - 1} = `, c(pot)]] },
        { passo: P("Termo", "Multiplique pelo primeiro termo.", `${a1} × ${pot} = ${an}.`, `Calcule ${a1} × ${pot}.`), linhas: [[`a${k} = ${a1} × ${pot} = `, c(an)]] },
      ]);
    }
    case "conj": {
      const [a, b, i] = n as [number, number, number], U = n.length === 4 ? n[3]! : null, sa = a - i, sb = b - i, un = sa + sb + i;
      const bl: Bloco[] = [
        { linhas: [[`n(A) = ${a}   n(B) = ${b}   n(A∩B) = ${i}`, ...(U !== null ? [`   total = ${U}`] : [])]] },
        { passo: P("Só A", "Quem está só em A é n(A) menos a interseção.", `${a} − ${i} = ${sa}.`, "Tire a interseção de A."), linhas: [[`só A = ${a} - ${i} = `, c(sa)]] },
        { passo: P("Só B", "Quem está só em B é n(B) menos a interseção.", `${b} − ${i} = ${sb}.`, "Tire a interseção de B."), linhas: [[`só B = ${b} - ${i} = `, c(sb)]] },
        { passo: P("União", "A união é só A + só B + interseção (a interseção é contada UMA vez).", `${sa} + ${sb} + ${i} = ${un}. (Ou ${a} + ${b} − ${i}.)`, "Some as três regiões do diagrama."), linhas: [[`n(A∪B) = ${sa} + ${sb} + ${i} = `, c(un)]] },
      ];
      if (U !== null) bl.push({ passo: P("Fora dos dois", "Quem não está em A nem em B é o total menos a união.", `${U} − ${un} = ${U - un}.`, "Tire a união do total."), linhas: [[`fora = ${U} - ${un} = `, c(U - un)]] });
      return M(`Conjuntos: A=${a}, B=${b}, A∩B=${i}`, `União = ${un}${U !== null ? `; fora = ${U - un}` : ""}`, bl);
    }
    case "prob": {
      const [f, t] = n as [number, number], g = gcd(f, t), pct = (100 * f) / t;
      return M(`Probabilidade ${f}/${t}`, `P = ${f / g}/${t / g} = ${pct}%`, [
        { linhas: [[`casos favoráveis = ${f}`], [`casos possíveis = ${t}`]] },
        { passo: P("Monte a fração", "Probabilidade = casos favoráveis ÷ casos possíveis. Escreva a fração.", `P = ${f}/${t}.`, "Em cima os favoráveis; embaixo os possíveis."), linhas: [["P = ", fr([c(f)], [c(t)])]] },
        { passo: P("Simplifique", "Simplifique dividindo em cima e embaixo pelo maior divisor comum.", g > 1 ? `${f} ÷ ${g} = ${f / g} e ${t} ÷ ${g} = ${t / g}.` : "Já está simplificada.", `Procure o maior divisor comum de ${f} e ${t}.`), linhas: [["P = ", fr([c(f / g)], [c(t / g)])]] },
        { passo: P("Em porcentagem", "Multiplique por 100 para ver em porcentagem.", `${f} ÷ ${t} × 100 = ${pct}%.`, `Calcule ${f} × 100 ÷ ${t}.`), linhas: [["P = ", c(pct), "%"]] },
      ]);
    }
    case "pfc": {
      const total = prod(n);
      const bl: Bloco[] = [{ linhas: [[`Escolhas: ${n.join(", ")}`]] }];
      if (n.length === 3) {
        bl.push({ passo: P("Primeiras escolhas", "Princípio fundamental da contagem: multiplique as possibilidades de cada etapa. Comece pelas duas primeiras.", `${n[0]} × ${n[1]} = ${n[0]! * n[1]!}.`, "Multiplique as duas primeiras quantidades."), linhas: [[`${n[0]} × ${n[1]} = `, c(n[0]! * n[1]!)]] },
          { passo: P("Total", "Multiplique pela última quantidade.", `${n[0]! * n[1]!} × ${n[2]} = ${total}.`, "Multiplique pelo que faltou."), linhas: [[`${n[0]! * n[1]!} × ${n[2]} = `, c(total)]] });
      } else {
        bl.push({ passo: P("Total", "Princípio fundamental da contagem: multiplique as possibilidades de cada etapa.", `${n[0]} × ${n[1]} = ${total}.`, "Multiplique as duas quantidades."), linhas: [[`${n[0]} × ${n[1]} = `, c(total)]] });
      }
      return M(`Contagem: ${n.join(" × ")}`, `Total = ${total}`, bl);
    }
    case "perm": {
      const k = n[0]!, ts = termos(k, k);
      return M(`${k}! (permutação)`, `${k}! = ${fatorial(k)}`, [
        { linhas: [[`P(${k}) = ${k}!`]] },
        { passo: P("Desenvolva o fatorial", `${k}! é ${k} vezes cada número menor, até 1.`, `${k}! = ${prodTxt(ts)}.`, `Comece em ${k} e vá diminuindo 1 até chegar em 1.`), linhas: [[`${k}! = `, c(prodTxt(ts))]] },
        { passo: P("Calcule", "Multiplique tudo.", `${prodTxt(ts)} = ${fatorial(k)}.`, "Multiplique da esquerda para a direita."), linhas: [["= ", c(fatorial(k))]] },
      ]);
    }
    case "arr": {
      const [k, p] = n as [number, number], ts = termos(k, p), r = prod(ts);
      return M(`A(${k},${p}) arranjo`, `A(${k},${p}) = ${r}`, [
        { linhas: [[`A(${k},${p}) = ${k}! ÷ (${k}-${p})!`]] },
        { passo: P("Termos", `No arranjo, multiplique ${p} números começando em ${k} e diminuindo 1 a cada passo (a ordem importa).`, `${prodTxt(ts)}.`, `Comece em ${k} e escreva ${p} números, diminuindo 1.`), linhas: [[`A(${k},${p}) = `, c(prodTxt(ts))]] },
        { passo: P("Calcule", "Multiplique.", `${prodTxt(ts)} = ${r}.`, "Multiplique da esquerda para a direita."), linhas: [["= ", c(r)]] },
      ]);
    }
    case "comb": {
      const [k, p] = n as [number, number], ts = termos(k, p), den = termos(p, p), r = prod(ts) / prod(den);
      return M(`C(${k},${p}) combinação`, `C(${k},${p}) = ${r}`, [
        { linhas: [[`C(${k},${p}) = ${k}! ÷ (${p}! × (${k}-${p})!)`]] },
        { passo: P("n − p", "Calcule n − p.", `${k} − ${p} = ${k - p}.`, "Subtraia."), linhas: [[`${k} - ${p} = `, c(k - p)]] },
        { passo: P("Em cima", `Em cima, multiplique ${p} números começando em ${k} e diminuindo 1 (o resto do ${k}! cancela com o ${k - p}!).`, `${prodTxt(ts)}.`, `Escreva ${p} números a partir de ${k}.`), linhas: [["em cima: ", c(prodTxt(ts))]] },
        { passo: P("Embaixo", `Embaixo fica ${p}! (a ordem não importa, por isso divide).`, `${p}! = ${prodTxt(den)}.`, `${p}! é ${p} vezes cada número menor até 1.`), linhas: [["embaixo: ", c(prodTxt(den))]] },
        { passo: P("Divida", "Calcule o de cima e o de baixo e divida.", `${prod(ts)} ÷ ${prod(den)} = ${r}.`, "Calcule cada produto e divida."), linhas: [["C = ", c(r)]] },
      ]);
    }
    default: return null;
  }
}
void digitos;
