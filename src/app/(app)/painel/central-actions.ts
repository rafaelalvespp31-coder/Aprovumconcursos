"use server";

import { requireUser } from "@/server/auth";
import { setMissaoSelecionada } from "@/server/services/central-missoes";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function selecionarMissaoAction(prepId: string | null): Promise<{ ok: boolean }> {
  const me = await requireUser("/painel");
  if (prepId !== null && !UUID.test(prepId)) return { ok: false };
  try {
    await setMissaoSelecionada(me.id, prepId);
    return { ok: true };
  } catch {
    return { ok: false };
  }
}
