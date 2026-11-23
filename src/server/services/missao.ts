import "server-only";
import { createAdminClient } from "../supabase";
import type { Sugestao } from "@/domain/missao/sugestoes";
import { resumirMaterias, type MateriasMissao } from "@/domain/missao/materias";
import { topicosDe } from "./edital-topicos";
import { getMentorGoal, listEditalOptions } from "./mentor-goal";

export interface DadosMissao {
  primeiroNome: string | null;
  /** Objetivo atual do aluno (profiles.preferences.mentor_goal), se já definido. */
  objetivo: string | null;
  /** Editais do próprio aluno (Aprovum AI), prontos para virar plano. */
  editais: Sugestao[];
  /** Matérias do edital em uso (o do objetivo, ou o mais recente), com a disponibilidade de aula. */
  materias: MateriasMissao | null;
}

async function carregarMaterias(editalId: string, editalNome: string): Promise<MateriasMissao | null> {
  const db = createAdminClient();
  const [d, t] = await Promise.all([
    db.from("edital_disciplines").select("id, name").eq("preparation_id", editalId).order("position").limit(200),
    topicosDe(db, editalId, "discipline_id, match_status"),
  ]);
  if (d.error || t.error) return null;
  const cards = resumirMaterias((d.data ?? []) as Array<{ id: string; name: string }>, t.data as unknown as Array<{ discipline_id: string; match_status: string | null }>);
  return cards.length ? { editalId, editalNome, cards } : null;
}

export async function carregarMissao(userId: string): Promise<DadosMissao> {
  const db = createAdminClient();
  const [perfil, objetivo, editais] = await Promise.all([
    db.from("profiles").select("display_name").eq("id", userId).maybeSingle(),
    getMentorGoal(userId).catch(() => null),
    listEditalOptions(userId).catch(() => []),
  ]);
  const nome = ((perfil.data?.display_name as string | null) ?? "").trim();
  const emUso = editais.find((e) => e.id === objetivo?.editalId) ?? editais[0];
  const materias = emUso ? await carregarMaterias(emUso.id, emUso.name).catch(() => null) : null;
  return {
    primeiroNome: nome ? nome.split(/\s+/)[0]! : null,
    objetivo: objetivo?.contest ?? null,
    materias,
    editais: editais.map((e): Sugestao => ({
      id: e.id,
      tipo: "edital",
      nome: e.name,
      detalhe: ["Seu edital", e.role, e.board].filter(Boolean).join(" · "),
      editalId: e.id,
    })),
  };
}
