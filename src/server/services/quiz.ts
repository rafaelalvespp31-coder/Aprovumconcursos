import "server-only";
import { cache as perRequest } from "react";
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
  /** Perguntas curtas (verdadeiro/falso e múltipla escolha) deste tema, em game_items. */
  gameCount: number;
}

// Catálogo publicado em memória por alguns minutos (o conteúdo muda raramente).
let cache: { at: number; topics: QuizTopic[] } | null = null;
const TTL = 5 * 60_000;

async function loadTopics(): Promise<QuizTopic[]> {
  await ensureDisciplines();
  if (cache && Date.now() - cache.at < TTL) return cache.topics;
  const db = createAdminClient();
  const [{ data, error }, counts] = await Promise.all([
    db.from("catalog_topics").select("id, title, discipline_mode, law_code, nodes").eq("status", "publicado").order("title"),
    db.rpc("game_topic_counts"),
  ]);
  if (error) throw new Error(error.message);
  if (counts.error) throw new Error(counts.error.message);
  const gameRows = (counts.data ?? []) as Array<{ topic_id: string; title: string; discipline: string; law_code: string | null; n: number }>;
  const gameN = new Map(gameRows.map((g) => [g.topic_id, g.n]));
  const topics: QuizTopic[] = (data ?? []).map((t) => {
    return {
      id: t.id as string,
      title: t.title as string,
      discipline: disciplineLabel((t.discipline_mode as string) ?? "outra") ?? "Outra",
      lawCode: (t.law_code as string | null) ?? null,
      nodes: (t.nodes ?? []) as LawNode[],
      items: buildAll(((t.nodes ?? []) as LawNode[]), t.id as string),
      sections: [],
      gameCount: gameN.get(t.id as string) ?? 0,
    };
  }).filter((t) => t.items.length > 0 || t.gameCount > 0);
  cache = { at: Date.now(), topics };
  tierCache.clear();
  return topics;
}


// A aula completa pesa MB; só é lida (e guardada por pouco tempo) para o tema da pergunta respondida.
const sectionsCache = new Map<string, { at: number; sections: QuizTopic["sections"] }>();
async function sectionsOf(topicId: string): Promise<QuizTopic["sections"]> {
  const hit = sectionsCache.get(topicId);
  if (hit && Date.now() - hit.at < TTL) return hit.sections;
  const { data } = await createAdminClient().from("catalog_topics").select("lesson").eq("id", topicId).maybeSingle();
  const sections = (((data?.lesson ?? {}) as { sections?: QuizTopic["sections"] }).sections ?? []);
  if (sectionsCache.size > 60) sectionsCache.clear();
  sectionsCache.set(topicId, { at: Date.now(), sections });
  return sections;
}

// Itens por dificuldade (mesmos dispositivos; lacunas, banco e apoio mudam com o nível).
const tierCache = new Map<string, ClozeItem[]>();
function itemsFor(topic: QuizTopic, tier: Tier): ClozeItem[] {
  const k = `${topic.id}:${tier.tier}`;
  let items = tierCache.get(k);
  if (!items) {
    items = buildAll(topic.nodes, topic.id, { blanks: tier.blanks, bank: tier.bank, context: tier.context, tier: tier.tier });
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

const myAttempts = perRequest(async (): Promise<AttemptRow[]> => {
  const db = await createUserClient();
  const { data, error } = await db.from("quiz_attempts").select("topic_id, node_key, correct, xp, created_at").order("created_at", { ascending: false }).limit(5000);
  if (error) throw new Error(error.message);
  return (data ?? []) as AttemptRow[];
});

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
      total: t.items.length + t.gameCount,
      mastered: Math.min(
        t.items.length + t.gameCount,
        t.items.filter((i) => hit.has(`${t.id}:${i.nodeKey}`)).length + (t.gameCount ? [...hit].filter((k) => k.startsWith(`${t.id}:G`)).length : 0),
      ),
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
  /** Preenchido quando o tema pedido não tinha mais perguntas inéditas e a rodada mudou de tema. */
  movedFrom: string | null;
}

/** Dispositivos que o aluno já respondeu neste tema (certo ou errado), consultados direto no banco. */
async function seenKeys(topicId: string): Promise<Set<string>> {
  const db = await createUserClient();
  const seen = new Set<string>();
  // Em páginas: o banco devolve no máximo 1000 linhas por consulta.
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from("quiz_attempts").select("node_key").eq("topic_id", topicId).order("created_at", { ascending: true }).range(from, from + 999);
    if (error) throw new Error(error.message);
    for (const r of data ?? []) seen.add(r.node_key as string);
    if ((data ?? []).length < 1000) break;
  }
  return seen;
}


