import "server-only";
import { createAdminClient } from "../supabase";
import { UserFacingError, enforceRateLimit } from "./trails";
import { resetAdminPendenciasCache } from "./admin-pendencias";
import { sendPushToUsers } from "./push";

export interface TeamMessage { id: string; sender: "aluno" | "equipe"; body: string; createdAt: string }

const CONTROL = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f<>]/g;
export function cleanBody(v: unknown): string {
  return typeof v === "string" ? v.normalize("NFC").replace(CONTROL, " ").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim().slice(0, 1000) : "";
}

const map = (r: { id: string; sender: string; body: string; created_at: string }): TeamMessage => ({ id: r.id, sender: r.sender === "equipe" ? "equipe" : "aluno", body: r.body, createdAt: r.created_at });

/** Conversa do aluno com a Equipe. Abrir a conversa marca as respostas da equipe como lidas. */
export async function listMyMessages(userId: string, markRead = true): Promise<TeamMessage[]> {
  const db = createAdminClient();
  const { data, error } = await db.from("team_messages").select("id, sender, body, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(100);
  if (error) throw new Error(error.message);
  if (markRead) await db.from("team_messages").update({ status: "lido" }).eq("user_id", userId).eq("sender", "equipe").eq("status", "novo");
  return (data ?? []).map(map).reverse();
}

/** Respostas da equipe ainda não lidas pelo aluno. */
export async function unreadReplies(userId: string): Promise<number> {
  const { count } = await createAdminClient().from("team_messages").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("sender", "equipe").eq("status", "novo");
  return count ?? 0;
}

export async function sendStudentMessage(userId: string, raw: unknown): Promise<TeamMessage> {
  const body = cleanBody(raw);
  if (!body) throw new UserFacingError("Escreva a sua dúvida antes de enviar.", "invalid");
  await enforceRateLimit(userId, "team_msg", 20, 3600);
  const { data, error } = await createAdminClient().from("team_messages").insert({ user_id: userId, sender: "aluno", body }).select("id, sender, body, created_at").single();
  if (error) throw new Error(error.message);
  resetAdminPendenciasCache();
  return map(data as { id: string; sender: string; body: string; created_at: string });
}

export interface TeamThread {
  userId: string;
  name: string | null;
  email: string | null;
  unread: number;
  lastAt: string;
  messages: TeamMessage[];
}

/** Conversas para o painel da equipe: as com mensagem nova primeiro, depois as mais recentes. */
export async function listThreads(): Promise<TeamThread[]> {
  const db = createAdminClient();
  const { data, error } = await db.from("team_messages").select("id, user_id, sender, body, status, created_at").order("created_at", { ascending: false }).limit(600);
  if (error) throw new Error(error.message);
  const by = new Map<string, TeamThread>();
  for (const r of (data ?? []) as Array<{ id: string; user_id: string; sender: string; body: string; status: string; created_at: string }>) {
    const t = by.get(r.user_id) ?? { userId: r.user_id, name: null, email: null, unread: 0, lastAt: r.created_at, messages: [] };
    if (r.sender === "aluno" && r.status === "novo") t.unread++;
    t.messages.unshift(map(r));
    by.set(r.user_id, t);
  }
  const threads = [...by.values()].slice(0, 100);
  const ids = threads.map((t) => t.userId);
  const profiles = ids.length ? await db.from("profiles").select("id, display_name").in("id", ids) : { data: [] };
  const names = new Map((profiles.data ?? []).map((p) => [p.id as string, (p.display_name as string | null) || null]));
  await Promise.all(threads.map(async (t) => {
    t.name = names.get(t.userId) ?? null;
    t.email = (await db.auth.admin.getUserById(t.userId).catch(() => null))?.data.user?.email ?? null;
  }));
  return threads.sort((a, b) => (b.unread > 0 ? 1 : 0) - (a.unread > 0 ? 1 : 0) || b.lastAt.localeCompare(a.lastAt));
}

/** A equipe responde: grava, marca as perguntas do aluno como atendidas e avisa o aluno no celular. */
export async function replyToStudent(userId: string, raw: unknown): Promise<void> {
  const body = cleanBody(raw);
  if (!body) throw new UserFacingError("Escreva a resposta antes de enviar.", "invalid");
  const db = createAdminClient();
  const ins = await db.from("team_messages").insert({ user_id: userId, sender: "equipe", body });
  if (ins.error) throw new Error(ins.error.message);
  await db.from("team_messages").update({ status: "lido" }).eq("user_id", userId).eq("sender", "aluno").eq("status", "novo");
  resetAdminPendenciasCache();
  await sendPushToUsers([userId], { title: "A Equipe APROVUM respondeu", body: body.slice(0, 120), url: "/mentor#equipe", tag: "equipe-resposta" }).catch(() => undefined);
}

export async function markThreadRead(userId: string): Promise<void> {
  await createAdminClient().from("team_messages").update({ status: "lido" }).eq("user_id", userId).eq("sender", "aluno").eq("status", "novo");
  resetAdminPendenciasCache();
}
