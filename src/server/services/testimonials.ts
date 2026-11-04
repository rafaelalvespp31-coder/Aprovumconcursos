import "server-only";
import { z } from "zod";
import { createAdminClient, createUserClient } from "../supabase";
import { publicEnv } from "@/lib/env";
import { UserFacingError } from "./trails";
import type { Testimonial } from "@/domain/testimonials";

const BUCKET = "depoimentos";
const COLS = "id, name, headline, video_url, photo_url";
type Row = { id: string; name: string; headline: string | null; video_url: string | null; photo_url: string | null };
const toItem = (r: Row): Testimonial => ({ id: r.id, name: r.name, headline: r.headline ?? null, videoUrl: r.video_url, photoUrl: r.photo_url });

/** Depoimentos ativos (a RLS já limita a alunos logados). */
export async function listTestimonials(): Promise<Testimonial[]> {
  const { data, error } = await (await createUserClient()).from("testimonials").select(COLS).eq("active", true).order("sort").order("created_at", { ascending: false }).limit(60);
  if (error) throw new Error(error.message);
  return ((data ?? []) as Row[]).map(toItem);
}

export interface TestimonialAdminRow extends Testimonial {
  active: boolean;
  sort: number;
  createdAt: string;
}

/** Equipe: todos os depoimentos (inclusive ocultos). */
export async function listTestimonialsAdmin(): Promise<TestimonialAdminRow[]> {
  const { data, error } = await createAdminClient().from("testimonials").select(`${COLS}, active, sort, created_at`).order("sort").order("created_at", { ascending: false }).limit(200);
  if (error) throw new Error(error.message);
  return ((data ?? []) as Array<Row & { active: boolean; sort: number; created_at: string }>).map((r) => ({ ...toItem(r), active: r.active, sort: r.sort, createdAt: r.created_at }));
}

const TYPES: Record<string, { ext: string; kind: "video" | "photo"; max: number }> = {
  "video/mp4": { ext: "mp4", kind: "video", max: 50 * 1024 * 1024 },
  "video/webm": { ext: "webm", kind: "video", max: 50 * 1024 * 1024 },
  "video/quicktime": { ext: "mov", kind: "video", max: 50 * 1024 * 1024 },
  "image/jpeg": { ext: "jpg", kind: "photo", max: 8 * 1024 * 1024 },
  "image/png": { ext: "png", kind: "photo", max: 8 * 1024 * 1024 },
  "image/webp": { ext: "webp", kind: "photo", max: 8 * 1024 * 1024 },
};

/** URL assinada para o navegador da equipe enviar o arquivo direto ao armazenamento (vídeos passam do limite dos formulários). */
export async function createTestimonialUpload(contentType: unknown, size: unknown): Promise<{ path: string; signedUrl: string; publicUrl: string; kind: "video" | "photo" }> {
  const type = z.string().parse(contentType);
  const bytes = z.number().int().positive().parse(size);
  const t = TYPES[type];
  if (!t) throw new UserFacingError("Formato não aceito. Use MP4, WEBM ou MOV (vídeo) e JPG, PNG ou WEBP (foto).", "validation");
  if (bytes > t.max) throw new UserFacingError(`Arquivo grande demais (máximo ${Math.round(t.max / 1024 / 1024)} MB). Para vídeos maiores, envie para o YouTube e cole o link.`, "validation");
  const path = `${Date.now()}-${crypto.randomUUID()}.${t.ext}`;
  const db = createAdminClient();
  const { data, error } = await db.storage.from(BUCKET).createSignedUploadUrl(path);
  if (error || !data) throw new Error(error?.message ?? "sem URL de envio");
  const base = publicEnv().supabaseUrl.replace(/\/$/, "");
  return { path, signedUrl: data.signedUrl, publicUrl: `${base}/storage/v1/object/public/${BUCKET}/${path}`, kind: t.kind };
}

const createSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome do aluno.").max(80),
  headline: z.string().trim().max(160).optional(),
  videoUrl: z.string().trim().url().startsWith("https://", "O link do vídeo precisa começar com https://").optional(),
  photoUrl: z.string().trim().url().startsWith("https://").optional(),
  paths: z.array(z.string().regex(/^[\w.-]+$/)).max(2).default([]),
});

export async function createTestimonial(input: unknown): Promise<void> {
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) throw new UserFacingError(parsed.error.issues[0]?.message ?? "Dados inválidos.", "validation");
  const v = parsed.data;
  if (!v.videoUrl && !v.photoUrl) throw new UserFacingError("Envie um vídeo (arquivo ou link) ou uma foto.", "validation");
  const { error } = await createAdminClient().from("testimonials").insert({ name: v.name, headline: v.headline || null, video_url: v.videoUrl ?? null, photo_url: v.photoUrl ?? null, storage_paths: v.paths });
  if (error) throw new Error(error.message);
}

export async function setTestimonialActive(id: unknown, active: boolean): Promise<void> {
  const { error } = await createAdminClient().from("testimonials").update({ active }).eq("id", z.uuid().parse(id));
  if (error) throw new Error(error.message);
}

export async function deleteTestimonial(id: unknown): Promise<void> {
  const db = createAdminClient();
  const uid = z.uuid().parse(id);
  const row = await db.from("testimonials").select("storage_paths").eq("id", uid).maybeSingle();
  const del = await db.from("testimonials").delete().eq("id", uid);
  if (del.error) throw new Error(del.error.message);
  const paths = (row.data?.storage_paths ?? []) as string[];
  if (paths.length) await db.storage.from(BUCKET).remove(paths);
}