// ---------------------------------------------------------------------------
// Perguntas curtas (verdadeiro/falso e múltipla escolha) no mesmo cartão do jogo: uma lacuna com banco de respostas.
// ---------------------------------------------------------------------------
interface GameRow {
  key: string;
  kind: "escolha" | "vf";
  prompt: string;
  subject: string;
  explanation: string;
  answer_true: boolean | null;
  options: Array<{ label: string; text: string; correct: boolean }> | null;
}
const GAME_COLS = "key, kind, prompt, subject, explanation, answer_true, options";

function gameToCloze(g: GameRow, rnd?: () => number): ClozeItem {
  if (g.kind === "vf") {
    return { nodeKey: g.key, context: "Verdadeiro ou falso?", parts: [{ text: `${g.prompt} ` }, { blank: 0 }], answers: [g.answer_true ? "Verdadeiro" : "Falso"], bank: ["Verdadeiro", "Falso"], ref: g.subject };
  }
  const opts = g.options ?? [];
  const bank = opts.map((o) => o.text);
  return { nodeKey: g.key, context: null, parts: [{ text: `${g.prompt} ` }, { blank: 0 }], answers: [opts.find((o) => o.correct)?.text ?? ""], bank: rnd ? shuffle(bank, rnd) : bank, ref: g.subject };
}

/** Perguntas curtas ainda não respondidas deste tema. */
async function freshGame(topicId: string, seen: Set<string>, rnd: () => number): Promise<ClozeItem[]> {
  const { data, error } = await createAdminClient().from("game_items").select(GAME_COLS).eq("topic_id", topicId).eq("active", true).limit(1000);
  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as GameRow[]).filter((g) => !seen.has(g.key)).map((g) => gameToCloze(g, rnd));
}

/**
 * Rodada no nível atual do aluno: vai até completar o nível (10 questões, ou o que falta).
 * Pergunta já respondida (certa ou errada) NUNCA volta para o mesmo aluno. Quando o tema pedido
 * acaba, a rodada segue em outro tema com perguntas inéditas (primeiro da mesma matéria); quando
 * não sobra nenhuma no jogo inteiro, o aluno é avisado.
 */
