import "server-only";
import { redirect } from "next/navigation";
import { createUserClient } from "./supabase";

export interface SessionUser {
  id: string;
  email: string | null;
}

/** Valida a sessão com o servidor de autenticação (não confia só no cookie). */
export async function getSessionUser(): Promise<SessionUser | null> {
  const supabase = await createUserClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return { id: data.user.id, email: data.user.email ?? null };
}

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
