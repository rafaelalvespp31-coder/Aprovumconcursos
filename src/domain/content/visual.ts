import { worked } from "./hand-math";
import { z } from "zod";

/**
 * Exemplos visuais dos cards "Na prática":
 *  - Tirinha: 1 a 3 quadros com cenário, personagens, fala e legenda (a situação).
 *  - Esquema: fluxo, linha do tempo ou comparação (a resposta, revelada ao tocar).
 * Tudo é desenhado no app (SVG/HTML): sem imagens externas, leve e funciona offline.
 */

export const ROLES = ["delegado", "pm", "policial_penal", "perito", "promotor", "juiz", "advogado", "vitima", "investigado", "preso", "cidadao", "servidor", "gestor", "professor"] as const;
export const SCENES = ["delegacia", "local_crime", "cela", "forum", "rua", "casa", "bar", "hospital", "piscina", "reparticao", "escola", "obra", "transito", "rodovia"] as const;
export const POSES = ["neutro", "fala", "aponta", "pega", "ataca", "bracos_cruzados"] as const;
export const MOODS = ["neutro", "serio", "bravo", "surpreso", "feliz", "triste"] as const;
export const PROPS = ["arma", "documento", "celular", "maleta", "faca", "copo", "carimbo"] as const;

const character = z.object({
  p: z.enum(ROLES),
  lado: z.enum(["esq", "centro", "dir"]).default("centro"),
  pose: z.enum(POSES).default("neutro"),
  humor: z.enum(MOODS).default("neutro"),
  objeto: z.enum(PROPS).optional(),
  /** Para onde o personagem olha: padrão é para o centro do quadro. */
  olha: z.enum(["esq", "dir"]).optional(),
});

const panel = z.object({
  cenario: z.enum(SCENES),
  legenda: z.string().max(90).optional(),
  personagens: z.array(character).max(3).default([]),
  fala: z.object({ quem: z.number().int().min(0).max(2), texto: z.string().min(1).max(80) }).optional(),
  /** Efeito de impacto (ex.: "PÁ!"), sem violência explícita. */
  efeito: z.string().max(12).optional(),
});

export const stripSchema = z.array(panel).min(1).max(3);

const step = z.object({ rotulo: z.string().min(1).max(70), detalhe: z.string().max(120).optional(), estado: z.enum(["ok", "erro", "neutro", "alerta"]).default("neutro") });

export const schemeSchema = z.discriminatedUnion("tipo", [
  z.object({ tipo: z.literal("fluxo"), titulo: z.string().max(70).optional(), passos: z.array(step).min(2).max(6), conclusao: step.optional() }),
  z.object({
    tipo: z.literal("linha_tempo"),
    titulo: z.string().max(70).optional(),
    /** Unidade da régua ("dias", "anos"…); vazia = régua de eventos, sem números (mostra só "data"). */
    unidade: z.string().max(12).default("dias"),
    marcos: z.array(z.object({ em: z.number().min(0), data: z.string().max(24).optional(), rotulo: z.string().min(1).max(50), estado: z.enum(["ok", "erro", "neutro", "alerta"]).default("neutro") })).min(2).max(8),
    /** Períodos sobre a régua (ex.: vigência de uma lei): de/ate na mesma escala dos marcos. */
    faixas: z.array(z.object({ de: z.number().min(0), ate: z.number().min(0), rotulo: z.string().min(1).max(40), estado: z.enum(["ok", "erro", "neutro", "alerta"]).default("neutro") })).max(4).optional(),
  }),
  z.object({
    tipo: z.literal("conta"),
    titulo: z.string().max(70).optional(),
    /** Conta armada à mão, calculada pelo app a partir dos números. */
    operacao: z.enum(["soma", "subtracao", "multiplicacao", "divisao", "mmc", "mdc"]),
    numeros: z.array(z.number().int().min(0).max(999_999_999)).min(2).max(4),
  }).refine((v) => worked(v.operacao, v.numeros) !== null, { message: "Números inválidos para a operação" }),
  z.object({
    tipo: z.literal("calculo"),
    titulo: z.string().max(70).optional(),
    passos: z.array(z.object({ rotulo: z.string().min(1).max(70), conta: z.string().min(1).max(70), resultado: z.string().max(30).optional(), estado: z.enum(["ok", "erro", "neutro", "alerta"]).default("neutro") })).min(1).max(6),
    total: z.object({ rotulo: z.string().min(1).max(50), valor: z.string().min(1).max(40) }).optional(),
    /** Barra proporcional das partes (ex.: pena-base + aumentos). */
    barra: z.array(z.object({ rotulo: z.string().min(1).max(30), valor: z.number().positive(), estado: z.enum(["ok", "erro", "neutro", "alerta"]).default("neutro") })).min(2).max(5).optional(),
  }),
  z.object({
    tipo: z.literal("comparacao"),
    titulo: z.string().max(70).optional(),
    lados: z
      .array(z.object({ titulo: z.string().min(1).max(50), resultado: z.string().min(1).max(60), estado: z.enum(["ok", "erro", "neutro", "alerta"]).default("neutro"), itens: z.array(z.string().max(80)).max(4).default([]) }))
      .length(2),
  }),
]);

