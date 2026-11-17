import { z } from "zod";

/** Só abre o quadro quando o aluno pede explicitamente para escrever/desenhar/mostrar no quadro; explicar e dar exemplo falado não abre. */
const GATILHO = /(\besquema|\bdiagrama|linha do tempo|mapa mental|\bquadro\b|\blousa\b|desenh|rabisc|ilustr|\bescrev(a|e|er|endo)\b|\banot(a|e|ar|ando)\b|exemplo (escrito|desenhado)|mostr\w+ (por escrito|desenhando|na tela)|passo a passo (escrito|no quadro))/i;
export const pedeLousa = (fala: string): boolean => fala.trim().length >= 8 && GATILHO.test(fala);

const COR = z.enum(["grafite", "vermelho", "azul", "verde", "laranja", "roxo", "rosa"]);
const n = z.number().min(0).max(1000);

/** Desenho em 400×260: só primitivas simples, desenhadas pelo nosso componente (nunca SVG vindo da IA). */
export const itemDesenho = z.discriminatedUnion("t", [
  z.object({ t: z.literal("linha"), d: z.number().min(0).max(30).optional(), x1: n, y1: n, x2: n, y2: n, seta: z.boolean().optional(), cor: COR.optional() }),
  z.object({ t: z.literal("ret"), d: z.number().min(0).max(30).optional(), x: n, y: n, w: n, h: n, cor: COR.optional() }),
  z.object({ t: z.literal("circ"), d: z.number().min(0).max(30).optional(), cx: n, cy: n, r: n, cor: COR.optional() }),
  z.object({ t: z.literal("curva"), d: z.number().min(0).max(30).optional(), pts: z.array(z.tuple([n, n])).min(2).max(40), cor: COR.optional() }),
  z.object({ t: z.literal("texto"), d: z.number().min(0).max(30).optional(), x: n, y: n, s: z.string().trim().min(1).max(40), cor: COR.optional(), tam: z.number().min(9).max(40).optional() }),
  /** Emoji ou figura pronta (fruta, número, objeto): x,y é o canto inferior esquerdo; tam em pixels. */
  z.object({ t: z.literal("emoji"), d: z.number().min(0).max(30).optional(), x: n, y: n, s: z.string().trim().min(1).max(8), tam: z.number().min(16).max(90).default(40) }),
]);

const COR_TEXTO = z.enum(["azul", "preto", "vermelho", "verde", "laranja", "roxo", "rosa"]);
export const linhaSchema = z.object({
  /** titulo: grande, no topo; texto: explicação; conta: expressão matemática; resposta: fecho; nota: observação pequena; par: "esq ----- dir" (regra de três, tabelas); espaco: respiro. */
  tipo: z.enum(["titulo", "texto", "conta", "resposta", "nota", "par", "espaco", "figuras", "desenho"]),
  texto: z.string().trim().max(120).default(""),
  /** Só em "par": o lado direito. */
  dir: z.string().trim().max(60).optional(),
  /** Recuo, de 0 a 5. */
  nivel: z.number().int().min(0).max(5).default(0),
  cor: COR_TEXTO.optional(),
  sublinhar: z.enum(["reta", "onda"]).optional(),
  caixa: z.boolean().optional(),
  /** Trecho do texto (ou do lado direito) que ganha um círculo, como o "x" da regra de três. */
  circular: z.string().trim().max(30).optional(),
  marca: z.enum(["ok", "estrela", "seta_baixo", "seta_dir"]).optional(),
  /** O que o professor diz em voz alta enquanto escreve esta linha (uma ou duas frases curtas). Vazio em título e espaços. */
  fala: z.string().trim().max(260).default(""),
  /** tipo "figuras": grupos de emojis desenhados um a um (ex.: 5 maçãs, 8 maçãs) — mostra a quantidade do problema. */
  figuras: z.array(z.object({ e: z.string().trim().min(1).max(8), n: z.number().int().min(1).max(12) })).max(4).optional(),
  /** tipo "desenho": mini-quadro 400x140 desenhado traço a traço junto com esta linha (texto = legenda). */
  rabisco: z.array(itemDesenho).max(200).optional(),
  /** Largura do mini-quadro (padrão 400). Diagramas de ditado usam 1000 (telas largas) ou 460 (celular). */
  larg: z.number().min(300).max(1000).optional(),
  /** Trechos escritos com outra caneta (cor diferente do resto da linha). */
  realce: z.array(z.object({ trecho: z.string().trim().min(1).max(40), cor: COR_TEXTO })).max(4).optional(),
});
export type LinhaLousa = z.infer<typeof linhaSchema>;

