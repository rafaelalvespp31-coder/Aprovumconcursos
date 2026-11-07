import { z } from "zod";

export const MAX_COMENTARIO = 500;
/** Depois de tantas dispensas, a popup para de aparecer sozinha (o aluno ainda pode avaliar quando quiser). */
export const MAX_DISPENSAS = 3;
/** Intervalo mínimo antes de perguntar de novo a quem dispensou. */
export const INTERVALO_DISPENSA_MS = 24 * 60 * 60 * 1000;
/** Média baixa só gera alerta com pelo menos esta quantidade de avaliações. */
export const MIN_AVALIACOES_ALERTA = 3;
export const MEDIA_ALERTA = 3;

export const ROTULOS_NOTA: Record<number, string> = { 1: "Muito ruim", 2: "Ruim", 3: "Regular", 4: "Muito boa", 5: "Excelente" };

export const enviarSchema = z.object({
  lessonId: z.uuid("Aula inválida."),
  rating: z.number({ error: "Escolha de 1 a 5 estrelas." }).int("Escolha de 1 a 5 estrelas.").min(1, "Escolha de 1 a 5 estrelas.").max(5, "Escolha de 1 a 5 estrelas."),
  comment: z
    .string()
    .max(MAX_COMENTARIO, `O comentário pode ter até ${MAX_COMENTARIO} caracteres.`)
    .optional()
    .transform((v) => {
      const t = (v ?? "").replace(/\u0000/g, "").trim();
      return t === "" ? null : t;
    }),
});

export type EstadoFeedback = { status: "nenhum" | "enviado" | "dispensado"; skips: number; lastSkippedAt: string | null };

/** Deve perguntar? Nunca após o envio; após dispensar, só depois do intervalo e até o limite de dispensas. */
export function devePerguntar(e: EstadoFeedback, agora: Date = new Date()): boolean {
  if (e.status === "enviado") return false;
  if (e.status === "nenhum") return true;
  if (e.skips >= MAX_DISPENSAS) return false;
  if (!e.lastSkippedAt) return true;
  return agora.getTime() - new Date(e.lastSkippedAt).getTime() >= INTERVALO_DISPENSA_MS;
}

export type FeedbackLinha = { id: string; rating: number; comment: string | null; lessonId: string | null; lessonTitle: string; subject: string | null; createdAt: string };

export const media = (xs: number[]) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 100) / 100 : null);

export function resumoGeral(rows: Pick<FeedbackLinha, "rating">[]) {
  const c = (f: (n: number) => boolean) => rows.filter((r) => f(r.rating)).length;
  return { total: rows.length, media: media(rows.map((r) => r.rating)), cinco: c((n) => n === 5), quatro: c((n) => n === 4), tres: c((n) => n === 3), baixas: c((n) => n <= 2) };
}

export interface GrupoNota { chave: string; rotulo: string; total: number; media: number; negativas: number; positivas: number; alerta: boolean }

function agrupar(rows: FeedbackLinha[], chave: (r: FeedbackLinha) => string | null, rotulo: (r: FeedbackLinha) => string): GrupoNota[] {
  const m = new Map<string, FeedbackLinha[]>();
  for (const r of rows) {
    const k = chave(r);
    if (!k) continue;
    (m.get(k) ?? m.set(k, []).get(k)!).push(r);
  }
  return [...m.entries()].map(([k, xs]) => {
    const md = media(xs.map((x) => x.rating)) ?? 0;
    return { chave: k, rotulo: rotulo(xs[0]!), total: xs.length, media: md, negativas: xs.filter((x) => x.rating <= 2).length, positivas: xs.filter((x) => x.rating >= 4).length, alerta: xs.length >= MIN_AVALIACOES_ALERTA && md < MEDIA_ALERTA };
  });
}

export const porAula = (rows: FeedbackLinha[]) => agrupar(rows, (r) => r.lessonId ?? `t:${r.lessonTitle}`, (r) => r.lessonTitle);
export const porMateria = (rows: FeedbackLinha[]) => agrupar(rows, (r) => r.subject, (r) => r.subject ?? "Sem matéria");

/** Evolução mensal (AAAA-MM) da média e do total. */
export function evolucaoMensal(rows: Pick<FeedbackLinha, "rating" | "createdAt">[]) {
  const m = new Map<string, number[]>();
  for (const r of rows) {
    const k = r.createdAt.slice(0, 7);
    (m.get(k) ?? m.set(k, []).get(k)!).push(r.rating);
  }
  return [...m.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([mes, xs]) => ({ mes, total: xs.length, media: media(xs) ?? 0 }));
}

export interface FiltroFeedback { q?: string; aula?: string; materia?: string; nota?: number | null; de?: string; ate?: string; comentario?: "com" | "sem" | "" }
const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Filtros do painel admin. Datas AAAA-MM-DD, comparadas no fuso de Brasília. */
export function filtrarFeedbacks<T extends FeedbackLinha & { studentName?: string | null; studentEmail?: string | null }>(rows: T[], f: FiltroFeedback): T[] {
  const dia = (iso: string) => new Date(new Date(iso).getTime() - 3 * 3600_000).toISOString().slice(0, 10);
  const q = f.q ? norm(f.q.trim()) : "";
  return rows.filter((r) => {
    if (f.nota && r.rating !== f.nota) return false;
    if (f.materia && (r.subject ?? "") !== f.materia) return false;
    if (f.aula && r.lessonTitle !== f.aula) return false;
    if (f.comentario === "com" && !r.comment) return false;
    if (f.comentario === "sem" && r.comment) return false;
    if (f.de && dia(r.createdAt) < f.de) return false;
    if (f.ate && dia(r.createdAt) > f.ate) return false;
    if (q && !norm([r.studentName, r.studentEmail, r.lessonTitle, r.subject, r.comment].filter(Boolean).join(" ")).includes(q)) return false;
    return true;
  });
}
