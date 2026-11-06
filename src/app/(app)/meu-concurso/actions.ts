"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/server/auth";
import { deletePreparation } from "@/server/services/edital";

/** Exclui a preparação do aluno (estrutura, vínculos, histórico e o PDF guardado). As aulas do catálogo e o progresso de estudo não são afetados. */
export async function deletePreparationAction(id: string): Promise<{ ok: boolean; error?: string }> {
  const user = await requireUser("/meu-concurso");
  try {
    await deletePreparation(user.id, id);
  } catch {
    return { ok: false, error: "Não foi possível excluir agora. Tente novamente." };
  }
  revalidatePath("/meu-concurso");
  revalidatePath("/aprovum-ai");
  return { ok: true };
}
