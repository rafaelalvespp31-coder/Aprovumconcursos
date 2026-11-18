import "server-only";
import { requireUser } from "../auth";
import { createAdminClient } from "../supabase";
import { UserFacingError } from "./trails";

/** Desafio Tático: o servidor (RPCs no banco) é a autoridade de tempo, gabarito, placar e XP. */
export type TaticoOpcao = { label: "A" | "B" | "C" | "D"; text: string };
export type TaticoQuestao = {
  pos: number; tiebreak: boolean; statement: string; topic: string; subject: string; level: string | null;
  options: TaticoOpcao[];
  correct?: string; justification?: string | null; explanations?: Record<string, string | null>; oppChoice?: string | null;
};
export type TaticoEstado =
  | { estado: "ocioso" | "fila"; usados: number; limite: number }
  | { estado: "limite" | "sem_questoes"; usados?: number }
  | {
      estado: "partida"; match: string; status: string; phase: "contagem" | "responder" | "revelar" | "fim";
      idx: number; total: number; msRestantes: number; questionSeconds: number;
      me: { hits: number; miss: number; streak: number; bestStreak: number; answered: boolean; choice: string | null; correct: boolean | null };
      opp: { name: string; hits: number; miss: number; answered: boolean };
      question: TaticoQuestao | null; winner: boolean | null; decidedBy: string | null; xp: number | null; usados: number; limite: number;
    };
export type TaticoStats = {
  partidas: number; vitorias: number; derrotas: number; vitoriasDesempate: number; acertos: number; erros: number;
  xpGanho: number; xpPerdido: number; melhorSequencia: number;
  recentes: { match: string; quando: string; venceu: boolean; acertos: number; erros: number; desempate: boolean }[];
  assuntos: { assunto: string; acertos: number; total: number; taxa: number }[];
} | null;
export type TaticoRevisao = {
  match: string; winner: boolean; decidedBy: string | null;
  itens: { pos: number; tiebreak: boolean; statement: string; topic: string; subject: string; options: { label: string; text: string; explanation: string | null }[]; correct: string; justification: string | null; choice: string | null; acertou: boolean }[];
} | null;

async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await createAdminClient().rpc(fn, args);
  if (error) throw new UserFacingError("O Desafio Tático não respondeu agora. Tente de novo.", "tatico_rpc");
  return data as T;
}

export async function taticoEntrar(): Promise<TaticoEstado> {
  const u = await requireUser("/quiz");
  const r = await rpc<{ estado: string; match?: string; usados?: number }>("tatico_entrar", { p_user: u.id });
  if (r.estado === "partida") return taticoEstado(r.match);
  if (r.estado === "limite") return { estado: "limite", usados: r.usados };
  if (r.estado === "sem_questoes") return { estado: "sem_questoes" };
  return { estado: "fila", usados: r.usados ?? 0, limite: 3 };
}
export async function taticoEstado(match?: string): Promise<TaticoEstado> {
  const u = await requireUser("/quiz");
  return rpc<TaticoEstado>("tatico_estado", { p_user: u.id, p_match: match ?? null });
}
export async function taticoSairFila(): Promise<void> {
  const u = await requireUser("/quiz");
  await rpc("tatico_sair_fila", { p_user: u.id });
}
export async function taticoResponder(match: string, choice: string): Promise<{ ok: boolean; erro?: string; acertou?: boolean }> {
  const u = await requireUser("/quiz");
  return rpc("tatico_responder", { p_user: u.id, p_match: match, p_choice: choice });
}
export async function taticoStats(): Promise<TaticoStats> {
  const u = await requireUser("/quiz");
  return rpc<TaticoStats>("tatico_stats", { p_user: u.id });
}
export async function taticoRevisao(match: string): Promise<TaticoRevisao> {
  const u = await requireUser("/quiz");
  return rpc<TaticoRevisao>("tatico_revisao", { p_user: u.id, p_match: match });
}
