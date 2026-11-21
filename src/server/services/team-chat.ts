import "server-only";
import { createAdminClient } from "../supabase";
import { UserFacingError, enforceRateLimit } from "./trails";
import { resetAdminPendenciasCache } from "./admin-pendencias";
import { sendPushToUsers } from "./push";
import { ANEXO_PATH } from "@/domain/equipe-anexo";

const BUCKET = "equipe-anexos";

/** deliveredAt: chegou ao app/painel de quem recebe ("Recebido"); readAt: a conversa foi aberta ("Lido"). */
export interface TeamMessage { id: string; sender: "aluno" | "equipe"; body: string; createdAt: string; deliveredAt: string | null; readAt: string | null; /** Foto/print anexado (link temporário). */ attachmentUrl: string | null }
type Row = { id: string; sender: string; body: string; created_at: string; delivered_at: string | null; read_at: string | null; attachment_path?: string | null };
const COLS = "id, sender, body, created_at, delivered_at, read_at, attachment_path";

const CONTROL = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f<>]/g;
export function cleanBody(v: unknown): string {
  return typeof v === "string" ? v.normalize("NFC").replace(CONTROL, " ").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim().slice(0, 1000) : "";
}

const map = (r: Row): TeamMessage => ({ id: r.id, sender: r.sender === "equipe" ? "equipe" : "aluno", body: r.body, createdAt: r.created_at, deliveredAt: r.delivered_at ?? null, readAt: r.read_at ?? null, attachmentUrl: null });

/** Troca o caminho do anexo por um link assinado de 1 hora (o bucket é privado). */
async function sign(rows: Row[]): Promise<TeamMessage[]> {
  const msgs = rows.map(map);
  const paths = [...new Set(rows.map((r) => r.attachment_path).filter((x): x is string => !!x))];
  if (!paths.length) return msgs;
  const { data } = await createAdminClient().storage.from(BUCKET).createSignedUrls(paths, 3600);
  const url = new Map((data ?? []).filter((d) => d.path && d.signedUrl).map((d) => [d.path as string, d.signedUrl]));
  return msgs.map((m, i) => ({ ...m, attachmentUrl: rows[i]!.attachment_path ? (url.get(rows[i]!.attachment_path!) ?? null) : null }));
}

/** Conversa do aluno com a Equipe. Abrir a conversa marca as respostas da equipe como lidas. */
export async function listMyMessages(userId: string, markRead = true): Promise<TeamMessage[]> {
  const db = createAdminClient();
  const now = new Date().toISOString();
  if (markRead) {
    // Abrir a conversa = recebeu e leu as respostas da equipe.
    await db.from("team_messages").update({ status: "lido", read_at: now }).eq("user_id", userId).eq("sender", "equipe").is("read_at", null);
    await db.from("team_messages").update({ delivered_at: now }).eq("user_id", userId).eq("sender", "equipe").is("delivered_at", null);
  }
  const { data, error } = await db.from("team_messages").select(COLS).eq("user_id", userId).order("created_at", { ascending: false }).limit(100);
  if (error) throw new Error(error.message);
  return (await sign((data ?? []) as Row[])).reverse();
}

export interface TeamPopup { id: string; body: string; createdAt: string }

/** Respostas da equipe que o aluno ainda não leu, para o pop-up em qualquer tela. Buscar = "Recebido". */
export async function newTeamReplies(userId: string): Promise<TeamPopup[]> {
  const db = createAdminClient();
  const { data, error } = await db.from("team_messages").select("id, body, created_at").eq("user_id", userId).eq("sender", "equipe").eq("status", "novo").order("created_at", { ascending: false }).limit(3);
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as Array<{ id: string; body: string; created_at: string }>;
  if (rows.length) await db.from("team_messages").update({ delivered_at: new Date().toISOString() }).in("id", rows.map((r) => r.id)).is("delivered_at", null);
  return rows.map((r) => ({ id: r.id, body: r.body || "📷 A Equipe enviou uma imagem", createdAt: r.created_at }));
}

/** Respostas da equipe ainda não lidas pelo aluno. */
export async function unreadReplies(userId: string): Promise<number> {
  const { count } = await createAdminClient().from("team_messages").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("sender", "equipe").eq("status", "novo");
  return count ?? 0;
}

