/**
 * Quadros prontos a partir da aula catalogada: tabelas, comparações e casos práticos que já estão nas seções da aula viram
 * roteiros de comandos para o motor de desenho (ditado.ts). Sem IA e sem espera: do banco para o quadro em milissegundos.
 */
export interface SecaoAula { kind: string; title: string; body_markdown: string }
export interface QuadroPronto { titulo: string; roteiro: string[]; kind: string }

const limpa = (s: string) =>
  s.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1").replace(/[*_`#>]/g, "").replace(/\s+/g, " ").replace(/\s*\|\s*$/, "").trim();
const corta = (s: string, n: number) => {
  const t = limpa(s);
  if (t.length <= n) return t;
  const c = t.slice(0, n), i = Math.max(c.lastIndexOf(". "), c.lastIndexOf("; "), c.lastIndexOf(", "), c.lastIndexOf(" "));
  return (i > n * 0.5 ? c.slice(0, i) : c).replace(/[,;:\s]+$/, "") + (t.length > n && !/[.!?]$/.test(c.slice(0, i > n * 0.5 ? i : n)) ? "…" : "");
};
// comando = uma frase do ditado; ":" e pontos finais não podem quebrar a frase
const cmd = (nome: string, texto: string) => `${nome}: ${texto.replace(/[.:\s]+$/, "").trim()}`;

function celulas(l: string): string[] { return l.trim().replace(/^\||\|$/g, "").split("|").map((c) => limpa(c)); }

function daTabela(sec: SecaoAula, max: number): string[] | null {
  const ls = sec.body_markdown.split("\n").map((l) => l.trim()).filter((l) => l.startsWith("|"));
  if (ls.length < 3 || !/^\|?[\s:|-]+\|?$/.test(ls[1]!)) return null;
  const cab = celulas(ls[0]!), linhas = ls.slice(2).map(celulas).slice(0, max);
  if (cab.length < 2 || !linhas.length) return null;
  const out = [cmd("Título", corta(sec.title, 40))];
  for (const r of linhas) {
    out.push(cmd("Caixa", corta(r[0] ?? "", 34)));
    for (let j = 1; j < cab.length && j < 4; j++) if (r[j]) out.push(cmd("Item", cab.length > 2 ? `${corta(cab[j]!, 18)}: ${corta(r[j]!, 70)}` : corta(r[j]!, 90)));
  }
  return out;
}

function daComparacao(sec: SecaoAula, max: number): string[] | null {
  const itens = sec.body_markdown.split("\n").map((l) => l.trim()).filter((l) => /^(\d+[.)]|[-*•])\s+/.test(l)).map((l) => l.replace(/^(\d+[.)]|[-*•])\s+/, ""));
  if (itens.length < 2) return null;
  const out = [cmd("Título", corta(sec.title, 40))];
  for (const it of itens.slice(0, max)) {
    const m = /^\*\*(.+?)\*\*[:\s]*(.*)$/.exec(it);
    const a = limpa(m?.[1] ?? it.split(":")[0]!).replace(/[:\s]+$/, ""), b = limpa(m?.[2] ?? it.split(":").slice(1).join(":"));
    out.push(cmd("Caixa", corta(a, 38)));
    if (b) out.push(cmd("Item", corta(b, 90)));
  }
  return out;
}

function dosCasos(sec: SecaoAula, max: number): string[] | null {
  const blocos = sec.body_markdown.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
  const casos = blocos.map((b) => {
    const m = /^\*\*(.+?)\*\*\s*([\s\S]*)$/.exec(b);
    if (!m) return null;
    const [corpo, ...res] = m[2]!.split(/\n\s*(?:→|->|⇒)\s*/);
    return { t: limpa(m[1]!), d: limpa(corpo ?? ""), r: limpa(res.join(" ")) };
  }).filter((c): c is { t: string; d: string; r: string } => !!c && (!!c.d || !!c.r));
  if (casos.length < 1) return null;
  const out = [cmd("Título", corta(sec.title, 40))];
  for (const c of casos.slice(0, max)) {
    out.push(cmd("Caixa", corta(c.t, 38)));
    if (c.d) out.push(cmd("Exemplo", corta(c.d, 80)));
    if (c.r) out.push(cmd("Destaque", corta(c.r, 80)));
  }
  return out;
}

const TIPOS: Record<string, (s: SecaoAula, max: number) => string[] | null> = {
  esquema: (s, m) => daTabela(s, m) ?? daComparacao(s, m), quadro_comparativo: (s, m) => daTabela(s, m) ?? daComparacao(s, m),
  comparacao: (s, m) => daComparacao(s, m) ?? daTabela(s, m), exemplos: (s, m) => dosCasos(s, m), aplicacao: (s, m) => dosCasos(s, m) ?? daComparacao(s, m),
};

export function quadroDaSecao(sec: SecaoAula, largo: boolean): QuadroPronto | null {
  const f = TIPOS[sec.kind];
  const roteiro = f?.(sec, largo ? 6 : 4);
  return roteiro && roteiro.length >= 3 ? { titulo: corta(sec.title, 60), roteiro, kind: sec.kind } : null;
}

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const PALAVRAS = (s: string) => new Set(norm(s).split(/[^a-z0-9]+/).filter((w) => w.length > 3));

/** Escolhe a seção que melhor responde ao pedido do aluno ("dá um exemplo", "qual a diferença", "faz um esquema"…). */
export function escolherQuadro(secoes: SecaoAula[], pedido: string, largo: boolean): QuadroPronto | null {
  const p = norm(pedido), pw = PALAVRAS(pedido);
  const quer = (re: RegExp) => re.test(p);
  const cands = secoes.map((s) => ({ s, q: quadroDaSecao(s, largo) })).filter((x): x is { s: SecaoAula; q: QuadroPronto } => !!x.q);
  if (!cands.length) return null;
  let melhor = cands[0]!, nota = -1;
  for (const c of cands) {
    let n = 0;
    if (quer(/exemplo|caso|pratic|aplic/) && (c.s.kind === "exemplos" || c.s.kind === "aplicacao")) n += 8;
    if (quer(/diferen|compar|versus|\bx\b|confund/) && (c.s.kind === "comparacao" || c.s.kind === "quadro_comparativo")) n += 6;
    if (quer(/esquema|mapa|resum|tabela|desenh/) && (c.s.kind === "esquema" || c.s.kind === "quadro_comparativo")) n += 5;
    const w = PALAVRAS(`${c.s.title} ${c.s.body_markdown.slice(0, 600)}`);
    for (const x of pw) if (w.has(x)) n += 1;
    if (n > nota) { nota = n; melhor = c; }
  }
  return melhor.q;
}
