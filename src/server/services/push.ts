import "server-only";
import * as webpush from "web-push";
import { createAdminClient } from "../supabase";
import { logEvent } from "../observability";

export interface PushMessage {
  title: string;
  body: string;
  /** Caminho aberto ao tocar na notificação (sempre dentro do app). */
  url?: string;
  /** Mesma tag substitui a notificação anterior em vez de empilhar. */
  tag?: string;
  /** Número mostrado no ícone do app (selo). */
  badge?: number;
  /** Chave da prioridade do Mentor: o app fecha a notificação quando o aluno a dispensa. */
  ref?: string;
}

export type PushAudience = "todos" | "pagos" | "gratuitos" | "admins";

let vapid: { publicKey: string; privateKey: string } | null = null;

/** Chaves VAPID: geradas uma única vez e guardadas no banco (sem variável de ambiente para configurar). */
export async function getVapid(): Promise<{ publicKey: string; privateKey: string }> {
  if (vapid) return vapid;
  const db = createAdminClient();
  const { data } = await db.from("push_config").select("public_key, private_key").eq("id", 1).maybeSingle();
  if (data) return (vapid = { publicKey: data.public_key as string, privateKey: data.private_key as string });
  const k = webpush.generateVAPIDKeys();
  const ins = await db.from("push_config").insert({ id: 1, public_key: k.publicKey, private_key: k.privateKey });
  if (ins.error) {
    // Outra requisição criou primeiro: usa a que ficou salva.
    const again = await db.from("push_config").select("public_key, private_key").eq("id", 1).maybeSingle();
    if (!again.data) throw new Error(ins.error.message);
    return (vapid = { publicKey: again.data.public_key as string, privateKey: again.data.private_key as string });
  }
  return (vapid = { publicKey: k.publicKey, privateKey: k.privateKey });
}

export async function saveSubscription(userId: string, sub: { endpoint: string; p256dh: string; auth: string }, userAgent: string | null): Promise<void> {
  const { error } = await createAdminClient().from("push_subscriptions").upsert(
    { user_id: userId, endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth, user_agent: userAgent?.slice(0, 200) ?? null },
    { onConflict: "endpoint" },
  );
  if (error) throw new Error(error.message);
}

export async function removeSubscription(userId: string, endpoint: string): Promise<void> {
  const { error } = await createAdminClient().from("push_subscriptions").delete().eq("user_id", userId).eq("endpoint", endpoint);
  if (error) throw new Error(error.message);
}

interface SubRow { id: string; user_id: string; endpoint: string; p256dh: string; auth: string }

/** Envia a mensagem a todos os aparelhos dos usuários; inscrições mortas (404/410) são apagadas. */
export async function sendPushToSubs(subs: SubRow[], msg: PushMessage): Promise<{ sent: number; failed: number; removed: number }> {
  if (!subs.length) return { sent: 0, failed: 0, removed: 0 };
  const { publicKey, privateKey } = await getVapid();
  const subject = process.env.VAPID_SUBJECT || "mailto:contato@aprovum.com.br";
  const payload = JSON.stringify({ title: msg.title.slice(0, 80), body: msg.body.slice(0, 220), url: msg.url?.startsWith("/") ? msg.url : "/painel", tag: msg.tag, badge: msg.badge, ref: msg.ref });
  const dead: string[] = [];
  let sent = 0, failed = 0;
  for (let i = 0; i < subs.length; i += 20) {
    await Promise.all(subs.slice(i, i + 20).map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { vapidDetails: { subject, publicKey, privateKey }, TTL: 60 * 60 * 12, urgency: "normal" });
        sent++;
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) dead.push(s.id);
        else { failed++; await logEvent("push.send_failed", { code: code ?? null, error: String((e as Error).message).slice(0, 160) }).catch(() => undefined); }
      }
    }));
  }
  const db = createAdminClient();
  if (dead.length) await db.from("push_subscriptions").delete().in("id", dead);
  const ok = subs.map((s) => s.id).filter((id) => !dead.includes(id));
  if (sent && ok.length) await db.from("push_subscriptions").update({ last_sent_at: new Date().toISOString() }).in("id", ok);
  return { sent, failed, removed: dead.length };
}

