import "server-only";
import { createAdminClient, createUserClient } from "../supabase";
import { publicEnv } from "@/lib/env";
import { getStudyStats } from "../queries";
import { computeLevel, type StudyStats } from "@/domain/progress/gamification";
import { defaultAvatar, validateAvatar, xpFromStats, type AvatarConfig, type AvatarItem, type Gender } from "@/domain/avatar/catalog";
import { UserFacingError } from "./trails";

export interface AvatarProgress {
  level: number;
  xp: number;
  /** 0–1 até o próximo nível. */
  levelProgress: number;
}
export interface AvatarState {
  config: AvatarConfig;
  saved: boolean;
  items: AvatarItem[];
  progress: AvatarProgress;
}

const assetUrl = (path: string | null) => {
  if (!path) return null;
  if (/^https?:\/\//.test(path)) return path;
  const base = publicEnv().supabaseUrl.replace(/\/$/, "");
  return base ? `${base}/storage/v1/object/public/avatar-assets/${path.replace(/^\/+/, "")}` : null;
};

type ItemRow = { id: string; slot: string; name: string; genders: string[]; min_level: number; min_xp: number; is_default: boolean; preview_path: string | null; model_path: string | null; meta: Record<string, unknown> | null; sort: number };
const toItem = (r: ItemRow): AvatarItem => ({
  id: r.id,
  slot: r.slot as AvatarItem["slot"],
  name: r.name,
  genders: r.genders as Gender[],
  minLevel: r.min_level,
  minXp: r.min_xp,
  isDefault: r.is_default,
  previewUrl: assetUrl(r.preview_path),
  modelUrl: assetUrl(r.model_path),
  meta: r.meta ?? {},
  sort: r.sort,
});

export function progressFrom(stats: StudyStats): AvatarProgress {
  const lv = computeLevel(stats.themesPassed);
  return { level: lv.level, xp: xpFromStats(stats), levelProgress: lv.progress };
}

async function loadItems(): Promise<AvatarItem[]> {
  const db = await createUserClient();
  const { data, error } = await db.from("avatar_items").select("id, slot, name, genders, min_level, min_xp, is_default, preview_path, model_path, meta, sort").order("slot").order("sort");
  if (error) throw new Error(error.message);
  return ((data ?? []) as ItemRow[]).map(toItem);
}

/** Avatar do aluno logado (ou o padrão, se ainda não personalizou), catálogo e progresso real. */
export async function loadMyAvatar(userId: string): Promise<AvatarState> {
  const db = await createUserClient();
  const [items, stats, row] = await Promise.all([
    loadItems(),
    getStudyStats(),
    db.from("avatar_profiles").select("gender, skin, hair_color, face, body, equipped").eq("user_id", userId).maybeSingle(),
  ]);
  const progress = progressFrom(stats);
  if (!row.data) return { config: defaultAvatar("m", items), saved: false, items, progress };
  const r = row.data as { gender: string; skin: string; hair_color: string; face: unknown; body: unknown; equipped: unknown };
  // Valida de novo o que está gravado (peça que saiu do catálogo volta ao padrão).
  const v = validateAvatar({ gender: r.gender, skin: r.skin, hairColor: r.hair_color, face: r.face, body: r.body, equipped: r.equipped }, items, { level: 999, xp: Number.MAX_SAFE_INTEGER });
  return { config: v.ok ? v.config : defaultAvatar(r.gender === "f" ? "f" : "m", items), saved: true, items, progress };
}

/** Grava o avatar do PRÓPRIO aluno, depois de validar contra o catálogo e o progresso real. */
export async function saveMyAvatar(userId: string, input: unknown): Promise<AvatarConfig> {
  const [items, stats] = await Promise.all([loadItems(), getStudyStats()]);
  const v = validateAvatar(input, items, progressFrom(stats));
  if (!v.ok) throw new UserFacingError(v.error, "validation");
  const c = v.config;
  const { error } = await createAdminClient()
    .from("avatar_profiles")
    .upsert({ user_id: userId, gender: c.gender, skin: c.skin, hair_color: c.hairColor, face: c.face, body: c.body, equipped: c.equipped, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  if (error) throw new Error(error.message);
  return c;
}
