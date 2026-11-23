import "server-only";
import { unstable_cache } from "next/cache";
import { disciplineLabel } from "@/ai/pedagogy";
import { createAdminClient } from "../supabase";
import { agruparCatalogo, classificarConcurso, ESTADOS_CONCLUIDOS, type ConcursoCard, type MateriaCatalogo } from "@/domain/missao/materias";
import { listarConcursosCatalogados } from "./concurso-edital";
import { ensureDisciplines } from "./disciplines";
import { getMentorGoal } from "./mentor-goal";

export interface DadosMissao {
  primeiroNome: string | null;
  /** Objetivo atual do aluno (profiles.preferences.mentor_goal), se já definido. */
  objetivo: string | null;
  /** Matérias catalogadas na plataforma (aulas publicadas), para os quadrados da Central. */
  materias: MateriaCatalogo[];
  /** Concursos catalogados pela equipe: os com edital publicado o aluno escolhe e estuda sem anexar nada; os demais aparecem como análise ou "em breve". */
  concursos: ConcursoCard[];
}

/** O catálogo publicado é igual para todos os alunos: cache de 5 minutos. */
const linhasDoCatalogo = unstable_cache(
  async () => {
    const { data, error } = await createAdminClient().from("catalog_topics").select("id, discipline_mode, topic_group, estimated_minutes").eq("status", "publicado").limit(5000);
    if (error) throw new Error(error.message);
    return (data ?? []) as Array<{ id: string; discipline_mode: string; topic_group: string | null; estimated_minutes: number | null }>;
  },
  ["central-materias-catalogo-v2"],
  { revalidate: 300 },
);

/** Percentual de aulas do catálogo concluídas pelo aluno em cada matéria (as cópias de estudo guardam `catalog_topic_id`). */
async function progressoDoAluno(userId: string, linhas: ReadonlyArray<{ id: string; discipline_mode: string }>): Promise<Map<string, number>> {
  const db = createAdminClient();
  const [aulas, estados] = await Promise.all([
    db.from("lessons").select("id, catalog_topic_id").eq("user_id", userId).not("catalog_topic_id", "is", null).limit(5000),
    db.from("learning_progress").select("lesson_id, state").eq("user_id", userId).limit(10000),
  ]);
  if (aulas.error) throw new Error(aulas.error.message);
  if (estados.error) throw new Error(estados.error.message);
  const concluida = new Set(((estados.data ?? []) as Array<{ lesson_id: string; state: string }>).filter((e) => ESTADOS_CONCLUIDOS.has(e.state)).map((e) => e.lesson_id));
  const topicosFeitos = new Set(((aulas.data ?? []) as Array<{ id: string; catalog_topic_id: string }>).filter((l) => concluida.has(l.id)).map((l) => l.catalog_topic_id));
  const total = new Map<string, number>();
  const feitos = new Map<string, number>();
  for (const l of linhas) {
    total.set(l.discipline_mode, (total.get(l.discipline_mode) ?? 0) + 1);
    if (topicosFeitos.has(l.id)) feitos.set(l.discipline_mode, (feitos.get(l.discipline_mode) ?? 0) + 1);
  }
  const out = new Map<string, number>();
  for (const [slug, n] of total) out.set(slug, Math.round(((feitos.get(slug) ?? 0) / n) * 100));
  return out;
}

export async function carregarMateriasCatalogo(userId?: string): Promise<MateriaCatalogo[]> {
  const [linhas] = await Promise.all([linhasDoCatalogo(), ensureDisciplines()]);
  const progresso = userId ? await progressoDoAluno(userId, linhas).catch(() => undefined) : undefined;
  return agruparCatalogo(linhas, disciplineLabel, progresso);
}

export async function carregarMissao(userId: string): Promise<DadosMissao> {
  const db = createAdminClient();
  const [perfil, objetivo, materias, concursos] = await Promise.all([
    db.from("profiles").select("display_name").eq("id", userId).maybeSingle(),
    getMentorGoal(userId).catch(() => null),
    carregarMateriasCatalogo(userId).catch(() => []),
    listarConcursosCatalogados().catch(() => []),
  ]);
  const nome = ((perfil.data?.display_name as string | null) ?? "").trim();
  return {
    primeiroNome: nome ? nome.split(/\s+/)[0]! : null,
    objetivo: objetivo?.contest ?? null,
    materias,
    concursos: concursos.map((c): ConcursoCard => ({
      estado: c.estado, id: c.id, nome: c.name, orgao: c.orgao || c.institution, cargo: c.roleName, uf: c.uf ?? null, imagem: c.imageUrl,
      vagas: c.vacancies, destaque: !!c.featured, situacao: c.status, provaEm: c.examDateConfirmed ? c.examDate : null, inscricaoAte: c.registrationEnd ?? null, banca: c.banca ?? null,
      categoria: classificarConcurso(`${c.orgao || ""} ${c.institution} ${c.name} ${c.roleName ?? ""}`),
    })),
  };
}