export async function startRound(topicId: string): Promise<QuizRound> {
  const user = await requireUser("/quiz");
  await assertQuota(user.id, "jogo");
  const [topics, attempts] = await Promise.all([loadTopics(), myAttempts()]);
  const asked = topics.find((t) => t.id === topicId);
  if (!asked) throw new UserFacingError("Este conteúdo não está disponível no quiz.", "not_found");
  const lv = levelInfo(attempts.length);
  // Já visto segundo o histórico carregado: serve para pular, sem consulta, temas claramente esgotados.
  const approx = new Map<string, Set<string>>();
  for (const a of attempts) approx.set(a.topic_id, (approx.get(a.topic_id) ?? new Set<string>()).add(a.node_key));
  const order = [asked, ...topics.filter((t) => t.id !== asked.id && t.discipline === asked.discipline), ...topics.filter((t) => t.discipline !== asked.discipline)];
  let topic: QuizTopic | null = null;
  let fresh: ClozeItem[] = [];
  for (const t of order) {
    const pool = itemsFor(t, lv.tier);
    const known = approx.get(t.id);
    if (known && !t.gameCount && pool.every((i) => known.has(i.nodeKey))) continue;
    const seen = await seenKeys(t.id);
    const f = pool.filter((i) => !seen.has(i.nodeKey));
    if (t.gameCount) f.push(...(await freshGame(t.id, seen, seeded(`${t.id}:${Date.now()}:${Math.random()}`))));
    if (f.length) {
      topic = t;
      fresh = f;
      break;
    }
  }
  if (!topic) throw new UserFacingError("Você já respondeu todas as perguntas do Modo Jogo. Novas perguntas aparecem quando novos conteúdos forem publicados.", "quiz_exhausted");
  const s = summarize(attempts, [topic]);
  const rnd = seeded(`${topic.id}:${Date.now()}:${Math.random()}`);
  const items = shuffle(fresh, rnd).slice(0, lv.toNext).map(({ answers, ...rest }) => ({ ...rest, blanks: answers.length }));
  return { topic: s.topics[0]!, items, level: lv, movedFrom: topic.id !== asked.id ? asked.title : null };
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

export async function checkAnswer(topicId: string, nodeKey: string, given: string[], tierN: number, responseMs?: number): Promise<QuizCheck> {
  const user = await requireUser("/quiz");
  // Um humano responde bem menos que isso por minuto; o teto barra automação (XP em massa).
  await enforceRateLimit(user.id, "quiz_check", 40);
  await assertQuota(user.id, "jogo");
  const [topics, before] = await Promise.all([loadTopics(), myAttempts()]);
  const topic = topics.find((t) => t.id === topicId);
  // A dificuldade da questão não pode passar a do nível que o aluno já conquistou.
  const current = levelInfo(before.length);
  const tier = tierByNumber(Math.min(tierN, current.tier.tier));
  let game: GameRow | null = null;
  if (/^G\d{6}$/.test(nodeKey)) {
    const { data, error: ge } = await createAdminClient().from("game_items").select(GAME_COLS).eq("key", nodeKey).eq("topic_id", topicId).eq("active", true).maybeSingle();
    if (ge) throw new Error(ge.message);
    game = (data as unknown as GameRow | null) ?? null;
  }
  const item = game ? gameToCloze(game) : topic ? itemsFor(topic, tier).find((i) => i.nodeKey === nodeKey) : undefined;
  if (!topic || !item) throw new UserFacingError("Questão não encontrada. Comece uma nova rodada.", "not_found");
  const results = checkCloze(item, given.slice(0, item.answers.length).map((g) => String(g ?? "").slice(0, 80)));
  const correct = results.every(Boolean);
  // Anti-farm: acertar de novo o mesmo item dentro de 24 h não rende XP nem conta como nova resposta
  // (a resposta certa é mostrada após o primeiro acerto; sem isso dava para repetir o item em loop).
  // Cada pergunta vale uma vez por aluno: responder de novo a mesma (por exemplo, reenviando o pedido)
  // não rende XP nem conta como nova resposta.
  const repeat = await createAdminClient().from("quiz_attempts").select("id", { head: true, count: "exact" }).eq("user_id", user.id).eq("topic_id", topicId).eq("node_key", nodeKey);
  if (repeat.error) throw new Error(repeat.error.message);
  const repeated = (repeat.count ?? 0) > 0;
  const xp = correct && !repeated ? tier.xp : 0;
  // Grava só pelo servidor, depois de conferir (o aluno não grava XP direto no banco).
  const { error } = repeated ? { error: null } : await createAdminClient().from("quiz_attempts").insert({ user_id: user.id, topic_id: topicId, node_key: nodeKey, correct, xp, tier: tier.tier, response_ms: typeof responseMs === "number" && Number.isFinite(responseMs) ? Math.min(3_600_000, Math.max(0, Math.round(responseMs))) : null });
  if (error) throw new Error(error.message);
  const after: AttemptRow[] = repeated ? before : [{ topic_id: topicId, node_key: nodeKey, correct, xp, created_at: new Date().toISOString() }, ...before];
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
    help: game ? { explicacao: `**${game.subject}**\n\n${game.explanation}`, banca: null, dica: null } : helpFor({ ...topic, sections: await sectionsOf(topic.id) }, item),
  };
}

export type PeriodoRanking = "hoje" | "semana" | "geral";
export interface RankingRow {
  pos: number;
  name: string;
  xp: number;
  answered: number;
  hits: number;
  isMe: boolean;
  patente: string;
  motto?: string | null;
  /** Total de alunos que pontuaram no período (igual em todas as linhas). */
  total: number;
}

/** Ranking do Modo Jogo por período. Posições únicas (1, 2, 3…), primeiro nome + inicial, XP. */
export async function getRanking(limit = 20, periodo: PeriodoRanking = "geral"): Promise<RankingRow[]> {
  await requireUser("/quiz");
  const db = await createUserClient();
  const { data, error } = await db.rpc("quiz_ranking", { p_limit: limit, p_period: periodo });
  if (error) throw new Error(error.message);
  return ((data ?? []) as Array<{ pos: number; name: string; xp: number; answered: number; hits: number; is_me: boolean; motto: string | null; total: number }>).map((r) => ({
    pos: r.pos,
    name: r.name,
    xp: r.xp,
    answered: r.answered,
    hits: r.hits,
    isMe: r.is_me,
    motto: r.motto,
    total: r.total,
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
  const chunk = teach.length ? firstChunk(teach[0]!.bodyMarkdown) : null;
  // Fundamento: a frase completa, como está na aula, com a referência do dispositivo.
  const filled = item.parts.map((p) => ("text" in p ? p.text : `**${item.answers[p.blank]}**`)).join("");
  const fundamento = `**Fundamento na aula — ${topic.title}, ${item.ref}**\n\n${item.context ? `${item.context} ` : ""}${filled}`;
  const explicacao = chunk ? `${fundamento}\n\n${chunk}` : fundamento;
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
