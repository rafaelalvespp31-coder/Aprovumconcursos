import "server-only";
import sharp from "sharp";
import { z } from "zod";
import { createAdminClient } from "@/server/supabase";
import { UserFacingError } from "@/server/services/trails";
import type { ApprovalBanner } from "@/app/(app)/painel/approval-banners";

/**
 * Banners de aprovados enviados pela equipe. A foto é encaixada no formato do banner
 * (2000×711) sem cortar: a imagem inteira no centro e ela mesma, ampliada e desfocada, nas laterais.
 */

const BUCKET = "aprovados";
const W = 2000;
const H = 711;
const MAX_UPLOAD = 4_200_000; // limite de envio da hospedagem (~4,5 MB)
const TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export interface ApprovedBannerRow {
  id: string;
  src: string;
  srcSm: string;
  alt: string;
  sortOrder: number;
  active: boolean;
}

type Row = { id: string; image_path: string; image_sm: string; alt: string; sort_order: number; active: boolean };
const url = (path: string) => createAdminClient().storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
const toRow = (r: Row): ApprovedBannerRow => ({ id: r.id, src: url(r.image_path), srcSm: url(r.image_sm), alt: r.alt, sortOrder: r.sort_order, active: r.active });

/** Ativos, na ordem definida pela equipe (para o carrossel do painel). */
export async function listActiveApprovedBanners(): Promise<ApprovalBanner[]> {
  const { data, error } = await createAdminClient().from("approved_banners").select("*").eq("active", true).order("sort_order").order("created_at").limit(30);
  if (error) throw new Error(error.message);
  return ((data ?? []) as Row[]).map(toRow).map(({ src, srcSm, alt }) => ({ src, srcSm, alt }));
}

export async function listApprovedBannersAdmin(): Promise<ApprovedBannerRow[]> {
  const { data, error } = await createAdminClient().from("approved_banners").select("*").order("sort_order").order("created_at").limit(200);
  if (error) throw new Error(error.message);
  return ((data ?? []) as Row[]).map(toRow);
}

async function fitBanner(input: Buffer, width: number, height: number): Promise<Buffer> {
  const img = sharp(input, { failOn: "error" }).rotate();
  const back = await img.clone().resize(width, height, { fit: "cover" }).blur(30).modulate({ brightness: 0.55 }).toBuffer();
  const front = await img.clone().resize(width, height, { fit: "inside", withoutEnlargement: false }).toBuffer();
  return sharp(back).composite([{ input: front, gravity: "center" }]).webp({ quality: 86 }).toBuffer();
}

const altSchema = z.string().trim().min(3, "Escreva o nome do aluno e onde foi aprovado.").max(400);
const sortOf = (v: unknown) => (Number.isFinite(Number(v)) ? Math.max(0, Math.min(999, Math.trunc(Number(v)))) : 0);

/** Texto alternativo padrão quando a equipe não escreve: vem do nome do arquivo ("joao-silva.jpg" → "Aprovado: joao silva"). */
const altFrom = (name: string) => `Aprovado: ${name.replace(/\.[a-z0-9]+$/i, "").replace(/[-_]+/g, " ").trim() || "aluno"}`.slice(0, 400);

/**
 * Publica um aprovado. O navegador já entrega a arte pronta (2000×711 e 1000×356, WEBP), então o
 * envio é leve (poucas centenas de KB) e não depende do tamanho da foto original.
 */
export async function createApprovedBannerFiles(adminId: string, big: File | null, small: File | null, altInput: unknown, sortInput: unknown, fileName = "") {
  if (!big || !small || !big.size || !small.size) throw new UserFacingError("A imagem não chegou. Escolha o arquivo de novo.", "invalid_input");
  if (big.size > MAX_UPLOAD || small.size > MAX_UPLOAD) throw new UserFacingError("Imagem pesada demais depois de ajustada. Tente outro arquivo.", "invalid_input");
  const altRaw = typeof altInput === "string" && altInput.trim().length >= 3 ? altInput : altFrom(fileName);
  const alt = altSchema.parse(altRaw);
  const [bigBuf, smallBuf] = await Promise.all([big.arrayBuffer().then(Buffer.from), small.arrayBuffer().then(Buffer.from)]);
  let b2: Buffer, s2: Buffer;
  try {
    // Confere que é imagem de verdade e normaliza para WEBP (aceita o que o navegador mandar).
    [b2, s2] = await Promise.all([
      sharp(bigBuf).resize(W, H, { fit: "fill" }).webp({ quality: 86 }).toBuffer(),
      sharp(smallBuf).resize(1000, 356, { fit: "fill" }).webp({ quality: 84 }).toBuffer(),
    ]);
  } catch {
    throw new UserFacingError("Não foi possível ler essa imagem. Tente outro arquivo.", "invalid_input");
  }
  return save(adminId, b2, s2, alt, sortOf(sortInput));
}

