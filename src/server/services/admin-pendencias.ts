import "server-only";
import { createAdminClient } from "../supabase";

export interface AdminPendencia {
  key: "planos" | "avatares" | "raiox";
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

async function countOpen(table: "plan_requests" | "avatar_requests", column: "status", value: string): Promise<{ count: number; latestAt: string | null }> {
  const db = createAdminClient();
  const [c, last] = await Promise.all([
    db.from(table).select("id", { count: "exact", head: true }).eq(column, value),
    db.from(table).select("created_at").eq(column, value).order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  if (c.error) throw new Error(c.error.message);
  return { count: c.count ?? 0, latestAt: (last.data?.created_at as string | undefined) ?? null };
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
  const [planos, avatares, raiox] = await Promise.all([
    countOpen("plan_requests", "status", "novo").catch(() => ({ count: 0, latestAt: null })),
    countOpen("avatar_requests", "status", "enviada").catch(() => ({ count: 0, latestAt: null })),
    raioXPending().catch(() => ({ count: 0, latestAt: null })),
  ]);
  const items: AdminPendencia[] = [
    { key: "planos", label: "Pedidos de plano", count: planos.count, href: "/admin/alunos", latestAt: planos.latestAt },
    { key: "avatares", label: "Avatares personalizados", count: avatares.count, href: "/admin/avatares", latestAt: avatares.latestAt },
    { key: "raiox", label: "Pedidos de Raio-X", count: raiox.count, href: "/admin/estrategico", latestAt: raiox.latestAt },
  ];
  const value = { total: items.reduce((s, i) => s + i.count, 0), items };
  memo = { at: Date.now(), value };
  return value;
}
