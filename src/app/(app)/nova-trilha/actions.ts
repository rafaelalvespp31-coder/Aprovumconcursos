"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/server/auth";
import { createTrail, enforceRateLimit, UserFacingError } from "@/server/services/trails";
import { findInCatalog } from "@/server/services/catalog";
import { moveTrailToFolder } from "@/server/services/folders";
import { logEvent } from "@/server/observability";

export interface CreateTrailState {
  error?: string;
}

export async function createTrailAction(_: CreateTrailState, form: FormData): Promise<CreateTrailState> {
  const user = await requireUser("/nova-trilha");
  let result: { trailId: string; jobId: string | null; fromCatalog: boolean };
  try {
    result = await createTrail(user.id, {
      board: form.get("board") || undefined,
      otherBoardName: form.get("otherBoardName") || undefined,
      contentType: form.get("contentType") || undefined,
      content: String(form.get("content") ?? ""),
      title: form.get("title") || undefined,
    }, { useCatalog: form.get("usarIa") !== "1" });
  } catch (err) {
    if (err instanceof UserFacingError) return { error: err.message };
    await logEvent("trail.create_error", { userId: user.id, error: (err as Error).message });
    return { error: "Não foi possível criar o estudo agora. Tente novamente em instantes." };
  }
  const folderId = String(form.get("folderId") ?? "");
  if (folderId) {
    // A pasta é opcional: se falhar, o estudo continua criado (o aluno pode mover depois).
    await moveTrailToFolder(user.id, result.trailId, folderId).catch((e) => logEvent("folder.assign_failed", { error: (e as Error).message }));
  }
  redirect(result.jobId ? `/trilhas/${result.trailId}/processando?job=${result.jobId}` : `/trilhas/${result.trailId}?catalogo=1`);
}

export interface CatalogHint {
  kind: "completo" | "parcial" | "nenhum";
  titles: string[];
  reason?: string;
}

/** Sugestão ao vivo: o pedido já está no catálogo revisado? */
export async function catalogHintAction(text: string): Promise<CatalogHint> {
  const user = await requireUser();
  try {
    await enforceRateLimit(user.id, "catalog_hint", 40);
    const m = await findInCatalog(String(text ?? "").slice(0, 2000));
    if (m.kind === "nenhum") return { kind: "nenhum", titles: [] };
    return { kind: m.kind, titles: m.topics.map((t) => t.title).slice(0, 12), reason: m.reason };
  } catch {
    return { kind: "nenhum", titles: [] };
  }
}
