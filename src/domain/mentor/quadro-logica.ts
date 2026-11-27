/** Lógica proposicional: fórmulas, valores, tabelas-verdade, negação e equivalências (usado nos esqueletos de Raciocínio Lógico). */
export type F = { k: "v"; n: string } | { k: "not"; a: F } | { k: "and" | "or" | "xor" | "imp" | "bi"; a: F; b: F };

export const OPS = { and: "∧", or: "∨", xor: "⊻", imp: "→", bi: "↔" } as const;
export const v = (n: string): F => ({ k: "v", n });
export const nao = (a: F): F => ({ k: "not", a });
export const bin = (k: "and" | "or" | "xor" | "imp" | "bi", a: F, b: F): F => ({ k, a, b });

/** Lê a fórmula digitada. Aceita ~ ¬ ! ∧ ^ & ∨ | v ⊻ → -> ↔ <-> e parênteses. Variáveis: p q r s t u. */
export function parse(src: string): F | null {
  const t: string[] = [];
  const s = src.replace(/\s+/g, "");
  for (let i = 0; i < s.length; i++) {
    const ch = s[i]!;
    if (s.startsWith("<->", i) || s.startsWith("<=>", i)) { t.push("↔"); i += 2; }
    else if (s.startsWith("->", i)) { t.push("→"); i += 1; }
    else if ("~¬!".includes(ch)) t.push("~");
    else if ("∧^&".includes(ch)) t.push("∧");
    else if ("∨|".includes(ch) || ch === "v" || ch === "V") t.push("∨");
    else if ("⊻⊕".includes(ch)) t.push("⊻");
    else if (ch === "→" || ch === ">") t.push("→");
    else if (ch === "↔") t.push("↔");
    else if (ch === "(" || ch === ")") t.push(ch);
    else if (/[pqrstuPQRSTU]/.test(ch)) t.push(ch.toLowerCase());
    else return null;
  }
  let i = 0;
  const peek = () => t[i];
  const atom = (): F | null => {
    const x = t[i++];
    if (x === undefined) return null;
    if (x === "~") { const a = atom(); return a && nao(a); }
    if (x === "(") { const e = bi(); if (!e || t[i++] !== ")") return null; return e; }
    return /^[pqrstu]$/.test(x) ? v(x) : null;
  };
  const and = (): F | null => { let l = atom(); while (l && peek() === "∧") { i++; const r = atom(); if (!r) return null; l = bin("and", l, r); } return l; };
  const or = (): F | null => { let l = and(); while (l && peek() === "∨") { i++; const r = and(); if (!r) return null; l = bin("or", l, r); } return l; };
  const xor = (): F | null => { let l = or(); while (l && peek() === "⊻") { i++; const r = or(); if (!r) return null; l = bin("xor", l, r); } return l; };
  const imp = (): F | null => { const l = xor(); if (l && peek() === "→") { i++; const r = imp(); return r && bin("imp", l, r); } return l; };
  const bi = (): F | null => { let l = imp(); while (l && peek() === "↔") { i++; const r = imp(); if (!r) return null; l = bin("bi", l, r); } return l; };
  const f = bi();
  return f && i === t.length ? f : null;
}

/** Texto compacto (sem espaços); subfórmulas binárias ficam entre parênteses. */
export function str(f: F, topo = true): string {
  if (f.k === "v") return f.n;
  if (f.k === "not") return `~${f.a.k === "v" || f.a.k === "not" ? str(f.a, false) : `(${str(f.a, true)})`}`;
  const t = `${str(f.a, false)}${OPS[f.k]}${str(f.b, false)}`;
  return topo ? t : `(${t})`;
}

export function ev(f: F, a: Record<string, boolean>): boolean {
  switch (f.k) {
    case "v": return a[f.n] ?? false;
    case "not": return !ev(f.a, a);
    case "and": return ev(f.a, a) && ev(f.b, a);
    case "or": return ev(f.a, a) || ev(f.b, a);
    case "xor": return ev(f.a, a) !== ev(f.b, a);
    case "imp": return !ev(f.a, a) || ev(f.b, a);
    case "bi": return ev(f.a, a) === ev(f.b, a);
  }
}

export function variaveis(...fs: F[]): string[] {
  const s = new Set<string>();
  const rec = (f: F) => { if (f.k === "v") s.add(f.n); else if (f.k === "not") rec(f.a); else { rec(f.a); rec(f.b); } };
  fs.forEach(rec);
  return [...s].sort();
}

/** Subfórmulas que não são só uma letra, na ordem em que devem ser calculadas (a última é a própria fórmula). */
export function subformulas(f: F): F[] {
  const out: F[] = [], vistos = new Set<string>();
  const rec = (x: F) => {
    if (x.k === "v") return;
    if (x.k === "not") rec(x.a); else { rec(x.a); rec(x.b); }
    const k = str(x);
    if (!vistos.has(k)) { vistos.add(k); out.push(x); }
  };
  rec(f);
  return out;
}

/** Linhas da tabela-verdade na ordem tradicional (a primeira é toda V). */
export function linhas(vars: string[]): Record<string, boolean>[] {
  const n = vars.length;
  return Array.from({ length: 2 ** n }, (_, i) => Object.fromEntries(vars.map((x, j) => [x, ((i >> (n - 1 - j)) & 1) === 0])));
}
export const VF = (b: boolean): string => (b ? "V" : "F");

