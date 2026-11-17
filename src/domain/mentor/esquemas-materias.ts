import { linhaSchema, type ItemDesenho, type LinhaLousa } from "./lousa";

/** Esquemas por matéria (Matemática, Português, Informática, Direitos, CTB, Geopolítica…): desenhos do mini-quadro 400×(140+). */
type Cor = "grafite" | "vermelho" | "azul" | "verde" | "laranja" | "roxo" | "rosa";
const L = (rabisco: ItemDesenho[]): LinhaLousa => linhaSchema.parse({ tipo: "desenho", texto: "", nivel: 1, rabisco });
const tx = (x: number, y: number, s: string, cor: Cor, tam?: number): ItemDesenho => ({ t: "texto", x: Math.max(0, Math.round(x)), y: Math.round(y), s: s.slice(0, 40), cor, tam });
const lin = (x1: number, y1: number, x2: number, y2: number, cor: Cor = "grafite", seta?: boolean): ItemDesenho => ({ t: "linha", x1: Math.max(0, Math.round(x1)), y1: Math.round(y1), x2: Math.max(0, Math.round(x2)), y2: Math.round(y2), cor, seta });
const ret = (x: number, y: number, w: number, h: number, cor: Cor): ItemDesenho => ({ t: "ret", x: Math.max(0, Math.round(x)), y: Math.round(y), w: Math.round(w), h: Math.round(h), cor });
const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const CICLO: Cor[] = ["azul", "vermelho", "verde", "laranja", "roxo"];

/** Caixa com texto centralizado. */
function caixa(x: number, y: number, w: number, h: number, s: string, cor: Cor, tam = 14): ItemDesenho[] {
  const cw = tam * 0.56;
  return [ret(x, y, w, h, cor), tx(x + Math.max(2, (w - s.length * cw) / 2), y + h / 2 + tam * 0.33, s, cor, tam)];
}

/** Etapas ligadas por setas: na horizontal (até 4) ou em coluna (5 ou mais). */
export function fluxo(rotulos: string[], cores: Cor[] = CICLO): LinhaLousa {
  const n = rotulos.length;
  const it: ItemDesenho[] = [];
  if (n <= 4) {
    const gap = 24, w = (372 - (n - 1) * gap) / n;
    rotulos.forEach((r, i) => {
      const x = 14 + i * (w + gap);
      it.push(...caixa(x, 46, w, 46, r, cores[i % cores.length]!, w < 90 ? 11 : 14));
      if (i < n - 1) it.push(lin(x + w + 3, 69, x + w + gap - 3, 69, "grafite", true));
    });
  } else {
    rotulos.slice(0, 6).forEach((r, i) => {
      const y = 8 + i * 36;
      it.push(...caixa(90, y, 220, 26, r, cores[i % cores.length]!, 14));
      if (i < Math.min(n, 6) - 1) it.push(lin(200, y + 28, 200, y + 35, "grafite", true));
    });
  }
  return L(it);
}

/** Itens lado a lado, sem setas (classificações: "são três: A, B e C"). */
export function colunas(rotulos: string[]): LinhaLousa {
  const n = rotulos.length;
  const it: ItemDesenho[] = [];
  if (n <= 3) {
    const w = (372 - (n - 1) * 14) / n;
    rotulos.forEach((r, i) => it.push(...caixa(14 + i * (w + 14), 40, w, 50, r, CICLO[i]!, w < 100 ? 12 : 14)));
  } else {
    rotulos.slice(0, 6).forEach((r, i) => it.push(...caixa(90, 8 + i * 34, 220, 26, r, CICLO[i % 5]!, 14)));
  }
  return L(it);
}

/** Pirâmide / camadas: do topo (estreito) para a base (largo). */
function pilha(rotulos: string[], cores: Cor[] = CICLO): LinhaLousa {
  const n = rotulos.length;
  const it: ItemDesenho[] = [];
  rotulos.forEach((r, i) => {
    const w = 110 + (i * 230) / Math.max(1, n - 1);
    it.push(...caixa(200 - w / 2, 8 + i * 28, w, 24, r, cores[i % cores.length]!, 13));
  });
  return L(it);
}

