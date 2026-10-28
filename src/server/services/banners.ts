import "server-only";
import sharp from "sharp";
import { isDisciplineSlug } from "@/ai/pedagogy";
import { ensureDisciplines } from "./disciplines";
import { createAdminClient } from "../supabase";
import type { SessionUser } from "../auth";
import { auditLog } from "../observability";
import { UserFacingError } from "./trails";

/** Banner de cada matéria: tira larga 4:1, no topo de todas as aulas daquela matéria. */
export const BANNER_W = 1600;
export const BANNER_H = 400;
const MAX_UPLOAD = 8_000_000;

const isMode = (m: string): boolean => isDisciplineSlug(m);

/** Versão (data de atualização) do banner de cada matéria que tem um. */
export async function bannerVersions(): Promise<Partial<Record<string, string>>> {
  await ensureDisciplines();
  const { data } = await createAdminClient().from("discipline_banners").select("discipline_mode, updated_at");
  const out: Partial<Record<string, string>> = {};
  for (const r of data ?? []) if (isMode(r.discipline_mode as string)) out[r.discipline_mode as string] = r.updated_at as string;
  return out;
}

/** URL pública do banner (com a versão para renovar o cache) ou null quando a matéria não tem. */
export async function bannerUrlFor(mode: string | null | undefined): Promise<string | null> {
  await ensureDisciplines();
  if (!mode || !isMode(mode)) return null;
  const { data } = await createAdminClient().from("discipline_banners").select("updated_at").eq("discipline_mode", mode).maybeSingle();
  return data ? `/banner/${mode}?v=${encodeURIComponent(new Date(data.updated_at as string).getTime().toString(36))}` : null;
}

export async function readBanner(mode: string): Promise<{ mime: string; bytes: Buffer; updatedAt: string } | null> {
  await ensureDisciplines();
  if (!isMode(mode)) return null;
  const { data } = await createAdminClient().from("discipline_banners").select("mime, data, updated_at").eq("discipline_mode", mode).maybeSingle();
  if (!data) return null;
  const hex = String(data.data).replace(/^\\x/, "");
  return { mime: data.mime as string, bytes: Buffer.from(hex, "hex"), updatedAt: data.updated_at as string };
}

async function toBannerWebp(file: File): Promise<Buffer> {
  if (!file || typeof file.arrayBuffer !== "function" || !file.size) throw new UserFacingError("Escolha uma imagem.", "invalid_input");
  if (file.size > MAX_UPLOAD) throw new UserFacingError("Imagem grande demais (máximo 8 MB).", "invalid_input");
  try {
    return await sharp(Buffer.from(await file.arrayBuffer()), { limitInputPixels: 60_000_000 })
      .rotate()
      .resize(BANNER_W, BANNER_H, { fit: "cover", position: "attention" })
      .webp({ quality: 82 })
      .toBuffer();
  } catch {
    throw new UserFacingError("Não consegui ler essa imagem. Use JPG, PNG ou WebP.", "invalid_input");
  }
}

/** Recebe a imagem, recorta na proporção do banner (4:1) e grava já otimizada (WebP). */
export async function saveBanner(user: SessionUser, mode: string, file: File) {
  await ensureDisciplines();
  if (!isMode(mode)) throw new UserFacingError("Matéria inválida.", "invalid_input");
  const out = await toBannerWebp(file);
  const db = createAdminClient();
  const { error } = await db.from("discipline_banners").upsert({
    discipline_mode: mode,
    mime: "image/webp",
    data: `\\x${out.toString("hex")}`,
    width: BANNER_W,
    height: BANNER_H,
    updated_by: user.id,
    updated_at: new Date().toISOString(),
  });
  if (error) throw new UserFacingError(`Não foi possível salvar o banner: ${error.message}`, "db_rule");
  await auditLog(db, { actorId: user.id, userId: user.id, action: "catalog.banner_saved", entity: "discipline_banners", meta: { mode, bytes: out.length } });
}

export async function removeBanner(user: SessionUser, mode: string) {
  await ensureDisciplines();
  if (!isMode(mode)) throw new UserFacingError("Matéria inválida.", "invalid_input");
  const db = createAdminClient();
  const { error } = await db.from("discipline_banners").delete().eq("discipline_mode", mode);
  if (error) throw new UserFacingError(error.message, "db_rule");
  await auditLog(db, { actorId: user.id, userId: user.id, action: "catalog.banner_removed", entity: "discipline_banners", meta: { mode } });
}

// ---------------------------------------------------------------------------
// Banner próprio de uma aula do catálogo (vale só para ela; sem ele, usa o da matéria)
// ---------------------------------------------------------------------------

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function topicBannerUrl(topicId: string | null | undefined): Promise<string | null> {
  if (!topicId || !UUID.test(topicId)) return null;
  const { data } = await createAdminClient().from("topic_banners").select("updated_at").eq("topic_id", topicId).maybeSingle();
  return data ? `/banner/tema/${topicId}?v=${encodeURIComponent(new Date(data.updated_at as string).getTime().toString(36))}` : null;
}

/** Banner da aula: o próprio, se houver; senão o da matéria. */
export async function lessonBannerUrl(topicId: string | null | undefined, mode: string | null | undefined): Promise<string | null> {
  return (await topicBannerUrl(topicId).catch(() => null)) ?? (await bannerUrlFor(mode).catch(() => null));
}

export async function readTopicBanner(topicId: string): Promise<{ mime: string; bytes: Buffer; updatedAt: string } | null> {
  if (!UUID.test(topicId)) return null;
  const { data } = await createAdminClient().from("topic_banners").select("mime, data, updated_at").eq("topic_id", topicId).maybeSingle();
  if (!data) return null;
  const hex = String(data.data).replace(/^\\x/, "");
  return { mime: data.mime as string, bytes: Buffer.from(hex, "hex"), updatedAt: data.updated_at as string };
}

export async function saveTopicBanner(user: SessionUser, topicId: string, file: File) {
  if (!UUID.test(topicId)) throw new UserFacingError("Aula inválida.", "invalid_input");
  const out = await toBannerWebp(file);
  const db = createAdminClient();
  const { error } = await db.from("topic_banners").upsert({
    topic_id: topicId,
    mime: "image/webp",
    data: `\\x${out.toString("hex")}`,
    width: BANNER_W,
    height: BANNER_H,
    updated_by: user.id,
    updated_at: new Date().toISOString(),
  });
  if (error) throw new UserFacingError(`Não foi possível salvar o banner: ${error.message}`, "db_rule");
  await auditLog(db, { actorId: user.id, userId: user.id, action: "catalog.topic_banner_saved", entity: "catalog_topics", entityId: topicId, meta: { bytes: out.length } });
}

export async function removeTopicBanner(user: SessionUser, topicId: string) {
  if (!UUID.test(topicId)) throw new UserFacingError("Aula inválida.", "invalid_input");
  const db = createAdminClient();
  const { error } = await db.from("topic_banners").delete().eq("topic_id", topicId);
  if (error) throw new UserFacingError(error.message, "db_rule");
  await auditLog(db, { actorId: user.id, userId: user.id, action: "catalog.topic_banner_removed", entity: "catalog_topics", entityId: topicId, meta: {} });
}
