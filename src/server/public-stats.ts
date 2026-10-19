import "server-only";
import { unstable_cache } from "next/cache";
import { createAdminClient } from "./supabase";

/**
 * Números públicos da landing, vindos do catálogo revisado (nada estimado): aulas
 * publicadas e questões ativas do banco. Em cache por 1 hora. Sem banco configurado,
 * devolve null e a página mostra os indicadores sem número.
 */
export const getPublicCatalogStats = unstable_cache(
  async (): Promise<{ lessons: number; questions: number } | null> => {
    try {
      const db = createAdminClient();
      const [topics, questions] = await Promise.all([
        db.from("catalog_topics").select("id", { count: "exact", head: true }).eq("status", "publicado"),
        db.from("catalog_questions").select("id", { count: "exact", head: true }).eq("active", true),
      ]);
      if (topics.error || questions.error) return null;
      return { lessons: topics.count ?? 0, questions: questions.count ?? 0 };
    } catch {
      return null;
    }
  },
  ["landing-catalog-stats"],
  { revalidate: 3600 },
);