export async function sendStudentMessage(userId: string, raw: unknown, attachmentPath?: string | null): Promise<TeamMessage> {
  const body = cleanBody(raw);
  // O anexo só vale se estiver na pasta do próprio aluno e no formato esperado.
  const path = attachmentPath && ANEXO_PATH.test(attachmentPath) && attachmentPath.startsWith(`${userId}/`) ? attachmentPath : null;
  if (attachmentPath && !path) throw new UserFacingError("Anexo inválido. Envie a foto de novo.", "invalid");
  if (!body && !path) throw new UserFacingError("Escreva a sua dúvida ou anexe uma foto antes de enviar.", "invalid");
  await enforceRateLimit(userId, "team_msg", 20, 3600);
  const { data, error } = await createAdminClient().from("team_messages").insert({ user_id: userId, sender: "aluno", body, attachment_path: path }).select(COLS).single();
  if (error) throw new Error(error.message);
  resetAdminPendenciasCache();
  return (await sign([data as Row]))[0]!;
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
  // Abrir o painel = a equipe "recebeu" as mensagens dos alunos.
  await db.from("team_messages").update({ delivered_at: new Date().toISOString() }).eq("sender", "aluno").is("delivered_at", null);
  const { data, error } = await db.from("team_messages").select("id, user_id, sender, body, status, created_at, delivered_at, read_at, attachment_path").order("created_at", { ascending: false }).limit(600);
  if (error) throw new Error(error.message);
  const by = new Map<string, TeamThread>();
  const all = (data ?? []) as Array<Row & { user_id: string; status: string }>;
  const signed = await sign(all);
  for (const [i, r] of all.entries()) {
    const t = by.get(r.user_id) ?? { userId: r.user_id, name: null, email: null, unread: 0, lastAt: r.created_at, messages: [] };
    if (r.sender === "aluno" && r.status === "novo") t.unread++;
    t.messages.unshift(signed[i]!);
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
export async function replyToStudent(userId: string, raw: unknown, attachmentPath?: string | null): Promise<void> {
  const body = cleanBody(raw);
  // A imagem da equipe fica na pasta do aluno da conversa (mesmo caminho/bucket dos anexos do aluno).
  const path = attachmentPath && ANEXO_PATH.test(attachmentPath) && attachmentPath.startsWith(`${userId}/`) ? attachmentPath : null;
  if (attachmentPath && !path) throw new UserFacingError("Anexo inválido. Envie a imagem de novo.", "invalid");
  if (!body && !path) throw new UserFacingError("Escreva a resposta ou anexe uma imagem antes de enviar.", "invalid");
  const db = createAdminClient();
  // A equipe pode puxar conversa com qualquer aluno cadastrado: confere que a conta existe.
  const { data: u, error: ue } = await db.auth.admin.getUserById(userId);
  if (ue || !u?.user) throw new UserFacingError("Aluno não encontrado.", "not_found");
  const ins = await db.from("team_messages").insert({ user_id: userId, sender: "equipe", body, attachment_path: path });
  if (ins.error) throw new Error(ins.error.message);
  await db.from("team_messages").update({ status: "lido", read_at: new Date().toISOString() }).eq("user_id", userId).eq("sender", "aluno").eq("status", "novo");
  await db.from("team_messages").update({ read_at: new Date().toISOString() }).eq("user_id", userId).eq("sender", "aluno").is("read_at", null);
  resetAdminPendenciasCache();
  await sendPushToUsers([userId], { title: "A Equipe APROVUM respondeu", body: body ? body.slice(0, 120) : "📷 A Equipe enviou uma imagem", url: "/mentor#equipe", tag: "equipe-resposta" }).catch(() => undefined);
}

/** A equipe abriu a conversa: as mensagens do aluno ficam "Lidas" (continuam pendentes até responder ou marcar como atendida). */
export async function markThreadSeen(userId: string): Promise<void> {
  await createAdminClient().from("team_messages").update({ read_at: new Date().toISOString() }).eq("user_id", userId).eq("sender", "aluno").is("read_at", null);
}

export async function markThreadRead(userId: string): Promise<void> {
  await createAdminClient().from("team_messages").update({ status: "lido", read_at: new Date().toISOString() }).eq("user_id", userId).eq("sender", "aluno").eq("status", "novo");
  resetAdminPendenciasCache();
}
