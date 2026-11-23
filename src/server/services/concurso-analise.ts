import "server-only";
import { z } from "zod";
import { unstable_cache } from "next/cache";
import { createAdminClient } from "../supabase";
import { auditLog } from "../observability";
import { analiseDoBanco, lerAnalise, type AnaliseConcurso } from "@/domain/edital/analise";
import { focosComoConteudo, type DisciplinaVisao, type TopicoVisao } from "@/domain/missao/analise-conteudo";
import { UserFacingError } from "./trails";
import { loadCatalog, refreshMatchesIfStale } from "./edital";
import { fundoDoConcurso } from "@/domain/missao/fundos";
import { carregarConteudoCompleto } from "./edital-view";

export interface ResumoAnaliseAdmin {
  em: string;
  disciplinas: number;
  titulo: string;
}

/** Concursos que já têm análise estratégica (para o painel do admin). */
export async function analisesDosConcursos(): Promise<Map<string, ResumoAnaliseAdmin>> {
  const { data } = await createAdminClient().from("contest_catalog").select("id, analise, analise_em").not("analise", "is", null).limit(500);
  const out = new Map<string, ResumoAnaliseAdmin>();
  for (const l of (data ?? []) as Array<{ id: string; analise: unknown; analise_em: string | null }>) {
    const a = analiseDoBanco(l.analise);
    if (a) out.set(l.id, { em: l.analise_em ?? "", disciplinas: a.disciplinas.length, titulo: a.titulo });
  }
  return out;
}

/** Lê, confere e grava a análise estratégica do concurso (substitui a anterior). */
export async function salvarAnaliseDoConcurso(adminId: string, contestId: unknown, texto: unknown): Promise<{ disciplinas: number; avisos: string[] }> {
  const cid = z.uuid().safeParse(contestId);
  if (!cid.success) throw new UserFacingError("Concurso inválido.", "invalid_input");
  if (typeof texto !== "string") throw new UserFacingError("Cole o texto da análise.", "invalid_input");
  const r = lerAnalise(texto);
  if (!r.ok) throw new UserFacingError(r.erros.join(" "), "invalid_input");
  const db = createAdminClient();
  const up = await db.from("contest_catalog").update({ analise: r.analise, analise_em: new Date().toISOString() }).eq("id", cid.data).select("id").maybeSingle();
  if (up.error) throw new Error(up.error.message);
  if (!up.data) throw new UserFacingError("Concurso não encontrado.", "not_found");
  await auditLog(db, { actorId: adminId, userId: adminId, action: "concurso.analise_importada", entity: "contest_catalog", entityId: cid.data, meta: { disciplinas: r.resumo.disciplinas, avisos: r.avisos.length } }).catch(() => {});
  return { disciplinas: r.resumo.disciplinas, avisos: r.avisos };
}

export async function removerAnaliseDoConcurso(adminId: string, contestId: unknown): Promise<void> {
  const cid = z.uuid().safeParse(contestId);
  if (!cid.success) throw new UserFacingError("Concurso inválido.", "invalid_input");
  const db = createAdminClient();
  const r = await db.from("contest_catalog").update({ analise: null, analise_em: null }).eq("id", cid.data);
  if (r.error) throw new Error(r.error.message);
  await auditLog(db, { actorId: adminId, userId: adminId, action: "concurso.analise_removida", entity: "contest_catalog", entityId: cid.data }).catch(() => {});
}

export interface AnaliseParaAluno {
  concurso: { id: string; nome: string; orgao: string | null; cargo: string | null; banca: string | null };
  /** Análise estratégica importada (pode não existir ainda). */
  analise: AnaliseConcurso | null;
  /** Conteúdo programático do edital publicado, com a disponibilidade de aula de cada tópico (pode não existir ainda). */
  conteudo: DisciplinaVisao[] | null;
  /** edital: tópicos literais do edital publicado; focos: itens extraídos dos "principais focos" da análise (edital ainda não importado). */
  conteudoOrigem: "edital" | "focos" | null;
  /** Arte de fundo (marca d'água) da página, quando há. */
  marca: string | null;
  atualizadaEm: string | null;
}