export const lousaSchema = z.object({
  mostrar: z.boolean(),
  titulo: z.string().trim().max(80).default(""),
  linhas: z.array(linhaSchema).max(40).default([]),
  desenho: z.array(itemDesenho).max(30).default([]),
});
export type Lousa = z.infer<typeof lousaSchema>;
export type ItemDesenho = z.infer<typeof itemDesenho>;
export const LOUSA_W = 400;
export const LOUSA_H = 260;

/** O Mentor anuncia, falando, que vai anotar/escrever/desenhar no quadro ("vou anotar na lousa", "olha aqui no quadro"). */
export function anunciaLousa(fala: string): boolean {
  const s = fala.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  return /\b(na|a|pra) lousa\b/.test(s) || /\bvou (te )?(anotar|escrever|desenhar|rabiscar|montar|mostrar (a|o) (conta|calculo|exemplo))/.test(s) || /\bdeixa eu (anotar|escrever|desenhar)/.test(s) || /\bno quadro\b/.test(s);
}

/** Roteiro falado, na ordem das linhas: o Mentor lê isto enquanto o quadro vai sendo escrito no mesmo ritmo. */
export function roteiroDe(l: Lousa): { falas: string[]; total: number; texto: string } {
  const falas = l.linhas.map((x) => x.fala.trim());
  const texto = falas.filter(Boolean).map((f, i) => `${i + 1}. ${f}`).join("\n");
  return { falas, total: falas.reduce((a, f) => a + f.length, 0), texto };
}

const PALAVRAS_VAZIAS = new Set("a o as os um uma uns umas de da do das dos em no na nos nas por para pra com e ou que me te se eu voce vc mim meu minha seu sua isso isto esse essa este esta ai la aqui so ja vai vou quero queria pode poder podia favor ensina ensinar ensine explica explicar explique mostra mostrar mostre da dar de exemplo exemplos como faz fazer faco calcula calcular conta contas passo lousa quadro desenha desenhar desenhe um uma sobre ao aos".split(" "));
const NUMEROS: Record<string, string> = { um: "1", dois: "2", tres: "3", quatro: "4", cinco: "5", seis: "6", sete: "7", oito: "8", nove: "9", dez: "10" };

/** Chave estável do pedido (sem acento, sem palavras de enchimento, números por extenso → dígitos, ordem das palavras ignorada). Pedidos parecidos geram a mesma chave. */
export function chaveLousa(pedido: string): string {
  const s = pedido.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9\s]/g, " ");
  const toks = s.split(/\s+/).filter(Boolean).map((w) => NUMEROS[w] ?? w).filter((w) => !PALAVRAS_VAZIAS.has(w) || /^\d+$/.test(w));
  return [...new Set(toks)].sort().join(" ").slice(0, 200);
}

/** Semelhança de Jaccard entre duas chaves (0 a 1). */
export function semelhancaChaves(a: string, b: string): number {
  const A = new Set(a.split(" ").filter(Boolean)), B = new Set(b.split(" ").filter(Boolean));
  if (!A.size || !B.size) return 0;
  let i = 0;
  for (const x of A) if (B.has(x)) i++;
  return i / (A.size + B.size - i);
}

