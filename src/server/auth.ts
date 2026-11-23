import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createUserClient } from "./supabase";

export interface SessionUser {
  id: string;
  email: string | null;
  /** Horário do último login: muda a cada login novo. */
  signedInAt?: string | null;
}

/** Valida a sessão com o servidor de autenticação (não confia só no cookie). */
export const getSessionUser = cache(async function getSessionUser(): Promise<SessionUser | null> {
  const supabase = await createUserClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return { id: data.user.id, email: data.user.email ?? null, signedInAt: data.user.last_sign_in_at ?? null };
});

/**
 * Identidade do aluno SEM ir ao servidor de autenticação: confere a assinatura e a validade do token localmente (getClaims).
 * Só para rotas leves e repetitivas (batida de presença, consulta de desafios, painéis do admin), que são chamadas a cada poucos
 * segundos por aba aberta. Páginas, ações e dados sensíveis continuam usando getSessionUser (valida a sessão no servidor).
 */
export const getSessionUserFast = cache(async function getSessionUserFast(): Promise<SessionUser | null> {
  const supabase = await createUserClient();
  const { data, error } = await supabase.auth.getClaims();
  const c = data?.claims;
  if (error || !c?.sub) return null;
  return { id: c.sub, email: typeof c.email === "string" ? c.email : null, signedInAt: null };
});

export async function requireUser(next?: string): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect(next ? `/entrar?next=${encodeURIComponent(next)}` : "/entrar");
  return user;
}

export async function isAdmin(): Promise<boolean> {
  const supabase = await createUserClient();
  const { data } = await supabase.rpc("is_admin");
  return data === true;
}
