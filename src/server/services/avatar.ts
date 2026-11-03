import "server-only";
import { createAdminClient, createUserClient } from "../supabase";
import { publicEnv } from "@/lib/env";
import { getStudyStats } from "../queries";
import { computeLevel, type StudyStats } from "@/domain/progress/gamification";
import { XP_RULES, defaultAvatar, parseGender, switchGender, validateAvatar, xpFromStats, type AvatarConfig, type AvatarItem, type Gender } from "@/domain/avatar/catalog";
import { UserFacingError } from "./trails";
import sharp from "sharp";
import { z } from "zod";
import { STANDARD_FRAME, customParamsSchema, standardFigureRect, type CustomParams } from "@/domain/avatar/custom";
import type { Portrait } from "@/components/avatar/portraits";

export interface AvatarProgress {
  level: number;
  xp: number;
  /** 0–1 até o próximo nível. */
  levelProgress: number;
  /** XP ao chegar no próximo nível (cada tema aprovado que falta vale 100 XP). */
  xpNext: number;
  /** Posição no ranking (atividade real) e total de alunos. */
  rank: { position: number | null; total: number } | null;
}
export interface AvatarState {
  config: AvatarConfig;
  saved: boolean;
  items: AvatarItem[];
  progress: AvatarProgress;
  /** Avatar personalizado anexado pela equipe (links temporários); null = arte padrão. */
  portrait: Portrait | null;
}

