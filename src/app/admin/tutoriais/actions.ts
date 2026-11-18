"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/server/services/catalog";
import { definirTutorialAtivo } from "@/server/services/tutorial";
import { TUTORIAL_IDS } from "@/domain/tutorial/roteiros";

const schema = z.object({ id: z.enum(TUTORIAL_IDS as [string, ...string[]]), ativo: z.boolean() });

export async function definirTutorialAtivoAction(input: { id: string; ativo: boolean }): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  try {
    const d = schema.parse(input);
    await definirTutorialAtivo(d.id, d.ativo);
    revalidatePath("/admin/tutoriais");
    return { ok: true };
  } catch {
    return { ok: false, error: "Não foi possível salvar. Tente novamente." };
  }
}
