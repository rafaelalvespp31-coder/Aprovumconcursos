/**
 * Expressões numéricas, equações de 1º e 2º grau e radiciação, resolvidas linha a linha como no caderno.
 * Aritmética exata (frações) para nunca inventar resultado. Puro.
 */
import { L, P, fr, frAdd, frDe, frDec, frDiv, frMul, frSub, frTxt, frVal, mdc, nf, sup, type CadernoLinhas, type Fr, type LinhaCaderno, type Parte } from "./calc-tipos";

// ───────────────────────── expressões numéricas ─────────────────────────
type Tok = { k: "n"; v: Fr; hi?: boolean } | { k: "o"; o: "+" | "-" | "*" | "/" | "^" } | { k: "(" } | { k: ")" };
const SIM: Record<string, string> = { "+": "+", "-": "−", "*": "×", "/": "÷", "^": "^" };

function tokenizar(src: string): Tok[] | null {
  const s = src.replace(/\s+/g, "").replace(/[x×X]/g, "*").replace(/[÷:]/g, "/").replace(/[−–]/g, "-").replace(/,/g, ".");
  const brutos: Tok[] = [];
  const re = /(\d+(?:\.\d+)?)|([()+\-*/^])/y;
  let i = 0;
  while (i < s.length) {
    re.lastIndex = i;
    const m = re.exec(s);
    if (!m) return null;
    i = re.lastIndex;
    if (m[1] !== undefined) { const v = frDe(m[1]); if (!v) return null; brutos.push({ k: "n", v }); }
    else { const ch = m[2]!; brutos.push(ch === "(" ? { k: "(" } : ch === ")" ? { k: ")" } : { k: "o", o: ch as "+" }); }
  }
  const out: Tok[] = [];
  for (let j = 0; j < brutos.length; j++) {
    const t = brutos[j]!, prev = out[out.length - 1], nx = brutos[j + 1];
    if (t.k === "o" && t.o === "-" && (!prev || prev.k === "(" || prev.k === "o") && nx?.k === "n") { out.push({ k: "n", v: fr(-nx.v.n, nx.v.d) }); j++; }
    else out.push(t);
  }
  return out;
}

const mostrarNum = (v: Fr) => frTxt(v);
function imprimir(t: Tok[]): Parte[] {
  const partes: Parte[] = [];
  for (let i = 0; i < t.length; i++) {
    const x = t[i]!;
    if (x.k === "(") partes.push(P("("));
    else if (x.k === ")") partes.push(P(")"));
    else if (x.k === "o") partes.push(P(SIM[x.o]!, { dim: true }));
    else {
      const prev = t[i - 1];
      const neg = x.v.n < 0 && prev?.k === "o";
      const op = t[i + 1], ex = t[i + 2];
      if (op?.k === "o" && op.o === "^" && ex?.k === "n" && ex.v.d === 1 && ex.v.n >= 0 && ex.v.n < 100) {
        const base = mostrarNum(x.v);
        partes.push(P(`${x.v.n < 0 || x.v.d !== 1 ? `(${base})` : base}${sup(ex.v.n)}`, { dest: x.hi || ex.hi }));
        i += 2;
        continue;
      }
      partes.push(P(neg ? `(${mostrarNum(x.v)})` : mostrarNum(x.v), { dest: x.hi }));
    }
  }
  return partes;
}

function aplicar(a: Fr, o: string, b: Fr): Fr | null {
  switch (o) {
    case "+": return frAdd(a, b);
    case "-": return frSub(a, b);
    case "*": return frMul(a, b);
    case "/": return frDiv(a, b);
    case "^": {
      if (b.d !== 1 || b.n < 0 || b.n > 12) return null;
      let r = fr(1);
      for (let i = 0; i < b.n; i++) r = frMul(r, a);
      return Number.isSafeInteger(r.n) && Number.isSafeInteger(r.d) ? r : null;
    }
  }
  return null;
}

