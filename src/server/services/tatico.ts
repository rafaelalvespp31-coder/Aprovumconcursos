import "server-only";
import { requireUser } from "../auth";
import { createAdminClient } from "../supabase";
import { getMyPlan } from "./plans";
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
      solo?: boolean; question: TaticoQuestao | null; winner: boolean | null; decidedBy: string | null; xp: number | null; usados: number; limite: number;
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
/** Só administradores: treino solo no estande (sem adversário, sem XP, sem limite). */
export async function taticoEntrarSolo(): Promise<TaticoEstado> {
  const u = await requireUser("/quiz");
  if (!(await getMyPlan(u.id)).admin) throw new UserFacingError("Recurso exclusivo para administradores.", "forbidden");
  const r = await rpc<{ estado: string; match?: string }>("tatico_entrar_solo", { p_user: u.id });
  if (r.estado === "partida") return taticoEstado(r.match);
  if (r.estado === "sem_questoes") return { estado: "sem_questoes" };
  throw new UserFacingError("Recurso exclusivo para administradores.", "forbidden");
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

export type AlunoBusca = { id: string; name: string; online: boolean };
export type DesafiosEstado = {
  entrada: { id: string; de: string; ms: number } | null;
  saida: { id: string; para: string; status: "pendente" | "aceito" | "recusado" | "expirado" | "cancelado"; reason: string | null; match: string | null; ms: number } | null;
};
const ERROS_DESAFIO: Record<string, string> = {
  aluno_invalido: "Aluno inválido.",
  seu_limite: "Você já usou os 3 desafios de hoje.",
  limite_dele: "Esse aluno já usou os 3 desafios de hoje.",
  voce_em_partida: "Você já está em uma partida.",
  ele_em_partida: "Esse aluno está em uma partida agora.",
  ja_pendente: "Você já tem um desafio aguardando resposta.",
  muitos_desafios: "Muitos desafios enviados. Tente de novo mais tarde.",
  sem_questoes: "Ainda não há questões suficientes para o desafio.",
};
export async function taticoBuscar(q: string): Promise<AlunoBusca[]> {
  const u = await requireUser("/quiz");
  return (await rpc<AlunoBusca[] | null>("tatico_buscar", { p_user: u.id, p_q: q.slice(0, 40) })) ?? [];
}
export async function taticoDesafiar(alvo: string): Promise<{ ok: boolean; id?: string; para?: string; erro?: string }> {
  const u = await requireUser("/quiz");
  const r = await rpc<{ ok: boolean; id?: string; para?: string; erro?: string }>("tatico_desafiar", { p_user: u.id, p_target: alvo });
  return r.ok ? r : { ok: false, erro: ERROS_DESAFIO[r.erro ?? ""] ?? "Não foi possível desafiar agora." };
}
export async function taticoDesafios(): Promise<DesafiosEstado> {
  const u = await requireUser("/quiz");
  return rpc<DesafiosEstado>("tatico_desafios", { p_user: u.id });
}
export async function taticoResponderDesafio(id: string, aceitar: boolean): Promise<{ ok: boolean; estado?: string; match?: string; erro?: string }> {
  const u = await requireUser("/quiz");
  const r = await rpc<{ ok: boolean; estado?: string; match?: string; erro?: string }>("tatico_responder_desafio", { p_user: u.id, p_id: id, p_aceitar: aceitar });
  if (r.ok) return r;
  return { ok: false, erro: r.erro === "expirado" ? "O desafio expirou." : r.erro === "indisponivel" ? "Desafio indisponível agora (limite do dia ou partida em andamento)." : "Não foi possível responder." };
}
export async function taticoCancelarDesafio(id: string): Promise<void> {
  const u = await requireUser("/quiz");
  await rpc("tatico_cancelar_desafio", { p_user: u.id, p_id: id });
}

/** Nível do Modo Jogo (a cada 10 questões respondidas), com uma contagem leve — sem montar a home inteira do jogo. */
export async function taticoNivel(): Promise<{ level: number; into: number }> {
  const u = await requireUser("/quiz");
  const { count } = await createAdminClient().from("quiz_attempts").select("id", { count: "exact", head: true }).eq("user_id", u.id);
  const n = count ?? 0;
  return { level: Math.floor(n / 10) + 1, into: n % 10 };
}
