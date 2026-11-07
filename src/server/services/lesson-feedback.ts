import "server-only";
import { createAdminClient } from "@/server/supabase";
import { UserFacingError } from "./trails";
import { disciplineLabel } from "@/ai/pedagogy";
import { devePerguntar, enviarSchema, type EstadoFeedback, type FeedbackLinha } from "@/domain/feedback/feedback";

const db = () => createAdminClient();

export async function estadoFeedback(userId: string, lessonId: string): Promise<EstadoFeedback> {
  const { data } = await db().from("lesson_feedbacks").select("status, skips, last_skipped_at").eq("user_id", userId).eq("lesson_id", lessonId).maybeSingle();
  if (!data) return { status: "nenhum", skips: 0, lastSkippedAt: null };
  return { status: data.status as "enviado" | "dispensado", skips: data.skips ?? 0, lastSkippedAt: data.last_skipped_at ?? null };
}

export async function deveMostrarFeedback(userId: string, lessonId: string): Promise<{ concluida: boolean; perguntar: boolean; enviado: boolean }> {
  const [c, e] = await Promise.all([contexto(userId, lessonId), estadoFeedback(userId, lessonId)]);
  return { concluida: c.concluida, perguntar: c.concluida && devePerguntar(e), enviado: e.status === "enviado" };
}

/** Confere no servidor: a aula é do aluno e está concluída (leitura + 3 níveis). Também resolve título/matéria/nome/e-mail. */
async function contexto(userId: string, lessonId: string) {
  const admin = db();
  const [l, p] = await Promise.all([
    admin.from("lessons").select("id, title, trail_id, user_id, study_trails(scope_summary, discipline_mode)").eq("id", lessonId).eq("user_id", userId).maybeSingle(),
    admin.from("learning_progress").select("levels_passed, reading_completed_at").eq("user_id", userId).eq("lesson_id", lessonId).maybeSingle(),
  ]);
  if (!l.data) throw new UserFacingError("Aula não encontrada.", "not_found");
  const t = (Array.isArray(l.data.study_trails) ? l.data.study_trails[0] : l.data.study_trails) as { scope_summary?: { subject?: string | null } | null; discipline_mode?: string | null } | null;
  const mode = t?.discipline_mode;
  const subject = t?.scope_summary?.subject ?? (mode && mode !== "outra" ? disciplineLabel(mode) ?? mode : null);
  const concluida = !!p.data?.reading_completed_at && (p.data?.levels_passed ?? 0) >= 3;
  return { title: l.data.title as string, trailId: l.data.trail_id as string, subject: subject ?? null, concluida, completedAt: (p.data?.reading_completed_at as string | null) ?? null };
}

async function identidade(userId: string) {
  const [prof, au] = await Promise.all([db().from("profiles").select("display_name").eq("id", userId).maybeSingle(), db().auth.admin.getUserById(userId)]);
  return { name: (prof.data?.display_name as string | null) ?? null, email: au.data?.user?.email ?? null };
}

export async function enviarFeedback(userId: string, raw: unknown): Promise<void> {
  const parsed = enviarSchema.safeParse(raw);
  if (!parsed.success) throw new UserFacingError(parsed.error.issues[0]?.message ?? "Dados inválidos.", "invalid");
  const { lessonId, rating, comment } = parsed.data;
  const ctx = await contexto(userId, lessonId);
  if (!ctx.concluida) throw new UserFacingError("Conclua a aula para avaliá-la.", "not_completed");
  const admin = db();
  const atual = await estadoFeedback(userId, lessonId);
  if (atual.status === "enviado") throw new UserFacingError("Você já avaliou esta aula. Obrigado!", "duplicate");
  const who = await identidade(userId);
  const base = { student_name: who.name, student_email: who.email, trail_id: ctx.trailId, lesson_title: ctx.title, subject: ctx.subject, status: "enviado", rating, comment, completed_at: ctx.completedAt };
  const r =
    atual.status === "dispensado"
      ? await admin.from("lesson_feedbacks").update(base).eq("user_id", userId).eq("lesson_id", lessonId).eq("status", "dispensado")
      : await admin.from("lesson_feedbacks").insert({ ...base, user_id: userId, lesson_id: lessonId });
  if (r.error) {
    if (r.error.code === "23505") throw new UserFacingError("Você já avaliou esta aula. Obrigado!", "duplicate");
    throw new Error(r.error.message);
  }
}

export async function dispensarFeedback(userId: string, lessonId: string): Promise<void> {
  const ctx = await contexto(userId, lessonId);
  if (!ctx.concluida) return;
  const admin = db();
  const atual = await estadoFeedback(userId, lessonId);
  if (atual.status === "enviado") return;
  const agora = new Date().toISOString();
  if (atual.status === "dispensado") {
    await admin.from("lesson_feedbacks").update({ skips: atual.skips + 1, last_skipped_at: agora }).eq("user_id", userId).eq("lesson_id", lessonId).eq("status", "dispensado");
    return;
  }
  const who = await identidade(userId);
  const r = await admin.from("lesson_feedbacks").insert({ user_id: userId, lesson_id: lessonId, trail_id: ctx.trailId, student_name: who.name, student_email: who.email, lesson_title: ctx.title, subject: ctx.subject, status: "dispensado", skips: 1, last_skipped_at: agora, completed_at: ctx.completedAt });
  if (r.error && r.error.code !== "23505") throw new Error(r.error.message);
}

// ---------------- Administração (quem chama deve ter passado por requireAdmin) ----------------
export interface FeedbackAdmin extends FeedbackLinha {
  userId: string | null;
  studentName: string | null;
  studentEmail: string | null;
  completedAt: string | null;
}

export async function listarFeedbacks(): Promise<FeedbackAdmin[]> {
  const out: FeedbackAdmin[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db().from("lesson_feedbacks").select("id, user_id, student_name, student_email, lesson_id, lesson_title, subject, rating, comment, completed_at, created_at").eq("status", "enviado").order("created_at", { ascending: false }).range(from, from + 999);
    if (error) throw new Error(error.message);
    for (const r of data ?? [])
      out.push({ id: r.id, userId: r.user_id, studentName: r.student_name, studentEmail: r.student_email, lessonId: r.lesson_id, lessonTitle: r.lesson_title, subject: r.subject, rating: r.rating as number, comment: r.comment, completedAt: r.completed_at, createdAt: r.created_at });
    if (!data || data.length < 1000) break;
  }
  return out;
}

export async function contarDispensas(): Promise<number> {
  const { count } = await db().from("lesson_feedbacks").select("id", { count: "exact", head: true }).eq("status", "dispensado");
  return count ?? 0;
}