/** Degraus subindo/descendo (blocos econômicos, regimes de pena). */
function degraus(rotulos: string[]): LinhaLousa {
  const n = rotulos.length;
  const it: ItemDesenho[] = [];
  rotulos.forEach((r, i) => {
    const x = 10 + (i * 200) / Math.max(1, n - 1), y = 8 + i * 28;
    it.push(...caixa(x, y, 170, 24, r, CICLO[i % 5]!, 13));
  });
  return L(it);
}

function barras(itens: { rot: string; v: number; cor: Cor }[]): LinhaLousa {
  const max = Math.max(...itens.map((i) => i.v));
  const w = Math.min(54, 340 / itens.length - 16);
  const it: ItemDesenho[] = [lin(14, 112, 390, 112)];
  itens.forEach((b, i) => {
    const x = 34 + i * (340 / itens.length), h = (b.v / max) * 76;
    it.push(ret(x, 112 - h, w, h, b.cor), tx(x + 4, 112 - h - 6, String(b.v), b.cor, 15), tx(x - 4, 130, b.rot, "grafite", 10));
  });
  return L(it);
}

function formula(linhas: { s: string; cor: Cor }[], legenda?: string): LinhaLousa {
  const it: ItemDesenho[] = [];
  linhas.forEach((l, i) => it.push(tx(30, 34 + i * 34, l.s, l.cor, 22)));
  if (legenda) it.push(tx(30, 34 + linhas.length * 34 + 4, legenda, "grafite", 13));
  return L(it);
}

function fracao(titulo: string, cima: string, baixo: string, nota?: string): LinhaLousa {
  const w = Math.max(cima.length, baixo.length) * 9.5;
  const it: ItemDesenho[] = [tx(24, 76, titulo, "laranja", 20), tx(24 + titulo.length * 12 + 8, 60, cima, "azul", 17), lin(24 + titulo.length * 12 + 4, 68, 24 + titulo.length * 12 + 12 + w, 68, "grafite"), tx(24 + titulo.length * 12 + 8, 92, baixo, "vermelho", 17)];
  if (nota) it.push(tx(24, 124, nota, "grafite", 13));
  return L(it);
}

function venn(): LinhaLousa {
  return L([
    { t: "circ", cx: 150, cy: 72, r: 54, cor: "azul" }, { t: "circ", cx: 215, cy: 72, r: 54, cor: "vermelho" },
    tx(100, 76, "só A", "azul", 13), tx(170, 76, "A∩B", "roxo", 12), tx(224, 76, "só B", "vermelho", 13),
    tx(110, 22, "A", "azul", 20), tx(246, 22, "B", "vermelho", 20),
    tx(284, 70, "A ∪ B = tudo", "verde", 13), tx(284, 90, "que está em", "verde", 13), tx(284, 108, "A ou em B", "verde", 13),
  ]);
}

function balanca(op: "+" | "−", a: number, b: number): LinhaLousa {
  const x = op === "+" ? b - a : b + a;
  return L([
    lin(50, 52, 350, 52), lin(200, 52, 178, 116), lin(200, 52, 222, 116), lin(176, 116, 224, 116),
    lin(80, 52, 56, 82), lin(80, 52, 104, 82), lin(48, 82, 112, 82, "azul"), tx(58, 44, `x ${op} ${a}`, "azul", 18),
    lin(320, 52, 296, 82), lin(320, 52, 344, 82), lin(288, 82, 352, 82, "vermelho"), tx(305, 44, String(b), "vermelho", 18),
    tx(130, 136, `x = ${x}`, "verde", 22),
  ]);
}

