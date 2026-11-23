import "server-only";
import { createAdminClient } from "../supabase";
import { sanitizarConsulta, type Sugestao } from "@/domain/missao/sugestoes";
import { getMentorGoal, listEditalOptions } from "./mentor-goal";

type Linha = { id: string; name: string; institution: string | null; role_name: string | null; uf: string | null };
const COLS = "id, name, institution, role_name, uf";

const paraSugestao = (c: Linha): Sugestao => ({
  id: c.id,
  tipo: "catalogo",
  nome: c.name,
  detalhe: [c.institution, c.role_name, c.uf].filter((x) => x && x.trim()).join(" · ") || null,
});

/** Concursos cadastrados pela equipe (catálogo ativo) que combinam com o texto. Nada é inventado: só linhas reais da tabela. */
export async function buscarConcursosCatalogo(q: string, limite = 8): Promise<Sugestao[]> {
  const t = sanitizarConsulta(q);
  if (!t) return [];
  const like = `%${t}%`;
  const { data, error } = await createAdminClient()
    .from("contest_catalog")
    .select(COLS)
    .eq("active", true)
    .or(`name.ilike.${like},institution.ilike.${like},orgao.ilike.${like},role_name.ilike.${like}`)
    .order("featured", { ascending: false })
    .order("exam_date", { ascending: true, nullsFirst: false })
    .limit(limite);
  if (error) throw new Error(error.message);
  return ((data ?? []) as Linha[]).map(paraSugestao);
}

export interface DadosMissao {
  primeiroNome: string | null;
  /** Objetivo atual do aluno (profiles.preferences.mentor_goal), se já definido. */
  objetivo: string | null;
  /** Concursos do catálogo para mostrar com o campo vazio. */
  iniciais: Sugestao[];
  /** Editais do próprio aluno (Aprovum AI), prontos para virar plano. */
  editais: Sugestao[];
}

export async function carregarMissao(userId: string): Promise<DadosMissao> {
  const db = createAdminClient();
  const [perfil, objetivo, iniciais, editais] = await Promise.all([
    db.from("profiles").select("display_name").eq("id", userId).maybeSingle(),
    getMentorGoal(userId).catch(() => null),
    db.from("contest_catalog").select(COLS).eq("active", true).order("featured", { ascending: false }).order("exam_date", { ascending: true, nullsFirst: false }).limit(6)
      .then((r) => ((r.data ?? []) as Linha[]).map(paraSugestao)),
    listEditalOptions(userId).catch(() => []),
  ]);
  const nome = ((perfil.data?.display_name as string | null) ?? "").trim();
  return {
    primeiroNome: nome ? nome.split(/\s+/)[0]! : null,
    objetivo: objetivo?.contest ?? null,
    iniciais,
    editais: editais.map((e): Sugestao => ({
      id: e.id,
      tipo: "edital",
      nome: e.name,
      detalhe: ["Seu edital", e.role, e.board].filter(Boolean).join(" · "),
      editalId: e.id,
    })),
  };
}
