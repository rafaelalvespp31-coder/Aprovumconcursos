import "server-only";
import { GoogleGenAI, Modality } from "@google/genai";
import { createAdminClient } from "../supabase";
import { logEvent } from "../observability";
import { getMyPlan } from "./plans";
import { UserFacingError, enforceRateLimit } from "./trails";
import { brDay } from "@/domain/plans/limits";
import { loadMentorSnapshot } from "./mentor";
import { recommend } from "@/domain/mentor/engine";
import { VOICE_DAILY_SECONDS, VOICE_PERSONAL_RULES, VOICE_SYSTEM_PROMPT, buildVoiceContext, cleanTranscript, VOICE_TOKEN_GRACE_SECONDS, settleSeconds, voiceLeft } from "@/domain/mentor/voice";

/**
 * Mentor por voz (Gemini Live). A chave do Google fica só aqui no servidor: o navegador recebe um
 * token efêmero, de uso único, que vence quando o tempo do dia acaba e já traz a instrução do
 * Mentor travada (o aluno não consegue trocá-la). O limite de 3 minutos/dia vale só para plano
 * pago e é medido pelo relógio do servidor.
 */

const DEFAULT_MODEL = "gemini-3.8-live";
/** Voz masculina e firme (professor). Troque pela variável GEMINI_VOICE: Algenib, Orus, Charon, Alnilam, Sadaltager… */
const DEFAULT_VOICE = "Algenib";

export type VoiceStatus =
  | { available: false; reason: "plano" | "indisponivel"; limit: number; left: 0 }
  | { available: true; limit: number; left: number };

interface Row {
  user_id: string;
  day: string;
  used_seconds: number;
  active_started_at: string | null;
  active_reserved: number | null;
}

const hasKey = () => !!process.env.GEMINI_API_KEY;

