import "server-only";
import { createAdminClient } from "../supabase";
import { listRaioXRequests } from "./strategic";

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
export async function getAdminPendencias(): Promise<AdminPendencias> {
  const [planos, avatares, raiox] = await Promise.all([
    countOpen("plan_requests", "status", "novo").catch(() => ({ count: 0, latestAt: null })),
    countOpen("avatar_requests", "status", "enviada").catch(() => ({ count: 0, latestAt: null })),
    listRaioXRequests({ onlyPending: true, limit: 200 }).catch(() => []),
  ]);
  const items: AdminPendencia[] = [
    { key: "planos", label: "Pedidos de plano", count: planos.count, href: "/admin/alunos", latestAt: planos.latestAt },
    { key: "avatares", label: "Avatares personalizados", count: avatares.count, href: "/admin/avatares", latestAt: avatares.latestAt },
    { key: "raiox", label: "Pedidos de Raio-X", count: raiox.length, href: "/admin/estrategico", latestAt: raiox[0]?.createdAt ?? null },
  ];
  return { total: items.reduce((s, i) => s + i.count, 0), items };
}
