import "server-only";
import { z } from "zod";
import { createAdminClient, createUserClient } from "../supabase";
import { publicEnv } from "@/lib/env";
import { UserFacingError } from "./trails";
import { DEFAULT_FOUNDERS, DEFAULT_QUOTE, type Founder, type StoryQuote, type Testimonial } from "@/domain/testimonials";

const BUCKET = "depoimentos";
const COLS = "id, name, headline, video_url, photo_url, thumb_url, captions_url, category, concurso, cargo, estado, description, duration_seconds, published_at, approved, featured";
type Row = {
  id: string; name: string; headline: string | null; video_url: string | null; photo_url: string | null; thumb_url: string | null; captions_url: string | null;
  category: Testimonial["category"]; concurso: string | null; cargo: string | null; estado: string | null; description: string | null;
  duration_seconds: number | null; published_at: string | null; approved: boolean; featured: boolean;
};
const toItem = (r: Row): Testimonial => ({
  id: r.id, name: r.name, headline: r.headline ?? null, videoUrl: r.video_url, photoUrl: r.photo_url, thumbUrl: r.thumb_url, captionsUrl: r.captions_url,
  category: r.category, concurso: r.concurso, cargo: r.cargo, estado: r.estado, description: r.description, durationSeconds: r.duration_seconds,
  publishedAt: r.published_at, approved: r.approved, featured: r.featured,
});

/** Depoimentos ativos (a RLS já limita a alunos logados). */
export async function listTestimonials(): Promise<Testimonial[]> {
  const { data, error } = await (await createUserClient()).from("testimonials").select(COLS).eq("active", true).order("featured", { ascending: false }).order("sort").order("created_at", { ascending: false }).limit(60);
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
  "text/vtt": { ext: "vtt", kind: "photo", max: 1024 * 1024 },
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

const optText = (max: number) => z.string().trim().max(max).optional().transform((v) => v || undefined);
const httpsUrl = z.string().trim().url().startsWith("https://", "Os links precisam começar com https://");
const baseSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome do aluno.").max(80),
  headline: optText(160),
  videoUrl: httpsUrl.optional(),
  photoUrl: httpsUrl.optional(),
  thumbUrl: httpsUrl.optional(),
  captionsUrl: httpsUrl.optional(),
  category: z.enum(["aprovados", "superacao", "transformacao", "comunidade"]).default("aprovados"),
  concurso: optText(120),
  cargo: optText(120),
  estado: z.string().trim().regex(/^[A-Z]{2}$/, "Estado com 2 letras (ex.: MG).").optional().or(z.literal("").transform(() => undefined)),
  description: optText(1000),
  durationSeconds: z.number().int().min(1).max(86400).optional(),
  approved: z.boolean().default(false),
  featured: z.boolean().default(false),
  sort: z.number().int().min(0).max(100000).default(0),
  paths: z.array(z.string().regex(/^[\w.-]+$/)).max(4).default([]),
});

const dbRow = (v: z.infer<typeof baseSchema>) => ({
  name: v.name, headline: v.headline ?? null, video_url: v.videoUrl ?? null, photo_url: v.photoUrl ?? null, thumb_url: v.thumbUrl ?? null, captions_url: v.captionsUrl ?? null,
  category: v.category, concurso: v.concurso ?? null, cargo: v.cargo ?? null, estado: v.estado ?? null, description: v.description ?? null,
  duration_seconds: v.durationSeconds ?? null, approved: v.approved, featured: v.featured, sort: v.sort,
});

export async function createTestimonial(input: unknown): Promise<void> {
  const parsed = baseSchema.safeParse(input);
  if (!parsed.success) throw new UserFacingError(parsed.error.issues[0]?.message ?? "Dados inválidos.", "validation");
  const v = parsed.data;
  if (!v.videoUrl && !v.photoUrl) throw new UserFacingError("Envie um vídeo (arquivo ou link) ou uma foto.", "validation");
  const { error } = await createAdminClient().from("testimonials").insert({ ...dbRow(v), storage_paths: v.paths });
  if (error) throw new Error(error.message);
}

