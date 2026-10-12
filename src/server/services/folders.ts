import "server-only";
import { z } from "zod";
import { createAdminClient } from "../supabase";
import { UserFacingError } from "./trails";

/**
 * Pastas do aluno (ex.: uma por matéria). Gravações pelo servidor, sempre filtradas
 * pelo dono — a chave composta (pasta, usuário) impede mover estudo para pasta alheia.
 */
export const FOLDER_COLORS = ["vermelho", "preto", "cinza", "verde", "azul", "amarelo"] as const;
export type FolderColor = (typeof FOLDER_COLORS)[number];

const nameSchema = z.string().trim().min(1, "Dê um nome à pasta.").max(80, "Use até 80 caracteres.");
const colorSchema = z.enum(FOLDER_COLORS).catch("vermelho");
const idSchema = z.uuid();

export async function createFolder(userId: string, name: string, color?: string): Promise<string> {
  const n = nameSchema.safeParse(name);
  if (!n.success) throw new UserFacingError(n.error.issues[0]!.message, "invalid_input");
  const db = createAdminClient();
  const { count } = await db.from("study_folders").select("id", { count: "exact", head: true }).eq("user_id", userId);
  if ((count ?? 0) >= 50) throw new UserFacingError("Limite de 50 pastas atingido.", "folder_limit");
  const { data, error } = await db
    .from("study_folders")
    .insert({ user_id: userId, name: n.data, color: colorSchema.parse(color), sort_order: count ?? 0 })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data.id as string;
}

export async function updateFolder(userId: string, folderId: string, patch: { name?: string; color?: string }) {
  const id = idSchema.parse(folderId);
  const row: Record<string, unknown> = {};
  if (patch.name !== undefined) {
    const n = nameSchema.safeParse(patch.name);
    if (!n.success) throw new UserFacingError(n.error.issues[0]!.message, "invalid_input");
    row.name = n.data;
  }
  if (patch.color !== undefined) row.color = colorSchema.parse(patch.color);
  if (!Object.keys(row).length) return;
  const db = createAdminClient();
  const { error } = await db.from("study_folders").update(row).eq("id", id).eq("user_id", userId);
  if (error) throw new Error(error.message);
}

/** Exclui só a pasta: os estudos continuam, agora sem pasta. */
export async function deleteFolder(userId: string, folderId: string) {
  const id = idSchema.parse(folderId);
  const db = createAdminClient();
  const { error } = await db.from("study_folders").delete().eq("id", id).eq("user_id", userId);
  if (error) throw new Error(error.message);
}

/** Move um estudo para uma pasta (ou tira da pasta com `null`), no fim da lista. */
export async function moveTrailToFolder(userId: string, trailId: string, folderId: string | null) {
  const tid = idSchema.parse(trailId);
  const db = createAdminClient();
  let order = 0;
  if (folderId) {
    const fid = idSchema.parse(folderId);
    const { data: f } = await db.from("study_folders").select("id").eq("id", fid).eq("user_id", userId).maybeSingle();
    if (!f) throw new UserFacingError("Pasta não encontrada.", "not_found");
    const { data: last } = await db
      .from("study_trails")
      .select("folder_order")
      .eq("folder_id", fid)
      .eq("user_id", userId)
      .order("folder_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    order = ((last?.folder_order as number | undefined) ?? -1) + 1;
  }
  const { error, count } = await db
    .from("study_trails")
    .update({ folder_id: folderId, folder_order: order }, { count: "exact" })
    .eq("id", tid)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
  if (!count) throw new UserFacingError("Estudo não encontrado.", "not_found");
}

/** Sobe ou desce um estudo dentro da pasta (ordem de "próximo tema"). */
export async function reorderTrail(userId: string, trailId: string, direction: "up" | "down") {
  const tid = idSchema.parse(trailId);
  const db = createAdminClient();
  const { data: t } = await db.from("study_trails").select("folder_id").eq("id", tid).eq("user_id", userId).maybeSingle();
  if (!t?.folder_id) return;
  const { data: list } = await db
    .from("study_trails")
    .select("id")
    .eq("folder_id", t.folder_id)
    .eq("user_id", userId)
    .is("archived_at", null)
    .order("folder_order")
    .order("created_at");
  const ids = (list ?? []).map((r) => r.id as string);
  const i = ids.indexOf(tid);
  const j = direction === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= ids.length) return;
  [ids[i], ids[j]] = [ids[j]!, ids[i]!];
  await Promise.all(ids.map((id, k) => db.from("study_trails").update({ folder_order: k }).eq("id", id).eq("user_id", userId)));
}
