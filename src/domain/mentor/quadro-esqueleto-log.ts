/** Esqueletos de Raciocínio Lógico: tabela-verdade (com classificação), valor lógico, negação, equivalência, argumento e quantificadores. */
import { Montador, c, montarLinhas, tamanhoPara, type Bloco, type Esqueleto, type TipoEsqueleto } from "./quadro-esqueleto-base";
import type { Medidor } from "./quadro-motor";
import { CLASSES, ev, equivalentes, linhas, negar, NOME_CONECTIVO, parse, REGRA, str, subformulas, variaveis, variantes, VF, classificar, type F } from "./quadro-logica";

type Passo = { titulo: string; texto: string; porque: string; dica: string };
interface Col { cab: string; vals: boolean[]; p: number }

const POOL: Record<string, string[]> = {
  tabela: ["p∧q", "p∨q", "p→q", "p↔q", "~p∨q", "~(p∧q)", "p∧~q", "(p∨q)→r", "(p→q)∧(q→r)", "p→(q→p)", "(p∧q)→p", "p∨~p", "p∧~p", "~(p→q)↔(p∧~q)", "(p→q)↔(~p∨q)"],
  valor: ["p=V,q=F;(p∨q)→~q", "p=F,q=F;~(p∧q)", "p=V,q=V,r=F;(p→q)∧r", "p=V,q=F;p↔~q", "p=F,q=V;(~p∨q)∧p", "p=V,q=F,r=V;p→(q∨r)"],
  negacao: ["p∧q", "p∨q", "p→q", "p↔q", "p⊻q", "p∧~q", "~p∨q", "(p∧q)→r"],
  equiv: ["p→q", "p↔q", "p∧q", "p∨q", "p⊻q", "~p→q"],
  argumento: ["p→q;p/q", "p→q;~q/~p", "p→q;q/p", "p→q;~p/~q", "p→q;q→r/p→r", "p∨q;~p/q", "p∧q/p", "p/p∨q"],
  quant: ["todo|policial|atento", "algum|aluno|aprovado", "nenhum|gato|preto", "algumnao|número|par", "todo|juiz|justo", "algum|carro|veloz"],
};
export const aleatorioLog = (tipo: TipoEsqueleto, rnd: () => number = Math.random): string | null => { const l = POOL[tipo]; return l ? l[Math.floor(rnd() * l.length)]! : null; };

function lerArgumento(src: string): { prem: F[]; conc: F } | null {
  const [pa, ca] = src.split(/\/|⊢|∴|\|-/);
  if (pa === undefined || ca === undefined) return null;
  const prem = pa.split(";").filter((x) => x.trim()).map(parse);
  const conc = parse(ca);
  return prem.length && prem.every(Boolean) && conc ? { prem: prem as F[], conc } : null;
}
function lerValor(src: string): { asg: Record<string, boolean>; f: F } | null {
  const [a, fs] = src.split(";");
  if (!a || !fs) return null;
  const asg: Record<string, boolean> = {};
  for (const par of a.split(",")) { const m = /^\s*([pqrstu])\s*=\s*([VFvf])\s*$/.exec(par); if (!m) return null; asg[m[1]!] = m[2]!.toUpperCase() === "V"; }
  const f = parse(fs);
  if (!f || variaveis(f).some((x) => asg[x] === undefined)) return null;
  return { asg, f };
}

/** A tabela cabe na largura de um celular (360) sem passar do tamanho mínimo legível? */
function cabe(tipo: TipoEsqueleto, entrada: string): boolean {
  const e = montarLog(tipo, entrada, 360, () => ({ asc: 0.7, desc: 0, w: 0.6 }), 600);
  return !!e && e.casas.every((k) => k.x0 >= 0 && k.x1 <= 362);
}

