import "server-only";
import { createAdminClient } from "../supabase";
import { logEvent } from "../observability";
import { loadPublishedIndex } from "./catalog";
import { createTrail, enforceRateLimit, UserFacingError } from "./trails";
import { acharAula, type Candidato } from "@/domain/mentor/navegacao";

export type ResultadoAulaPorVoz =
  | { ok: true; destino: string; titulo: string; iniciada: boolean }
  | { ok: false; motivo: "nao_encontrada" | "varios" | "limite"; opcoes?: string[]; mensagem?: string };

const contentTypeOf = (title: string) =>
  /\b(arts?\.?|artigos?|§|inciso|lei\s+n?º?|c[óo]digo|constitui[çc][ãa]o|\bCF\b|\bCP\b|\bCPP\b)/i.test(title) ? "artigo_lei" : "tema_livre";

/**
 * Mentor por voz: acha a aula pelo que o aluno falou. Primeiro entre as aulas que ele já tem (abre direto); se só existir
 * no catálogo, cria o estudo a partir dele (o mesmo caminho do "Novo estudo") e abre a primeira aula.
 */
export async function resolverAulaPorVoz(userId: string, consulta: string): Promise<ResultadoAulaPorVoz> {
  const q = String(consulta ?? "").slice(0, 160);
  if (q.trim().length < 2) return { ok: false, motivo: "nao_encontrada" };
  await enforceRateLimit(userId, "mentor_navegar", 40);
  const db = createAdminClient();
  const [minhas, catalogo] = await Promise.all([
    db.from("lessons").select("id, title, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(1000),
    loadPublishedIndex().catch(() => []),
  ]);
  const candidatos: Candidato[] = [
    ...((minhas.data ?? []) as Array<{ id: string; title: string }>).map((l) => ({ id: l.id, titulo: l.title, origem: "aluno" as const })),
    ...catalogo.map((t) => ({ id: t.id, titulo: t.title, origem: "catalogo" as const })),
  ];
  const r = acharAula(q, candidatos);
  if (r.tipo === "nenhum") return { ok: false, motivo: "nao_encontrada" };
  if (r.tipo === "varios") return { ok: false, motivo: "varios", opcoes: r.opcoes.map((o) => o.titulo) };
  const e = r.escolhido;
  if (e.origem === "aluno") return { ok: true, destino: `/aula/${e.id}`, titulo: e.titulo, iniciada: false };
  try {
    const { trailId } = await createTrail(userId, { board: "outra", otherBoardName: "Várias bancas", contentType: contentTypeOf(e.titulo), content: e.titulo, title: e.titulo }, { useCatalog: true, catalogTopicId: e.id });
    const primeira = await db.from("lessons").select("id").eq("trail_id", trailId).eq("user_id", userId).order("sort_order").limit(1).maybeSingle();
    const id = (primeira.data as { id?: string } | null)?.id;
    return { ok: true, destino: id ? `/aula/${id}` : `/trilhas/${trailId}?catalogo=1`, titulo: e.titulo, iniciada: true };
  } catch (err) {
    if (err instanceof UserFacingError) return { ok: false, motivo: "limite", mensagem: err.message };
    await logEvent("mentor.navegar.erro", { userId, error: (err as Error).message.slice(0, 200) });
    return { ok: false, motivo: "limite", mensagem: "Não consegui iniciar essa aula agora." };
  }
}