/** Encerra a conversa em andamento (se houver) e soma o tempo usado ao dia em que ela começou. */
async function settle(userId: string, reported?: number | null): Promise<void> {
  const db = createAdminClient();
  const { data, error } = await db.from("mentor_voice_usage").select("*").eq("user_id", userId).not("active_started_at", "is", null).order("day", { ascending: false }).limit(1).maybeSingle();
  if (error) throw new Error(error.message);
  const row = data as Row | null;
  if (!row?.active_started_at) return;
  const charged = settleSeconds({ startedAt: new Date(row.active_started_at), reserved: row.active_reserved ?? 0, reported });
  const up = await db
    .from("mentor_voice_usage")
    .update({ used_seconds: Math.min(VOICE_DAILY_SECONDS, row.used_seconds + charged), active_started_at: null, active_reserved: null, updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("day", row.day)
    .eq("active_started_at", row.active_started_at);
  if (up.error) throw new Error(up.error.message);
}

async function usedToday(userId: string): Promise<number> {
  const { data, error } = await createAdminClient().from("mentor_voice_usage").select("used_seconds").eq("user_id", userId).eq("day", brDay().day).maybeSingle();
  if (error) throw new Error(error.message);
  return (data?.used_seconds as number | undefined) ?? 0;
}

export async function getVoiceStatus(userId: string): Promise<VoiceStatus> {
  const plan = await getMyPlan(userId);
  if (!plan.unlimited) return { available: false, reason: "plano", limit: VOICE_DAILY_SECONDS, left: 0 };
  if (!hasKey()) return { available: false, reason: "indisponivel", limit: VOICE_DAILY_SECONDS, left: 0 };
  await settle(userId);
  return { available: true, limit: VOICE_DAILY_SECONDS, left: voiceLeft(await usedToday(userId)) };
}

/** Instrução do Mentor para este aluno: regras fixas + nome e desempenho reais (nunca falha a conversa). */
async function personalPrompt(userId: string): Promise<string> {
  try {
    const { snapshot, name } = await loadMentorSnapshot(userId);
    const r = recommend(snapshot);
    const notes = await createAdminClient().from("mentor_voice_notes").select("day, student_text").eq("user_id", userId).order("created_at", { ascending: false }).limit(3);
    const ctx = buildVoiceContext({
      name,
      memory: ((notes.data ?? []) as Array<{ day: string; student_text: string }>).map((n) => ({ day: n.day, student: n.student_text })),
      lessonsTotal: snapshot.lessons.length,
      lessonsCompleted: r.completedLessons.length,
      inProgress: snapshot.lessons
        .filter((l) => (l.readingDone || l.levelsPassed > 0) && !(l.readingDone && l.levelsPassed >= 3))
        .map((l) => ({ title: l.title, subject: l.subject, pct: Math.round((((l.readingDone ? 1 : 0) + l.levelsPassed) / 4) * 100) })),
      topics: r.topics.map((t) => ({ label: t.label, subject: t.subject, pct: t.pct, valid: t.valid, band: t.band })),
      recommendations: r.top.map((x) => ({ title: x.title, reason: x.reason })),
      reviewsDue: snapshot.reviews.filter((x) => x.dueAt && new Date(x.dueAt) <= new Date(snapshot.now)).length,
      notebooks: snapshot.notebooks.length,
    });
    return `${VOICE_SYSTEM_PROMPT} ${VOICE_PERSONAL_RULES} ${ctx}`;
  } catch (e) {
    await logEvent("mentor.voz.contexto_error", { error: (e as Error).message.slice(0, 200) });
    return VOICE_SYSTEM_PROMPT;
  }
}

export interface VoiceSession {
  token: string;
  model: string;
  voice: string;
  left: number;
  limit: number;
}

/** Libera uma conversa: confere plano e saldo do dia, reserva o tempo e cria o token efêmero. */
export async function startVoice(userId: string): Promise<VoiceSession> {
  const plan = await getMyPlan(userId);
  if (!plan.unlimited) throw new UserFacingError("O Mentor por voz é exclusivo dos planos pagos.", "plan_limit");
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new UserFacingError("O Mentor por voz está indisponível no momento. Tente mais tarde.", "voice_unavailable");
  await enforceRateLimit(userId, "mentor_voz", 6, 60);

  const instruction = await personalPrompt(userId); // antes de reservar o tempo: a leitura dos dados não gasta os 3 minutos
  await settle(userId); // conversa anterior que não foi encerrada direito
  const left = voiceLeft(await usedToday(userId));
  if (left <= 0) throw new UserFacingError("Seus 3 minutos de voz de hoje acabaram. Eles voltam amanhã!", "plan_limit");

  const db = createAdminClient();
  const now = new Date();
  const mark = await db
    .from("mentor_voice_usage")
    .upsert({ user_id: userId, day: brDay().day, used_seconds: VOICE_DAILY_SECONDS - left, active_started_at: now.toISOString(), active_reserved: left, updated_at: now.toISOString() }, { onConflict: "user_id,day" });
  if (mark.error) throw new Error(mark.error.message);

  const model = process.env.GEMINI_LIVE_MODEL?.trim() || DEFAULT_MODEL;
  const voice = process.env.GEMINI_VOICE?.trim() || DEFAULT_VOICE;
  try {
    const client = new GoogleGenAI({ apiKey, httpOptions: { apiVersion: "v1alpha" } });
    const token = await client.authTokens.create({
      config: {
        uses: 1,
        expireTime: new Date(now.getTime() + (left + VOICE_TOKEN_GRACE_SECONDS) * 1000).toISOString(),
        newSessionExpireTime: new Date(now.getTime() + 60_000).toISOString(),
        liveConnectConstraints: { model, config: { responseModalities: [Modality.AUDIO], inputAudioTranscription: {}, outputAudioTranscription: {}, systemInstruction: instruction, speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } } } },
        httpOptions: { apiVersion: "v1alpha" },
      },
    });
    if (!token.name) throw new Error("token vazio");
    return { token: token.name, model, voice, left, limit: VOICE_DAILY_SECONDS };
  } catch (e) {
    await settle(userId, 0).catch(() => {}); // não houve conversa: devolve a reserva
    await logEvent("mentor.voz.token_error", { error: (e as Error).message.slice(0, 300) });
    throw new UserFacingError("Não foi possível iniciar o Mentor por voz agora. Tente novamente em instantes.", "voice_error");
  }
}

/** Fim da conversa: cobra o tempo falado (limitado ao relógio do servidor) e devolve o saldo. */
export async function endVoice(userId: string, reportedSeconds: unknown, transcript?: { student?: unknown; mentor?: unknown }): Promise<{ left: number }> {
  const reported = typeof reportedSeconds === "number" && Number.isFinite(reportedSeconds) ? reportedSeconds : null;
  await settle(userId, reported);
  // Memória do Mentor: guarda o que foi dito (texto), limpo e limitado, para a próxima conversa.
  const student = cleanTranscript(transcript?.student);
  const mentor = cleanTranscript(transcript?.mentor);
  if (student) {
    const ins = await createAdminClient().from("mentor_voice_notes").insert({ user_id: userId, day: brDay().day, student_text: student, mentor_text: mentor });
    if (ins.error) await logEvent("mentor.voz.nota_error", { error: ins.error.message.slice(0, 200) });
  }
  return { left: voiceLeft(await usedToday(userId)) };
}