export function validarLog(tipo: TipoEsqueleto, entrada: string): string | null | undefined {
  const ruim = (m: string) => m;
  switch (tipo) {
    case "tabela": { const f = parse(entrada); return !f ? ruim("Digite a proposição, ex.: (p∨q)→r  (use ~ ∧ ∨ → ↔)") : variaveis(f).length > 3 ? ruim("Use até 3 letras (p, q, r).") : cabe(tipo, entrada) ? null : ruim("Fórmula grande demais para a lousa: use menos conectivos."); }
    case "negacao": case "equiv": return parse(entrada) ? null : ruim("Digite a proposição, ex.: p→q");
    case "valor": return lerValor(entrada) ? null : ruim("Formato: p=V,q=F;(p∨q)→~q");
    case "argumento": { const a = lerArgumento(entrada); return !a ? ruim("Formato: p→q;p/q  (premissas separadas por ; e a conclusão depois da /)") : variaveis(...a.prem, a.conc).length > 3 ? ruim("Use até 3 letras.") : cabe(tipo, entrada) ? null : ruim("Argumento grande demais para a lousa."); }
    case "quant": return /^(todo|algum|nenhum|algumnao)\|[^|]+\|[^|]+$/.test(entrada) ? null : ruim("Use o botão Novo para sortear outra frase.");
    default: return undefined;
  }
}

const unico = <T,>(a: T[]) => [...new Set(a)];

/** Tabela de linhas e colunas V/F, preenchida passo a passo. */
function tabela(tipo: TipoEsqueleto, titulo: string, resposta: string, entrada: string, cols: Col[], passos: Passo[], nL: number, classif: { opcoes: string[]; esperado: string; passo: Passo }, larg: number, med: Medidor, alt: number): Esqueleto {
  const w = cols.map((k) => Math.max(1, k.cab.length) + 1);
  const somaW = w.reduce((a, x) => a + x, 0);
  const unidL = Math.max(somaW, 12) + 1;
  const size = Math.max(14, Math.min(40, Math.floor((larg - 24) / (unidL * med("0").w * 1.15)), Math.floor((alt - 36) / (1.3 + (nL + 5) * 1.4))));
  const b = new Montador(med, size, med("0").w * size * 1.15);
  const { cw } = b, lh = size * 1.4, ox = Math.max(12, (larg - somaW * cw) / 2), t0 = size * 1.3;
  const ps = passos.map((p) => b.passo(p.titulo, p.texto, p.porque, p.dica));
  const pLinhas = ps[0]!, pClasse = b.passo(classif.passo.titulo, classif.passo.texto, classif.passo.porque, classif.passo.dica);
  b.txt("linhas =", ox, t0);
  b.casa(pLinhas, ox + 9 * cw, t0, String(nL).length, String(nL), "esq");
  const hb = t0 + lh * 1.25;
  let x = ox;
  const xs: number[] = [];
  cols.forEach((k, j) => { xs.push(x); b.txt(k.cab, x + ((w[j]! - k.cab.length) / 2) * cw, hb); x += w[j]! * cw; });
  b.linha(ox - 4, hb + 9, ox + somaW * cw + 4, hb + 9, 1);
  const primeiraDerivada = cols.findIndex((k) => k.p !== cols[0]!.p);
  if (primeiraDerivada > 0) { const xv = xs[primeiraDerivada]! - 2; b.linha(xv, hb - size, xv, hb + lh * nL + 8, 2); }
  // casas: cada passo recebe as colunas dele, de cima para baixo
  const ordem = unico(cols.map((k) => k.p));
  for (const p of ordem) cols.forEach((k, j) => {
    if (k.p !== p) return;
    for (let r = 0; r < nL; r++) b.casa(ps[p]!, xs[j]! + ((w[j]! - 1) / 2) * cw, hb + lh * (r + 1), 1, VF(k.vals[r]!), "esq");
  });
  b.txt("resultado:", ox, hb + lh * (nL + 1.5));
  const ca = b.casa(pClasse, Math.min(ox, larg - 12 - 12 * cw), hb + lh * (nL + 2.6), 12, classif.esperado, "esq");
  ca.opcoes = classif.opcoes;
  const e = b.pronto(tipo, [], titulo, resposta);
  e.entrada = entrada;
  return e;
}

const dicaDaTabela = "Confira linha por linha com a regra do conectivo.";

