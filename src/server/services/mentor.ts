import "server-only";
import { z } from "zod";
import { ensureDisciplines } from "./disciplines";
import { disciplineLabel } from "@/ai/pedagogy";
import { MENTOR_RULES_VERSION, recommend, type LessonState, type MentorAttempt, type MentorLesson, type MentorResult, type MentorSnapshot, type MentorTopicPerformance } from "@/domain/mentor/engine";
import { reconcile, type RecommendationStatus, type StoredRecommendation, type VisibleRecommendation } from "@/domain/mentor/history";
import { createAdminClient, createUserClient } from "../supabase";
import { auditLog, logEvent } from "../observability";
import { listNotebooks } from "./notebooks";
import { UserFacingError, enforceRateLimit } from "./trails";

/**
 * Mentor APROVUM — acesso aos dados e persistência.
 *
 *  - O usuário vem SEMPRE da sessão (quem chama passa o id já confirmado no servidor); nada
 *    vindo do navegador escolhe de quem são os dados.
 *  - Os dados do aluno são lidos com a sessão dele (RLS). Só as tabelas sem leitura direta do
 *    cliente (respostas dos cadernos) e o conteúdo público do banco usam o cliente de servidor,
 *    sempre filtrando pelo id da sessão.
 *  - Uma leva de consultas por visita (sem N+1); histórico limitado.
 */

const LIMIT = { lessons: 3000, attempts: 3000, bankAttempts: 3000, stored: 300 } as const;

