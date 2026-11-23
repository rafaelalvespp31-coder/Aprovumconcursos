import "server-only";
import { createAdminClient } from "../supabase";
import type { Sugestao } from "@/domain/missao/sugestoes";
import { getMentorGoal, listEditalOptions } from "./mentor-goal";

export interface DadosMissao {
  primeiroNome: string | null;
  /** Objetivo atual do aluno (profiles.preferences.mentor_goal), se já definido. */
  objetivo: string | null;
  /** Editais do próprio aluno (Aprovum AI), prontos para virar plano. */
  editais: Sugestao[];
}

export async function carregarMissao(userId: string): Promise<DadosMissao> {
  const db = createAdminClient();
  const [perfil, objetivo, editais] = await Promise.all([
    db.from("profiles").select("display_name").eq("id", userId).maybeSingle(),
    getMentorGoal(userId).catch(() => null),
    listEditalOptions(userId).catch(() => []),
  ]);
  const nome = ((perfil.data?.display_name as string | null) ?? "").trim();
  return {
    primeiroNome: nome ? nome.split(/\s+/)[0]! : null,
    objetivo: objetivo?.contest ?? null,
    editais: editais.map((e): Sugestao => ({
      id: e.id,
      tipo: "edital",
      nome: e.name,
      detalhe: ["Seu edital", e.role, e.board].filter(Boolean).join(" · "),
      editalId: e.id,
    })),
  };
}
