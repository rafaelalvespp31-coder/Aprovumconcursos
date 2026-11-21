import "server-only";
import { createAdminClient } from "../supabase";

export interface AdminPendencia {
  key: "planos" | "equipe" | "avatares" | "raiox" | "pagamentos" | "feedbacks" | "indicacoes" | "parceiros";
  label: string;
  count: number;
  href: string;
  /** Quando chegou o pedido mais recente (para mostrar "há quanto tempo"). */
  latestAt: string | null;
}

export interface AdminPendencias {
  total: number;
  items: AdminPendencia[];
}

type Filter = [column: string, value: string];
/** Conta (e acha o mais recente) o que está em aberto; com `since`, só o que chegou depois da última visita da equipe. */
async function countOpen(table: string, filters: Filter[], dateCol: string, since?: string): Promise<{ count: number; latestAt: string | null }> {
  const db = createAdminClient();
  const base = () => {
    let q = db.from(table).select("id", { count: "exact", head: true });
    for (const [c, v] of filters) q = q.eq(c, v);
    return since ? q.gt(dateCol, since) : q;
  };
  const lastQ = () => {
    let q = db.from(table).select(dateCol);
    for (const [c, v] of filters) q = q.eq(c, v);
    if (since) q = q.gt(dateCol, since);
    return q.order(dateCol, { ascending: false }).limit(1).maybeSingle();
  };
  const [c, last] = await Promise.all([base(), lastQ()]);
  if (c.error) throw new Error(c.error.message);
  return { count: c.count ?? 0, latestAt: ((last.data as Record<string, unknown> | null)?.[dateCol] as string | undefined) ?? null };
}

const EPOCH = "1970-01-01T00:00:00Z";
async function seenMap(): Promise<Record<string, string>> {
  const { data } = await createAdminClient().from("admin_visto").select("feature, seen_at");
  return Object.fromEntries((data ?? []).map((r) => [r.feature as string, r.seen_at as string]));
}

/** Marca a área como vista agora (só áreas sem fila própria: pagamentos, feedbacks, parceiros). */
export const SEEN_FEATURES = ["pagamentos", "feedbacks", "parceiros"] as const;
export type SeenFeature = (typeof SEEN_FEATURES)[number];
export async function markSeen(feature: SeenFeature): Promise<void> {
  const { error } = await createAdminClient().from("admin_visto").upsert({ feature, seen_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
  memo = null;
}

/**
 * Tudo o que um aluno pediu e depende da equipe: pedidos de plano, avatares personalizados novos e
 * pedidos de Raio-X sem prova catalogada. Só admin chama (o layout e a rota conferem). Falha de uma
 * fonte não derruba as outras: ela só aparece com 0.
 */
/** Só a contagem de Raio-X sem prova: sem nomes nem e-mails dos alunos (antes buscava até 120 contas uma a uma a cada abertura do painel). */
async function raioXPending(): Promise<{ count: number; latestAt: string | null }> {
  const db = createAdminClient();
  const { data: preps, error } = await db.from("edital_preparations").select("strategic_exam_id, created_at").not("strategic_exam_id", "is", null).order("created_at", { ascending: false }).limit(200);
  if (error) throw new Error(error.message);
  if (!preps?.length) return { count: 0, latestAt: null };
  const examIds = [...new Set(preps.map((p) => p.strategic_exam_id as string))];
  const { data: eds } = await db.from("strategic_editions").select("exam_id").in("exam_id", examIds).limit(5000);
  const withEd = new Set((eds ?? []).map((e) => e.exam_id as string));
  const pending = preps.filter((p) => !withEd.has(p.strategic_exam_id as string));
  return { count: pending.length, latestAt: (pending[0]?.created_at as string | undefined) ?? null };
}

let memo: { at: number; value: AdminPendencias } | null = null;
const TTL_MS = 20_000;

/** Zera o resumo guardado por 20 s (usado nos testes). */
export function resetAdminPendenciasCache(): void {
  memo = null;
}

export async function getAdminPendencias(): Promise<AdminPendencias> {
  if (memo && Date.now() - memo.at < TTL_MS) return memo.value;
  const none = { count: 0, latestAt: null as string | null };
  const seen = await seenMap().catch(() => ({}) as Record<string, string>);
  const [planos, avatares, raiox, pagamentos, feedbacks, indicacoes, parceiros, equipe] = await Promise.all([
    countOpen("plan_requests", [["status", "novo"]], "created_at").catch(() => none),
    countOpen("avatar_requests", [["status", "enviada"]], "created_at").catch(() => none),
    raioXPending().catch(() => none),
    countOpen("mp_payments", [["status", "aprovado"]], "approved_at", seen.pagamentos ?? EPOCH).catch(() => none),
    countOpen("lesson_feedbacks", [["status", "enviado"]], "created_at", seen.feedbacks ?? EPOCH).catch(() => none),
    countOpen("referral_rewards", [["status", "pendente"]], "created_at").catch(() => none),
    countOpen("partner_coupon_redemptions", [["status", "aprovado"]], "approved_at", seen.parceiros ?? EPOCH).catch(() => none),
    countOpen("team_messages", [["sender", "aluno"], ["status", "novo"]], "created_at").catch(() => none),
  ]);
  const items: AdminPendencia[] = [
    { key: "planos", label: "Pedidos de plano", count: planos.count, href: "/admin/alunos", latestAt: planos.latestAt },
    { key: "equipe", label: "Mensagens de alunos", count: equipe.count, href: "/admin/alunos#mensagens", latestAt: equipe.latestAt },
    { key: "avatares", label: "Avatares personalizados", count: avatares.count, href: "/admin/avatares", latestAt: avatares.latestAt },
    { key: "pagamentos", label: "Novas compras", count: pagamentos.count, href: "/admin/pagamentos", latestAt: pagamentos.latestAt },
    { key: "feedbacks", label: "Novos feedbacks de aula", count: feedbacks.count, href: "/admin/feedbacks", latestAt: feedbacks.latestAt },
    { key: "indicacoes", label: "Recompensas de indicação a enviar", count: indicacoes.count, href: "/admin/indicacoes", latestAt: indicacoes.latestAt },
    { key: "parceiros", label: "Vendas por parceiros", count: parceiros.count, href: "/admin/parceiros", latestAt: parceiros.latestAt },
    { key: "raiox", label: "Pedidos de Raio-X", count: raiox.count, href: "/admin/estrategico", latestAt: raiox.latestAt },
  ];
  const value = { total: items.reduce((s, i) => s + i.count, 0), items };
  memo = { at: Date.now(), value };
  return value;
}