/** Monta o retrato dos dados reais do aluno para o motor. */
export async function loadMentorSnapshot(userId: string): Promise<{ snapshot: MentorSnapshot; name: string | null }> {
  await ensureDisciplines();
  const db = await createUserClient();
  const admin = createAdminClient();
  const [profile, trails, lessons, progress, prereqs, questions, attempts, reviews, bankAttempts, notebooks] = await Promise.all([
    db.from("profiles").select("display_name").eq("id", userId).maybeSingle(),
    db.from("study_trails").select("id, title, discipline_mode, scope_summary, archived_at").eq("user_id", userId).is("archived_at", null).limit(300),
    db.from("lessons").select("id, trail_id, title, sort_order").eq("user_id", userId).order("sort_order").limit(LIMIT.lessons),
    db.from("learning_progress").select("lesson_id, state, levels_passed, reading_completed_at, updated_at").eq("user_id", userId).limit(LIMIT.lessons),
    db.from("lesson_prerequisites").select("lesson_id, prerequisite_lesson_id").eq("user_id", userId).limit(LIMIT.lessons),
    db.from("questions").select("lesson_id, level, active, recovery_of").eq("user_id", userId).eq("active", true).is("recovery_of", null).limit(20000),
    db.from("answer_attempts").select("is_correct, questions(lesson_id, active)").eq("user_id", userId).order("created_at", { ascending: false }).limit(LIMIT.attempts),
    db.from("review_schedules").select("lesson_id, trail_id, due_at").eq("user_id", userId).limit(500),
    // Respostas dos cadernos não têm leitura direta pelo cliente: servidor, filtrado pelo id da sessão.
    admin.from("bank_attempts").select("question_id, is_correct, omitted").eq("user_id", userId).order("created_at", { ascending: false }).limit(LIMIT.bankAttempts),
    listNotebooks(userId).catch(() => []),
  ]);
  for (const r of [trails, lessons, progress, prereqs, questions, attempts, reviews, bankAttempts]) if (r.error) throw new Error(r.error.message);

  // Matéria de cada estudo: a do catálogo (como no painel) ou a do próprio estudo.
  type TrailRow = { id: string; title: string; discipline_mode: string | null; scope_summary: { catalogTopics?: Array<{ id: string }> } | null };
  const trailRows = (trails.data ?? []) as TrailRow[];
  const topicIds = [...new Set(trailRows.flatMap((t) => (t.scope_summary?.catalogTopics ?? []).map((c) => c.id)))];
  const topicDiscipline = new Map<string, string>();
  if (topicIds.length) {
    const { data } = await admin.from("catalog_topics").select("id, discipline_mode").in("id", topicIds.slice(0, 500));
    for (const t of (data ?? []) as Array<{ id: string; discipline_mode: string }>) topicDiscipline.set(t.id, t.discipline_mode);
  }
  const label = (mode: string | null | undefined) => (mode && mode !== "outra" ? (disciplineLabel(mode) ?? null) : null);
  const trailInfo = new Map(
    trailRows.map((t) => {
      const fromCatalog = (t.scope_summary?.catalogTopics ?? []).map((c) => label(topicDiscipline.get(c.id))).find(Boolean) ?? null;
      return [t.id, { title: t.title, subject: fromCatalog ?? label(t.discipline_mode) }] as const;
    }),
  );

  type ProgressRow = { lesson_id: string; state: string; levels_passed: number | null; reading_completed_at: string | null; updated_at: string | null };
  const prog = new Map(((progress.data ?? []) as ProgressRow[]).map((p) => [p.lesson_id, p]));
  const pre = new Map<string, string[]>();
  for (const p of (prereqs.data ?? []) as Array<{ lesson_id: string; prerequisite_lesson_id: string }>) pre.set(p.lesson_id, [...(pre.get(p.lesson_id) ?? []), p.prerequisite_lesson_id]);
  const qByLesson = new Map<string, { facil: number; medio: number; dificil: number }>();
  for (const q of (questions.data ?? []) as Array<{ lesson_id: string; level: string | null }>) {
    const c = qByLesson.get(q.lesson_id) ?? { facil: 0, medio: 0, dificil: 0 };
    if (q.level === "facil" || q.level === "medio" || q.level === "dificil") c[q.level]++;
    qByLesson.set(q.lesson_id, c);
  }

  const order = new Map<string, number>();
  const mentorLessons: MentorLesson[] = [];
  for (const l of (lessons.data ?? []) as Array<{ id: string; trail_id: string; title: string; sort_order: number }>) {
    const t = trailInfo.get(l.trail_id);
    if (!t) continue; // estudo arquivado
    const n = (order.get(l.trail_id) ?? 0) + 1;
    order.set(l.trail_id, n);
    const p = prog.get(l.id);
    mentorLessons.push({
      id: l.id,
      trailId: l.trail_id,
      trailTitle: t.title,
      subject: t.subject,
      title: l.title,
      order: n,
      state: (p?.state as LessonState | undefined) ?? null,
      readingDone: !!p?.reading_completed_at,
      levelsPassed: Math.min(3, Math.max(0, p?.levels_passed ?? 0)),
      updatedAt: p?.updated_at ?? null,
      prerequisiteIds: pre.get(l.id) ?? [],
      questionsByLevel: qByLesson.get(l.id) ?? { facil: 0, medio: 0, dificil: 0 },
    });
  }
  const lessonById = new Map(mentorLessons.map((l) => [l.id, l]));

  // Desempenho por aula (questões de fixação): cada resposta uma vez; questão desativada não conta.
  const perLesson = new Map<string, MentorAttempt[]>();
  for (const a of (attempts.data ?? []) as unknown as Array<{ is_correct: boolean | null; questions: { lesson_id: string | null; active: boolean } | null }>) {
    const lid = a.questions?.lesson_id;
    if (!lid || !lessonById.has(lid)) continue;
    perLesson.set(lid, [...(perLesson.get(lid) ?? []), { correct: a.is_correct, questionValid: a.questions?.active !== false }]);
  }
  const performance: MentorTopicPerformance[] = [...perLesson].map(([lid, list]) => {
    const l = lessonById.get(lid)!;
    return { key: `aula:${lid}`, label: l.title, subject: l.subject, href: `/aula/${lid}#questoes`, attempts: list };
  });

  // Desempenho por assunto do banco (cadernos): questão fora de "publicada" (anulada/arquivada) não conta.
  type BankAttempt = { question_id: string; is_correct: boolean | null; omitted: boolean | null };
  const bankRows = (bankAttempts.data ?? []) as BankAttempt[];
  const qids = [...new Set(bankRows.map((a) => a.question_id))];
  if (qids.length) {
    type BQ = { id: string; status: string; subject_id: string | null; topic_id: string | null };
    const bq: BQ[] = [];
    for (let i = 0; i < qids.length; i += 200) {
      const part = await admin.from("bank_questions").select("id, status, subject_id, topic_id").in("id", qids.slice(i, i + 200));
      if (part.error) throw new Error(part.error.message);
      bq.push(...((part.data ?? []) as BQ[]));
    }
    const byQ = new Map(bq.map((q) => [q.id, q]));
    const subjIds = [...new Set(bq.map((q) => q.subject_id).filter((x): x is string => !!x))];
    const topIds = [...new Set(bq.map((q) => q.topic_id).filter((x): x is string => !!x))];
    const [subs, tops] = await Promise.all([
      subjIds.length ? admin.from("subjects").select("id, name").in("id", subjIds) : { data: [] },
      topIds.length ? admin.from("subject_topics").select("id, name").in("id", topIds) : { data: [] },
    ]);
    const subName = new Map(((subs.data ?? []) as Array<{ id: string; name: string }>).map((x) => [x.id, x.name]));
    const topName = new Map(((tops.data ?? []) as Array<{ id: string; name: string }>).map((x) => [x.id, x.name]));
    const groups = new Map<string, MentorTopicPerformance>();
    for (const a of bankRows) {
      const q = byQ.get(a.question_id);
      if (!q) continue;
      const key = q.topic_id ? `banco:${q.topic_id}` : q.subject_id ? `banco-materia:${q.subject_id}` : null;
      if (!key) continue;
      const g = groups.get(key) ?? {
        key,
        label: (q.topic_id && topName.get(q.topic_id)) || (q.subject_id && subName.get(q.subject_id)) || "Assunto",
        subject: (q.subject_id && subName.get(q.subject_id)) || null,
        href: "/questoes",
        attempts: [],
      };
      g.attempts.push({ correct: a.is_correct, questionValid: q.status === "publicada", omitted: !!a.omitted });
      groups.set(key, g);
    }
    performance.push(...groups.values());
  }

  const snapshot: MentorSnapshot = {
    now: new Date().toISOString(),
    lessons: mentorLessons,
    performance,
    reviews: ((reviews.data ?? []) as Array<{ lesson_id: string; due_at: string | null }>)
      .filter((r) => lessonById.has(r.lesson_id))
      .map((r) => ({ lessonId: r.lesson_id, title: lessonById.get(r.lesson_id)!.title, subject: lessonById.get(r.lesson_id)!.subject, dueAt: r.due_at })),
    notebooks: notebooks.map((n) => ({ id: n.id, title: n.title, answered: n.answered, available: n.available })),
  };
  const name = ((profile.data as { display_name: string | null } | null)?.display_name ?? "").trim().split(/\s+/)[0] || null;
  return { snapshot, name };
}

