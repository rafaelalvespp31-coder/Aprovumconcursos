import { z } from "zod";

/** Pedidos que costumam pedir uma demonstração (conta, exemplo, esquema, desenho). Barato e roda no navegador. */
const GATILHO = /(ensin|explic|mostr|exempl|calcul|\bconta\b|\bcontas\b|resolv|resolu|desenh|esquem|passo a passo|como (faz|fa[çc]o|se faz|resolve|calcula|funciona)|f[óo]rmula|equa[çc][ãa]o|regra de tr[êe]s|porcentag|probabilidad|fra[çc][ãa]o|\bmapa\b|diagrama|gr[áa]fico|quadro|lousa|desenvolv|demonstr)/i;
export const pedeLousa = (fala: string): boolean => fala.trim().length >= 8 && GATILHO.test(fala);

const COR = z.enum(["grafite", "vermelho", "azul", "verde", "laranja", "roxo", "rosa"]);
const n = z.number().min(0).max(1000);

/** Desenho em 400×260: só primitivas simples, desenhadas pelo nosso componente (nunca SVG vindo da IA). */
export const itemDesenho = z.discriminatedUnion("t", [
  z.object({ t: z.literal("linha"), x1: n, y1: n, x2: n, y2: n, seta: z.boolean().optional(), cor: COR.optional() }),
  z.object({ t: z.literal("ret"), x: n, y: n, w: n, h: n, cor: COR.optional() }),
  z.object({ t: z.literal("circ"), cx: n, cy: n, r: n, cor: COR.optional() }),
  z.object({ t: z.literal("curva"), pts: z.array(z.tuple([n, n])).min(2).max(24), cor: COR.optional() }),
  z.object({ t: z.literal("texto"), x: n, y: n, s: z.string().trim().min(1).max(40), cor: COR.optional() }),
  /** Emoji ou figura pronta (fruta, número, objeto): x,y é o canto inferior esquerdo; tam em pixels. */
  z.object({ t: z.literal("emoji"), x: n, y: n, s: z.string().trim().min(1).max(8), tam: z.number().min(16).max(90).default(40) }),
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
  rabisco: z.array(itemDesenho).max(10).optional(),
  /** Trechos escritos com outra caneta (cor diferente do resto da linha). */
  realce: z.array(z.object({ trecho: z.string().trim().min(1).max(40), cor: COR_TEXTO })).max(4).optional(),
});
export type LinhaLousa = z.infer<typeof linhaSchema>;

export const lousaSchema = z.object({
  mostrar: z.boolean(),
  titulo: z.string().trim().max(80).default(""),
  linhas: z.array(linhaSchema).max(28).default([]),
  desenho: z.array(itemDesenho).max(30).default([]),
});
export type Lousa = z.infer<typeof lousaSchema>;
export type ItemDesenho = z.infer<typeof itemDesenho>;
export const LOUSA_W = 400;
export const LOUSA_H = 260;

/** O Mentor anuncia, falando, que vai anotar/escrever/desenhar no quadro ("vou anotar na lousa", "olha aqui no quadro"). */
export function anunciaLousa(fala: string): boolean {
  const s = fala.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  return /\b(lousa|quadro)\b/.test(s) || /\bvou (te )?(anotar|escrever|desenhar|rabiscar|montar|mostrar (a|o) (conta|calculo|exemplo))/.test(s) || /\bdeixa eu (anotar|escrever|desenhar)/.test(s);
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