export type Classe = "TAUTOLOGIA" | "CONTRADIÇÃO" | "CONTINGÊNCIA";
export const CLASSES: Classe[] = ["TAUTOLOGIA", "CONTRADIÇÃO", "CONTINGÊNCIA"];
export function classificar(f: F): Classe {
  const rs = linhas(variaveis(f)).map((a) => ev(f, a));
  return rs.every(Boolean) ? "TAUTOLOGIA" : rs.every((x) => !x) ? "CONTRADIÇÃO" : "CONTINGÊNCIA";
}

/** Negação de uma fórmula pelas leis de De Morgan etc., sem deixar ~~ no caminho. Devolve também o nome da regra. */
const lit = (f: F): F => (f.k === "not" ? f.a : nao(f));
export function negar(f: F): { f: F; regra: string } {
  switch (f.k) {
    case "v": return { f: nao(f), regra: "Negação simples: basta colocar o ~" };
    case "not": return { f: f.a, regra: "Dupla negação: ~(~p) = p" };
    case "and": return { f: bin("or", lit(f.a), lit(f.b)), regra: "De Morgan: a negação de (p ∧ q) é (~p ∨ ~q)" };
    case "or": return { f: bin("and", lit(f.a), lit(f.b)), regra: "De Morgan: a negação de (p ∨ q) é (~p ∧ ~q)" };
    case "imp": return { f: bin("and", f.a, lit(f.b)), regra: "Negação do condicional: ~(p → q) é (p ∧ ~q)" };
    case "bi": return { f: bin("or", bin("and", f.a, lit(f.b)), bin("and", f.b, lit(f.a))), regra: "Negação do bicondicional: ~(p ↔ q) é (p ∧ ~q) ∨ (q ∧ ~p)" };
    case "xor": return { f: bin("bi", f.a, f.b), regra: "A negação do ou exclusivo é o bicondicional: ~(p ⊻ q) = (p ↔ q)" };
  }
}

/** Fórmulas equivalentes clássicas da fórmula (conforme o conectivo principal). */
export function equivalentes(f: F): { nome: string; f: F; porque: string }[] {
  switch (f.k) {
    case "imp": return [
      { nome: "Contrapositiva", f: bin("imp", lit(f.b), lit(f.a)), porque: "Trocar as posições e negar as duas: p → q ≡ ~q → ~p." },
      { nome: "Condicional como disjunção", f: bin("or", lit(f.a), f.b), porque: "p → q ≡ ~p ∨ q (nega a primeira, troca → por ∨)." },
    ];
    case "bi": return [
      { nome: "Bicondicional como duas condicionais", f: bin("and", bin("imp", f.a, f.b), bin("imp", f.b, f.a)), porque: "p ↔ q ≡ (p → q) ∧ (q → p)." },
      { nome: "Bicondicional como iguais", f: bin("or", bin("and", f.a, f.b), bin("and", lit(f.a), lit(f.b))), porque: "p ↔ q ≡ (p ∧ q) ∨ (~p ∧ ~q): os dois V ou os dois F." },
    ];
    case "and": return [
      { nome: "De Morgan", f: nao(bin("or", lit(f.a), lit(f.b))), porque: "p ∧ q ≡ ~(~p ∨ ~q)." },
      { nome: "Conjunção como condicional", f: nao(bin("imp", f.a, lit(f.b))), porque: "p ∧ q ≡ ~(p → ~q)." },
    ];
    case "or": return [
      { nome: "Disjunção como condicional", f: bin("imp", lit(f.a), f.b), porque: "p ∨ q ≡ ~p → q." },
      { nome: "De Morgan", f: nao(bin("and", lit(f.a), lit(f.b))), porque: "p ∨ q ≡ ~(~p ∧ ~q)." },
    ];
    case "xor": return [
      { nome: "Ou exclusivo", f: bin("or", bin("and", f.a, lit(f.b)), bin("and", f.b, lit(f.a))), porque: "p ⊻ q ≡ (p ∧ ~q) ∨ (q ∧ ~p): só um dos dois é V." },
      { nome: "Negação do bicondicional", f: nao(bin("bi", f.a, f.b)), porque: "p ⊻ q ≡ ~(p ↔ q)." },
    ];
    default: return [];
  }
}

/** Regra de cada conectivo, para explicar a coluna da tabela. */
export const REGRA: Record<F["k"], string> = {
  v: "",
  not: "A negação (~) inverte: V vira F e F vira V.",
  and: "A conjunção (∧, \"e\") só é verdadeira quando as DUAS são verdadeiras.",
  or: "A disjunção (∨, \"ou\") só é falsa quando as DUAS são falsas.",
  xor: "A disjunção exclusiva (⊻) é verdadeira quando os valores são DIFERENTES.",
  imp: "O condicional (→) só é falso quando a primeira é V e a segunda é F.",
  bi: "O bicondicional (↔) é verdadeiro quando os dois valores são IGUAIS.",
};
export const NOME_CONECTIVO: Record<F["k"], string> = { v: "", not: "negação", and: "conjunção", or: "disjunção", xor: "ou exclusivo", imp: "condicional", bi: "bicondicional" };

/** Compara fórmulas: igual na estrutura ou com os operandos trocados nos conectivos comutativos. */
export function variantes(f: F): string[] {
  const base = str(f);
  const out = [base];
  if (f.k === "and" || f.k === "or" || f.k === "xor" || f.k === "bi") out.push(str(bin(f.k, f.b, f.a)));
  if (f.k === "or" || f.k === "and") {
    // (p∧~q)∨(q∧~p) e comutações internas ficam fora: aceitamos só a troca no topo
  }
  return [...new Set(out)];
}
