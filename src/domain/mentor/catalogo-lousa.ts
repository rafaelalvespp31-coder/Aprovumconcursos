import { comandoDitado, fimDitado, novoDitado } from "./ditado";
import { numerais } from "./numerais";
import { extractPractice } from "@/domain/content/practice";
/**
 * Quadros prontos a partir da aula catalogada: tabelas, comparações e casos práticos que já estão nas seções da aula viram
 * roteiros de comandos para o motor de desenho (ditado.ts). Sem IA e sem espera: do banco para o quadro em milissegundos.
 */
export interface SecaoAula { kind: string; title: string; body_markdown: string }
export interface QuadroPronto { titulo: string; roteiro: string[]; kind: string }

const limpa = (s: string) =>
  s.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1").replace(/[*_`#>]/g, "").replace(/\s+/g, " ").replace(/\s*\|\s*$/, "").trim();
/** Texto completo para a lousa (ela quebra em linhas): só corta frases gigantes, sempre no fim de uma palavra e sem reticências. */
const corta = (s: string, n: number) => {
  const t = limpa(s), lim = Math.max(n * 3, 200);
  if (t.length <= lim) return t;
  const c = t.slice(0, lim), i = Math.max(c.lastIndexOf(". "), c.lastIndexOf("; "), c.lastIndexOf(" "));
  return (i > lim * 0.5 ? c.slice(0, i) : c).replace(/[,;:\s]+$/, "");
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
import { casosDe, roteiroDeCaso } from "./calculo-lousa";
export interface QuadroGuardado { tipo: string; titulo: string; gatilhos: string[]; roteiro: string[] }
const COMANDO_MAT = /^(tabela|linha(?! do tempo)|cruzar|conta|resposta|mmc|mdc|armada|divis[aã]o|regra de tr[eê]s|passos)\b/i;
const PROSA = /^(item|exemplo|destaque|aten[cç][aã]o|cuidado|resumo|ponto|t[oó]pico|caixa)\s*:/i;
/** Quadro de matemática: só números e esquemas de cálculo. Tira frases explicativas (ficam na voz). Quadros de outras matérias passam intactos. */
export function soNumeros(q: QuadroPronto | null): QuadroPronto | null {
  if (!q || (q.roteiro.filter((c) => COMANDO_MAT.test(c)).join(" ").match(/\d/g) ?? []).length < 4) return q;
  const r = q.roteiro.filter((c) => !PROSA.test(c) || (c.replace(/^[^:]*:/, "").match(/\d/g) ?? []).length >= 3);
  return r.length >= 3 ? { ...q, roteiro: r } : q;
}

/** Texto com datas ("Em 2020, João pratica…; em 2025, surge a lei…") → linha do tempo com um marco por data, em ordem cronológica. */
export function roteiroLinhaDoTempo(texto: string, titulo: string, conclusao = ""): string[] | null {
  const frases = numerais(limpa(texto)).split(/(?<=[.;!?])\s+/);
  const marcos: Array<{ ano: number; rot: string }> = [];
  for (const f of frases) {
    const m = /\b(1[0-9]{3}|20[0-9]{2})\b/.exec(f);
    if (!m) continue;
    const antes = f.slice(0, m.index).replace(/\b(?:em|no ano de|no ano|desde|at[ée]|de|se)\s*$/i, "").replace(/[,;:\s]+$/, "").trim();
    const depois = f.slice(m.index + m[0].length).replace(/^[\s,;:]*(?:a|o|foi|era|quando|que|com|em)?\s*/i, "").replace(/[.;!?]+$/, "").trim();
    const rot = corta([antes, depois].filter(Boolean).join(", "), 70);
    marcos.push({ ano: Number(m[1]), rot: cap(rot) });
  }
  if (marcos.length < 2) return null;
  marcos.sort((a, b) => a.ano - b.ano);
  const out = [cmd("Título", corta(titulo, 40)), "Linha do tempo:", ...marcos.slice(0, 6).map((x) => cmd("Marco", `${x.ano} ${x.rot}`.trim()))];
  const c = limpa(conclusao);
  if (c.length >= 12) out.push(cmd("Destaque", corta(c, 130)));
  return out;
}

/** Casos práticos (":::exemplo") escritos na própria aula: datas viram linha do tempo; o resto, situação → pergunta → resposta. */
function casosPraticos(secoes: SecaoAula[]): Array<{ s: SecaoAula; q: QuadroPronto }> {
  return secoes.flatMap((sec) => extractPractice(sec.body_markdown).cases.flatMap((c) => {
    const titulo = corta(sec.title || "Exemplo", 40);
    const roteiro = roteiroLinhaDoTempo(`${c.situation} ${c.answer}`, titulo, c.answer)
      ?? roteiroDeCaso({ titulo, enunciado: c.situation, pergunta: c.question, resultado: c.answer });
    return roteiro ? [{ s: { kind: "exemplos", title: `${sec.title} ${c.situation} ${c.question}`, body_markdown: c.answer }, q: { titulo, roteiro, kind: "exemplos" } }] : [];
  }));
}

// ── pedido → trecho da aula ────────────────────────────────────────────────────────────────────────
const PEDIDO_VAZIO = new Set(["linha", "tempo", "mostra", "mostre", "mostrar", "desenha", "desenhe", "desenhar", "exemplo", "exemplos", "quero", "queria", "pode", "para", "sobre", "como", "aula", "quadro", "lousa", "escreve", "escreva", "explica", "explique", "fala", "favor", "pelo", "pela", "essa", "esse", "isso", "esta", "este", "tambem", "depois", "agora", "assunto", "parte", "tudo", "voce", "mentor", "faz", "faca", "fazer", "preciso", "gostaria", "ver", "dar", "da", "de", "do", "na", "no", "um", "uma", "com", "que", "por", "e", "o", "a", "os", "as", "dos", "das", "nos", "nas", "meu", "minha", "seu", "sua", "cronologia", "cronologica", "esquema", "diagrama"]);
/** Radicais que identificam o assunto pedido (com as variações de escrita: ultratividade = ultraatividade = extratividade). */
export function radicaisDoPedido(pedido: string): string[] {
  const out = new Set<string>();
  for (const w of norm(pedido).split(/[^a-z0-9]+/)) {
    if (w.length < 4 || PEDIDO_VAZIO.has(w)) continue;
    if (/^(ultra|extra)-?a?tiv/.test(w)) { ["ultrativ", "ultraativ", "extrativ", "extraativ"].forEach((r) => out.add(r)); continue; }
    if (/^retro-?a?tiv/.test(w)) { out.add("retroativ"); continue; }
    out.add(w.length > 7 ? w.slice(0, w.length - 3) : w.length > 5 ? w.slice(0, w.length - 1) : w);
  }
  return [...out];
}

/** Procura na aula os trechos sobre o assunto pedido e os transcreve para a lousa como estão no material (linha do tempo quando há datas ou o aluno pediu). */
export function trechoDoPedido(secoes: SecaoAula[], pedido: string): QuadroPronto | null {
  const rad = radicaisDoPedido(pedido);
  if (!rad.length) return null;
  const quer = /tempo|cronolog|linha/.test(norm(pedido));
  const pass: Array<{ ordem: number; sec: string; texto: string; nota: number }> = [];
  let ordem = 0;
  for (const sec of secoes) {
    const tit = norm(sec.title);
    const hitTit = rad.filter((r) => tit.includes(r)).length;
    for (const bruto of sec.body_markdown.replace(/^[ \t]*:::.*$/gm, "").split(/\n\s*\n/)) {
      const txt = limpa(bruto.replace(/\n/g, " "));
      if (txt.length < 12) continue;
      const nt = norm(txt);
      const hits = rad.filter((r) => nt.includes(r)).length;
      if (hits + hitTit === 0 || (hits === 0 && txt.length < 30)) { ordem++; continue; }
      pass.push({ ordem: ordem++, sec: sec.title, texto: txt, nota: hits * 3 + hitTit });
    }
  }
  if (!pass.length) return null;
  const top = [...pass].sort((a, b) => b.nota - a.nota).slice(0, 5).sort((a, b) => a.ordem - b.ordem);
  const titulo = corta(top[0]!.sec || "Exemplo", 40);
  const junto = top.map((x) => x.texto).join(" ");
  const anos = (numerais(junto).match(/\b(?:1[0-9]{3}|20[0-9]{2})\b/g) ?? []).length;
  if (quer || anos >= 2) {
    const tl = roteiroLinhaDoTempo(junto, titulo);
    if (tl) return { titulo, roteiro: tl, kind: "linha_do_tempo" };
    if (quer) {
      // sem datas no material: a sequência do que a aula conta, na ordem em que está escrita
      const frases = junto.split(/(?<=[.;!?])\s+/).map((f) => f.trim()).filter((f) => f.length >= 15).slice(0, 5);
      if (frases.length >= 2) return { titulo, roteiro: [cmd("Título", titulo), "Linha do tempo:", ...frases.map((f) => cmd("Marco", cap(f.replace(/[.;!?]+$/, ""))))], kind: "linha_do_tempo" };
    }
  }
  const roteiro = [cmd("Título", titulo)];
  for (const x of top) {
    const m = /^([^:.]{3,40}):\s+(.{12,})$/.exec(x.texto);
    if (m) { roteiro.push(cmd("Caixa", m[1]!), cmd("Item", m[2]!)); } else roteiro.push(cmd("Item", x.texto));
  }
  return roteiro.length >= 3 ? { titulo, roteiro, kind: "exemplos" } : null;
}

export function escolherQuadro(secoes: SecaoAula[], pedido: string, largo: boolean, guardados: QuadroGuardado[] = []): QuadroPronto | null {
  return soNumeros(escolherQuadroBruto(secoes, pedido, largo, guardados));
}
function escolherQuadroBruto(secoes: SecaoAula[], pedido: string, largo: boolean, guardados: QuadroGuardado[] = []): QuadroPronto | null {
  const doPedido = trechoDoPedido(secoes, pedido); // o assunto pedido, direto do material da aula
  if (doPedido && /tempo|cronolog|linha/.test(norm(pedido))) return doPedido; // linha do tempo de um assunto: vai direto ao trecho dele
  // os exemplos que a própria aula escreveu ("EXEMPLO:") são a base do que o Mentor desenha
  const doTexto = exemplosDaAula(secoes).flatMap((e) => { const r = roteiroDeExemplo(e.itens, `Exemplo: ${e.contexto}`.slice(0, 40), e.conclusao); return r ? [{ s: { kind: "exemplos", title: e.contexto, body_markdown: e.itens.join(" ") } as SecaoAula, q: { titulo: e.contexto, roteiro: r, kind: "exemplos" } as QuadroPronto }] : []; });
  const contas = secoes.flatMap((s) => casosDe(s.body_markdown).flatMap((c) => { const r = roteiroDeCaso(c); return r ? [{ s: { kind: "exemplos", title: `${c.titulo} ${c.enunciado} calculo conta`, body_markdown: c.resultado } as SecaoAula, q: { titulo: c.titulo, roteiro: r, kind: "exemplos" } as QuadroPronto }] : []; }));
  doTexto.push(...contas, ...casosPraticos(secoes));
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
    if (quer(/tempo|linha|cronolog|ordem|retroativ|extrativ|ultrativ|datas?\b/) && c.q.roteiro.includes("Linha do tempo:")) n += 10;
    if (guardados.some((g) => g.titulo === c.q.titulo)) n += 2;
    const w = PALAVRAS(`${c.s.title} ${c.s.body_markdown.slice(0, 600)}`);
    for (const x of pw) if (w.has(x)) n += 1;
    const nc = norm(`${c.s.title} ${c.s.body_markdown} ${c.q.roteiro.join(" ")}`);
    for (const r of radicaisDoPedido(pedido)) if (nc.includes(r)) n += 4; // o assunto pedido (com variações: ultratividade = extratividade)
    if (n > nota) { nota = n; melhor = c; }
  }
  return nota >= 3 ? melhor.q : doPedido; // sem quadro pronto parecido: transcreve do material o trecho do assunto pedido // sem relação com o pedido: o Mentor escreve o que fala, em vez de um quadro qualquer
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
  const xs = itens.map((s) => limpa(s).replace(/^[-–—•]\s*/, "")).filter((s) => s.length >= 3).slice(0, 8);
  if (xs.length < 2) return null;
  const tabuada = roteiroDeTabuada(xs, titulo, conclusao);
  if (tabuada) return tabuada;
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

const CONTA = /^(\d+(?:[.,]\d+)?)\s*([×x·*÷/+−-])\s*(\d+(?:[.,]\d+)?)\s*=\s*(\d+(?:[.,]\d+)?)\b/;
/** Lista de contas ("5 × 1 = 5", "5 × 2 = 10"…) → tabela de verdade: o aluno vê cada conta e o resultado, linha a linha. */
function roteiroDeTabuada(xs: string[], titulo: string, conclusao: string): string[] | null {
  const m = xs.map((x) => CONTA.exec(x));
  if (m.length >= 2 && m.some((x) => !x) && xs.filter((x) => /\d[^=]*=[^=]*\d/.test(x) && x.length <= 90).length === xs.length) {
    const o = [cmd("Título", corta(titulo, 40))];
    xs.forEach((x, i) => { o.push(cmd("Caixa", `Passo ${i + 1}`)); o.push(cmd("Conta", corta(x.replace(/^\d+[.)]\s*/, ""), 60))); });
    return o; // matemática: só números na lousa
  }
  if (m.length < 3 || m.some((x) => !x)) return null;
  const ms = m as RegExpExecArray[];
  const out = [cmd("Título", corta(titulo, 40))];
  out.push("Tabela: Conta, Resultado");
  for (const x of ms) out.push(cmd("Linha", `${x[1]} ${/[x*]/.test(x[2]!) ? "×" : x[2]} ${x[3]}, ${x[4]}`));
  void conclusao; // matemática: só números na lousa
  return out;
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

/** Roteiro do quadro → texto corrido, para o Mentor DESCREVER em voz exatamente o que está desenhado (o exemplo da aula, sem trocar por outro). */
export function descreverQuadro(titulo: string, roteiro: string[]): string {
  const partes: string[] = [`Título do quadro: ${titulo}.`];
  for (const c of roteiro) {
    const m = /^([^:]+):\s*(.*)$/.exec(c);
    if (!m) continue;
    const nome = m[1]!.trim().toLowerCase(), corpo = m[2]!.trim().replace(/[.\s]+$/, "");
    if (!corpo && nome !== "linha do tempo") continue;
    if (nome === "título" || nome === "titulo") continue;
    if (nome === "linha do tempo") partes.push("É uma linha do tempo, em ordem cronológica.");
    else if (nome === "marco") partes.push(`Marco: ${corpo.replace(/^(\d{3,4})\s+/, "em $1, ")}.`);
    else if (nome === "caixa") partes.push(`Etapa "${corpo}".`);
    else if (nome === "destaque") partes.push(`Destaque: ${corpo}.`);
    else if (nome === "passos") partes.push(`Passos do cálculo: ${corpo.split("|").map((s) => s.trim()).join("; ")}.`);
    else if (nome === "regra de três") { const p2 = corpo.split("|").map((s) => s.trim()); partes.push(`Regra de três (${p2[5] ?? "direta"}): ${p2[0]} ${p2[3]} corresponde a ${p2[1]} ${p2[4]}; ${p2[2]} ${p2[3]} corresponde a x.`); }
    else if (nome === "grade") partes.push(`Tabela com as colunas: ${corpo.split("|").map((s) => s.trim()).join(", ")}.`);
    else if (nome === "célula" || nome === "celula") partes.push(`Linha da tabela: ${corpo.split("|").map((s) => s.trim()).join(" — ")}.`);
    else if (nome === "tabela") partes.push(`Tabela com as colunas: ${corpo}.`);
    else if (nome === "linha") partes.push(`Linha: ${corpo}.`);
    else partes.push(`${corpo}.`);
  }
  return partes.join(" ").replace(/\.\./g, ".").slice(0, 2200);
}