/** Converte os argumentos da chamada de função "lousa_escrever" (feita pelo Mentor ao vivo) em uma linha válida do quadro. */
export function linhaDeChamada(a: Record<string, unknown>): LinhaLousa | null {
  const s = (k: string) => (typeof a[k] === "string" && (a[k] as string).trim() ? (a[k] as string).trim() : undefined);
  const nv = typeof a.nivel === "number" ? Math.max(0, Math.min(5, Math.round(a.nivel))) : 0;
  const emoji = s("emoji");
  const q = typeof a.quantidade === "number" ? Math.max(1, Math.min(12, Math.round(a.quantidade))) : 1;
  const raw: Record<string, unknown> = {
    tipo: s("tipo") ?? "texto",
    texto: s("texto") ?? "",
    dir: s("dir"),
    nivel: nv,
    cor: s("cor"),
    sublinhar: s("sublinhar"),
    caixa: a.caixa === true ? true : undefined,
    circular: s("circular"),
    marca: s("marca"),
    figuras: emoji ? [{ e: emoji, n: q }] : undefined,
    realce: s("realce_trecho") && s("realce_cor") ? [{ trecho: s("realce_trecho"), cor: s("realce_cor") }] : undefined,
  };
  for (const k of Object.keys(raw)) if (raw[k] === undefined) delete raw[k];
  if (raw.tipo === "figuras" && !raw.figuras) raw.tipo = "texto";
  const ok = linhaSchema.safeParse(raw);
  return ok.success ? ok.data : null;
}

const NUM = /\d/;
const CONTA = /\b(vezes|dividido|dividida|mais|menos|igual|multiplic|soma|subtra)\b|[=+×÷·]/i;
const FECHO = /\b(portanto|ent[ãa]o|resultado|resposta|logo|fica|d[áa])\b/i;

/** Escreve a conta como num quadro: "5 vezes x é igual a 8 vezes 20" → "5 · x = 8 · 20". */
function simbolos(s: string): string {
  return s
    .replace(/\s+(é|e|fica|dá)?\s*igual\s+a\s+/gi, " = ")
    .replace(/\s+dividido\s+por\s+/gi, " ÷ ")
    .replace(/\s+vezes\s+/gi, " · ")
    .replace(/\s+mais\s+/gi, " + ")
    .replace(/\s+menos\s+/gi, " − ");
}

/** Título a partir do pedido do aluno ("me dá um exemplo de regra de três no quadro" → "Regra de três"). */
export function tituloDe(pedido: string): string {
  const m = /\b(?:de|da|do|sobre|d[ea]s)\s+([^,.?!]{3,40}?)(?:\s+(?:no|na|em|pra|para|com)\s+(?:o\s+|a\s+)?(?:quadro|lousa)|[,.?!]|$)/i.exec(pedido.replace(/\s+/g, " "));
  const s = (m?.[1] ?? "").replace(/\b(um|uma|exemplo|escrito|desenhado)\b/gi, "").replace(/\s+/g, " ").trim();
  return s ? s.charAt(0).toUpperCase() + s.slice(1, 38) : "Explicação";
}

const CANETAS_CONTA = ["preto", "vermelho", "roxo", "laranja"] as const;
const FIGURAS: [RegExp, string][] = [
  [/ma[çc][ãa]s?/, "🍎"], [/laranjas?/, "🍊"], [/bananas?/, "🍌"], [/peras?/, "🍐"], [/uvas?/, "🍇"], [/bolos?/, "🍰"], [/pizzas?/, "🍕"],
  [/funcion[áa]rios?|oper[áa]rios?|trabalhadores?/, "👷"], [/policiais?|agentes?/, "👮"], [/pessoas?|alunos?|candidatos?|estudantes?/, "🧑"],
  [/viaturas?/, "🚓"], [/carros?/, "🚗"], [/caminh[õo]es|caminh[ãa]o/, "🚚"], [/motos?/, "🏍️"], [/livros?/, "📘"], [/canetas?/, "🖊️"], [/bolas?/, "⚽"],
  [/dias?/, "📅"], [/horas?/, "⏰"],
];

/** Se a frase tem "N coisas" que dá para desenhar (até 12), devolve a linha de figuras. */
export function figurasDe(frase: string): LinhaLousa | null {
  const s = frase.normalize("NFC").toLowerCase();
  for (const [re, e] of FIGURAS) {
    const m = new RegExp(`\\b(\\d{1,2})\\s+(?:${re.source})\\b`, "i").exec(s);
    const n = m ? Number(m[1]) : 0;
    if (n >= 1 && n <= 12) return linhaSchema.parse({ tipo: "figuras", texto: "", nivel: 1, figuras: [{ e, n }] });
  }
  return null;
}

