import { comandoDitado, fimDitado, novoDitado } from "./ditado";
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
export interface QuadroGuardado { tipo: string; titulo: string; gatilhos: string[]; roteiro: string[] }
export function escolherQuadro(secoes: SecaoAula[], pedido: string, largo: boolean, guardados: QuadroGuardado[] = []): QuadroPronto | null {
  // os exemplos que a própria aula escreveu ("EXEMPLO:") são a base do que o Mentor desenha
  const doTexto = exemplosDaAula(secoes).flatMap((e) => { const r = roteiroDeExemplo(e.itens, `Exemplo: ${e.contexto}`.slice(0, 40), e.conclusao); return r ? [{ s: { kind: "exemplos", title: e.contexto, body_markdown: e.itens.join(" ") } as SecaoAula, q: { titulo: e.contexto, roteiro: r, kind: "exemplos" } as QuadroPronto }] : []; });
  const p = norm(pedido), pw = PALAVRAS(pedido);
  const quer = (re: RegExp) => re.test(p);
  const cands = [...doTexto, ...secoes.map((s) => ({ s, q: quadroDaSecao(s, largo) })).filter((x): x is { s: SecaoAula; q: QuadroPronto } => !!x.q)];
  // quadros desenhados sob medida para o tópico (IA, uma vez só) valem mais que a conversão direta das tabelas da aula
  for (const g of guardados) cands.push({ s: { kind: g.tipo, title: `${g.titulo} ${g.gatilhos.join(" ")}`, body_markdown: "" }, q: { titulo: g.titulo, roteiro: g.roteiro, kind: g.tipo } });
  if (!cands.length) return null;
  let melhor = cands[0]!, nota = -1;
  for (const c of cands) {
    let n = 0;
    if (quer(/exemplo|caso|pratic|aplic/) && (c.s.kind === "exemplos" || c.s.kind === "aplicacao")) n += 8 + (doTexto.some((d) => d.q === c.q) ? 2 : 0);
    if (quer(/diferen|compar|versus|\bx\b|confund/) && (c.s.kind === "comparacao" || c.s.kind === "quadro_comparativo")) n += 6;
    if (quer(/esquema|mapa|resum|tabela|desenh/) && (c.s.kind === "esquema" || c.s.kind === "quadro_comparativo")) n += 5;
    if (quer(/calcul|conta|passo|resolv|como se faz|como faz/) && c.s.kind === "calculo") n += 8;
    if (quer(/tempo|linha|cronolog|ordem/) && c.s.kind === "linha_do_tempo") n += 8;
    if (guardados.some((g) => g.titulo === c.q.titulo)) n += 2;
    const w = PALAVRAS(`${c.s.title} ${c.s.body_markdown.slice(0, 600)}`);
    for (const x of pw) if (w.has(x)) n += 1;
    if (n > nota) { nota = n; melhor = c; }
  }
  return melhor.q;
}

/** Mantém só os comandos que o motor de desenho entende e exige que o roteiro desenhe de verdade. */
export function validarRoteiro(roteiro: string[]): string[] | null {
  for (const largo of [true, false]) {
    const e = novoDitado(largo);
    const ok = roteiro.filter((c) => comandoDitado(e, c, 0));
    fimDitado(e);
    if (ok.length < Math.ceil(roteiro.length * 0.7) || e.itens.length < 6) return null;
    if (largo) roteiro = ok;
  }
  return roteiro;
}


const MESES = "janeiro|fevereiro|mar[çc]o|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro";
const TEMPO = new RegExp(`^(?:em\\s+|no\\s+(?:dia\\s+)?|na\\s+)?((?:\\d{1,2}\\s+de\\s+)?(?:${MESES})(?:\\s+de\\s+\\d{4})?|\\d{4}|dia\\s+\\d{1,2}|hoje|ontem|depois|antes)\\b[\\s,:;–-]*`, "i");