export type Strip = z.infer<typeof stripSchema>;

/**
 * JSON com defeitos comuns de resposta de IA: aspas curvas, vírgula sobrando antes de "]" ou "}",
 * quebra de linha dentro do texto e colchete/chave que ficou sem fechar. Tenta o JSON puro primeiro.
 */
export function parseJsonLoose(raw: string): unknown {
  try { return JSON.parse(raw); } catch { /* tenta reparar */ }
  let t = raw.trim().replace(/[\u201C\u201D\u201E\u00AB\u00BB]/g, '"').replace(/[\u2018\u2019]/g, "'").replace(/\u00A0/g, " ");
  t = t.replace(/,\s*([\]}])/g, "$1");
  // quebra de linha dentro de string vira espaço
  let out = "";
  let inStr = false;
  let esc = false;
  const stack: string[] = [];
  for (const ch of t) {
    if (inStr) {
      if (esc) { esc = false; out += ch; continue; }
      if (ch === "\\") { esc = true; out += ch; continue; }
      if (ch === '"') { inStr = false; out += ch; continue; }
      out += ch === "\n" || ch === "\r" || ch === "\t" ? " " : ch;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === "[" || ch === "{") stack.push(ch === "[" ? "]" : "}");
    else if (ch === "]" || ch === "}") { if (stack[stack.length - 1] === ch) stack.pop(); else continue; }
    out += ch;
  }
  if (inStr) out += '"';
  out = out.replace(/,\s*$/, "") + stack.reverse().join("");
  try { return JSON.parse(out.replace(/,\s*([\]}])/g, "$1")); } catch { return undefined; }
}

const plain = (v: unknown) => String(v ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/[\s-]+/g, "_");
const pick = <T extends string>(list: readonly T[], v: unknown): T | undefined => {
  const k = plain(v);
  return list.find((x) => x === k);
};
const cut = (v: unknown, max: number): string | undefined => {
  const t = String(v ?? "").trim();
  if (!t) return undefined;
  return t.length <= max ? t : `${t.slice(0, max - 1).replace(/\s+\S*$/, "")}…`.slice(0, max);
};

/**
 * Leitura tolerante da tirinha que a IA devolve: em vez de jogar a tirinha inteira fora por um detalhe
 * (legenda longa, cenário ou personagem fora da lista, índice de fala errado), corta ou corrige o detalhe.
 */
export function lenientStrip(raw: string | undefined): Strip | undefined {
  if (!raw?.trim()) return undefined;
  const parsed = parseJsonLoose(raw);
  // aceita um quadro solto ({...}) além da lista de quadros
  const data = Array.isArray(parsed) ? parsed : parsed && typeof parsed === "object" ? [parsed] : undefined;
  if (!data) return undefined;
  const panels = data.slice(0, 3).map((pn): unknown => {
    const o = (pn && typeof pn === "object" ? pn : {}) as Record<string, unknown>;
    const chars = (Array.isArray(o.personagens) ? o.personagens : []).slice(0, 3).map((c) => {
      const k = (c && typeof c === "object" ? c : {}) as Record<string, unknown>;
      return { p: pick(ROLES, k.p) ?? "cidadao", lado: pick(["esq", "centro", "dir"] as const, k.lado) ?? "centro", pose: pick(POSES, k.pose) ?? "neutro", humor: pick(MOODS, k.humor) ?? "neutro", ...(pick(PROPS, k.objeto) ? { objeto: pick(PROPS, k.objeto) } : {}), ...(pick(["esq", "dir"] as const, k.olha) ? { olha: pick(["esq", "dir"] as const, k.olha) } : {}) };
    });
    const f = (o.fala && typeof o.fala === "object" ? o.fala : null) as Record<string, unknown> | null;
    const texto = f ? cut(f.texto, 80) : undefined;
    const quem = f ? Math.max(0, Math.min(Math.max(0, chars.length - 1), Number.isFinite(Number(f.quem)) ? Math.trunc(Number(f.quem)) : 0)) : 0;
    return { cenario: pick(SCENES, o.cenario) ?? "rua", legenda: cut(o.legenda, 90), personagens: chars, ...(texto && chars.length ? { fala: { quem, texto } } : {}), efeito: cut(o.efeito, 12) };
  });
  const r = stripSchema.safeParse(panels);
  return r.success ? r.data : undefined;
}
export type StripPanel = Strip[number];
export type StripCharacter = StripPanel["personagens"][number];
export type Scheme = z.infer<typeof schemeSchema>;
export type StepState = "ok" | "erro" | "neutro" | "alerta";

/** Lê o JSON de um campo visual; inválido = ignorado (o card continua só com texto). */
export function parseVisual<T>(raw: string | undefined, schema: z.ZodType<T>): T | undefined {
  if (!raw?.trim()) return undefined;
  const data = parseJsonLoose(raw);
  if (data === undefined) return undefined;
  const r = schema.safeParse(data);
  return r.success ? r.data : undefined;
}