/** Envio de uma foto original (usado quando o navegador não consegue ajustar a imagem). */
export async function createApprovedBanner(adminId: string, file: File | null, altInput: unknown, sortInput: unknown) {
  if (!file || file.size === 0) throw new UserFacingError("Escolha a foto ou arte do aprovado.", "invalid_input");
  if (!TYPES.has(file.type)) throw new UserFacingError("Envie JPG, PNG ou WEBP.", "invalid_input");
  if (file.size > MAX_UPLOAD) throw new UserFacingError("Imagem acima de 4 MB: reduza antes de enviar.", "invalid_input");
  const raw = Buffer.from(await file.arrayBuffer());
  let big: Buffer, small: Buffer;
  try {
    [big, small] = await Promise.all([fitBanner(raw, W, H), fitBanner(raw, 1000, 356)]);
  } catch {
    throw new UserFacingError("Não foi possível ler essa imagem. Tente outro arquivo.", "invalid_input");
  }
  const altRaw = typeof altInput === "string" && altInput.trim().length >= 3 ? altInput : altFrom(file.name);
  return save(adminId, big, small, altSchema.parse(altRaw), sortOf(sortInput));
}

async function save(adminId: string, big: Buffer, small: Buffer, alt: string, sort: number) {
  const id = crypto.randomUUID();
  const db = createAdminClient();
  const paths = { image_path: `banners/${id}.webp`, image_sm: `banners/${id}-sm.webp` };
  for (const [path, buf] of [[paths.image_path, big], [paths.image_sm, small]] as const) {
    const up = await db.storage.from(BUCKET).upload(path, buf, { contentType: "image/webp", upsert: false });
    if (up.error) {
      await db.storage.from(BUCKET).remove([paths.image_path, paths.image_sm]);
      throw new UserFacingError(`Não consegui guardar a imagem (${up.error.message}).`, "invalid_input");
    }
  }
  const r = await db.from("approved_banners").insert({ id, ...paths, alt, sort_order: sort, created_by: adminId });
  if (r.error) {
    await db.storage.from(BUCKET).remove([paths.image_path, paths.image_sm]);
    throw new UserFacingError(`Não consegui registrar o banner (${r.error.message}).`, "invalid_input");
  }
  return id;
}

export async function updateApprovedBanner(idInput: unknown, altInput: unknown, sortInput: unknown, active: boolean) {
  const id = z.uuid().parse(idInput);
  const alt = altSchema.safeParse(altInput);
  if (!alt.success) throw new UserFacingError(alt.error.issues[0]?.message ?? "Descrição inválida.", "invalid_input");
  const sort = sortOf(sortInput);
  const r = await createAdminClient().from("approved_banners").update({ alt: alt.data, sort_order: sort, active, updated_at: new Date().toISOString() }).eq("id", id);
  if (r.error) throw new Error(r.error.message);
}

export async function deleteApprovedBanner(idInput: unknown) {
  const id = z.uuid().parse(idInput);
  const db = createAdminClient();
  const cur = await db.from("approved_banners").select("image_path, image_sm").eq("id", id).maybeSingle();
  if (cur.error) throw new Error(cur.error.message);
  if (!cur.data) return;
  const r = await db.from("approved_banners").delete().eq("id", id);
  if (r.error) throw new Error(r.error.message);
  await db.storage.from(BUCKET).remove([cur.data.image_path as string, cur.data.image_sm as string]);
}