function montarTabela(entrada: string, larg: number, med: Medidor, alt: number): Esqueleto | null {
  const f = parse(entrada); if (!f) return null;
  const vars = variaveis(f), subs = subformulas(f), rs = linhas(vars), n = vars.length, nL = rs.length;
  const passos: Passo[] = [
    { titulo: "Quantas linhas?", texto: `Com ${n} letra${n > 1 ? "s" : ""} (${vars.join(", ")}), a tabela-verdade tem 2 elevado a ${n} linhas. Calcule e escreva.`, porque: `2^${n} = ${nL} linhas: cada letra pode ser V ou F, então multiplicamos 2 por ele mesmo ${n} vez${n > 1 ? "es" : ""}.`, dica: `Cada letra dobra o número de linhas: 2${n > 1 ? " × 2".repeat(n - 1) : ""}.` },
    { titulo: `Colunas de ${vars.join(", ")}`, texto: `Preencha as colunas das letras com todas as combinações de V e F. A primeira letra: ${nL / 2} V e depois ${nL / 2} F${n > 1 ? `; a seguinte alterna de ${nL / 4} em ${nL / 4}` : ""}${n > 2 ? "; a última alterna V, F, V, F…" : ""}. Comece sempre com V.`, porque: "Pronto: todas as combinações possíveis de V e F aparecem, sem repetir nenhuma.", dica: "A primeira linha é toda V e a última toda F; cada letra alterna na metade do ritmo da anterior." },
    ...subs.map((s): Passo => {
      const filhos = s.k === "v" ? [] : s.k === "not" ? [s.a] : [s.a, s.b];
      const usa = filhos.map((x) => `a coluna de ${str(x)}`).join(" e ");
      const col = rs.map((a) => ev(s, a)), nv = col.filter(Boolean).length;
      return { titulo: `Coluna ${str(s)}`, texto: `Calcule ${NOME_CONECTIVO[s.k]} ${str(s)} usando ${usa}. ${REGRA[s.k]}`, porque: `Coluna ${str(s)} pronta: ${nv} V e ${nL - nv} F. ${REGRA[s.k]}`, dica: `${REGRA[s.k]} ${dicaDaTabela}` };
    }),
  ];
  const cols: Col[] = [...vars.map((x, i): Col => ({ cab: x, p: 1, vals: rs.map((a) => a[x]!) })), ...subs.map((s, i): Col => ({ cab: str(s), p: 2 + i, vals: rs.map((a) => ev(s, a)) }))];
  const cls = classificar(f);
  const nV = rs.filter((a) => ev(f, a)).length;
  const pq = cls === "TAUTOLOGIA" ? "só tem V na coluna final: é sempre verdadeira." : cls === "CONTRADIÇÃO" ? "só tem F na coluna final: é sempre falsa." : "tem V e F na coluna final: depende dos valores das letras.";
  return tabela("tabela", `Tabela-verdade de ${entrada}`, `${str(f)} é ${cls}`, entrada, cols, passos, nL,
    { opcoes: CLASSES, esperado: cls, passo: { titulo: "Classificação", texto: "Olhe só a coluna final: só V = tautologia; só F = contradição; V e F misturados = contingência. Toque na resposta.", porque: `A coluna final tem ${nV} V e ${nL - nV} F: ${pq} Logo é ${cls}.`, dica: "Tautologia: todas as linhas V. Contradição: todas F. Contingência: as duas aparecem." } }, larg, med, alt);
}

