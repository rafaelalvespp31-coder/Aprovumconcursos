"use server";

import { abrirConcursoAction, escolherConcursoAction, type EscolhaResultado } from "../../painel/actions";

/**
 * "Montar meu plano de estudo" direto da análise: recebe a cópia do edital publicado do concurso (se a equipe já o importou)
 * e monta o plano a partir dele, como na página do conteúdo programático.
 */
export async function montarPlanoDoConcursoAction(contestId: string, nome: string): Promise<EscolhaResultado> {
  const aberto = await abrirConcursoAction(contestId);
  if (!aberto.ok) return aberto;
  const editalId = aberto.destino.split("/").pop() ?? "";
  return escolherConcursoAction(nome, editalId);
}