/** Edita um depoimento. Arquivos novos entram em `paths` (somem junto com o depoimento). */
export async function updateTestimonial(id: unknown, input: unknown): Promise<void> {
  const uid = z.uuid().parse(id);
  const parsed = baseSchema.safeParse(input);
  if (!parsed.success) throw new UserFacingError(parsed.error.issues[0]?.message ?? "Dados inválidos.", "validation");
  const v = parsed.data;
  if (!v.videoUrl && !v.photoUrl) throw new UserFacingError("O depoimento precisa de vídeo ou foto.", "validation");
  const db = createAdminClient();
  const cur = await db.from("testimonials").select("storage_paths").eq("id", uid).maybeSingle();
  const paths = [...new Set([...((cur.data?.storage_paths ?? []) as string[]), ...v.paths])];
  const { error } = await db.from("testimonials").update({ ...dbRow(v), storage_paths: paths }).eq("id", uid);
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


// ---------------------------------------------------------------------------
// Idealizadores, indicadores e citação (editáveis pela equipe)
// ---------------------------------------------------------------------------

const founderSchema = z.object({
  slug: z.enum(["rafael", "william"]),
  name: z.string().trim().min(2).max(80),
  role: z.string().trim().min(2).max(80),
  age: z.number().int().min(16).max(99).nullable(),
  city: z.string().trim().max(80).nullable(),
  bio: z.string().trim().max(600).nullable(),
  story: z.string().trim().max(4000).nullable(),
  trajectory: z.string().trim().max(4000).nullable(),
  quote: z.string().trim().max(300).nullable(),
});
const statsSchema = z.object({
  students: z.number().int().min(0).max(100_000_000).nullable(),
  approved: z.number().int().min(0).max(100_000_000).nullable(),
  satisfaction: z.string().trim().max(10).nullable(),
});
const quoteSchema = z.object({ text: z.string().trim().min(5).max(300), authors: z.string().trim().min(2).max(120) });

export interface StoriesData { founders: Founder[]; stats: { students: number | null; approved: number | null; satisfaction: string | null; studentsReal: number; approvedReal: number }; quote: StoryQuote }

export async function loadStories(): Promise<StoriesData> {
  const db = createAdminClient();
  const [cfg, students, approved] = await Promise.all([
    db.from("depoimentos_config").select("key, value"),
    db.from("profiles").select("id", { count: "exact", head: true }),
    db.from("approved_banners").select("id", { count: "exact", head: true }).eq("active", true),
  ]);
  const by = new Map(((cfg.data ?? []) as Array<{ key: string; value: unknown }>).map((r) => [r.key, r.value]));
  const f = founderSchema.array().safeParse(by.get("founders"));
  const st = statsSchema.safeParse(by.get("stats"));
  const q = quoteSchema.safeParse(by.get("quote"));
  return {
    founders: f.success && f.data.length === 2 ? f.data : DEFAULT_FOUNDERS,
    stats: { students: st.success ? st.data.students : null, approved: st.success ? st.data.approved : null, satisfaction: st.success ? st.data.satisfaction : null, studentsReal: students.count ?? 0, approvedReal: approved.count ?? 0 },
    quote: q.success ? q.data : DEFAULT_QUOTE,
  };
}

export async function saveStoriesConfig(key: "founders" | "stats" | "quote", input: unknown): Promise<void> {
  const schema = key === "founders" ? founderSchema.array().length(2) : key === "stats" ? statsSchema : quoteSchema;
  const parsed = schema.safeParse(input);
  if (!parsed.success) throw new UserFacingError(parsed.error.issues[0]?.message ?? "Dados inválidos.", "validation");
  const { error } = await createAdminClient().from("depoimentos_config").upsert({ key, value: parsed.data, updated_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
}
