import { createAdminClient } from "@/server/supabase";
import { diaBrasilia } from "@/domain/visitas/visitas";

export type ResumoVisitas = { hoje: number; seteDias: number; total: number; desde: string | null };

/** Visitantes únicos por dia (somados): hoje, últimos 7 dias e total desde o início da contagem. */
export async function resumoVisitas(): Promise<ResumoVisitas> {
  const { data } = await createAdminClient().rpc("resumo_visitas", { p_hoje: diaBrasilia() });
  const r = (data ?? {}) as { hoje?: number; sete_dias?: number; total?: number; desde?: string | null };
  return { hoje: r.hoje ?? 0, seteDias: r.sete_dias ?? 0, total: r.total ?? 0, desde: r.desde ?? null };
}