const assetUrl = (path: string | null) => {
  if (!path) return null;
  if (/^https?:\/\//.test(path) || path.startsWith("/")) return path;
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

export function progressFrom(stats: StudyStats, rank: AvatarProgress["rank"] = null): AvatarProgress {
  const lv = computeLevel(stats.themesPassed);
  const xp = xpFromStats(stats);
  return { level: lv.level, xp, levelProgress: lv.progress, xpNext: xp + lv.remaining * XP_RULES.themePassed, rank };
}

async function myRank(): Promise<AvatarProgress["rank"]> {
  const { data, error } = await (await createUserClient()).rpc("my_ranking_position");
  if (error || !data) return null;
  const d = data as { posicao: number | null; total: number };
  return { position: d.posicao === null ? null : Number(d.posicao), total: Number(d.total) };
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
  const [items, stats, row, rank] = await Promise.all([
    loadItems(),
    getStudyStats(),
    db.from("avatar_profiles").select("gender, skin, hair_color, face, body, equipped, custom_portrait").eq("user_id", userId).maybeSingle(),
    myRank(),
  ]);
  const progress = progressFrom(stats, rank);
  if (!row.data) {
    // Sem avatar gravado: usa o gênero informado no cadastro.
    const meta = (await db.auth.getUser()).data.user?.user_metadata as Record<string, unknown> | undefined;
    return { config: defaultAvatar(parseGender(meta?.avatar_gender) ?? "m", items), saved: false, items, progress, portrait: null };
  }
  const r = row.data as { gender: string; skin: string; hair_color: string; face: unknown; body: unknown; equipped: unknown; custom_portrait: StoredCustom | null };
  const portrait = r.custom_portrait ? await customPortrait(r.custom_portrait).catch(() => null) : null;
  // Valida de novo o que está gravado (peça que saiu do catálogo volta ao padrão).
  const v = validateAvatar({ gender: r.gender, skin: r.skin, hairColor: r.hair_color, face: r.face, body: r.body, equipped: r.equipped }, items, { level: 999, xp: Number.MAX_SAFE_INTEGER });
  return { config: v.ok ? v.config : defaultAvatar(r.gender === "f" ? "f" : "m", items), saved: true, items, progress, portrait };
}

// ---------------------------------------------------------------------------
// Avatar personalizado (arte pronta anexada pela equipe)
// ---------------------------------------------------------------------------
const CUSTOM_BUCKET = "avatar-personalizado";
type StoredCustom = CustomParams & { art: string; lids: string; requestId?: string; at?: string };

/** Posição padrão do avatar oficial (cabeça, pés e eixo do corpo nas mesmas linhas). */
async function customPortrait(c: StoredCustom): Promise<Portrait> {
  const signed = await createAdminClient().storage.from(CUSTOM_BUCKET).createSignedUrls([c.art, c.lids], 6 * 3600);
  const [art, lids] = (signed.data ?? []).map((x) => x.signedUrl);
  if (signed.error || !art || !lids) throw new Error(signed.error?.message ?? "link do avatar indisponível");
  return {
    src: art,
    lids,
    aspect: c.aspect,
    centerX: c.centerX,
    neckY: c.neckY,
    shoulderY: c.shoulderY,
    chestY: c.chestY,
    waistY: c.waistY,
    eyes: c.eyes,
    backdrop: { src: "/avatar/ui/palco-fundo.webp", w: STANDARD_FRAME.w, h: STANDARD_FRAME.h, figure: standardFigureRect(c.aspect, c.centerX) },
  };
}

async function checkLayer(file: File | null, label: string): Promise<{ buf: Buffer; width: number; height: number; type: string }> {
  if (!file || file.size === 0) throw new UserFacingError(`Falta a ${label}.`, "validation");
  if (!["image/webp", "image/png"].includes(file.type)) throw new UserFacingError(`A ${label} deve ser WEBP ou PNG.`, "validation");
  if (file.size > 8 * 1024 * 1024) throw new UserFacingError(`A ${label} passa de 8 MB.`, "validation");
  const buf = Buffer.from(await file.arrayBuffer());
  const meta = await sharp(buf).metadata().catch(() => null);
  if (!meta?.width || !meta.height) throw new UserFacingError(`Não foi possível ler a ${label}.`, "validation");
  if (!meta.hasAlpha) throw new UserFacingError(`A ${label} precisa ter fundo transparente.`, "validation");
  if (meta.height > 4096 || meta.width > 4096) throw new UserFacingError(`A ${label} passa de 4096 px.`, "validation");
  return { buf, width: meta.width, height: meta.height, type: file.type };
}

/**
 * Equipe: grava a arte pronta como avatar do aluno da solicitação (piscadas e respiração com os
 * parâmetros calculados no painel) e conclui a solicitação.
 */
export async function saveCustomAvatar(requestIdInput: unknown, artFile: File | null, lidsFile: File | null, paramsJson: unknown) {
  const requestId = z.uuid().parse(requestIdInput);
  let params: CustomParams;
  try {
    params = customParamsSchema.parse(JSON.parse(String(paramsJson)));
  } catch {
    throw new UserFacingError("Marque os dois olhos e confira o recorte antes de salvar.", "validation");
  }
  const [art, lids] = await Promise.all([checkLayer(artFile, "arte do avatar"), checkLayer(lidsFile, "camada das pálpebras")]);
  if (art.height < 900) throw new UserFacingError("A arte está pequena (menos de 900 px de altura): o avatar ficaria borrado. Envie uma imagem maior.", "validation");
  if (lids.width !== art.width || lids.height !== art.height) throw new UserFacingError("As camadas não têm o mesmo tamanho.", "validation");
  if (Math.abs(art.width / art.height - params.aspect) > 0.01) throw new UserFacingError("Proporção da arte não confere.", "validation");
  const db = createAdminClient();
  const req = await db.from("avatar_requests").select("user_id").eq("id", requestId).maybeSingle();
  if (req.error) throw new Error(req.error.message);
  if (!req.data) throw new UserFacingError("Solicitação não encontrada.", "validation");
  const userId = req.data.user_id as string;
  const stamp = `${Date.now()}`;
  const paths = { art: `${userId}/${stamp}-arte.${art.type === "image/png" ? "png" : "webp"}`, lids: `${userId}/${stamp}-palpebras.png` };
  for (const [path, layer] of [[paths.art, art], [paths.lids, lids]] as const) {
    const up = await db.storage.from(CUSTOM_BUCKET).upload(path, layer.buf, { contentType: layer.type, upsert: false });
    if (up.error) throw new Error(up.error.message);
  }
  const cur = await db.from("avatar_profiles").select("custom_portrait").eq("user_id", userId).maybeSingle();
  if (!cur.data) {
    const meta = (await db.auth.admin.getUserById(userId)).data.user?.user_metadata as Record<string, unknown> | undefined;
    await writeConfig(userId, defaultAvatar(parseGender(meta?.avatar_gender) ?? "m", await loadItemsAdmin()));
  }
  const stored: StoredCustom = { ...params, ...paths, requestId, at: new Date().toISOString() };
  const upd = await db.from("avatar_profiles").update({ custom_portrait: stored, updated_at: new Date().toISOString() }).eq("user_id", userId);
  if (upd.error) {
    await db.storage.from(CUSTOM_BUCKET).remove([paths.art, paths.lids]);
    throw new Error(upd.error.message);
  }
  const prev = cur.data?.custom_portrait as StoredCustom | null | undefined;
  if (prev) await db.storage.from(CUSTOM_BUCKET).remove([prev.art, prev.lids]);
  await db.from("avatar_requests").update({ status: "concluida", note: "Seu avatar personalizado está pronto!", updated_at: new Date().toISOString() }).eq("id", requestId);
}

/** Equipe: volta o aluno para a arte padrão. */
export async function removeCustomAvatar(requestIdInput: unknown) {
  const requestId = z.uuid().parse(requestIdInput);
  const db = createAdminClient();
  const req = await db.from("avatar_requests").select("user_id").eq("id", requestId).maybeSingle();
  if (!req.data) throw new UserFacingError("Solicitação não encontrada.", "validation");
  const userId = req.data.user_id as string;
  const cur = await db.from("avatar_profiles").select("custom_portrait").eq("user_id", userId).maybeSingle();
  const prev = cur.data?.custom_portrait as StoredCustom | null | undefined;
  const upd = await db.from("avatar_profiles").update({ custom_portrait: null, updated_at: new Date().toISOString() }).eq("user_id", userId);
  if (upd.error) throw new Error(upd.error.message);
  if (prev) await db.storage.from(CUSTOM_BUCKET).remove([prev.art, prev.lids]);
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

// ---------------------------------------------------------------------------
// Solicitação de avatar personalizado (foto de corpo inteiro)
// ---------------------------------------------------------------------------
export type AvatarRequestStatus = "enviada" | "em_producao" | "concluida" | "recusada";
export interface AvatarRequest {
  id: string;
  status: AvatarRequestStatus;
  note: string | null;
  createdAt: string;
}
const PHOTO_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/heic": "heic", "image/heif": "heif" };
export const AVATAR_PHOTO_MAX = 12 * 1024 * 1024;

/** Última solicitação do aluno (para mostrar o andamento). */
export async function getMyAvatarRequest(userId: string): Promise<AvatarRequest | null> {
  const { data } = await (await createUserClient()).from("avatar_requests").select("id, status, note, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (!data) return null;
  return { id: data.id as string, status: data.status as AvatarRequestStatus, note: (data.note as string | null) ?? null, createdAt: data.created_at as string };
}

/** Recebe a foto (validada no servidor), guarda no bucket privado e registra a solicitação. */
export async function submitAvatarRequest(userId: string, file: File): Promise<AvatarRequest> {
  const ext = PHOTO_TYPES[file.type];
  if (!ext) throw new UserFacingError("Envie uma foto (JPG, PNG, WEBP ou HEIC).", "validation");
  if (file.size < 20_000) throw new UserFacingError("A foto está pequena demais. Envie uma foto de corpo inteiro com boa resolução.", "validation");
  if (file.size > AVATAR_PHOTO_MAX) throw new UserFacingError("A foto passa de 12 MB. Envie uma versão menor.", "validation");
  const db = createAdminClient();
  const path = `${userId}/${Date.now()}.${ext}`;
  const up = await db.storage.from("avatar-solicitacoes").upload(path, Buffer.from(await file.arrayBuffer()), { contentType: file.type, upsert: false });
  if (up.error) throw new Error(up.error.message);
  const { data, error } = await db.from("avatar_requests").insert({ user_id: userId, photo_path: path }).select("id, status, note, created_at").single();
  if (error) {
    await db.storage.from("avatar-solicitacoes").remove([path]);
    throw new Error(error.message);
  }
  return { id: data.id as string, status: data.status as AvatarRequestStatus, note: null, createdAt: data.created_at as string };
}

export interface AvatarRequestAdminRow extends AvatarRequest {
  userId: string;
  name: string | null;
  email: string | null;
  photoUrl: string | null;
  /** Arte personalizada atual do aluno (link temporário), se houver. */
  customArtUrl: string | null;
}

/** Equipe: solicitações com link temporário da foto (quem chama confere que é administrador). */
export async function listAvatarRequests(limit = 100): Promise<AvatarRequestAdminRow[]> {
  const db = createAdminClient();
  const { data, error } = await db.from("avatar_requests").select("id, user_id, photo_path, status, note, created_at").order("created_at", { ascending: false }).limit(limit);
  if (error) throw new Error(error.message);
  const rows = data ?? [];
  const ids = [...new Set(rows.map((r) => r.user_id as string))];
  const profiles = ids.length ? ((await db.from("profiles").select("id, display_name").in("id", ids)).data ?? []) : [];
  const names = new Map(profiles.map((p) => [p.id as string, p.display_name as string | null]));
  const emails = new Map<string, string | null>();
  await Promise.all(ids.map(async (id) => emails.set(id, (await db.auth.admin.getUserById(id)).data.user?.email ?? null)));
  const signed = rows.length ? await db.storage.from("avatar-solicitacoes").createSignedUrls(rows.map((r) => r.photo_path as string), 3600) : { data: [] };
  const urlBy = new Map((signed.data ?? []).map((s) => [s.path, s.signedUrl]));
  const customs = ids.length ? ((await db.from("avatar_profiles").select("user_id, custom_portrait").in("user_id", ids)).data ?? []) : [];
  const artPath = new Map(customs.filter((c) => c.custom_portrait).map((c) => [c.user_id as string, (c.custom_portrait as StoredCustom).art]));
  const artSigned = artPath.size ? await db.storage.from(CUSTOM_BUCKET).createSignedUrls([...artPath.values()], 3600) : { data: [] };
  const artUrl = new Map((artSigned.data ?? []).map((s) => [s.path, s.signedUrl]));
  return rows.map((r) => ({
    id: r.id as string,
    userId: r.user_id as string,
    name: names.get(r.user_id as string) ?? null,
    email: emails.get(r.user_id as string) ?? null,
    status: r.status as AvatarRequestStatus,
    note: (r.note as string | null) ?? null,
    createdAt: r.created_at as string,
    photoUrl: urlBy.get(r.photo_path as string) ?? null,
    customArtUrl: artPath.has(r.user_id as string) ? (artUrl.get(artPath.get(r.user_id as string)!) ?? null) : null,
  }));
}

export async function setAvatarRequestStatus(id: string, status: AvatarRequestStatus, note: string | null) {
  if (!["enviada", "em_producao", "concluida", "recusada"].includes(status)) throw new UserFacingError("Situação inválida.", "validation");
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new UserFacingError("Solicitação inválida.", "validation");
  const { error } = await createAdminClient().from("avatar_requests").update({ status, note: note?.trim().slice(0, 500) || null, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) throw new Error(error.message);
}

/** Catálogo lido com a chave do servidor (no cadastro ainda pode não haver sessão). */
async function loadItemsAdmin(): Promise<AvatarItem[]> {
  const { data, error } = await createAdminClient().from("avatar_items").select("id, slot, name, genders, min_level, min_xp, is_default, preview_path, model_path, meta, sort").eq("active", true);
  if (error) throw new Error(error.message);
  return ((data ?? []) as ItemRow[]).map(toItem);
}

async function writeConfig(userId: string, c: AvatarConfig) {
  const { error } = await createAdminClient()
    .from("avatar_profiles")
    .upsert({ user_id: userId, gender: c.gender, skin: c.skin, hair_color: c.hairColor, face: c.face, body: c.body, equipped: c.equipped, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  if (error) throw new Error(error.message);
}

/** Cadastro: cria o avatar do gênero escolhido pelo aluno. */
export async function initAvatarForNewUser(userId: string, gender: Gender) {
  const items = await loadItemsAdmin();
  await writeConfig(userId, defaultAvatar(gender, items));
}

/** Editar perfil: troca o gênero do avatar do próprio aluno, mantendo o que for compatível. */
export async function setMyAvatarGender(userId: string, genderInput: unknown) {
  const gender = parseGender(genderInput);
  if (!gender) throw new UserFacingError("Escolha masculino ou feminino.", "validation");
  const items = await loadItemsAdmin();
  const { data } = await createAdminClient().from("avatar_profiles").select("gender, skin, hair_color, face, body, equipped").eq("user_id", userId).maybeSingle();
  let current = defaultAvatar(gender, items);
  if (data) {
    const v = validateAvatar({ gender: data.gender, skin: data.skin, hairColor: data.hair_color, face: data.face, body: data.body, equipped: data.equipped }, items, { level: 999, xp: Number.MAX_SAFE_INTEGER });
    if (v.ok) current = switchGender(v.config, gender, items);
  }
  await writeConfig(userId, current);
  await createAdminClient().auth.admin.updateUserById(userId, { user_metadata: { avatar_gender: gender } });
}

/** Gênero atual do avatar (para o formulário do perfil). */
export async function getMyAvatarGender(userId: string): Promise<Gender | null> {
  const { data } = await (await createUserClient()).from("avatar_profiles").select("gender").eq("user_id", userId).maybeSingle();
  if (data) return parseGender(data.gender);
  const meta = (await (await createUserClient()).auth.getUser()).data.user?.user_metadata as Record<string, unknown> | undefined;
  return parseGender(meta?.avatar_gender);
}
