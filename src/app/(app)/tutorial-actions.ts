"use server";
import { z } from "zod";
import { requireUser } from "@/server/auth";
import { salvarProgresso } from "@/server/services/tutorial";
import { TUTORIAL_IDS } from "@/domain/tutorial/roteiros";

const schema = z.object({
  tutorialId: z.enum(TUTORIAL_IDS as [string, ...string[]]),
  passo: z.number().int().min(0).max(99).optional(),
  concluido: z.boolean().optional(),
  pulado: z.boolean().optional(),
  reiniciar: z.boolean().optional(),
  ocultar: z.boolean().optional(),
});

/** Salva o progresso do tutorial do aluno logado (nunca de outro). Falha em silêncio: o tour não pode derrubar o app. */
export async function salvarProgressoTutorialAction(input: z.input<typeof schema>): Promise<{ ok: boolean }> {
  try {
    const user = await requireUser();
    const d = schema.parse(input);
    await salvarProgresso(user.id, d.tutorialId, { passo: d.passo, concluido: d.concluido, pulado: d.pulado, reiniciar: d.reiniciar, ocultar: d.ocultar });
    return { ok: true };
  } catch {
    return { ok: false };
  }
}
