"use server";

import { redirect } from "next/navigation";
import { getSessionUser } from "@/server/auth";
import { createAdminClient, createUserClient } from "@/server/supabase";

/** Tabelas com dados pessoais do aluno entregues na cópia (LGPD art. 18, II e V). Leitura pelo cliente do aluno: o RLS garante que só vêm os dele. */
const TABELAS = [
  "subscriptions", "subscription_payments", "answer_attempts", "bank_attempts", "quiz_attempts", "study_time_days",
  "gamification_activity_days", "gamification_xp_transactions", "learning_progress", "review_schedules", "lesson_annotations",
  "lesson_postits", "error_notebook_entries", "question_marks", "bank_question_notes", "bank_question_favorites", "contest_favorites",
  "edital_preparations", "mentor_recommendations", "avatar_profiles", "writing_submissions", "writing_evaluations", "student_achievements",
] as const;

export async function exportMyDataAction(): Promise<{ ok: true; json: string; name: string } | { ok: false; error: string }> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Sessão expirada. Entre novamente." };
  const db = await createUserClient();
  const out: Record<string, unknown> = { gerado_em: new Date().toISOString(), conta: { id: user.id, email: user.email ?? null } };
  const prof = await db.from("profiles").select("*").eq("id", user.id).maybeSingle();
  out.perfil = prof.data ?? null;
  await Promise.all(TABELAS.map(async (t) => {
    const r = await db.from(t).select("*").eq("user_id", user.id).limit(5000);
    out[t] = r.error ? [] : r.data;
  }));
  return { ok: true, json: JSON.stringify(out, null, 2), name: `aprovum-meus-dados-${new Date().toISOString().slice(0, 10)}.json` };
}

/** Exclui a conta e os dados do aluno. Exige digitar EXCLUIR. Contas da equipe devem ser removidas pelo admin. */
export async function deleteMyAccountAction(confirm: string): Promise<{ error: string } | never> {
  const user = await getSessionUser();
  if (!user) return { error: "Sessão expirada. Entre novamente." };
  if (confirm.trim().toUpperCase() !== "EXCLUIR") return { error: "Digite EXCLUIR para confirmar." };
  const admin = createAdminClient();
  const [a, s, p] = await Promise.all([
    admin.from("admin_roles").select("user_id").eq("user_id", user.id).limit(1),
    admin.from("staff_roles").select("user_id").eq("user_id", user.id).limit(1),
    admin.from("partner_accounts").select("user_id").eq("user_id", user.id).limit(1),
  ]);
  if (a.data?.length || s.data?.length || p.data?.length) return { error: "Contas da equipe e de sócios são removidas pelo administrador. Fale com o suporte." };
  const del = await admin.auth.admin.deleteUser(user.id);
  if (del.error) return { error: "Não foi possível excluir agora. Tente de novo ou fale com o suporte." };
  const supabase = await createUserClient();
  await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
  redirect("/?conta=excluida");
}
