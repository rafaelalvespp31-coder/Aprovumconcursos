import "server-only";
import { disciplineLabel } from "@/ai/pedagogy";
import { levelFor, patente, toNextLevel } from "@/domain/quiz/levels";
import { requireUser } from "../auth";
import { createAdminClient } from "../supabase";
import { ensureDisciplines } from "./disciplines";
import { assertQuota } from "./plans";
import { enforceRateLimit, UserFacingError } from "./trails";

/**
 * Desafio rápido: rodadas de 10 questões curtas (escolha e verdadeiro/falso) de todas as matérias
 * do catálogo. Os itens vêm de public.game_items (questões curadas e pegadinhas das aulas); a
 * resposta certa fica só no servidor. O XP entra em quiz_attempts, o mesmo sistema do Modo Jogo.
 */

export const ROUND_SIZE = 10;
const XP_BY_DIFFICULTY = [0, 10, 15, 20] as const;
const QUIZ_CHECK_PER_MINUTE = 40;

export type RapidoMode = "novas" | "erros";

interface ItemRow {
  id: string;
  key: string;
  topic_id: string;
  discipline: string;
  subject: string;
  kind: "escolha" | "vf";
  difficulty: number;
  prompt: string;
  options: Array<{ label: string; text: string; correct: boolean; explanation?: string }>;
  answer_true: boolean | null;
  explanation: string;
  source: "catalogo" | "pegadinha";
}

export interface RapidoItem {
  key: string;
  kind: "escolha" | "vf";
  prompt: string;
  subject: string;
  discipline: string;
  difficulty: 1 | 2 | 3;
  /** Só em "escolha": alternativas embaralhadas, sem indicar a certa. */
  options: Array<{ id: string; text: string }>;
}

export interface RapidoDiscipline {
  slug: string;
  label: string;
  total: number;
  done: number;
  wrong: number;
}

export interface RapidoHome {
  disciplines: RapidoDiscipline[];
  total: number;
  done: number;
  wrong: number;
  level: { level: number; patente: string; toNext: number };
}

export interface RapidoRound {
  items: RapidoItem[];
  scope: { discipline: string | null; label: string; mode: RapidoMode };
  level: { level: number; patente: string; toNext: number };
}

export interface RapidoCheck {
  correct: boolean;
  /** Id da alternativa certa ("A"… para escolha; "v" ou "f" para verdadeiro/falso). */
  correctId: string;
  correctText: string;
  explanation: string;
  /** Por que a alternativa escolhida está errada (só em "escolha" quando errou). */
  pickedNote: string | null;
  xp: number;
  bonus: number;
  /** Acertos seguidos até aqui (contando esta resposta). */
  run: number;
  repeated: boolean;
  level: { level: number; patente: string; toNext: number };
  levelUp: { from: number; to: number; patente: string } | null;
}

const levelInfo = (answered: number) => {
  const level = levelFor(answered);
  return { level, patente: patente(level), toNext: toNextLevel(answered) };
};

function shuffle<T>(list: T[]): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

async function answeredCount(userId: string): Promise<number> {
  const { count, error } = await createAdminClient().from("quiz_attempts").select("id", { head: true, count: "exact" }).eq("user_id", userId);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function getRapidoHome(): Promise<RapidoHome> {
  const user = await requireUser("/quiz");
  await ensureDisciplines();
  const db = createAdminClient();
  const [ov, answered] = await Promise.all([db.rpc("game_overview", { p_user: user.id }), answeredCount(user.id)]);
  if (ov.error) throw new Error(ov.error.message);
  const disciplines = ((ov.data ?? []) as Array<{ discipline: string; total: number; done: number; wrong: number }>)
    .map((r) => ({ slug: r.discipline, label: disciplineLabel(r.discipline) ?? "Outra", total: r.total, done: r.done, wrong: r.wrong }))
    .sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));
  return {
    disciplines,
    total: disciplines.reduce((s, d) => s + d.total, 0),
    done: disciplines.reduce((s, d) => s + d.done, 0),
    wrong: disciplines.reduce((s, d) => s + d.wrong, 0),
    level: levelInfo(answered),
  };
}

const publicItem = (r: ItemRow): RapidoItem => ({
  key: r.key,
  kind: r.kind,
  prompt: r.prompt,
  subject: r.subject,
  discipline: disciplineLabel(r.discipline) ?? "Outra",
  difficulty: Math.min(3, Math.max(1, r.difficulty)) as 1 | 2 | 3,
  options: r.kind === "escolha" ? shuffle(r.options.map((o) => ({ id: o.label, text: o.text }))) : [],
});

async function pick(userId: string, discipline: string | null, mode: RapidoMode, source: "catalogo" | "pegadinha" | null, n: number): Promise<ItemRow[]> {
  const { data, error } = await createAdminClient().rpc("game_round", { p_user: userId, p_discipline: discipline, p_topic: null, p_mode: mode, p_source: source, p_n: n });
  if (error) throw new Error(error.message);
  return (data ?? []) as ItemRow[];
}

/**
 * Rodada de 10: itens inéditos (ou os que o aluno errou), intercalando as matérias quando o jogo é misto.
 * As "pegadinhas" das aulas são sempre afirmações erradas; por isso entram em quantidade limitada,
 * para o aluno não aprender a chutar "falso".
 */