async function subsOf(userIds: string[] | null): Promise<SubRow[]> {
  const db = createAdminClient();
  const out: SubRow[] = [];
  const COLS = "id, user_id, endpoint, p256dh, auth";
  if (userIds === null) {
    for (let from = 0; ; from += 1000) {
      const { data, error } = await db.from("push_subscriptions").select(COLS).range(from, from + 999);
      if (error) throw new Error(error.message);
      out.push(...((data ?? []) as SubRow[]));
      if ((data ?? []).length < 1000) break;
    }
    return out;
  }
  for (let i = 0; i < userIds.length; i += 200) {
    const { data, error } = await db.from("push_subscriptions").select(COLS).in("user_id", userIds.slice(i, i + 200));
    if (error) throw new Error(error.message);
    out.push(...((data ?? []) as SubRow[]));
  }
  return out;
}

export async function sendPushToUsers(userIds: string[], msg: PushMessage) {
  return sendPushToSubs(await subsOf(userIds), msg);
}

/** Aparelhos de uma audiência: todos, só plano pago, só gratuito ou só administradores. */
export async function sendPushToAudience(aud: PushAudience, msg: PushMessage) {
  const db = createAdminClient();
  if (aud === "todos") return sendPushToSubs(await subsOf(null), msg);
  if (aud === "admins") {
    const { data } = await db.from("admin_roles").select("user_id").eq("role", "admin");
    return sendPushToUsers((data ?? []).map((r) => r.user_id as string), msg);
  }
  const { data: paid } = await db.from("subscriptions").select("user_id, current_period_end").eq("status", "active").neq("plan_id", "free");
  const now = Date.now();
  const paidIds = new Set((paid ?? []).filter((r) => !r.current_period_end || Date.parse(r.current_period_end as string) > now).map((r) => r.user_id as string));
  const all = await subsOf(null);
  return sendPushToSubs(all.filter((s) => (aud === "pagos") === paidIds.has(s.user_id)), msg);
}

/** Quantos aparelhos têm aviso ativo (para o admin ver o alcance). */
export async function countPushDevices(): Promise<{ devices: number; users: number }> {
  const { data, error } = await createAdminClient().from("push_subscriptions").select("user_id").limit(10000);
  if (error) throw new Error(error.message);
  return { devices: (data ?? []).length, users: new Set((data ?? []).map((r) => r.user_id as string)).size };
}

/**
 * Aviso de concurso previsto ou aberto: vai a quem ativou o alerta (todos os concursos "*" ou o estado do
 * concurso) e a quem favoritou esse concurso. Quem não ligou os avisos no celular não recebe.
 */
export async function notifyContestPush(c: { id: string; name: string; institution: string | null; uf: string | null; status: string }): Promise<{ sent: number }> {
  const aberto = c.status === "inscricoes_abertas";
  const db = createAdminClient();
  const scopes = c.uf ? ["*", c.uf] : ["*"];
  const [al, fav] = await Promise.all([
    db.from("contest_alerts").select("user_id").in("scope", scopes),
    db.from("contest_favorites").select("user_id").eq("contest_id", c.id),
  ]);
  const ids = [...new Set([...(al.data ?? []), ...(fav.data ?? [])].map((r) => r.user_id as string))];
  if (!ids.length) return { sent: 0 };
  const onde = [c.institution, c.uf].filter(Boolean).join(" · ");
  const r = await sendPushToUsers(ids, {
    title: aberto ? "Concurso aberto!" : "Novo concurso previsto",
    body: `${c.name}${onde ? ` (${onde})` : ""}. ${aberto ? "Inscrições abertas: veja prazo e edital." : "Comece a se preparar desde já."}`,
    url: "/concursos",
    tag: `concurso-${c.id}-${aberto ? "aberto" : "previsto"}`,
  });
  return { sent: r.sent };
}