export function expressao(src: string): CadernoLinhas | null {
  const t = tokenizar(src);
  if (!t || t.length < 3 || t.length > 40) return null;
  const abre = t.filter((x) => x.k === "(").length, fecha = t.filter((x) => x.k === ")").length;
  if (abre !== fecha) return null;
  const titulo = imprimir(t).map((x) => x.t).join(" ").replace(/\( /g, "(").replace(/ \)/g, ")");
  const passos = ["Antes de calcular, lembre a ordem: 1º parênteses; 2º potências; 3º multiplicação e divisão, da esquerda para a direita; 4º soma e subtração, da esquerda para a direita. Escrevemos a expressão como ela veio."];
  const linhas: LinhaCaderno[] = [{ p: 0, partes: imprimir(t) }];
  const vistos = new Set<string>();
  const limpar = () => { for (let i = 0; i < t!.length - 2; i++) { if (t![i]!.k === "(" && t![i + 1]!.k === "n" && t![i + 2]!.k === ")") t!.splice(i, 3, t![i + 1]!); } };
  limpar();
  for (let guard = 0; guard < 30; guard++) {
    if (t.length === 1 && t[0]!.k === "n") break;
    let lo = 0, hi = t.length, dentro = false;
    const r = t.findIndex((x) => x.k === ")");
    if (r >= 0) { lo = t.slice(0, r).map((x) => x.k).lastIndexOf("(") + 1; hi = r; dentro = true; }
    let best = -1, bp = 0;
    for (let i = lo; i < hi; i++) { const x = t[i]!; if (x.k === "o") { const p = x.o === "^" ? 3 : x.o === "*" || x.o === "/" ? 2 : 1; if (p > bp || (p === bp && x.o === "^")) { bp = p; best = i; } } }
    if (best < 1) return null;
    const A = t[best - 1], O = t[best] as { k: "o"; o: string }, B = t[best + 1];
    if (A?.k !== "n" || B?.k !== "n" || best + 1 >= hi) return null;
    const res = aplicar(A.v, O.o, B.v);
    if (!res) return null;
    const cat = O.o === "^" ? "pot" : O.o === "*" || O.o === "/" ? "md" : "as";
    const chave = (dentro ? "p" : "") + cat;
    const rot = vistos.has(chave) ? "Continuando: " : dentro ? "Primeiro, o que está dentro dos parênteses: " : cat === "pot" ? "Agora a potência: " : cat === "md" ? "Agora multiplicação e divisão, da esquerda para a direita: " : "Por último, soma e subtração, da esquerda para a direita: ";
    vistos.add(chave);
    const a = frTxt(A.v), b = frTxt(B.v);
    passos.push(`${rot}${A.v.n < 0 ? `(${a})` : a} ${SIM[O.o]} ${B.v.n < 0 ? `(${b})` : b} = ${frTxt(res)}.${res.d !== 1 ? ` (≈ ${frDec(res)})` : ""}`);
    t.splice(best - 1, 3, { k: "n", v: res, hi: true });
    t.forEach((x, i) => { if (x.k === "n" && x.hi && i !== best - 1) delete x.hi; });
    limpar();
    linhas.push({ p: passos.length - 1, partes: [P("=", { dim: true }), ...imprimir(t)] });
  }
  if (!(t.length === 1 && t[0]!.k === "n")) return null;
  const v = t[0]!.v;
  return { titulo, passos, resultado: `${titulo} = ${frTxt(v)}${v.d !== 1 ? ` (≈ ${frDec(v)})` : ""}`, linhas };
}

