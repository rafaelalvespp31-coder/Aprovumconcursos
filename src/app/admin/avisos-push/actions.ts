"use server";

import { requireAdmin } from "@/server/services/catalog";
import { sendPushToAudience, type PushAudience } from "@/server/services/push";
import { enforceRateLimit } from "@/server/services/trails";

const AUD: PushAudience[] = ["todos", "pagos", "gratuitos", "admins"];

export async function enviarAvisoAction(input: { title: string; body: string; url: string; audience: string }): Promise<{ ok: true; sent: number; failed: number } | { ok: false; error: string }> {
  const admin = await requireAdmin();
  const title = String(input.title ?? "").trim().slice(0, 60);
  const body = String(input.body ?? "").trim().slice(0, 200);
  const url = String(input.url ?? "").trim();
  if (!title || !body) return { ok: false, error: "Escreva o título e a mensagem." };
  if (url && !/^\/[a-z0-9\-_/?=&.%]*$/i.test(url)) return { ok: false, error: "O link deve ser um caminho do app, como /painel ou /quiz." };
  if (!AUD.includes(input.audience as PushAudience)) return { ok: false, error: "Escolha quem vai receber." };
  await enforceRateLimit(admin.id, "admin_push", 10);
  const r = await sendPushToAudience(input.audience as PushAudience, { title, body, url: url || "/painel" });
  return { ok: true, sent: r.sent, failed: r.failed };
}
