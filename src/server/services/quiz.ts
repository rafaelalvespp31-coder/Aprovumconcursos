import "server-only";
import { disciplineLabel } from "@/ai/pedagogy";
import { assertQuota } from "./plans";
import { ensureDisciplines } from "./disciplines";
import { extractPractice } from "@/domain/content/practice";
import { computeStreak, streakMessage } from "@/domain/progress/gamification";
import { buildAll, checkCloze, shuffle, seeded, type ClozeItem, type LawNode } from "@/domain/quiz/cloze";
import { levelFor, patente, tierByNumber, tierFor, toNextLevel, type Tier } from "@/domain/quiz/levels";
import { requireUser } from "../auth";
import { getStudyStats } from "../queries";
import { createAdminClient, createUserClient } from "../supabase";
import { enforceRateLimit, UserFacingError } from "./trails";

/** Vidas por rodada e meta do desafio do dia. A rodada vai até o próximo nível (10 questões). */
export const LIVES = 3;
export const DAILY_GOAL = 20;

interface QuizTopic {
  id: string;
  title: string;
  discipline: string;
  lawCode: string | null;
  nodes: LawNode[];
  /** Itens no formato padrão (para contar dispositivos e progresso). */
  items: ClozeItem[];
  sections: Array<{ kind: string; title: string; bodyMarkdown: string; nodeKeys: string[] }>;
}

// Catálogo publicado em memória por alguns minutos (o conteúdo muda raramente).
let cache: { at: number; topics: QuizTopic[] } | null = null;
const TTL = 5 * 60_000;

async function loadTopics(): Promise<QuizTopic[]> {
  await ensureDisciplines();
  if (cache && Date.now() - cache.at < TTL) return cache.topics;
  const db = createAdminClient();
  const { data, error } = await db.from("catalog_topics").select("id, title, discipline_mode, law_code, nodes, lesson").eq("status", "publicado").order("title");
  if (error) throw new Error(error.message);
  const topics = (data ?? [])
    .map((t) => {
      const lesson = (t.lesson ?? {}) as { sections?: QuizTopic["sections"] };
      return {
        id: t.id as string,
        title: t.title as string,
        discipline: disciplineLabel((t.discipline_mode as string) ?? "outra") ?? "Outra",
        lawCode: (t.law_code as string | null) ?? null,
        nodes: (t.nodes ?? []) as LawNode[],
        items: buildAll(((t.nodes ?? []) as LawNode[]), t.id as string),
        sections: lesson.sections ?? [],
      };
    })
    .filter((t) => t.items.length > 0);
  cache = { at: Date.now(), topics };
  tierCache.clear();
  return topics;
}

// Itens por dificuldade (mesmos dispositivos; lacunas, banco e apoio mudam com o nível).
const tierCache = new Map<string, ClozeItem[]>();
function itemsFor(topic: QuizTopic, tier: Tier): ClozeItem[] {
  const k = `${topic.id}:${tier.tier}`;
  let items = tierCache.get(k);
  if (!items) {
    items = buildAll(topic.nodes, topic.id, { blanks: tier.blanks, bank: tier.bank, context: tier.context });
    tierCache.set(k, items);
  }
  return items;
}

export interface QuizLevel {
  level: number;
  patente: string;
  nextPatente: string;
  tier: Tier;
  /** Questões respondidas (todas). */
  answered: number;
  /** Faltam para subir de nível. */
  toNext: number;
}

function levelInfo(answered: number): QuizLevel {
  const level = levelFor(answered);
  return { level, patente: patente(level), nextPatente: patente(level + 1), tier: tierFor(level), answered, toNext: toNextLevel(answered) };
}

export interface QuizTopicSummary {
  id: string;
  title: string;
  discipline: string;
  lawCode: string | null;
  total: number;
  mastered: number;
}

export interface QuizHome {
  topics: QuizTopicSummary[];
  xp: number;
  todayHits: number;
  level: QuizLevel;
  streak: { current: number; best: number; studiedToday: boolean; last7: boolean[]; message: string };
}

interface AttemptRow {
  topic_id: string;
  node_key: string;
  correct: boolean;
  xp: number;
  created_at: string;
}

async function myAttempts(): Promise<AttemptRow[]> {
  const db = await createUserClient();
  const { data, error } = await db.from("quiz_attempts").select("topic_id, node_key, correct, xp, created_at").order("created_at", { ascending: false }).limit(5000);
  if (error) throw new Error(error.message);
  return (data ?? []) as AttemptRow[];
}