// ───────────────────────── equação do 1º grau ─────────────────────────
function lado(txt: string): { a: Fr; b: Fr } | null {
  const t = txt.replace(/\s+/g, "").replace(/[−–]/g, "-").replace(/,/g, ".").replace(/[×*]/g, "");
  if (!t) return null;
  const re = /([+-]?)(\d+(?:\.\d+)?)?(x)?/y;
  let a = fr(0), b = fr(0), i = 0;
  while (i < t.length) {
    re.lastIndex = i;
    const m = re.exec(t);
    if (!m || re.lastIndex === i || (m[2] === undefined && m[3] === undefined)) return null;
    i = re.lastIndex;
    const v = m[2] !== undefined ? frDe(m[2]) : fr(1);
    if (!v) return null;
    const sv = m[1] === "-" ? fr(-v.n, v.d) : v;
    if (m[3]) a = frAdd(a, sv); else b = frAdd(b, sv);
  }
  return { a, b };
}
const coef = (a: Fr) => (a.n === 1 && a.d === 1 ? "" : a.n === -1 && a.d === 1 ? "−" : a.d === 1 ? frTxt(a) : `(${frTxt(a)})`);
function termos(itens: { v: Fr; x?: boolean }[]): string {
  const vivos = itens.filter((i) => i.v.n !== 0);
  if (!vivos.length) return "0";
  return vivos.map((it, k) => {
    const neg = it.v.n < 0;
    const abs = fr(Math.abs(it.v.n), it.v.d);
    const corpo = it.x ? `${coef(abs)}x` : frTxt(abs);
    return k === 0 ? `${neg ? "−" : ""}${it.x && !neg ? coef(it.v) + "x" : it.x ? corpo : frTxt(it.v)}` : `${neg ? "−" : "+"} ${corpo}`;
  }).join(" ").replace(/^−(?=\()/, "−");
}

export function equacao1(src: string): CadernoLinhas | null {
  const partes = src.split("=");
  if (partes.length !== 2) return null;
  const E = lado(partes[0]!), D = lado(partes[1]!);
  if (!E || !D || (E.a.n === 0 && D.a.n === 0)) return null;
  const orig = `${termos([{ v: E.a, x: true }, { v: E.b }])} = ${termos([{ v: D.a, x: true }, { v: D.b }])}`;
  const passos = ["Escrevemos a equação. O objetivo é descobrir o valor de x: vamos deixar o x sozinho de um lado da igualdade."];
  const linhas: LinhaCaderno[] = [L(0, orig)];
  const mover = D.a.n !== 0 || E.b.n !== 0;
  if (mover) {
    passos.push("Letras de um lado, números do outro. Quando um termo muda de lado da igualdade, ele troca de sinal: o que somava passa subtraindo e o que subtraía passa somando.");
    linhas.push(L(1, "=", `${termos([{ v: E.a, x: true }, { v: fr(-D.a.n, D.a.d), x: true }])} = ${termos([{ v: D.b }, { v: fr(-E.b.n, E.b.d) }])}`));
  }
  const A = frSub(E.a, D.a), B = frSub(D.b, E.b);
  const eq2 = `${coef(A)}x = ${frTxt(B)}`;
  passos.push(`Agora fazemos as contas de cada lado: ${frTxt(E.a)}x ${D.a.n ? `− ${frTxt(D.a)}x ` : ""}= ${coef(A) || "1"}x${A.n === 0 ? " (o x some)" : ""} e ${frTxt(D.b)}${E.b.n ? ` − ${E.b.n < 0 ? `(${frTxt(E.b)})` : frTxt(E.b)}` : ""} = ${frTxt(B)}.`);
  linhas.push(L(passos.length - 1, "=", eq2));
  if (A.n === 0) {
    const infinitas = B.n === 0;
    passos.push(infinitas ? "Ficou 0 = 0: a igualdade é sempre verdadeira, qualquer valor de x serve." : "Ficou 0 = um número diferente de zero: isso é impossível, então a equação não tem solução.");
    linhas.push(L(passos.length - 1, "=", infinitas ? "0 = 0" : `0 = ${frTxt(B)}`));
    return { titulo: orig, passos, resultado: infinitas ? `${orig}: infinitas soluções` : `${orig}: sem solução`, linhas };
  }
  const sol = frDiv(B, A)!;
  if (!(A.n === 1 && A.d === 1)) {
    passos.push(`O ${frTxt(A)} está multiplicando o x. Para deixar o x sozinho, ele passa para o outro lado dividindo.`);
    linhas.push(L(passos.length - 1, "=", `x = ${frTxt(B)} ÷ ${A.n < 0 || A.d !== 1 ? `(${frTxt(A)})` : frTxt(A)}`));
  }
  passos.push(`Dividindo, encontramos x = ${frTxt(sol)}${sol.d !== 1 ? ` (≈ ${frDec(sol)})` : ""}.`);
  linhas.push(L(passos.length - 1, "=", P(`x = ${frTxt(sol)}`, { dest: true })));
  const le = frAdd(frMul(E.a, sol), E.b), ld = frAdd(frMul(D.a, sol), D.b);
  passos.push(`Conferindo: trocando x por ${frTxt(sol)}, o lado esquerdo dá ${frTxt(le)} e o direito dá ${frTxt(ld)}. ${le.n === ld.n && le.d === ld.d ? "São iguais: a resposta está certa." : ""}`);
  linhas.push(L(passos.length - 1, P("Conferindo:", { dim: true }), `${frTxt(le)} = ${frTxt(ld)}`, P(le.n === ld.n && le.d === ld.d ? "✓" : "✗", { dest: true })));
  return { titulo: orig, passos, resultado: `x = ${frTxt(sol)}${sol.d !== 1 ? ` (≈ ${frDec(sol)})` : ""}`, linhas };
}

// ───────────────────────── equação do 2º grau (Bhaskara) ─────────────────────────
const int = (n: number) => nf(n, 0);
const ehQuad = (n: number) => n >= 0 && Number.isInteger(Math.sqrt(n));
export function equacao2(a: number, b: number, c: number): CadernoLinhas | null {
  if (![a, b, c].every((x) => Number.isInteger(x) && Math.abs(x) <= 1000) || a === 0) return null;
  const x2 = a === 1 ? "x²" : a === -1 ? "−x²" : `${int(a)}x²`;
  const x1 = b === 0 ? "" : ` ${b < 0 ? "−" : "+"} ${Math.abs(b) === 1 ? "" : int(Math.abs(b))}x`;
  const x0 = c === 0 ? "" : ` ${c < 0 ? "−" : "+"} ${int(Math.abs(c))}`;
  const orig = `${x2}${x1}${x0} = 0`;
  const passos = ["Escrevemos a equação do 2º grau na forma ax² + bx + c = 0."];
  const linhas: LinhaCaderno[] = [L(0, orig)];
  passos.push("Primeiro identificamos os coeficientes: a é o número que acompanha x², b acompanha x e c é o número sozinho (com o sinal de cada um).");
  linhas.push(L(1, P(`a = ${int(a)}`, { cel: true }), P(`b = ${int(b)}`, { cel: true }), P(`c = ${int(c)}`, { cel: true })));
  const delta = b * b - 4 * a * c;
  const pb = b < 0 ? `(${int(b)})` : int(b);
  passos.push("Calculamos o discriminante, Δ (delta), com a fórmula Δ = b² − 4 · a · c.");
  linhas.push(L(2, "Δ = b² − 4 · a · c"));
  passos.push("Trocamos as letras pelos números, com cuidado com os sinais.");
  linhas.push(L(3, "Δ =", `${pb}² − 4 · ${a < 0 ? `(${int(a)})` : int(a)} · ${c < 0 ? `(${int(c)})` : int(c)}`));
  passos.push(`Resolvemos: ${int(b * b)} − ${4 * a * c < 0 ? `(${int(4 * a * c)})` : int(4 * a * c)} = ${int(delta)}.`);
  linhas.push(L(4, "Δ =", `${int(b * b)} ${4 * a * c < 0 ? "+" : "−"} ${int(Math.abs(4 * a * c))}`), L(4, "Δ =", P(int(delta), { dest: true })));
  if (delta < 0) {
    passos.push("Δ é negativo: não existe raiz quadrada de número negativo nos números reais. Então a equação não tem raízes reais.");
    linhas.push(L(5, P("Δ < 0 → sem raízes reais", { dest: true })));
    return { titulo: orig, passos, resultado: `${orig}: Δ = ${int(delta)} (sem raízes reais)`, linhas };
  }
  passos.push(delta === 0 ? "Δ = 0: a equação tem uma única raiz (duas iguais). Usamos a fórmula de Bhaskara: x = (−b ± √Δ) ÷ 2a." : "Δ é positivo: temos duas raízes diferentes. Usamos a fórmula de Bhaskara: x = (−b ± √Δ) ÷ 2a.");
  linhas.push(L(5, "x = (−b ± √Δ) ÷ 2a"));
  const mb = -b;
  const s = Math.sqrt(delta);
  if (ehQuad(delta)) {
    passos.push(`Substituindo: −b = ${int(mb)}, √${int(delta)} = ${int(s)} e 2a = ${int(2 * a)}.`);
    linhas.push(L(6, "x =", `(${int(mb)} ± ${int(s)}) ÷ ${a * 2 < 0 ? `(${int(2 * a)})` : int(2 * a)}`));
    const x1v = fr(mb + s, 2 * a), x2v = fr(mb - s, 2 * a);
    passos.push(`Raiz com o sinal de +: (${int(mb)} + ${int(s)}) ÷ ${int(2 * a)} = ${frTxt(x1v)}. Raiz com o sinal de −: (${int(mb)} − ${int(s)}) ÷ ${int(2 * a)} = ${frTxt(x2v)}.`);
    linhas.push(L(7, "x′ =", `(${int(mb)} + ${int(s)}) ÷ ${int(2 * a)} =`, P(frTxt(x1v), { dest: true })));
    if (delta > 0) linhas.push(L(7, "x″ =", `(${int(mb)} − ${int(s)}) ÷ ${int(2 * a)} =`, P(frTxt(x2v), { dest: true })));
    const soma = frAdd(x1v, x2v), prod = frMul(x1v, x2v);
    passos.push(`Conferindo: a soma das raízes deve ser −b÷a = ${frTxt(fr(mb, a))} e o produto c÷a = ${frTxt(fr(c, a))}. Aqui a soma é ${frTxt(soma)} e o produto é ${frTxt(prod)}.`);
    linhas.push(L(8, P("Conferindo:", { dim: true }), `soma = ${frTxt(soma)}`, `produto = ${frTxt(prod)}`, P("✓", { dest: true })));
    const res = delta === 0 ? `x = ${frTxt(x1v)}` : `x′ = ${frTxt(x1v)} e x″ = ${frTxt(x2v)}`;
    return { titulo: orig, passos, resultado: res, linhas };
  }
  passos.push(`√${int(delta)} não é exata. Usamos o valor aproximado: √${int(delta)} ≈ ${nf(s, 3)}.`);
  linhas.push(L(6, "x =", `(${int(mb)} ± √${int(delta)}) ÷ ${int(2 * a)}`), L(6, `√${int(delta)} ≈ ${nf(s, 3)}`));
  const r1 = (mb + s) / (2 * a), r2 = (mb - s) / (2 * a);
  passos.push(`Com o +: (${int(mb)} + ${nf(s, 3)}) ÷ ${int(2 * a)} ≈ ${nf(r1, 3)}. Com o −: (${int(mb)} − ${nf(s, 3)}) ÷ ${int(2 * a)} ≈ ${nf(r2, 3)}.`);
  linhas.push(L(7, "x′ ≈", P(nf(r1, 3), { dest: true })), L(7, "x″ ≈", P(nf(r2, 3), { dest: true })));
  return { titulo: orig, passos, resultado: `x′ ≈ ${nf(r1, 3)} e x″ ≈ ${nf(r2, 3)}`, linhas };
}

// ───────────────────────── radiciação ─────────────────────────
export function raiz(indice: number, n: number): CadernoLinhas | null {
  if (!Number.isInteger(indice) || indice < 2 || indice > 5 || !Number.isInteger(n) || n < 1 || n > 1e9) return null;
  const rad = (c: string) => `${indice === 2 ? "" : sup(indice)}√${/^\d+$/.test(c) ? c : `(${c})`}`;
  const passos = [`Vamos tirar a raiz${indice === 2 ? " quadrada" : indice === 3 ? " cúbica" : ` de índice ${indice}`} de ${nf(n, 0)}. O jeito mais seguro é fatorar: dividir pelo menor número primo possível, várias vezes, até chegar a 1.`];
  const linhas: LinhaCaderno[] = [L(0, P(nf(n, 0), { cel: true }))];
  const fatores: number[] = [];
  let cur = n;
  for (let p = 2; cur > 1; p += p === 2 ? 1 : 2) {
    if (p * p > cur) { fatores.push(cur); passos.push(`${nf(cur, 0)} já é primo. Dividimos por ele mesmo.`); linhas.push(L(passos.length - 1, P(nf(cur, 0), { cel: true }), P("│", { dim: true }), P(nf(cur, 0), { dest: true }))); cur = 1; linhas.push(L(passos.length - 1, P("1", { cel: true }))); break; }
    while (cur % p === 0) {
      passos.push(`${nf(cur, 0)} ÷ ${p} = ${nf(cur / p, 0)}.`);
      linhas.push(L(passos.length - 1, P(nf(cur / p, 0), { cel: true }), P("│", { dim: true }), P(String(p), { dest: true })));
      fatores.push(p);
      cur /= p;
    }
  }
  if (n === 1) { return { titulo: rad("1"), passos: ["A raiz de 1 é 1, porque 1 multiplicado por ele mesmo dá 1."], resultado: `${rad("1")} = 1`, linhas: [L(0, `${rad("1")} = 1`)] }; }
  const exp = new Map<number, number>();
  fatores.forEach((f) => exp.set(f, (exp.get(f) ?? 0) + 1));
  const listaX = fatores.join(" × ");
  const pot = [...exp.entries()].map(([p, e]) => (e === 1 ? `${p}` : `${p}${sup(e)}`)).join(" × ");
  passos.push("Escrevemos o número como produto dos primos que saíram na coluna da direita e juntamos os iguais em potências.");
  linhas.push(L(passos.length - 1, `${nf(n, 0)} = ${listaX}`), L(passos.length - 1, `${nf(n, 0)} = ${pot}`));
  passos.push(`Colocamos tudo dentro da raiz. Na raiz de índice ${indice}, a cada ${indice} fatores iguais, um deles pode sair da raiz.`);
  linhas.push(L(passos.length - 1, `${rad(String(n))} = ${rad(pot)}`));
  let fora = 1, dentro = 1;
  const exFora: string[] = [], exDentro: string[] = [];
  exp.forEach((e, p) => {
    const sai = Math.floor(e / indice), fica = e % indice;
    if (sai) { fora *= p ** sai; exFora.push(sai === 1 ? `${p}` : `${p}${sup(sai)}`); }
    if (fica) { dentro *= p ** fica; exDentro.push(fica === 1 ? `${p}` : `${p}${sup(fica)}`); }
  });
  passos.push(`Dividimos cada expoente por ${indice}: o quociente é quanto sai da raiz e o resto é quanto fica dentro.`);
  linhas.push(L(passos.length - 1, "=", `${exFora.join(" × ") || "1"}${dentro > 1 ? ` × ${rad(exDentro.join(" × "))}` : ""}`));
  const res = dentro === 1 ? `${nf(fora, 0)}` : `${fora > 1 ? nf(fora, 0) : ""}${rad(String(dentro))}`;
  passos.push(dentro === 1 ? `Fazemos a multiplicação: ${exFora.join(" × ")} = ${nf(fora, 0)}. A raiz é exata.` : `Multiplicamos o que saiu: ${nf(fora, 0)}. O ${dentro} não tem como sair: a raiz não é exata e fica ${res}. Valor aproximado: ${nf(Math.pow(n, 1 / indice), 3)}.`);
  linhas.push(L(passos.length - 1, "=", P(res, { dest: true })));
  return { titulo: rad(String(n)), passos, resultado: `${rad(String(n))} = ${res}${dentro === 1 ? "" : ` ≈ ${nf(Math.pow(n, 1 / indice), 3)}`}`, linhas };
}

export const _int = { mdc, frVal };