/** Conteúdo do edital publicado no concurso: o mesmo que o aluno vê no conteúdo programático, sem depender de quem pergunta. Cache curto: é igual para todos. */
const conteudoDoEdital = unstable_cache(
  async (prepId: string): Promise<DisciplinaVisao[] | null> => {
    const db = createAdminClient();
    const { data } = await db.from("edital_preparations").select("id, user_id, status").eq("id", prepId).maybeSingle();
    const p = data as { id: string; user_id: string; status: string } | null;
    if (!p || p.status !== "concluido") return null;
    // Aulas catalogadas depois da importação: refaz os vínculos antes de mostrar (rápido, sem IA).
    await refreshMatchesIfStale(p.user_id, p.id).catch(() => false);
    const c = await carregarConteudoCompleto(p.user_id, p.id);
    if (!c.disciplinas.length) return null;
    return c.disciplinas.map((d) => ({
      nome: d.nome,
      topicos: d.topicos.map((t): TopicoVisao => ({
        codigo: t.codigo,
        nivel: t.nivel,
        titulo: t.titulo,
        disponivel: t.status === "completa" || t.status === "parcial" || t.status === "conferencia",
        aulas: t.aulas.map((a) => a.titulo),
      })),
    }));
  },
  ["analise-concurso-conteudo-v1"],
  { revalidate: 120 },
);

/**
 * Sem edital importado, os "principais focos" de cada disciplina da análise viram itens de conteúdo e são conferidos contra as aulas catalogadas
 * (mesma correspondência do edital): verde = há aula, vermelho = ainda não. Não é o edital literal; a página avisa isso.
 */
const conteudoPelosFocos = unstable_cache(
  async (contestId: string): Promise<DisciplinaVisao[] | null> => {
    const db = createAdminClient();
    const { data } = await db.from("contest_catalog").select("analise").eq("id", contestId).maybeSingle();
    const analise = analiseDoBanco((data as { analise: unknown } | null)?.analise);
    if (!analise) return null;
    const r = focosComoConteudo(analise.disciplinas, await loadCatalog());
    return r.length ? r : null;
  },
  ["analise-concurso-focos-v2"],
  { revalidate: 300 },
);

/** Análise e conteúdo de um concurso ativo, para o aluno. Null se o concurso não tem nem uma coisa nem outra. */
export async function carregarAnaliseDoConcurso(contestId: string): Promise<AnaliseParaAluno | null> {
  const id = z.uuid().safeParse(contestId);
  if (!id.success) return null;
  const db = createAdminClient();
  const { data } = await db.from("contest_catalog").select("id, name, institution, orgao, role_name, banca, analise, analise_em, active, edital_prep_id, image_path").eq("id", id.data).eq("active", true).maybeSingle();
  if (!data) return null;
  const l = data as { id: string; name: string; institution: string | null; orgao: string | null; role_name: string | null; banca: string | null; analise: unknown; analise_em: string | null; edital_prep_id: string | null; image_path: string | null };
  const analise = analiseDoBanco(l.analise);
  let conteudo = l.edital_prep_id ? await conteudoDoEdital(l.edital_prep_id).catch(() => null) : null;
  let conteudoOrigem: AnaliseParaAluno["conteudoOrigem"] = conteudo ? "edital" : null;
  if (!conteudo && analise) {
    conteudo = await conteudoPelosFocos(l.id).catch(() => null);
    conteudoOrigem = conteudo?.length ? "focos" : null;
    if (!conteudoOrigem) conteudo = null;
  }
  if (!analise && !conteudo) return null;
  const marca = fundoDoConcurso(l.name, l.institution, l.orgao) ?? (l.image_path ? db.storage.from("concursos").getPublicUrl(l.image_path).data.publicUrl : null);
  return { concurso: { id: l.id, nome: l.name, orgao: l.orgao ?? l.institution, cargo: l.role_name, banca: l.banca }, analise, conteudo, conteudoOrigem, marca, atualizadaEm: l.analise_em };
}
