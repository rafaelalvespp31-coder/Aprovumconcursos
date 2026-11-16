import { z } from "zod";

/** Pedidos que costumam pedir uma demonstração (conta, exemplo, esquema, desenho). Barato e roda no navegador. */
const GATILHO = /(ensin|explic|mostr|exempl|calcul|\bconta\b|\bcontas\b|resolv|resolu|desenh|esquem|passo a passo|como (faz|fa[çc]o|se faz|resolve|calcula|funciona)|f[óo]rmula|equa[çc][ãa]o|regra de tr[êe]s|porcentag|probabilidad|fra[çc][ãa]o|\bmapa\b|diagrama|gr[áa]fico|quadro|lousa|desenvolv|demonstr)/i;
export const pedeLousa = (fala: string): boolean => fala.trim().length >= 8 && GATILHO.test(fala);

const COR = z.enum(["grafite", "vermelho", "azul", "verde"]);
const n = z.number().min(0).max(1000);

/** Desenho em 400×260: só primitivas simples, desenhadas pelo nosso componente (nunca SVG vindo da IA). */
export const itemDesenho = z.discriminatedUnion("t", [
  z.object({ t: z.literal("linha"), x1: n, y1: n, x2: n, y2: n, seta: z.boolean().optional(), cor: COR.optional() }),
  z.object({ t: z.literal("ret"), x: n, y: n, w: n, h: n, cor: COR.optional() }),
  z.object({ t: z.literal("circ"), cx: n, cy: n, r: n, cor: COR.optional() }),
  z.object({ t: z.literal("curva"), pts: z.array(z.tuple([n, n])).min(2).max(24), cor: COR.optional() }),
  z.object({ t: z.literal("texto"), x: n, y: n, s: z.string().trim().min(1).max(40), cor: COR.optional() }),
]);

export const lousaSchema = z.object({
  mostrar: z.boolean(),
  titulo: z.string().trim().max(80).default(""),
  passos: z.array(z.object({ texto: z.string().trim().min(1).max(140), conta: z.string().trim().max(90).optional() })).max(9).default([]),
  desenho: z.array(itemDesenho).max(30).default([]),
});
export type Lousa = z.infer<typeof lousaSchema>;
export type ItemDesenho = z.infer<typeof itemDesenho>;
export const LOUSA_W = 400;
export const LOUSA_H = 260;
