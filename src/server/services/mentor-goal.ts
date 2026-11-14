import "server-only";
import { createAdminClient, createUserClient } from "../supabase";
import { brDay } from "@/domain/plans/limits";
import { buildStudyPlan, type PlanSubject, type StudyPlan } from "@/domain/mentor/plan";
import type { MentorResult, MentorSnapshot } from "@/domain/mentor/engine";
import { UserFacingError, enforceRateLimit } from "./trails";

/** Concurso que o aluno quer passar, dito por ele ao Mentor. Fica em profiles.preferences.mentor_goal. */
export interface MentorGoal { contest: string; setAt: string }

const CONTROL = /[\u0000-\u001f\u007f<>`{}]/g;
export function cleanGoal(v: unknown): string {
  return typeof v === "string" ? v.normalize("NFC").replace(CONTROL, " ").replace(/\s+/g, " ").trim().slice(0, 120) : "";
}

export async function getMentorGoal(userId: string): Promise<MentorGoal | null> {
  const { data } = await createAdminClient().from("profiles").select("preferences").eq("id", userId).maybeSingle();
  const g = ((data?.preferences ?? {}) as { mentor_goal?: { contest?: unknown; setAt?: unknown } }).mentor_goal;
  const contest = cleanGoal(g?.contest);
  return contest ? { contest, setAt: typeof g?.setAt === "string" ? g.setAt : "" } : null;
}

/** Guarda a resposta do aluno ("Qual concurso você quer passar?"). Vazio apaga. */
export async function setMentorGoal(userId: string, raw: unknown): Promise<MentorGoal | null> {
  await enforceRateLimit(userId, "mentor_goal", 20, 3600);
  const contest = cleanGoal(raw);
  if (raw !== "" && contest.length < 2) throw new UserFacingError("Escreva o nome do concurso (ex.: Polícia Penal MG, PRF, PF).", "invalid");
  const db = await createUserClient();
  const cur = await db.from("profiles").select("preferences").eq("id", userId).maybeSingle();
  const prefs = { ...((cur.data?.preferences ?? {}) as Record<string, unknown>) };
  if (contest) prefs.mentor_goal = { contest, setAt: new Date().toISOString() };
  else delete prefs.mentor_goal;
  const up = await db.from("profiles").update({ preferences: prefs }).eq("id", userId);
  if (up.error) throw new UserFacingError("Não foi possível salvar agora. Tente de novo.", "save_failed");
  return contest ? { contest, setAt: new Date().toISOString() } : null;
}

const words = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").split(/[^a-z0-9]+/).filter((w) => w.length >= 3);

/** Procura o concurso no catálogo da plataforma para pegar data da prova e banca (melhor correspondência). */
async function findCatalogContest(contest: string): Promise<{ examDate: string | null; banca: string | null } | null> {
  const ws = words(contest);
  if (!ws.length) return null;
  const { data } = await createAdminClient().from("contest_catalog").select("name, institution, role_name, banca, exam_date, active").eq("active", true).limit(400);
  let best: { score: number; examDate: string | null; banca: string | null } | null = null;
  for (const r of (data ?? []) as Array<{ name: string; institution: string; role_name: string | null; banca: string | null; exam_date: string | null }>) {
    const hay = new Set(words(`${r.name} ${r.institution} ${r.role_name ?? ""}`));
    const score = ws.filter((w) => hay.has(w)).length / ws.length;
    if (score >= 0.6 && (!best || score > best.score)) best = { score, examDate: r.exam_date, banca: r.banca };
  }
  return best ? { examDate: best.examDate, banca: best.banca } : null;
}

export interface GoalPlan { goal: MentorGoal | null; plan: StudyPlan | null }

/** Concurso-alvo + plano semanal montado com os dados reais do aluno (nunca falha o Mentor). */
export async function loadGoalPlan(userId: string, snapshot: MentorSnapshot, result: MentorResult): Promise<GoalPlan> {
  const goal = await getMentorGoal(userId).catch(() => null);
  if (!goal) return { goal: null, plan: null };
  try {
    const [prof, cat] = await Promise.all([
      createAdminClient().from("profiles").select("daily_goal_minutes, daily_questions_goal").eq("id", userId).maybeSingle(),
      findCatalogContest(goal.contest).catch(() => null),
    ]);
    const subj = new Map<string, { correct: number; valid: number; pending: number }>();
    const get = (n: string) => subj.get(n) ?? subj.set(n, { correct: 0, valid: 0, pending: 0 }).get(n)!;
    for (const l of snapshot.lessons) {
      if (!l.subject) continue;
      const done = l.readingDone && l.levelsPassed >= 3;
      if (!done) get(l.subject).pending++;
      else get(l.subject);
    }
    for (const t of result.topics) {
      if (!t.subject) continue;
      const s = get(t.subject);
      s.correct += t.correct;
      s.valid += t.valid;
    }
    const subjects: PlanSubject[] = [...subj].map(([name, s]) => ({ name, pct: s.valid >= 5 ? Math.round((s.correct / s.valid) * 100) : null, pendingLessons: s.pending }));
    const row = (prof.data ?? {}) as { daily_goal_minutes?: number | null; daily_questions_goal?: number | null };
    const plan = buildStudyPlan({
      contest: goal.contest,
      examDate: cat?.examDate ?? null,
      banca: cat?.banca ?? null,
      dailyMinutes: row.daily_goal_minutes ?? 120,
      dailyQuestions: row.daily_questions_goal ?? null,
      subjects,
      reviewsDue: snapshot.reviews.filter((r) => r.dueAt && new Date(r.dueAt) <= new Date(snapshot.now)).length,
      today: brDay().day,
    });
    return { goal, plan };
  } catch {
    return { goal, plan: null };
  }
}

/** Fatos reais do aluno para o Mentor (idade, gênero, horas, acertos/erros, dias sem estudar). Cada item some se o dado não existir. */
export async function loadStudentFacts(userId: string, snapshot: MentorSnapshot): Promise<string[]> {
  const admin = createAdminClient();
  const lines: string[] = [];
  const safe = async <T,>(f: () => PromiseLike<T>): Promise<T | null> => { try { return await f(); } catch { return null; } };
  const [birth, avatar, secs, days, att, clock] = await Promise.all([
    safe(async () => (await admin.from("profiles").select("birth_date").eq("id", userId).maybeSingle()).data as { birth_date: string | null } | null),
    safe(async () => (await admin.from("avatar_profiles").select("gender").eq("user_id", userId).maybeSingle()).data as { gender: string | null } | null),
    safe(async () => (await admin.from("answer_attempts").select("time_spent_seconds, created_at").eq("user_id", userId).not("time_spent_seconds", "is", null).gte("created_at", new Date(Date.now() - 30 * 86_400_000).toISOString()).limit(20000)).data as Array<{ time_spent_seconds: number; created_at: string }> | null),
    safe(async () => (await admin.from("gamification_activity_days").select("day").eq("user_id", userId).order("day", { ascending: false }).limit(60)).data as Array<{ day: string }> | null),
    safe(async () => (await admin.from("bank_attempts").select("is_correct, omitted").eq("user_id", userId).limit(20000)).data as Array<{ is_correct: boolean | null; omitted: boolean | null }> | null),
    safe(async () => (await admin.from("study_time_days").select("day, seconds").eq("user_id", userId).gte("day", new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10)).limit(60)).data as Array<{ day: string; seconds: number }> | null),
  ]);
  if (birth?.birth_date) {
    const b = new Date(`${birth.birth_date}T00:00:00Z`);
    const n = new Date();
    let age = n.getUTCFullYear() - b.getUTCFullYear();
    if (n.getUTCMonth() < b.getUTCMonth() || (n.getUTCMonth() === b.getUTCMonth() && n.getUTCDate() < b.getUTCDate())) age--;
    if (age >= 10 && age <= 99) lines.push(`Idade: ${age} anos.`);
  }
  if (avatar?.gender) lines.push(`Gênero (do avatar): ${avatar.gender === "f" ? "feminino" : "masculino"}.`);
  // Acertos e erros: questões das aulas (fixação) + banco.
  let right = 0, wrong = 0;
  for (const p of snapshot.performance) for (const a of p.attempts) { if (a.questionValid === false) continue; if (a.correct === true) right++; else if (a.correct === false) wrong++; }
  void att;
  lines.push(right + wrong > 0 ? `Questões respondidas: ${right + wrong} — ${right} certas e ${wrong} erradas (${Math.round((right / (right + wrong)) * 100)}% de acerto).` : "Ainda não respondeu questões.");
  if (secs) {
    const tz = (iso: string) => new Date(iso).toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
    const today = brDay().day;
    const week = new Date(Date.now() - 7 * 86_400_000).toISOString();
    const total = secs.reduce((a, r) => a + r.time_spent_seconds, 0);
    const hToday = secs.filter((r) => tz(r.created_at) === today).reduce((a, r) => a + r.time_spent_seconds, 0);
    const h7 = secs.filter((r) => r.created_at >= week).reduce((a, r) => a + r.time_spent_seconds, 0);
    const f = (s: number) => `${Math.floor(s / 3600)}h${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}`;
    lines.push(`Tempo resolvendo questões (medido): hoje ${f(hToday)}, últimos 7 dias ${f(h7)}, últimos 30 dias ${f(total)}.`);
  }
  if (clock?.length) {
    const f = (x: number) => `${Math.floor(x / 3600)}h${String(Math.floor((x % 3600) / 60)).padStart(2, "0")}`;
    const t = brDay().day;
    const w = new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10);
    lines.push(`Horas de estudo (relógio da plataforma): hoje ${f(clock.filter((r) => r.day === t).reduce((a, r) => a + r.seconds, 0))}, últimos 7 dias ${f(clock.filter((r) => r.day >= w).reduce((a, r) => a + r.seconds, 0))}, últimos 30 dias ${f(clock.reduce((a, r) => a + r.seconds, 0))}.`);
  }
  const last = [days?.[0]?.day, ...(clock ?? []).filter((r) => r.seconds > 0).map((r) => r.day)].filter((x): x is string => !!x).sort().at(-1);
  if (last) {
    const gap = Math.round((Date.parse(`${brDay().day}T00:00:00Z`) - Date.parse(`${last}T00:00:00Z`)) / 86_400_000);
    lines.push(gap <= 0 ? "Estudou hoje." : `Está há ${gap} ${gap === 1 ? "dia" : "dias"} sem estudar (último dia ativo: ${last}).`);
  } else lines.push("Sem registro de dias de estudo ainda.");
  const due = snapshot.reviews.filter((r) => r.dueAt && new Date(r.dueAt) <= new Date(snapshot.now));
  if (due.length) lines.push(`Aulas que precisam de revisão agora: ${due.slice(0, 8).map((r) => r.title).join("; ")}.`);
  return lines;
}
