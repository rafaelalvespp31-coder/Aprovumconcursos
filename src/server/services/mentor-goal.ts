import "server-only";
import { createAdminClient, createUserClient } from "../supabase";
import { brDay } from "@/domain/plans/limits";
import { buildStudyPlan, type PlanSubject, type StudyPlan } from "@/domain/mentor/plan";
import type { MentorResult, MentorSnapshot } from "@/domain/mentor/engine";
import { UserFacingError, enforceRateLimit } from "./trails";
import { EDITAL_MIN_SCORE, cargoHits, concursoScore } from "@/domain/mentor/edital-match";

/** Concurso que o aluno quer passar, dito por ele ao Mentor. Fica em profiles.preferences.mentor_goal. */
export interface MentorGoal { contest: string; setAt: string; editalId?: string }
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const CONTROL = /[\u0000-\u001f\u007f<>`{}]/g;
export function cleanGoal(v: unknown): string {
  return typeof v === "string" ? v.normalize("NFC").replace(CONTROL, " ").replace(/\s+/g, " ").trim().slice(0, 120) : "";
}

export async function getMentorGoal(userId: string): Promise<MentorGoal | null> {
  const { data } = await createAdminClient().from("profiles").select("preferences").eq("id", userId).maybeSingle();
  const g = ((data?.preferences ?? {}) as { mentor_goal?: { contest?: unknown; setAt?: unknown; editalId?: unknown } }).mentor_goal;
  const contest = cleanGoal(g?.contest);
  const editalId = typeof g?.editalId === "string" && UUID.test(g.editalId) ? g.editalId : undefined;
  return contest ? { contest, setAt: typeof g?.setAt === "string" ? g.setAt : "", ...(editalId ? { editalId } : {}) } : null;
}

/** Guarda a resposta do aluno ("Qual concurso você quer passar?"). Vazio apaga. */
export async function setMentorGoal(userId: string, raw: unknown, editalId?: string | null): Promise<MentorGoal | null> {
  await enforceRateLimit(userId, "mentor_goal", 20, 3600);
  let contest = cleanGoal(raw);
  let prepId: string | undefined;
  if (editalId) {
    // O plano só pode vir de um edital que é do próprio aluno (cadastrado no Aprovum AI); o nome vem do edital.
    if (!UUID.test(editalId)) throw new UserFacingError("Edital inválido.", "invalid");
    const { data: row } = await createAdminClient().from("edital_preparations").select("id, contest_name, role_name, status").eq("id", editalId).eq("user_id", userId).maybeSingle();
    const r = row as { contest_name: string | null; role_name: string | null; status: string } | null;
    if (!r || !["concluido", "conferencia"].includes(r.status)) throw new UserFacingError("Esse edital não está disponível. Escolha outro.", "invalid");
    contest = cleanGoal([r.contest_name, r.role_name].filter(Boolean).join(" — ")) || "Meu edital";
    prepId = editalId;
    raw = contest;
  }
  if (raw !== "" && contest.length < 2) throw new UserFacingError("Escreva o nome do concurso (ex.: Polícia Penal MG, PRF, PF).", "invalid");
  const db = await createUserClient();
  const cur = await db.from("profiles").select("preferences").eq("id", userId).maybeSingle();
  const prefs = { ...((cur.data?.preferences ?? {}) as Record<string, unknown>) };
  if (contest) prefs.mentor_goal = { contest, setAt: new Date().toISOString(), ...(prepId ? { editalId: prepId } : {}) };
  else delete prefs.mentor_goal;
  const up = await db.from("profiles").update({ preferences: prefs }).eq("id", userId);
  if (up.error) throw new UserFacingError("Não foi possível salvar agora. Tente de novo.", "save_failed");
  return contest ? { contest, setAt: new Date().toISOString(), ...(prepId ? { editalId: prepId } : {}) } : null;
}

export interface EditalOption { id: string; name: string; role: string | null; board: string | null; disciplines: number; topics: number }

/** Editais cadastrados pelo aluno no Aprovum AI (prontos para virar plano). */
export async function listEditalOptions(userId: string): Promise<EditalOption[]> {
  const admin = createAdminClient();
  const { data } = await admin.from("edital_preparations").select("id, contest_name, role_name, board, status").eq("user_id", userId).in("status", ["concluido", "conferencia"]).order("created_at", { ascending: false }).limit(50);
  const preps = (data ?? []) as Array<{ id: string; contest_name: string | null; role_name: string | null; board: string | null }>;
  if (!preps.length) return [];
  const ids = preps.map((p) => p.id);
  const [d, t] = await Promise.all([
    admin.from("edital_disciplines").select("preparation_id").in("preparation_id", ids).limit(5000),
    admin.from("edital_topics").select("preparation_id").in("preparation_id", ids).limit(20000),
  ]);
  const cnt = (rows: unknown) => { const m = new Map<string, number>(); for (const r of (rows ?? []) as Array<{ preparation_id: string }>) m.set(r.preparation_id, (m.get(r.preparation_id) ?? 0) + 1); return m; };
  const dc = cnt(d.data), tc = cnt(t.data);
  return preps.filter((p) => (dc.get(p.id) ?? 0) > 0).map((p) => ({ id: p.id, name: p.contest_name?.trim() || "Edital sem nome", role: p.role_name, board: p.board, disciplines: dc.get(p.id) ?? 0, topics: tc.get(p.id) ?? 0 }));
}

export interface EditalDoConcurso { label: string; origem: "seu" | "plataforma"; subjects: Array<{ name: string; topics: number }> }

/** Disciplinas e nº de tópicos de uma preparação de edital (null se ela não tiver disciplinas). */
async function carregarDisciplinas(prepId: string): Promise<Array<{ name: string; topics: number }> | null> {
  const admin = createAdminClient();
  const [d, t] = await Promise.all([
    admin.from("edital_disciplines").select("id, name, position").eq("preparation_id", prepId).order("position").limit(100),
    admin.from("edital_topics").select("discipline_id").eq("preparation_id", prepId).limit(5000),
  ]);
  const discs = (d.data ?? []) as Array<{ id: string; name: string }>;
  if (!discs.length) return null;
  const count = new Map<string, number>();
  for (const x of (t.data ?? []) as Array<{ discipline_id: string }>) count.set(x.discipline_id, (count.get(x.discipline_id) ?? 0) + 1);
  return discs.map((x) => ({ name: x.name, topics: count.get(x.id) ?? 0 }));
}

type Prep = { id: string; contest_name: string | null; role_name: string | null };
const rotulo = (p: Prep) => [p.contest_name, p.role_name].filter(Boolean).join(" — ");

/**
 * Edital do concurso escolhido, na ordem: (1) o que o próprio aluno enviou; (2) o de outro aluno já analisado na plataforma
 * (só nomes de disciplinas e tópicos do edital público, nunca dados da pessoa). Sem edital, devolve null: o plano NÃO cai em matérias genéricas.
 */
async function findEditalSubjects(userId: string, query: string, editalId?: string): Promise<EditalDoConcurso | null> {
  const admin = createAdminClient();
  const rank = (preps: Prep[]) => preps
    .map((p) => ({ p, score: concursoScore(query, `${p.contest_name ?? ""} ${p.role_name ?? ""}`), cargo: cargoHits(query, p.role_name) }))
    .filter((x) => x.score >= EDITAL_MIN_SCORE)
    .sort((a, b) => b.score - a.score || b.cargo - a.cargo);

  const { data: mine } = await admin.from("edital_preparations").select("id, contest_name, role_name, status, created_at").eq("user_id", userId).in("status", ["concluido", "conferencia"]).order("created_at", { ascending: false }).limit(50);
  const own = (mine ?? []) as Prep[];
  const ownRanked = editalId ? own.filter((p) => p.id === editalId).map((p) => ({ p })) : rank(own);
  for (const { p } of ownRanked) {
    const subjects = await carregarDisciplinas(p.id);
    if (subjects) return { label: rotulo(p), origem: "seu", subjects };
  }
  if (editalId) return null;

  // Edital já analisado de outro aluno (só os confirmados): vale para todos que escolherem o mesmo concurso.
  const { data: pool } = await admin.from("edital_preparations").select("id, contest_name, role_name, created_at").neq("user_id", userId).eq("status", "concluido").order("created_at", { ascending: false }).limit(400);
  const ranked = rank((pool ?? []) as Prep[]);
  if (!ranked.length) return null;
  const topo = ranked.filter((x) => x.score === ranked[0]!.score && x.cargo === ranked[0]!.cargo).slice(0, 6);
  let melhor: { p: Prep; subjects: Array<{ name: string; topics: number }>; total: number } | null = null;
  for (const { p } of topo) {
    const subjects = await carregarDisciplinas(p.id);
    if (!subjects) continue;
    const total = subjects.reduce((a, x) => a + x.topics, 0);
    if (!melhor || total > melhor.total) melhor = { p, subjects, total };
  }
  return melhor ? { label: rotulo(melhor.p), origem: "plataforma", subjects: melhor.subjects } : null;
}

const words = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").split(/[^a-z0-9]+/).filter((w) => w.length >= 3);

/** Procura o concurso no catálogo da plataforma para pegar data da prova e banca (melhor correspondência). */
async function findCatalogContest(contest: string): Promise<{ examDate: string | null; banca: string | null; query: string } | null> {
  const ws = words(contest);
  const { data } = await createAdminClient().from("contest_catalog").select("name, institution, role_name, banca, exam_date, active").eq("active", true).limit(400);
  let best: { score: number; examDate: string | null; banca: string | null } | null = null;
  const chave = (x: string) => x.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
  for (const r of (data ?? []) as Array<{ name: string; institution: string; role_name: string | null; banca: string | null; exam_date: string | null }>) {
    if (chave(r.name) === chave(contest)) { best = { score: 2, examDate: r.exam_date, banca: r.banca }; continue; } // mesmo nome (ex.: "PC MG")
    if (!ws.length || (best && best.score >= 2)) continue;
    const hay = new Set(words(`${r.name} ${r.institution} ${r.role_name ?? ""}`));
    const score = ws.filter((w) => hay.has(w)).length / ws.length;
    if (score >= 0.6 && (!best || score > best.score)) best = { score, examDate: r.exam_date, banca: r.banca };
  }
  return best ? { examDate: best.examDate, banca: best.banca, query: contest } : null;
}

export interface GoalPlan { goal: MentorGoal | null; plan: StudyPlan | null; /** Concurso escolhido, mas a plataforma não tem o edital (conteúdo programático) dele: não há plano. */ semEdital?: boolean }

/** Concurso-alvo + plano semanal montado com os dados reais do aluno (nunca falha o Mentor). */
export async function loadGoalPlan(userId: string, snapshot: MentorSnapshot, result: MentorResult): Promise<GoalPlan> {
  const goal = await getMentorGoal(userId).catch(() => null);
  if (!goal) return { goal: null, plan: null };
  try {
    // Plano pelo edital do concurso escolhido. Sem edital NÃO se monta plano com matérias genéricas da plataforma.
    const edital = await findEditalSubjects(userId, goal.contest, goal.editalId);
    if (!edital) return { goal, plan: null, semEdital: true };
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
    const platform: PlanSubject[] = [...subj].map(([name, s]) => ({ name, pct: s.valid >= 5 ? Math.round((s.correct / s.valid) * 100) : null, pendingLessons: s.pending }));
    const norm = (x: string) => x.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
    const subjects: PlanSubject[] = edital.subjects.map((e) => {
      const hit = platform.find((p) => { const a = norm(p.name), b = norm(e.name); return !!a && !!b && (a.includes(b) || b.includes(a)); });
      return { name: e.name, pct: hit?.pct ?? null, pendingLessons: Math.ceil(e.topics / 5), editalTopics: e.topics };
    });
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
    plan.notes.unshift(edital.origem === "seu"
      ? `Plano montado com o seu edital: ${edital.label || "edital enviado"} (${edital.subjects.length} disciplinas).`
      : `Plano montado com o conteúdo programático do edital ${edital.label || "do concurso"} (${edital.subjects.length} disciplinas). Se o seu cargo tiver matérias diferentes, envie o seu edital em Meu concurso.`);
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