function geometria(forma: string, n: number[]): LinhaLousa | null {
  if (forma === "retangulo" && n.length >= 2) {
    const [a, b] = [n[0]!, n[1]!];
    const w = Math.max(60, Math.min(190, (a / Math.max(a, b)) * 190)), h = Math.max(40, Math.min(100, (b / Math.max(a, b)) * 100));
    return L([ret(30, 24, w, h, "azul"), tx(30 + w / 2 - 6, 18, String(a), "azul", 16), tx(36 + w, 24 + h / 2 + 6, String(b), "vermelho", 16), tx(250, 50, `A = ${a} · ${b} = ${a * b}`, "verde", 15), tx(250, 84, `P = 2·(${a}+${b}) = ${2 * (a + b)}`, "laranja", 15)]);
  }
  if (forma === "quadrado" && n.length >= 1) {
    const a = n[0]!;
    return L([ret(40, 20, 90, 90, "azul"), tx(78, 16, String(a), "azul", 16), tx(140, 70, "lado", "azul", 13), tx(200, 50, `A = ${a}² = ${a * a}`, "verde", 15), tx(200, 84, `P = 4·${a} = ${4 * a}`, "laranja", 15)]);
  }
  if (forma === "triangulo" && n.length >= 2) {
    const [b, h] = [n[0]!, n[1]!];
    return L([lin(30, 112, 190, 112, "azul"), lin(30, 112, 110, 22, "azul"), lin(190, 112, 110, 22, "azul"), lin(110, 22, 110, 112, "vermelho"), tx(100, 130, `base ${b}`, "azul", 14), tx(118, 100, `h = ${h}`, "vermelho", 14), tx(220, 58, `A = ${b}·${h} / 2`, "verde", 15), tx(220, 90, `A = ${(b * h) / 2}`, "verde", 15)]);
  }
  if (forma === "circulo" && n.length >= 1) {
    const r = n[0]!;
    return L([{ t: "circ", cx: 100, cy: 70, r: 52, cor: "azul" }, lin(100, 70, 152, 70, "vermelho"), tx(116, 62, `r = ${r}`, "vermelho", 14), tx(190, 50, "A = π · r²", "verde", 16), tx(190, 84, `A ≈ ${(3.14 * r * r).toFixed(2).replace(/\.?0+$/, "")}`, "verde", 16), tx(190, 116, "C = 2 · π · r", "laranja", 15)]);
  }
  return null;
}

function tabelaVerdade(op: "e" | "ou" | "se"): LinhaLousa {
  const lin_ = [[true, true], [true, false], [false, true], [false, false]];
  const f = (p: boolean, q: boolean) => (op === "e" ? p && q : op === "ou" ? p || q : !p || q);
  const sim = op === "e" ? "p ∧ q" : op === "ou" ? "p ∨ q" : "p → q";
  const it: ItemDesenho[] = [tx(30, 24, "p", "azul", 18), tx(90, 24, "q", "azul", 18), tx(160, 24, sim, "roxo", 18), lin(14, 32, 250, 32), lin(140, 8, 140, 126)];
  lin_.forEach(([p, q], i) => {
    const y = 56 + i * 24, r = f(p!, q!);
    it.push(tx(30, y, p ? "V" : "F", p ? "verde" : "vermelho", 18), tx(90, y, q ? "V" : "F", q ? "verde" : "vermelho", 18), tx(176, y, r ? "V" : "F", r ? "verde" : "vermelho", 18));
  });
  return L(it);
}

interface Tpl { re: RegExp; chave: string; build: (s: string, frase: string) => LinhaLousa | null }
const num = (s: string) => [...s.matchAll(/\d+(?:[.,]\d+)?/g)].map((m) => Number(m[0].replace(",", ".")));