export async function startRapidoRound(discipline: string | null, mode: RapidoMode): Promise<RapidoRound> {
  const user = await requireUser("/quiz");
  await assertQuota(user.id, "jogo");
  await ensureDisciplines();
  let rows: ItemRow[];
  if (mode === "erros") {
    rows = await pick(user.id, discipline, "erros", null, ROUND_SIZE);
  } else {
    const [curated, traps] = await Promise.all([pick(user.id, discipline, "novas", "catalogo", ROUND_SIZE), pick(user.id, discipline, "novas", "pegadinha", ROUND_SIZE)]);
    const trapN = Math.min(traps.length, Math.max(2, ROUND_SIZE - curated.length));
    rows = [...curated.slice(0, ROUND_SIZE - trapN), ...traps.slice(0, trapN)];
  }
  if (!rows.length) {
    throw new UserFacingError(
      mode === "erros" ? "Você não tem erros para revisar nesta seleção. Boa!" : "Você já respondeu todas as perguntas desta seleção. Escolha outra matéria ou aguarde novos conteúdos.",
      "rapido_exhausted",
    );
  }
  const answered = await answeredCount(user.id);
  const label = discipline ? disciplineLabel(discipline) ?? "Outra" : "Todas as matérias";
  return { items: shuffle(rows).map(publicItem), scope: { discipline, label, mode }, level: levelInfo(answered) };
}

const KEY = /^G\d{6}$/;

/** Confere a resposta no servidor, grava a tentativa e devolve o feedback (a única hora em que a resposta certa sai daqui). */
export async function checkRapido(key: string, choice: string, responseMs?: number): Promise<RapidoCheck> {
  const user = await requireUser("/quiz");
  if (!KEY.test(key)) throw new UserFacingError("Questão inválida.", "not_found");
  await enforceRateLimit(user.id, "quiz_check", QUIZ_CHECK_PER_MINUTE);
  await assertQuota(user.id, "jogo");
  const db = createAdminClient();
  const { data: item, error } = await db.from("game_items").select("id, key, topic_id, discipline, subject, kind, difficulty, prompt, options, answer_true, explanation, source").eq("key", key).eq("active", true).maybeSingle();
  if (error) throw new Error(error.message);
  if (!item) throw new UserFacingError("Questão não encontrada. Comece uma nova rodada.", "not_found");
  const row = item as unknown as ItemRow;

  let correct: boolean;
  let correctId: string;
  let correctText: string;
  let pickedNote: string | null = null;
  if (row.kind === "vf") {
    if (choice !== "v" && choice !== "f") throw new UserFacingError("Resposta inválida.", "invalid");
    correctId = row.answer_true ? "v" : "f";
    correctText = row.answer_true ? "Verdadeiro" : "Falso";
    correct = choice === correctId;
  } else {
    const right = row.options.find((o) => o.correct);
    const picked = row.options.find((o) => o.label === choice);
    if (!right || !picked) throw new UserFacingError("Resposta inválida.", "invalid");
    correctId = right.label;
    correctText = right.text;
    correct = picked.label === right.label;
    pickedNote = correct ? null : picked.explanation?.replace(/^\s*Incorreta\.?\s*/i, "").trim() || null;
  }

  const [prev, before] = await Promise.all([
    db.from("quiz_attempts").select("id, correct").eq("user_id", user.id).eq("topic_id", row.topic_id).eq("node_key", key).order("created_at", { ascending: false }).limit(1),
    answeredCount(user.id),
  ]);
  if (prev.error) throw new Error(prev.error.message);
  const previous = prev.data?.[0] as { id: string; correct: boolean } | undefined;
  const repeated = !!previous;

  // Sequência de acertos (para o bônus): últimas respostas do aluno, da mais recente para trás.
  let run = 0;
  if (correct) {
    const recent = await db.from("quiz_attempts").select("correct").eq("user_id", user.id).order("created_at", { ascending: false }).limit(6);
    if (recent.error) throw new Error(recent.error.message);
    run = 1;
    for (const r of recent.data ?? []) {
      if (!r.correct) break;
      run++;
    }
  }
  const base = correct && !repeated ? XP_BY_DIFFICULTY[Math.min(3, Math.max(1, row.difficulty))]! : 0;
  const bonus = base ? Math.min(5, Math.max(0, run - 1)) * 2 : 0;
  const xp = base + bonus;

  if (!repeated) {
    const { error: insErr } = await db.from("quiz_attempts").insert({
      user_id: user.id,
      topic_id: row.topic_id,
      node_key: key,
      correct,
      xp,
      tier: Math.min(3, Math.max(1, row.difficulty)),
      response_ms: typeof responseMs === "number" && Number.isFinite(responseMs) ? Math.min(3_600_000, Math.max(0, Math.round(responseMs))) : null,
    });
    if (insErr) throw new Error(insErr.message);
  } else if (correct && !previous.correct) {
    // Revisão de erro: a tentativa passa a constar como acerto, sem XP e sem contar resposta nova.
    const { error: upErr } = await db.from("quiz_attempts").update({ correct: true }).eq("id", previous.id);
    if (upErr) throw new Error(upErr.message);
  }

  const answered = repeated ? before : before + 1;
  const from = levelFor(before);
  const to = levelFor(answered);
  return {
    correct,
    correctId,
    correctText,
    explanation: row.explanation,
    pickedNote,
    xp,
    bonus,
    run: correct ? run : 0,
    repeated,
    level: levelInfo(answered),
    levelUp: to > from ? { from, to, patente: patente(to) } : null,
  };
}
