import "server-only";
import { unstable_cache } from "next/cache";
import { disciplineLabel } from "@/ai/pedagogy";
import { createAdminClient } from "../supabase";
import { agruparCatalogo, type MateriaCatalogo } from "@/domain/missao/materias";
import { ensureDisciplines } from "./disciplines";
import { getMentorGoal } from "./mentor-goal";

export interface DadosMissao {
  primeiroNome: string | null;
  /** Objetivo atual do aluno (profiles.preferences.mentor_goal), se já definido. */
  objetivo: string | null;
  /** Matérias catalogadas na plataforma (aulas publicadas), para os quadrados da Central. */
  materias: MateriaCatalogo[];
}

/** O catálogo publicado é igual para todos os alunos: cache de 5 minutos. */
const linhasDoCatalogo = unstable_cache(
  async () => {
    const { data, error } = await createAdminClient().from("catalog_topics").select("discipline_mode, topic_group").eq("status", "publicado").limit(5000);
    if (error) throw new Error(error.message);
    return (data ?? []) as Array<{ discipline_mode: string; topic_group: string | null }>;
  },
  ["central-materias-catalogo-v1"],
  { revalidate: 300 },
);

export async function carregarMateriasCatalogo(): Promise<MateriaCatalogo[]> {
  const [linhas] = await Promise.all([linhasDoCatalogo(), ensureDisciplines()]);
  return agruparCatalogo(linhas, disciplineLabel);
}

export async function carregarMissao(userId: string): Promise<DadosMissao> {
  const db = createAdminClient();
  const [perfil, objetivo, materias] = await Promise.all([
    db.from("profiles").select("display_name").eq("id", userId).maybeSingle(),
    getMentorGoal(userId).catch(() => null),
    carregarMateriasCatalogo().catch(() => []),
  ]);
  const nome = ((perfil.data?.display_name as string | null) ?? "").trim();
  return {
    primeiroNome: nome ? nome.split(/\s+/)[0]! : null,
    objetivo: objetivo?.contest ?? null,
    materias,
  };
}