type StoredRow = { id: string; dedupe_key: string; context_hash: string; status: RecommendationStatus; created_at: string; dismissed_at: string | null };

export interface MentorView {
  name: string | null;
  result: MentorResult;
  visible: VisibleRecommendation[];
  lessons: MentorLesson[];
}

/**
 * Calcula as recomendações, concilia com o histórico e grava só o necessário (idempotente):
 * novas apresentadas, pendências resolvidas pelos dados (concluída) e reativações.
 */
export async function computeMentor(userId: string): Promise<MentorView> {
  const { snapshot, name } = await loadMentorSnapshot(userId);
  const result = recommend(snapshot);
  const admin = createAdminClient();
  const stored = await admin
    .from("mentor_recommendations")
    .select("id, dedupe_key, context_hash, status, created_at, dismissed_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(LIMIT.stored);
  if (stored.error) throw new Error(stored.error.message);
  const rows: StoredRecommendation[] = ((stored.data ?? []) as StoredRow[]).map((r) => ({ id: r.id, key: r.dedupe_key, contextHash: r.context_hash, status: r.status, createdAt: r.created_at, dismissedAt: r.dismissed_at }));
  const rec = reconcile(result.all, rows, new Date(snapshot.now));
  const now = new Date().toISOString();

  if (rec.toInsert.length) {
    const ins = await admin
      .from("mentor_recommendations")
      .upsert(
        rec.toInsert.map((r) => ({
          user_id: userId,
          dedupe_key: r.key,
          context_hash: r.contextHash,
          kind: r.kind,
          rule: r.rule,
          entity_type: r.entity.type,
          entity_id: r.entity.id.slice(0, 120),
          title: r.explanation.slice(0, 300),
          reason: r.reason.slice(0, 600),
          priority: Math.max(0, Math.min(1000, Math.round(r.priority))),
          href: r.href,
          rules_version: MENTOR_RULES_VERSION,
        })),
        { onConflict: "user_id,dedupe_key,context_hash", ignoreDuplicates: true },
      )
      .select("id, dedupe_key, context_hash");
    if (ins.error) throw new Error(ins.error.message);
    // Chamadas concorrentes: quem perdeu a corrida lê o id gravado pela outra.
    const ids = new Map(((ins.data ?? []) as Array<{ id: string; dedupe_key: string; context_hash: string }>).map((x) => [`${x.dedupe_key}\u0000${x.context_hash}`, x.id]));
    const missing = rec.visible.filter((v) => v.storedId === null && !ids.has(`${v.key}\u0000${v.contextHash}`));
    if (missing.length) {
      const again = await admin.from("mentor_recommendations").select("id, dedupe_key, context_hash").eq("user_id", userId).in("dedupe_key", missing.map((m) => m.key));
      for (const x of (again.data ?? []) as Array<{ id: string; dedupe_key: string; context_hash: string }>) ids.set(`${x.dedupe_key}\u0000${x.context_hash}`, x.id);
    }
    for (const v of rec.visible) if (v.storedId === null) v.storedId = ids.get(`${v.key}\u0000${v.contextHash}`) ?? null;
  }
  if (rec.toResolve.length) {
    const r = await admin.from("mentor_recommendations").update({ status: "concluida", resolved_at: now }).eq("user_id", userId).in("id", rec.toResolve).in("status", ["nova", "visualizada"]);
    if (r.error) throw new Error(r.error.message);
  }
  if (rec.toReactivate.length) {
    const r = await admin.from("mentor_recommendations").update({ status: "nova", dismissed_at: null, resolved_at: null }).eq("user_id", userId).in("id", rec.toReactivate);
    if (r.error) throw new Error(r.error.message);
  }
  return { name, result, visible: rec.visible, lessons: snapshot.lessons };
}

const idSchema = z.uuid();

/**
 * Muda o estado de uma recomendação DO PRÓPRIO aluno: "visualizada" (abriu a ação) ou
 * "dispensada". Concluída nunca vem do navegador: só quando os dados confirmam.
 */
export async function setRecommendationStatus(userId: string, idInput: string, status: "visualizada" | "dispensada") {
  const id = idSchema.parse(idInput);
  await enforceRateLimit(userId, "mentor_status", 60);
  const admin = createAdminClient();
  const patch = status === "dispensada" ? { status, dismissed_at: new Date().toISOString() } : { status, seen_at: new Date().toISOString() };
  const allowed = status === "dispensada" ? ["nova", "visualizada"] : ["nova"];
  const r = await admin.from("mentor_recommendations").update(patch).eq("id", id).eq("user_id", userId).in("status", allowed).select("id, kind");
  if (r.error) throw new Error(r.error.message);
  if (!r.data?.length) {
    // Já estava nesse estado (ou concluída) — só confirma que a recomendação é do aluno.
    const own = await admin.from("mentor_recommendations").select("id").eq("id", id).eq("user_id", userId).maybeSingle();
    if (!own.data) throw new UserFacingError("Recomendação não encontrada.", "not_found");
    return;
  }
  if (status === "dispensada") {
    await auditLog(admin, { actorId: userId, userId, action: "mentor.recommendation_dismissed", entity: "mentor_recommendations", entityId: id, meta: { kind: (r.data[0] as { kind: string }).kind } });
    await logEvent("mentor.dismissed", { kind: (r.data[0] as { kind: string }).kind });
  }
}