const TEMPLATES: Tpl[] = [
  // ── Matemática / raciocínio lógico ──
  { chave: "venn", re: /\bdiagramas? de venn\b|\bintersecca?o\b|\buniao de conjuntos|\bconjuntos? a e b\b/, build: () => venn() },
  { chave: "balanca", re: /\bx (mais|menos) (\d+),? (?:e|é)? ?igual a (\d+)/, build: (s) => { const m = /\bx (mais|menos) (\d+),? (?:e|é)? ?igual a (\d+)/.exec(s)!; return balanca(m[1] === "mais" ? "+" : "−", Number(m[2]), Number(m[3])); } },
  { chave: "geo-ret", re: /\bretangulo\b.*\d+.*\d+/, build: (s) => geometria("retangulo", num(s)) },
  { chave: "geo-quad", re: /\bquadrado\b.*\d+/, build: (s) => geometria("quadrado", num(s)) },
  { chave: "geo-tri", re: /\btriangulo\b.*\d+.*\d+/, build: (s) => geometria("triangulo", num(s)) },
  { chave: "geo-circ", re: /\b(circulo|circunferencia)\b.*\d+/, build: (s) => geometria("circulo", num(s)) },
  { chave: "tv-ou", re: /\bdisjuncao\b|\btabela[- ]verdade (do|da|de) ou\b/, build: () => tabelaVerdade("ou") },
  { chave: "tv-se", re: /\bproposicao condicional\b|\bimplicacao\b|\bp implica q\b/, build: () => tabelaVerdade("se") },
  { chave: "tv-e", re: /\btabela[- ]verdade\b|\bconjuncao logica\b|\bproposic[a-z]*\b.*\bconjuncao\b/, build: () => tabelaVerdade("e") },
  { chave: "juros-s", re: /\bjuros simples\b/, build: () => formula([{ s: "J = C · i · t", cor: "azul" }, { s: "M = C + J", cor: "verde" }], "C capital · i taxa · t tempo · M montante") },
  { chave: "juros-c", re: /\bjuros compostos\b/, build: () => formula([{ s: "M = C · (1 + i)ᵗ", cor: "azul" }, { s: "J = M − C", cor: "verde" }], "C capital · i taxa · t tempo") },
  { chave: "bhaskara", re: /\bbhaskara\b|\bequacao do (2|segundo) grau\b/, build: () => formula([{ s: "Δ = b² − 4·a·c", cor: "vermelho" }, { s: "x = (−b ± √Δ) / 2a", cor: "azul" }], "a, b e c: coeficientes da equação") },
  { chave: "prob", re: /\bprobabilidade\b/, build: () => fracao("P =", "casos favoráveis", "casos possíveis", "probabilidade vai de 0 a 1") },
  { chave: "media", re: /\bmedia aritmetica\b/, build: () => fracao("M =", "soma dos valores", "quantidade de valores") },
  { chave: "vm", re: /\bvelocidade media\b/, build: () => fracao("Vm =", "distância percorrida", "tempo gasto") },
  { chave: "comb", re: /\banalise combinatoria\b|\bpermutac[a-z]*\b|\bcombinac[a-z]*\b|\barranjos?\b|\bfatorial\b/, build: () => formula([{ s: "P = n!", cor: "azul" }, { s: "A = n! / (n − p)!", cor: "vermelho" }, { s: "C = n! / [p!·(n − p)!]", cor: "verde" }]) },
  { chave: "prop", re: /\bproporc(ao|oes)\b(?!.*regra de tres)/, build: () => L([tx(30, 44, "a / b  =  c / d", "azul", 26), tx(30, 88, "a · d = b · c", "verde", 22), tx(30, 120, "(multiplica em cruz)", "grafite", 13)]) },
  // ── Direito Penal / Processual Penal ──
  { chave: "crime", re: /\bconceito analitico\b|\bfato tipico\b|\bteoria tripartite\b|\bsubstrato\b/, build: () => fluxo(["Fato típico", "Ilicitude", "Culpabilidade"], ["azul", "vermelho", "verde"]) },
  { chave: "iter", re: /\biter criminis\b/, build: () => fluxo(["Cogitação", "Preparação", "Execução", "Consumação"]) },
  { chave: "regime", re: /\bregime (fechado|semiaberto|aberto)\b|\bprogressao de regime\b/, build: () => degraus(["Fechado", "Semiaberto", "Aberto"]) },
  { chave: "processo", re: /\binquerito policial\b|\bfases do processo\b|\bprocesso penal comeca\b/, build: () => fluxo(["Inquérito", "Denúncia", "Instrução", "Sentença"]) },
  // ── Direito Constitucional / Administrativo / Humanos ──
  { chave: "kelsen", re: /\bpiramide de kelsen\b|\bhierarquia das normas\b|\bhierarquia das leis\b/, build: () => pilha(["Constituição", "Leis e emendas", "Decretos", "Portarias"]) },
  { chave: "poderes", re: /\bseparacao dos poderes\b|\btres poderes\b/, build: () => colunas(["Legislativo", "Executivo", "Judiciário"]) },
  { chave: "limpe", re: /\blimpe\b|\bprincipios (expressos )?da administracao\b/, build: () => L(["L", "I", "M", "P", "E"].flatMap((l, i) => [ret(14 + i * 76, 24, 66, 52, CICLO[i]!), tx(34 + i * 76, 62, l, CICLO[i]!, 32)]).concat(["Legalidade", "Impessoal.", "Moralidade", "Publicidade", "Eficiência"].map((n, i) => tx(16 + i * 76, 96, n, "grafite", 11)))) },
  { chave: "entes", re: /\bentes federativos\b|\bfederacao\b/, build: () => L([...caixa(150, 6, 100, 28, "União", "azul", 15), lin(200, 36, 80, 56), lin(200, 36, 200, 56), lin(200, 36, 320, 56), ...caixa(30, 58, 100, 28, "Estados", "vermelho", 14), ...caixa(150, 58, 100, 28, "DF", "verde", 14), ...caixa(270, 58, 100, 28, "Municípios", "laranja", 14), tx(90, 112, "autonomia política e financeira", "grafite", 12)]) },
  { chave: "adm", re: /\badministracao (direta|indireta)\b/, build: () => L([...caixa(130, 6, 140, 26, "Administração", "azul", 14), lin(200, 34, 90, 52), lin(200, 34, 310, 52), ...caixa(30, 54, 120, 26, "Direta", "verde", 14), ...caixa(250, 54, 120, 26, "Indireta", "vermelho", 14), tx(24, 100, "União, Estados,", "grafite", 12), tx(24, 118, "DF e Municípios", "grafite", 12), tx(214, 100, "autarquias, fundações,", "grafite", 12), tx(214, 118, "empresas e sociedades", "grafite", 12)]) },
  { chave: "dimensoes", re: /\b(geracoes|dimensoes) (dos |de )?direitos\b/, build: () => fluxo(["1ª Liberdade", "2ª Igualdade", "3ª Fraternidade"], ["azul", "vermelho", "verde"]) },
  // ── CTB ──
  { chave: "infracoes", re: /\binfracoes? (leve|media|grave|gravissima)|\bpontos? (na|da) cnh\b|\bgravissima\b/, build: () => barras([{ rot: "Leve", v: 3, cor: "verde" }, { rot: "Média", v: 4, cor: "azul" }, { rot: "Grave", v: 5, cor: "laranja" }, { rot: "Gravíss.", v: 7, cor: "vermelho" }]) },
  { chave: "velocidade", re: /\bvelocidade maxima\b|\bvias urbanas\b|\bvia (local|coletora|arterial)\b/, build: () => barras([{ rot: "Local", v: 30, cor: "verde" }, { rot: "Coletora", v: 40, cor: "azul" }, { rot: "Arterial", v: 60, cor: "laranja" }, { rot: "Trân. rápido", v: 80, cor: "vermelho" }]) },
  // ── Informática ──
  { chave: "bytes", re: /\b(byte|kilobyte|megabyte|gigabyte|terabyte)s?\b|\bkb\b|\bmb\b|\bgb\b/, build: () => L(["B", "KB", "MB", "GB", "TB"].flatMap((u, i) => [...caixa(10 + i * 78, 50, 52, 36, u, CICLO[i]!, 16), ...(i < 4 ? [lin(64 + i * 78, 68, 86 + i * 78, 68, "grafite", true), tx(62 + i * 78, 44, "×1024", "grafite", 10)] : [])])) },
  { chave: "osi", re: /\bmodelo osi\b|\bcamadas (do modelo|osi)\b/, build: () => pilha(["Aplicação", "Apresentação", "Sessão", "Transporte", "Rede", "Enlace", "Física"]) },
  { chave: "es", re: /\bdispositivos? de entrada\b|\bentrada e saida\b|\bentrada, processamento\b/, build: () => fluxo(["Entrada", "Processamento", "Saída"], ["azul", "vermelho", "verde"]) },
  // ── Geopolítica ──
  { chave: "blocos", re: /\bblocos? economicos?\b|\bintegracao economica\b/, build: () => degraus(["Zona livre com.", "União aduaneira", "Mercado comum", "União econômica", "Integr. total"]) },
  { chave: "cardeais", re: /\bpontos cardeais\b|\brosa dos ventos\b/, build: () => L([{ t: "circ", cx: 200, cy: 72, r: 46, cor: "grafite" }, lin(200, 22, 200, 122, "vermelho"), lin(150, 72, 250, 72, "azul"), tx(194, 16, "N", "vermelho", 18), tx(194, 140, "S", "azul", 18), tx(252, 78, "L", "verde", 18), tx(128, 78, "O", "laranja", 18)]) },
  // ── Língua Portuguesa ──
  { chave: "sujpred", re: /\bsujeito\b.*\bpredicado\b|\bpredicado\b.*\bsujeito\b/, build: () => L([...caixa(14, 30, 170, 42, "Sujeito", "azul", 18), ...caixa(216, 30, 170, 42, "Predicado", "vermelho", 18), lin(186, 51, 214, 51, "grafite", true), tx(26, 100, "quem pratica ou", "azul", 13), tx(26, 118, "sofre a ação", "azul", 13), tx(228, 100, "o que se diz", "vermelho", 13), tx(228, 118, "sobre o sujeito", "vermelho", 13)]) },
  { chave: "periodo", re: /\bcoordenac[a-z]*\b.*\bsubordinac[a-z]*\b|\bsubordinac[a-z]*\b.*\bcoordenac[a-z]*\b|\bperiodo composto\b/, build: () => L([...caixa(14, 20, 170, 40, "Coordenação", "azul", 16), ...caixa(216, 20, 170, 40, "Subordinação", "vermelho", 16), tx(22, 86, "orações independentes", "azul", 13), tx(22, 106, "ligadas por conjunção", "azul", 13), tx(224, 86, "uma depende da outra", "vermelho", 13), tx(224, 106, "(principal + subord.)", "vermelho", 13)]) },
  { chave: "crase", re: /\bcrase\b/, build: () => L([tx(20, 60, "a", "azul", 28), tx(44, 52, "prep.", "azul", 12), tx(86, 60, "+", "grafite", 28), tx(120, 60, "a", "vermelho", 28), tx(144, 52, "artigo", "vermelho", 12), tx(204, 60, "=", "grafite", 28), tx(240, 60, "à", "verde", 34), tx(20, 104, "crase = fusão da preposição com o artigo", "grafite", 13)]) },
];

