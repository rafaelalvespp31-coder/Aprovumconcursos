import "server-only";
import { createAdminClient } from "../supabase";

/** Aviso de Raio-X publicado, entregue ao aluno pelo Mentor (sem tabela nova: usa o `stats` da preparação). */
export interface RaioXNotice {
  prepId: string;
  title: string;
  publishedAt: string;
  href: string;
}

const JANELA_DIAS = 30;

type Row = { id: string; created_at: string; contest_name: string | null; role_name: string | null; stats: Record<string, unknown> | null; strategic_exams: { name: string | null; status: string; published_at: string | null } | null };

/** Raio-X publicado (e ainda não aberto) dos editais do próprio aluno; o usuário vem sempre da sessão. */
export async function getRaioXNotices(userId: string): Promise<RaioXNotice[]> {
  const db = createAdminClient();
  const r = await db
    .from("edital_preparations")
    .select("id, contest_name, role_name, stats, created_at, strategic_exams!inner(name, status, published_at)")
    .eq("user_id", userId)
    .not("strategic_exam_id", "is", null)
    .eq("strategic_exams.status", "publicado")
    .limit(50);
  if (r.error) throw new Error(r.error.message);
  const desde = Date.now() - JANELA_DIAS * 86_400_000;
  const out: RaioXNotice[] = [];
  for (const p of (r.data ?? []) as unknown as Row[]) {
    const ex = p.strategic_exams;
    if (!ex?.published_at || (p.stats ?? {}).raioxSeenAt) continue;
    // A janela conta a partir do que veio por último: a publicação ou o envio do edital deste aluno
    // (quem anexa um edital cuja análise já estava publicada também recebe o aviso).
    const entregue = new Date(ex.published_at).getTime() > new Date(p.created_at).getTime() ? ex.published_at : p.created_at;
    if (new Date(entregue).getTime() < desde) continue;
    out.push({ prepId: p.id, title: ex.name || p.contest_name || "seu concurso", publishedAt: entregue, href: `/meu-concurso/${p.id}?aba=raiox` });
  }
  return out.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

/** Marca o aviso como visto quando o aluno abre o Raio-X (mescla no jsonb, só da própria preparação). */
export async function markRaioXSeen(userId: string, prepId: string): Promise<void> {
  const db = createAdminClient();
  const p = await db.from("edital_preparations").select("stats").eq("id", prepId).eq("user_id", userId).maybeSingle();
  if (!p.data) return;
  const stats = (p.data.stats as Record<string, unknown> | null) ?? {};
  if (stats.raioxSeenAt) return;
  await db.from("edital_preparations").update({ stats: { ...stats, raioxSeenAt: new Date().toISOString() } }).eq("id", prepId).eq("user_id", userId);
}