function montarArgumento(entrada: string, larg: number, med: Medidor, alt: number): Esqueleto | null {
  const a = lerArgumento(entrada); if (!a) return null;
  const vars = variaveis(...a.prem, a.conc), rs = linhas(vars), nL = rs.length;
  const todas = rs.map((r) => a.prem.every((p) => ev(p, r)));
  const valido = rs.every((r, i) => !todas[i] || ev(a.conc, r));
  const passos: Passo[] = [
    { titulo: "Quantas linhas?", texto: `Com ${vars.length} letra${vars.length > 1 ? "s" : ""} (${vars.join(", ")}) a tabela tem 2 elevado a ${vars.length} linhas.`, porque: `2^${vars.length} = ${nL} linhas.`, dica: "Cada letra dobra o número de linhas." },
    { titulo: `Colunas de ${vars.join(", ")}`, texto: `Preencha as combinações de V e F das letras: a primeira ${nL / 2} V e ${nL / 2} F; as outras alternam na metade do ritmo. Comece com V.`, porque: "Todas as combinações de V e F estão na tabela.", dica: "A primeira linha é toda V e a última toda F." },
    ...a.prem.map((p, i): Passo => ({ titulo: `Premissa ${i + 1}: ${str(p)}`, texto: `Calcule o valor da premissa ${i + 1} (${str(p)}) em cada linha. ${REGRA[p.k]}`, porque: `Premissa ${i + 1} calculada. ${REGRA[p.k]}`, dica: `${REGRA[p.k]} Confira linha por linha.` })),
    { titulo: "Premissas todas V", texto: "Marque V só nas linhas em que TODAS as premissas são V ao mesmo tempo (são as linhas que importam). Nas demais, F.", porque: `As premissas são todas V em ${todas.filter(Boolean).length} linha(s). Só essas linhas decidem se o argumento é válido.`, dica: "Uma premissa F já basta para a linha ser F." },
    { titulo: `Conclusão: ${str(a.conc)}`, texto: `Calcule o valor da conclusão (${str(a.conc)}) em cada linha. ${REGRA[a.conc.k]}`, porque: "Conclusão calculada para todas as linhas.", dica: `${REGRA[a.conc.k]} Confira linha por linha.` },
  ];
  const cols: Col[] = [
    ...vars.map((x): Col => ({ cab: x, p: 1, vals: rs.map((r) => r[x]!) })),
    ...a.prem.map((p, i): Col => ({ cab: str(p), p: 2 + i, vals: rs.map((r) => ev(p, r)) })),
    { cab: "todas", p: 2 + a.prem.length, vals: todas },
    { cab: str(a.conc), p: 3 + a.prem.length, vals: rs.map((r) => ev(a.conc, r)) },
  ];
  const ruins = rs.map((r, i) => (todas[i] && !ev(a.conc, r) ? i + 1 : 0)).filter(Boolean);
  const cls = valido ? "VÁLIDO" : "INVÁLIDO";
  return tabela("argumento", `Argumento: ${a.prem.map((x) => str(x)).join("; ")} ⊢ ${str(a.conc)}`, `Argumento ${cls}`, entrada, cols, passos, nL,
    { opcoes: ["VÁLIDO", "INVÁLIDO"], esperado: cls, passo: { titulo: "Válido ou inválido?", texto: "Veja só as linhas em que a coluna \"todas\" é V: a conclusão é V em todas elas? Se sim, o argumento é válido. Se aparecer algum F, é inválido.", porque: valido ? "Em todas as linhas em que as premissas são V, a conclusão também é V: argumento VÁLIDO." : `Na linha ${ruins[0]} as premissas são V e a conclusão é F: isso é um contraexemplo, então o argumento é INVÁLIDO.`, dica: "Basta UMA linha com premissas V e conclusão F para o argumento ser inválido." } }, larg, med, alt);
}

function montarValor(entrada: string, larg: number, med: Medidor, alt: number): Esqueleto | null {
  const d = lerValor(entrada); if (!d) return null;
  const subs = subformulas(d.f);
  const dado = Object.entries(d.asg).map(([k, x]) => `${k}=${VF(x)}`).join(", ");
  const calc = new Set<string>();
  const val = (x: F): string => (x.k === "v" ? VF(d.asg[x.n]!) : calc.has(str(x)) ? VF(ev(x, d.asg)) : str(x));
  const blocos: Bloco[] = [{ linhas: [[`Dado: ${dado}`], [`Calcular: ${str(d.f)}`]] }];
  for (const s of subs) {
    const ant = s.k === "not" ? `~${val(s.a)}` : s.k === "v" ? "" : `${val(s.a)}${{ and: "∧", or: "∨", xor: "⊻", imp: "→", bi: "↔" }[s.k]}${val((s as { b: F }).b)}`;
    const r = VF(ev(s, d.asg));
    blocos.push({ passo: { titulo: str(s), texto: `Troque as letras pelos valores dados e calcule ${str(s)}. ${REGRA[s.k]}`, porque: `${ant} = ${r}. ${REGRA[s.k]}`, dica: `${REGRA[s.k]} Aqui os valores são ${ant}.` }, linhas: [[`${str(s)} = `, c(r)]] });
    calc.add(str(s));
  }
  const fin = VF(ev(d.f, d.asg));
  return montarLinhas("valor", [], `Valor lógico de ${str(d.f)}`, `${str(d.f)} é ${fin}`, blocos, larg, med, alt, entrada);
}