/** Esquema da matéria para a frase (uma vez por conceito); `usadas` evita repetir. */
export function materiaDe(frase: string, usadas: Set<string>): LinhaLousa | null {
  const s = norm(frase);
  for (const t of TEMPLATES) {
    if (usadas.has(t.chave) || !t.re.test(s)) continue;
    const d = t.build(s, frase);
    if (d) { usadas.add(t.chave); return d; }
  }
  return null;
}

const NUMEROS: Record<string, number> = { dois: 2, duas: 2, tres: 3, quatro: 4, cinco: 5 };
const limpaRot = (r: string) => {
  const ws = r.replace(/^(?:o|a|os|as|um|uma|de|do|da)\s+/i, "").replace(/[.;!?]+$/, "").trim().split(/\s+/);
  let out = "";
  for (const w of ws.slice(0, 3)) { if ((out ? `${out} ${w}` : w).length > 18) break; out = out ? `${out} ${w}` : w; }
  return out || ws[0]!.slice(0, 16);
};

/** "São três: legislativo, executivo e judiciário" → colunas com os itens (qualquer matéria). */
export function listaDe(frase: string): LinhaLousa | null {
  const s = norm(frase);
  const m = /(?:sao|existem|temos|ha|dividem-se em|classificam-se em)\s+(dois|duas|tres|quatro|cinco)\b[^:]*:/.exec(s);
  if (!m) return null;
  const itens = frase.slice(m.index + m[0].length).split(/,|;|\se\s/).map(limpaRot).filter((x) => x.length >= 2);
  const n = NUMEROS[m[1]!] ?? itens.length;
  return itens.length >= 2 && itens.length <= 5 && Math.abs(itens.length - n) <= 1 ? colunas(itens) : null;
}

const ORD = /^(?:primeiro|primeiramente|segundo|terceiro|quarto|quinto|depois|em seguida|a seguir|por fim|finalmente|por ultimo)\b[,\s]*/i;
/** Etapa citada ("Primeiro, a denúncia…") → rótulo curto, ou null. */
export function etapaDe(frase: string): string | null {
  const f = frase.trim();
  if (!ORD.test(norm(f))) return null;
  const r = limpaRot(f.replace(/^[^\s,]+(?:\s+(?:seguir|ultimo|último))?[,\s]*/i, ""));
  return r.length >= 3 ? r : null;
}