const MES_LISTA = ["janeiro", "fevereiro", "marco", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const MES_ANY = new RegExp(`\\b(${MESES})\\b`, "i");
const cap = (s: string) => s.replace(/^\w/, (c) => c.toUpperCase());

/**
 * Bloco "EXEMPLO:" da aula (lista de fatos) → roteiro do quadro: com datas vira linha do tempo (em ordem cronológica)
 * + caixas; sem datas vira uma sequência de caixas (um passo por item).
 */
export function roteiroDeExemplo(itens: string[], titulo = "Exemplo", conclusao = ""): string[] | null {
  const xs = itens.map(limpa).filter((s) => s.length >= 3).slice(0, 8);
  if (xs.length < 2) return null;
  const info = xs.map((x, i) => {
    const lead = TEMPO.exec(x), anyM = MES_ANY.exec(x);
    const rot = lead ? lead[1]! : anyM ? anyM[1]! : null;
    const mes = rot ? MES_LISTA.indexOf(norm(rot).replace(/^\d+\s+de\s+/, "").split(" ")[0]!) : -1;
    return { x, i, rot: rot ? cap(rot) : null, mes, resto: lead ? x.slice(lead[0].length) : x };
  });
  const comTempo = info.filter((n) => n.rot);
  const out = [cmd("Título", corta(titulo, 40))];
  let seq = info;
  if (comTempo.length >= 2) {
    if (comTempo.length === info.length && info.every((n) => n.mes >= 0)) seq = [...info].sort((a, b) => a.mes - b.mes || a.i - b.i);
    out.push("Linha do tempo:");
    for (const n of seq) if (n.rot) out.push(cmd("Marco", corta(n.rot, 24)));
  }
  seq.forEach((n, k) => {
    out.push(cmd("Caixa", n.rot ? corta(n.rot, 30) : `Passo ${k + 1}`));
    out.push(cmd("Item", corta(cap(n.resto) || n.x, 110)));
  });
  const c = limpa(conclusao);
  if (c.length >= 12) out.push(cmd("Destaque", corta(c, 130)));
  return out.length >= 5 ? out : null;
}

export interface ExemploDaAula { contexto: string; itens: string[]; conclusao: string }
const ROTULO_EX = /^[\s>*_#]*(?:exemplos?|ex\.|caso pr[áa]tico)\s*:?[\s*_]*$/i;
const ITEM = /^\s*(?:[-*•]|\d+[.)])\s+(.*\S)\s*$/;

/** Todos os blocos "EXEMPLO:" (rótulo + lista de fatos + frase de conclusão) escritos nas seções da aula, com o título da regra a que pertencem. */
export function exemplosDaAula(secoes: SecaoAula[]): ExemploDaAula[] {
  const out: ExemploDaAula[] = [];
  for (const s of secoes) {
    const ls = s.body_markdown.split("\n");
    let ctx = s.title;
    for (let i = 0; i < ls.length; i++) {
      const l = ls[i]!.trim();
      if (/^(?:#{1,6}\s+|\*\*\s*\d+[.)]\s)/.test(l) && !ROTULO_EX.test(l)) ctx = limpa(l).replace(/^\d+[.)]\s*/, "");
      if (!ROTULO_EX.test(l)) continue;
      const itens: string[] = [];
      let j = i + 1;
      while (j < ls.length && !ls[j]!.trim()) j++;
      for (; j < ls.length; j++) { const m = ITEM.exec(ls[j]!); if (m) itens.push(m[1]!); else if (ls[j]!.trim()) break; else if (itens.length && !ITEM.test(ls[j + 1] ?? "")) break; }
      while (j < ls.length && !ls[j]!.trim()) j++;
      const prox = (ls[j] ?? "").trim();
      const conclusao = prox && !ITEM.test(prox) && !ROTULO_EX.test(prox) && !/^(#{1,6}\s|\*\*\s*\d+[.)])/.test(prox) && prox.length <= 220 ? prox : "";
      if (itens.length >= 2) out.push({ contexto: ctx, itens, conclusao });
    }
  }
  return out;
}
