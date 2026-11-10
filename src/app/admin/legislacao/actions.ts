"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { AIError } from "@/ai/provider";
import { logEvent } from "@/server/observability";
import { requireAdmin } from "@/server/services/catalog";
import { checkLawUpdates, refreshTopicFromLaw, restoreTopicSnapshot, type LawSyncSummary } from "@/server/services/catalog-law-sync";
import { UserFacingError } from "@/server/services/trails";

export type LegResult = { ok: true; message: string; summary?: LawSyncSummary } | { ok: false; error: string };

const UUID = /^[0-9a-f-]{36}$/i;

function fail(name: string, e: unknown): LegResult {
  if (e instanceof UserFacingError) return { ok: false, error: e.message };
  if (e instanceof AIError) return { ok: false, error: e.kind === "not_configured" ? "IA não configurada no servidor." : e.message };
  void logEvent(`${name}.failed`, { error: (e as Error).message });
  return { ok: false, error: "Não foi possível concluir. Tente novamente." };
}

/** "Conferir leis agora": baixa o texto oficial e marca os temas cujos artigos mudaram. */
export async function conferirLeisAction(): Promise<LegResult> {
  try {
    await requireAdmin();
    const summary = await checkLawUpdates();
    revalidatePath("/admin/legislacao");
    return { ok: true, message: `${summary.checked} temas conferidos: ${summary.desatualizados} desatualizados.`, summary };
  } catch (e) {
    return fail("legislacao.check", e);
  }
}

/** Atualiza um tema em segundo plano (a regeneração com IA leva alguns minutos). */
export async function atualizarTemaAction(id: string): Promise<LegResult> {
  try {
    await requireAdmin();
    if (!UUID.test(id)) return { ok: false, error: "Tema inválido." };
    after(async () => {
      try {
        await refreshTopicFromLaw(id);
      } catch (e) {
        await logEvent("legislacao.refresh_bg_failed", { id, error: (e as Error).message });
      }
    });
    revalidatePath("/admin/legislacao");
    return { ok: true, message: "Atualização iniciada. Leva alguns minutos; recarregue a página para acompanhar." };
  } catch (e) {
    return fail("legislacao.refresh", e);
  }
}

export async function restaurarTemaAction(id: string): Promise<LegResult> {
  try {
    await requireAdmin();
    if (!UUID.test(id)) return { ok: false, error: "Tema inválido." };
    await restoreTopicSnapshot(id);
    revalidatePath("/admin/legislacao");
    return { ok: true, message: "Versão anterior restaurada." };
  } catch (e) {
    return fail("legislacao.restore", e);
  }
}