const todayKey = (iso: string) => new Date(iso).toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });

function summarize(attempts: AttemptRow[], topics: QuizTopic[]) {
  const hit = new Set(attempts.filter((a) => a.correct).map((a) => `${a.topic_id}:${a.node_key}`));
  const today = todayKey(new Date().toISOString());
  return {
    xp: attempts.reduce((s, a) => s + (a.xp ?? 0), 0),
    todayHits: attempts.filter((a) => a.correct && todayKey(a.created_at) === today).length,
    hit,
    topics: topics.map((t) => ({
      id: t.id,
      title: t.title,
      discipline: t.discipline,
      lawCode: t.lawCode,
      total: t.items.length,
      mastered: t.items.filter((i) => hit.has(`${t.id}:${i.nodeKey}`)).length,
    })),
  };
}

export async function getQuizHome(): Promise<QuizHome> {
  await requireUser("/quiz");
  const [topics, attempts, stats] = await Promise.all([loadTopics(), myAttempts(), getStudyStats()]);
  const s = summarize(attempts, topics);
  const st = computeStreak(stats.activeDays, stats.today);
  return { topics: s.topics, xp: s.xp, todayHits: s.todayHits, level: levelInfo(attempts.length), streak: { ...st, message: streakMessage(st) } };
}

/** Item enviado ao navegador: sem as respostas (a conferência é no servidor). */
export type PublicClozeItem = Omit<ClozeItem, "answers"> & { blanks: number };

export interface QuizRound {
  topic: QuizTopicSummary;
  items: PublicClozeItem[];
  level: QuizLevel;
}

/**
 * Rodada no nível atual do aluno: vai até completar o nível (10 questões, ou o que falta).
 * Primeiro os dispositivos que ele ainda não acertou; nos níveis altos, os de mais lacunas.
 */
export async function startRound(topicId: string): Promise<QuizRound> {
  const user = await requireUser("/quiz");
  await assertQuota(user.id, "jogo");
  const [topics, attempts] = await Promise.all([loadTopics(), myAttempts()]);
  const topic = topics.find((t) => t.id === topicId);
  if (!topic) throw new UserFacingError("Este conteúdo não está disponível no quiz.", "not_found");
  const s = summarize(attempts, [topic]);
  const lv = levelInfo(attempts.length);
  const pool = itemsFor(topic, lv.tier);
  const rnd = seeded(`${topicId}:${Date.now()}:${Math.random()}`);
  const order = (list: ClozeItem[]) => {
    const sh = shuffle(list, rnd);
    return lv.tier.tier >= 3 ? sh.sort((a, b) => b.answers.length - a.answers.length) : sh;
  };
  const fresh = order(pool.filter((i) => !s.hit.has(`${topicId}:${i.nodeKey}`)));
  const done = order(pool.filter((i) => s.hit.has(`${topicId}:${i.nodeKey}`)));
  const items = [...fresh, ...done].slice(0, lv.toNext).map(({ answers, ...rest }) => ({ ...rest, blanks: answers.length }));
  return { topic: s.topics[0]!, items, level: lv };
}

export interface QuizHelp {
  explicacao: string | null;
  banca: string | null;
  dica: string | null;
}

export interface QuizCheck {
  results: boolean[];
  answers: string[];
  correct: boolean;
  xp: number;
  totals: { xp: number; todayHits: number; mastered: number };
  level: QuizLevel;
  /** Preenchido quando esta resposta completou 10 questões e o aluno subiu de nível. */
  levelUp: { from: QuizLevel; to: QuizLevel } | null;
  help: QuizHelp;
}

