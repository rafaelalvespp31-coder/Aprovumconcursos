"use server";

import { requireUser } from "@/server/auth";
import { refazerLeitura } from "@/server/services/edital";
import { escolherConcursoAction, type EscolhaResultado } from "../../painel/actions";

/** Monta o plano a partir do conteúdo programático que o aluno acabou de conferir. */
export async function montarPlanoAction(nome: string, editalId: string): Promise<EscolhaResultado> {
  return escolherConcursoAction(nome, editalId);
}

/** Refaz a leitura do mesmo edital (sem reenviar o PDF) com o especialista; o navegador acompanha pelo /avancar. */
export async function refazerLeituraAction(editalId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await requireUser(`/conteudo-programatico/${editalId}`);
  try {
    await refazerLeitura(user.id, editalId);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Não consegui refazer a leitura agora." };
  }
}
