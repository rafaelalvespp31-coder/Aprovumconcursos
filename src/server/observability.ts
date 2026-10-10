import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Registro de eventos operacionais (seção 21). Saída JSON em stdout (coletada pela
 * Vercel). Chaves sensíveis são removidas antes de registrar; conteúdo do aluno não
 * é registrado — apenas identificadores, contagens, durações e códigos de erro.
 */
const SENSITIVE = /(password|senha|token|secret|key|authorization|cookie|content|text|prompt)/i;

function sanitize(meta: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(meta)) {
    if (SENSITIVE.test(k)) {
      out[k] = "[omitido]";
    } else if (typeof v === "string" && v.length > 300) {
      out[k] = `${v.slice(0, 300)}…`;
    } else {
      out[k] = v;
    }
  }
  return out;
}

export async function logEvent(event: string, meta: Record<string, unknown> = {}): Promise<void> {
  const line = { ts: new Date().toISOString(), level: /fail|error/.test(event) ? "error" : "info", event, ...sanitize(meta) };
  (line.level === "error" ? console.error : console.log)(JSON.stringify(line));
}

/** Eventos que também entram na trilha de auditoria (visível ao admin). */
export async function auditLog(
  db: SupabaseClient,
  entry: { actorId: string | null; userId: string | null; action: string; entity?: string; entityId?: string; meta?: Record<string, unknown> },
): Promise<void> {
  const { error } = await db.from("audit_logs").insert({
    actor_id: entry.actorId,
    user_id: entry.userId,
    action: entry.action,
    entity: entry.entity ?? null,
    entity_id: entry.entityId ?? null,
    meta: sanitize(entry.meta ?? {}),
  });
  if (error) await logEvent("audit_log.write_failed", { action: entry.action });
}