function montarNegacao(entrada: string, larg: number, med: Medidor, alt: number): Esqueleto | null {
  const f = parse(entrada); if (!f) return null;
  const { f: nf, regra } = negar(f);
  const alvo = str(nf), vs = variantes(nf);
  const cab = f.k === "v" || f.k === "not" ? `~${str(f)}` : `~(${str(f)})`;
  const blocos: Bloco[] = [
    { linhas: [[`Negar: ${cab}`]] },
    { passo: { titulo: "Aplique a regra da negação", texto: "Aplique a regra de negação do conectivo principal e escreva a nova proposição (use ~ ∧ ∨ → ↔ do teclado).", porque: `${regra}. Resultado: ${alvo}.`, dica: regra },
      linhas: [[`${cab} = `, { c: vs[0]!, alt: vs[1] }]] },
  ];
  return montarLinhas("negacao", [], `Negação de ${str(f)}`, `${cab} = ${alvo}`, blocos, larg, med, alt, entrada);
}

function montarEquiv(entrada: string, larg: number, med: Medidor, alt: number): Esqueleto | null {
  const f = parse(entrada); if (!f) return null;
  const eqs = equivalentes(f);
  if (!eqs.length) return null;
  const blocos: Bloco[] = [{ linhas: [[`Proposição: ${str(f)}`]] }];
  for (const q of eqs) {
    const vs = variantes(q.f);
    blocos.push({ passo: { titulo: q.nome, texto: `Escreva uma proposição equivalente usando a regra: ${q.nome}.`, porque: q.porque, dica: q.porque }, linhas: [[`${str(f)} ≡ `, { c: vs[0]!, alt: vs[1] }]] });
  }
  return montarLinhas("equiv", [], `Equivalências de ${str(f)}`, `${str(f)} ≡ ${eqs.map((q) => str(q.f)).join(" ≡ ")}`, blocos, larg, med, alt, entrada);
}

const NEG_Q: Record<string, { q: string; cop: string; regra: string }> = {
  todo: { q: "Algum", cop: "não é", regra: "A negação de \"Todo X é Y\" é \"Algum X não é Y\": basta UM caso fora da regra para ela cair." },
  algum: { q: "Nenhum", cop: "é", regra: "A negação de \"Algum X é Y\" é \"Nenhum X é Y\": se não existe nenhum, o \"algum\" é falso." },
  nenhum: { q: "Algum", cop: "é", regra: "A negação de \"Nenhum X é Y\" é \"Algum X é Y\": basta existir UM para a afirmação cair." },
  algumnao: { q: "Todo", cop: "é", regra: "A negação de \"Algum X não é Y\" é \"Todo X é Y\": se nenhum deixa de ser, então todos são." },
};
function montarQuant(entrada: string, larg: number, med: Medidor, alt: number): Esqueleto | null {
  const [k, x, y] = entrada.split("|");
  const n = k && NEG_Q[k];
  if (!n || !x || !y) return null;
  const orig = { todo: `Todo ${x} é ${y}`, algum: `Algum ${x} é ${y}`, nenhum: `Nenhum ${x} é ${y}`, algumnao: `Algum ${x} não é ${y}` }[k as "todo"];
  const blocos: Bloco[] = [
    { linhas: [[`Negar: "${orig}"`]] },
    { passo: { titulo: "Troque o quantificador", texto: "A negação troca o quantificador por outro: Todo ⇄ Algum / Nenhum. Toque no quantificador certo.", porque: `${n.regra}`, dica: n.regra }, linhas: [[{ c: n.q, opcoes: ["Todo", "Algum", "Nenhum"] }, ` ${x} `]] },
    { passo: { titulo: "Ajuste a afirmação", texto: "Veja se a frase continua afirmando (é) ou passa a negar (não é).", porque: `Fica: "${n.q} ${x} ${n.cop} ${y}".`, dica: n.regra }, linhas: [[`${n.q} ${x} `, { c: n.cop, opcoes: ["é", "não é"] }, ` ${y}`]] },
  ];
  return montarLinhas("quant", [], `Negação: ${orig}`, `${n.q} ${x} ${n.cop} ${y}`, blocos, larg, med, alt, entrada);
}

export function montarLog(tipo: TipoEsqueleto, entrada: string, larg: number, med: Medidor, alt: number): Esqueleto | null {
  switch (tipo) {
    case "tabela": return montarTabela(entrada, larg, med, alt);
    case "argumento": return montarArgumento(entrada, larg, med, alt);
    case "valor": return montarValor(entrada, larg, med, alt);
    case "negacao": return montarNegacao(entrada, larg, med, alt);
    case "equiv": return montarEquiv(entrada, larg, med, alt);
    case "quant": return montarQuant(entrada, larg, med, alt);
    default: return null;
  }
}