/** Uma frase falada pelo Mentor → linha do quadro (canetas variadas por posição). Devolve null para abertura, fechamento e perguntas. */
export function linhaDeFala(frase: string, primeira: boolean, idx = 0): LinhaLousa | null {
  const f = frase.replace(/\s+/g, " ").replace(/[*_`]/g, "").trim();
  if (f.length < 4) return null;
  const sem = f.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (/\b(ficou claro|ferramentas|salv[ao]|alguma duvida|entendeu)\b/.test(sem) || (f.endsWith("?") && !NUM.test(f))) return null;
  if (primeira && f.length < 28 && /\b(bora|vamos|olha|certo|claro|beleza|pronto|ok)\b/.test(sem)) return null;
  const corta = (s: string) => (s.length > 78 ? `${s.slice(0, 77).replace(/[\s,;:]+\S*$/, "")}…` : s);
  const limpa = f.replace(/[.!]+$/, "");
  if (NUM.test(limpa) && CONTA.test(limpa)) {
    const eh = FECHO.test(sem) && /=|igual|resultado|resposta|portanto/.test(sem) && /\d\s*$/.test(limpa);
    return linhaSchema.parse({ tipo: eh ? "resposta" : "conta", texto: corta(simbolos(limpa.replace(/^(ent[ãa]o|portanto|logo|agora|depois)[, ]+/i, ""))), nivel: 1, cor: eh ? "verde" : CANETAS_CONTA[idx % CANETAS_CONTA.length], caixa: eh || undefined, marca: eh ? "estrela" : undefined });
  }
  const texto = corta(limpa);
  const dest = /\d+(?:[.,]\d+)?\s+[A-Za-zÀ-ú]+/.exec(texto)?.[0]; // "5 maçãs": outra caneta no que importa
  return linhaSchema.parse({ tipo: "texto", texto, nivel: primeira ? 0 : 1, cor: idx % 2 === 0 ? "azul" : "roxo", realce: dest ? [{ trecho: dest, cor: "vermelho" }] : undefined, sublinhar: /\b(quanto|qual|quantos|quantas)\b/.test(sem) ? "reta" : undefined });
}

export const linhaTitulo = (texto: string): LinhaLousa => linhaSchema.parse({ tipo: "titulo", texto, cor: "azul", sublinhar: "onda" });

// ── Esquemas desenhados (sem emojis) a partir do que o Mentor fala ──────────────────────────────
type Forma = { forma: "circ" | "ret" | "linha"; cor: z.infer<typeof COR> };
const COISAS: [RegExp, Forma][] = [
  [/ma[çc][ãa]s?/, { forma: "circ", cor: "vermelho" }], [/laranjas?/, { forma: "circ", cor: "laranja" }], [/bananas?/, { forma: "circ", cor: "laranja" }],
  [/peras?/, { forma: "circ", cor: "verde" }], [/uvas?/, { forma: "circ", cor: "roxo" }], [/bolos?|pizzas?/, { forma: "circ", cor: "rosa" }], [/bolas?/, { forma: "circ", cor: "azul" }],
  [/funcion[áa]rios?|oper[áa]rios?|trabalhadores?/, { forma: "circ", cor: "azul" }], [/policiais?|agentes?/, { forma: "circ", cor: "grafite" }], [/pessoas?|alunos?|candidatos?|estudantes?/, { forma: "circ", cor: "roxo" }],
  [/viaturas?|carros?|motos?/, { forma: "ret", cor: "grafite" }], [/caminh[õo]es|caminh[ãa]o/, { forma: "ret", cor: "laranja" }], [/livros?/, { forma: "ret", cor: "azul" }],
  [/canetas?|l[áa]pis/, { forma: "linha", cor: "azul" }], [/dias?/, { forma: "ret", cor: "verde" }], [/horas?/, { forma: "circ", cor: "azul" }],
];
const FORA = new Set(["vezes", "por", "de", "e", "a", "o", "para", "em", "que", "se", "x"]);
const base = (s: string) => s.toLowerCase().replace(/(?<=[a-zà-ú]{3,})s$/, "").replace(/ões$/, "ão");

export interface Qtd { n: number; nome: string; raiz: string }
function quantidades(frase: string): Qtd[] {
  if (CONTA.test(frase)) return [];
  const out: Qtd[] = [];
  for (const m of frase.matchAll(/(\d+(?:[.,]\d+)?)\s+([A-Za-zÀ-ú]+)/g)) {
    const nome = m[2]!.toLowerCase();
    if (FORA.has(nome)) continue;
    out.push({ n: Number(m[1]!.replace(",", ".")), nome, raiz: base(nome) });
  }
  return out;
}

export interface EsquemaCtx { base?: { a: Qtd; b: Qtd }; grade: boolean; usadas: Set<string> }
export const novoEsquema = (): EsquemaCtx => ({ grade: false, usadas: new Set() });

function desenhoQuantidade(q: Qtd): LinhaLousa | null {
  const c = COISAS.find(([re]) => new RegExp(`^(?:${re.source})$`, "i").test(q.nome))?.[1];
  if (!c || !Number.isInteger(q.n) || q.n < 1 || q.n > 9) return null;
  const sp = Math.min(46, 340 / q.n);
  const it: ItemDesenho[] = [];
  for (let i = 0; i < q.n; i++) {
    const x = 30 + i * sp;
    if (c.forma === "circ") it.push({ t: "circ", cx: x + 16, cy: 55, r: 15, cor: c.cor });
    else if (c.forma === "ret") it.push({ t: "ret", x, y: 40, w: 34, h: 26, cor: c.cor });
    else it.push({ t: "linha", x1: x + 10, y1: 30, x2: x + 22, y2: 82, cor: c.cor });
  }
  it.push({ t: "texto", x: 30, y: 122, s: `${q.n} ${q.nome}`, cor: c.cor });
  return linhaSchema.parse({ tipo: "desenho", texto: "", nivel: 1, rabisco: it });
}

/** Regra de três em grade: 5 maçãs → 20 reais / 8 maçãs → x, com as setas cruzadas. */
function desenhoGrade(a: Qtd, b: Qtd, c: Qtd): LinhaLousa {
  const it: ItemDesenho[] = [
    { t: "texto", x: 20, y: 38, s: `${a.n} ${a.nome}`, cor: "azul" },
    { t: "texto", x: 235, y: 38, s: `${b.n} ${b.nome}`, cor: "verde" },
    { t: "texto", x: 20, y: 112, s: `${c.n} ${c.nome}`, cor: "azul" },
    { t: "texto", x: 245, y: 112, s: "x", cor: "vermelho" },
    { t: "circ", cx: 249, cy: 104, r: 16, cor: "vermelho" },
    { t: "linha", x1: 140, y1: 30, x2: 222, y2: 30, seta: true, cor: "grafite" },
    { t: "linha", x1: 140, y1: 104, x2: 222, y2: 104, seta: true, cor: "grafite" },
    { t: "linha", x1: 80, y1: 52, x2: 232, y2: 94, cor: "laranja" },
    { t: "linha", x1: 250, y1: 52, x2: 70, y2: 94, cor: "roxo" },
  ];
  return linhaSchema.parse({ tipo: "desenho", texto: "", nivel: 1, rabisco: it });
}

/** Esquema desenhado (formas coloridas) para o que o Mentor acabou de falar, ou null. */
export function esquemaDe(frase: string, ctx: EsquemaCtx): LinhaLousa | null {
  const qs = quantidades(frase);
  if (!qs.length) return null;
  if (ctx.base && !ctx.grade && qs.length === 1 && qs[0]!.raiz === ctx.base.a.raiz) {
    ctx.grade = true;
    return desenhoGrade(ctx.base.a, ctx.base.b, qs[0]!);
  }
  if (qs.length >= 2 && !ctx.base) ctx.base = { a: qs[0]!, b: qs[1]! };
  const q = qs[0]!;
  if (ctx.usadas.has(q.raiz)) return null;
  const d = desenhoQuantidade(q);
  if (d) ctx.usadas.add(q.raiz);
  return d;
}
