import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Todos os tópicos de uma preparação, página por página. A API do banco devolve no máximo ~1000 linhas por consulta
 * (mesmo com .limit maior): editais grandes perdiam tópicos em silêncio. A ordem (matéria, posição) é única, então a paginação não repete nem pula linhas.
 */
export async function topicosDe(db: SupabaseClient, prepId: string, colunas: string): Promise<{ data: Array<Record<string, unknown>>; error: { message: string } | null }> {
  const PAGINA = 1000;
  const out: Array<Record<string, unknown>> = [];
  for (let de = 0; de < 100_000; de += PAGINA) {
    const r = await db.from("edital_topics").select(colunas).eq("preparation_id", prepId).order("discipline_id").order("position").range(de, de + PAGINA - 1);
    if (r.error) return { data: out, error: { message: r.error.message } };
    const linhas = (r.data ?? []) as unknown as Array<Record<string, unknown>>;
    out.push(...linhas);
    if (linhas.length < PAGINA) break;
  }
  return { data: out, error: null };
}