export async function checkAnswer(topicId: string, nodeKey: string, given: string[], tierN: number): Promise<QuizCheck> {
  const user = await requireUser("/quiz");
  await enforceRateLimit(user.id, "quiz_check", 120);
  await assertQuota(user.id, "jogo");
  const [topics, before] = await Promise.all([loadTopics(), myAttempts()]);
  const topic = topics.find((t) => t.id === topicId);
  // A dificuldade da questão não pode passar a do nível que o aluno já conquistou.
  const current = levelInfo(before.length);
  const tier = tierByNumber(Math.min(tierN, current.tier.tier));
  const item = topic ? itemsFor(topic, tier).find((i) => i.nodeKey === nodeKey) : undefined;
  if (!topic || !item) throw new UserFacingError("Questão não encontrada. Comece uma nova rodada.", "not_found");
  const results = checkCloze(item, given.slice(0, item.answers.length).map((g) => String(g ?? "").slice(0, 80)));
  const correct = results.every(Boolean);
  const xp = correct ? tier.xp : 0;
  // Grava só pelo servidor, depois de conferir (o aluno não grava XP direto no banco).
  const { error } = await createAdminClient().from("quiz_attempts").insert({ user_id: user.id, topic_id: topicId, node_key: nodeKey, correct, xp });
  if (error) throw new Error(error.message);
  const after = await myAttempts();
  const s = summarize(after, topics);
  const next = levelInfo(after.length);
  return {
    results,
    answers: item.answers,
    correct,
    xp,
    totals: { xp: s.xp, todayHits: s.todayHits, mastered: s.topics.find((t) => t.id === topicId)?.mastered ?? 0 },
    level: next,
    levelUp: next.level > current.level ? { from: current, to: next } : null,
    help: helpFor(topic, item),
  };
}

export interface RankingRow {
  pos: number;
  name: string;
  xp: number;
  answered: number;
  isMe: boolean;
  patente: string;
}

/** Ranking de todos os alunos (posição, primeiro nome + inicial, XP). */
export async function getRanking(limit = 20): Promise<RankingRow[]> {
  await requireUser("/quiz");
  const db = await createUserClient();
  const { data, error } = await db.rpc("quiz_ranking", { p_limit: limit });
  if (error) throw new Error(error.message);
  return ((data ?? []) as Array<{ pos: number; name: string; xp: number; answered: number; is_me: boolean }>).map((r) => ({
    pos: r.pos,
    name: r.name,
    xp: r.xp,
    answered: r.answered,
    isMe: r.is_me,
    patente: patente(levelFor(r.answered)),
  }));
}

// ---------------------------------------------------------------------------
// Explicação, banca e dica: trechos reais da aula do catálogo
// ---------------------------------------------------------------------------
const TEACH = ["explicacao", "conceitos_fundamentais", "aprofundamento", "quadro_comparativo", "comparacao", "doutrina", "jurisprudencia", "excecoes", "introducao"];

/** Primeiro trecho legível (sem tabela) de um texto, até ~460 caracteres. */
function firstChunk(md: string, max = 460): string | null {
  const body = extractPractice(md).body;
  const blocks = body.split(/\n\s*\n/).map((b) => b.trim()).filter((b) => b && !b.startsWith("|") && !/^#{1,6}\s/.test(b));
  let out = "";
  for (const b of blocks) {
    if (out && out.length + b.length > max) break;
    out = out ? `${out}\n\n${b}` : b;
    if (out.length >= max * 0.6) break;
  }
  return out ? (out.length > max + 200 ? `${out.slice(0, max).replace(/\s+\S*$/, "")}…` : out) : null;
}

function helpFor(topic: QuizTopic, item: ClozeItem): QuizHelp {
  const art = item.ref.match(/Art\.\s*(\d+(?:-[A-Z])?)/)?.[1];
  const mentions = (txt: string) => (art ? new RegExp(`\\bart(?:igo)?s?\\.?\\s*${art.replace("-", "\\-")}\\b`, "i").test(txt) : false);
  const teach = topic.sections
    .filter((s) => TEACH.includes(s.kind) && s.nodeKeys?.includes(item.nodeKey))
    .sort((a, b) => TEACH.indexOf(a.kind) - TEACH.indexOf(b.kind));
  const explicacao = teach.length ? firstChunk(teach[0]!.bodyMarkdown) : null;
  const bancaSec = topic.sections.find((s) => s.kind === "interpretacao_banca");
  const bancaLines = bancaSec ? bancaSec.bodyMarkdown.split("\n").filter((l) => /^\s*[-*]\s/.test(l)) : [];
  const banca = bancaLines.length ? (bancaLines.find(mentions) ? [bancaLines.find(mentions)!] : bancaLines.slice(0, 2)).join("\n") : null;
  // Dica: flashcard ou pegadinha da aula que cita o mesmo artigo.
  const cards = topic.sections
    .filter((s) => s.kind === "flashcards" || s.kind === "pegadinhas")
    .flatMap((s) => s.bodyMarkdown.split(/\n\s*\n/).map((b) => b.trim()))
    .filter((b) => b.includes("→"));
  const dica = cards.find(mentions) ?? null;
  return { explicacao, banca, dica };
}
