/**
 * Avatar do aluno: opções, valores padrão, validação e regras de desbloqueio.
 * Regras puras (sem banco): o servidor usa para validar o que o navegador manda, e o
 * editor usa para mostrar o que está liberado.
 */
import type { StudyStats } from "@/domain/progress/gamification";

export type Gender = "m" | "f";
export const GENDERS: ReadonlyArray<{ id: Gender; label: string }> = [
  { id: "m", label: "Masculino" },
  { id: "f", label: "Feminino" },
];

export const SKIN_TONES = [
  { id: "muito_clara", label: "Muito clara", hex: "#F6E2D3" },
  { id: "clara", label: "Clara", hex: "#EBC6A8" },
  { id: "morena_clara", label: "Morena clara", hex: "#D3A27E" },
  { id: "morena", label: "Morena", hex: "#B97E58" },
  { id: "morena_media", label: "Morena média", hex: "#9C6542" },
  { id: "morena_escura", label: "Morena escura", hex: "#7A4A2E" },
  { id: "negra", label: "Negra", hex: "#4E2E1D" },
] as const;
export type SkinTone = (typeof SKIN_TONES)[number]["id"];

export const HAIR_COLORS = [
  { id: "preto", label: "Preto", hex: "#141110" },
  { id: "castanho_escuro", label: "Castanho escuro", hex: "#3B2417" },
  { id: "castanho", label: "Castanho", hex: "#6A4128" },
  { id: "ruivo", label: "Ruivo", hex: "#8E3B1C" },
  { id: "loiro", label: "Loiro", hex: "#C9A15E" },
  { id: "loiro_claro", label: "Loiro claro", hex: "#E3CB94" },
  { id: "grisalho", label: "Grisalho", hex: "#B9B6B1" },
] as const;
export type HairColor = (typeof HAIR_COLORS)[number]["id"];

/** Rosto: escolhas discretas (cada uma corresponde a uma forma/peça do modelo 3D). */
export const FACE_OPTIONS = {
  formato: [
    { id: "oval", label: "Oval" },
    { id: "quadrado", label: "Quadrado" },
    { id: "redondo", label: "Redondo" },
    { id: "alongado", label: "Alongado" },
  ],
  sobrancelhas: [
    { id: "finas", label: "Finas" },
    { id: "medias", label: "Médias" },
    { id: "grossas", label: "Grossas" },
  ],
  olhos: [
    { id: "amendoados", label: "Amendoados" },
    { id: "redondos", label: "Redondos" },
    { id: "puxados", label: "Puxados" },
  ],
} as const;
export type FaceKey = keyof typeof FACE_OPTIONS;
export type Face = { [K in FaceKey]: (typeof FACE_OPTIONS)[K][number]["id"] };

/** Corpo: ajustes limitados (0–100) para não deformar o personagem. */
export const BODY_SLIDERS = [
  { id: "estrutura", label: "Estrutura física", min: "Leve", max: "Forte" },
  { id: "ombros", label: "Largura dos ombros", min: "Estreitos", max: "Largos" },
  { id: "constituicao", label: "Constituição corporal", min: "Magra", max: "Robusta" },
  { id: "altura", label: "Altura visual", min: "Mais baixa", max: "Mais alta" },
] as const;
export type BodyKey = (typeof BODY_SLIDERS)[number]["id"];
export type Body = Record<BodyKey, number>;

/** Faixa real aplicada ao modelo: 0–100 → ±`spread` em torno de 1 (sem exageros). */
export function bodyFactor(v: number, spread = 0.06): number {
  const t = Math.min(100, Math.max(0, Number.isFinite(v) ? v : 50)) / 100;
  return 1 + (t - 0.5) * 2 * spread;
}

/** Peças equipáveis (cada uma é um item do catálogo). */
export const SLOTS = ["cabelo", "barba", "camiseta", "uniforme", "jaqueta", "calca", "calcado", "bone", "oculos", "acessorio"] as const;
export type Slot = (typeof SLOTS)[number];
export const SLOT_LABEL: Record<Slot, string> = {
  cabelo: "Cabelo",
  barba: "Barba e bigode",
  camiseta: "Camisetas",
  uniforme: "Uniformes e táticos",
  jaqueta: "Jaquetas",
  calca: "Calças e shorts",
  calcado: "Calçados",
  bone: "Bonés",
  oculos: "Óculos",
  acessorio: "Acessórios",
};
/** Peças que podem ficar vazias (as outras sempre têm algo equipado). */
export const OPTIONAL_SLOTS: ReadonlySet<Slot> = new Set(["barba", "uniforme", "jaqueta", "bone", "oculos", "acessorio"]);
/** O uniforme completo substitui camiseta e jaqueta. */
export const UNIFORM_REPLACES: readonly Slot[] = ["camiseta", "jaqueta"];

export interface AvatarItem {
  id: string;
  slot: Slot | "base";
  name: string;
  genders: Gender[];
  minLevel: number;
  minXp: number;
  isDefault: boolean;
  previewUrl: string | null;
  modelUrl: string | null;
  /** Ex.: { hides: ["torso"], color: "#..." } */
  meta: Record<string, unknown>;
  sort: number;
}

export interface AvatarConfig {
  gender: Gender;
  skin: SkinTone;
  hairColor: HairColor;
  face: Face;
  body: Body;
  equipped: Partial<Record<Slot, string>>;
}

export const DEFAULT_FACE: Face = { formato: "oval", sobrancelhas: "medias", olhos: "amendoados" };
export const DEFAULT_BODY: Body = { estrutura: 50, ombros: 50, constituicao: 50, altura: 50 };

/** XP derivado só de atividade real registrada (respostas certas, temas, domínio, dias de estudo). */
export const XP_RULES = { correct: 10, themePassed: 100, themeMastered: 150, activeDay: 20 } as const;
export function xpFromStats(s: Pick<StudyStats, "correct" | "themesPassed" | "themesMastered" | "activeDays">): number {
  return s.correct * XP_RULES.correct + s.themesPassed * XP_RULES.themePassed + s.themesMastered * XP_RULES.themeMastered + new Set(s.activeDays).size * XP_RULES.activeDay;
}

export function isUnlocked(item: Pick<AvatarItem, "minLevel" | "minXp">, progress: { level: number; xp: number }): boolean {
  return progress.level >= item.minLevel && progress.xp >= item.minXp;
}

const fits = (item: AvatarItem, g: Gender) => item.genders.includes(g);

/** Avatar padrão do gênero: peças marcadas como padrão no catálogo. */
export function defaultAvatar(gender: Gender, items: readonly AvatarItem[]): AvatarConfig {
  const equipped: Partial<Record<Slot, string>> = {};
  for (const slot of SLOTS) {
    const it = items.filter((i) => i.slot === slot && fits(i, gender)).sort((a, b) => Number(b.isDefault) - Number(a.isDefault) || a.sort - b.sort);
    const pick = it.find((i) => i.isDefault) ?? (OPTIONAL_SLOTS.has(slot) ? undefined : it[0]);
    if (pick) equipped[slot] = pick.id;
  }
  return { gender, skin: "morena_clara", hairColor: "preto", face: { ...DEFAULT_FACE }, body: { ...DEFAULT_BODY }, equipped };
}

/**
 * Troca de gênero preservando o que é compatível (pele, cor do cabelo, rosto, corpo e
 * peças unissex); o que não serve volta ao padrão do novo gênero.
 */
export function switchGender(cfg: AvatarConfig, gender: Gender, items: readonly AvatarItem[]): AvatarConfig {
  if (cfg.gender === gender) return cfg;
  const base = defaultAvatar(gender, items);
  const byId = new Map(items.map((i) => [i.id, i]));
  const equipped: Partial<Record<Slot, string>> = { ...base.equipped };
  for (const slot of SLOTS) {
    const cur = cfg.equipped[slot];
    if (cur && byId.get(cur) && fits(byId.get(cur)!, gender)) equipped[slot] = cur;
    else if (OPTIONAL_SLOTS.has(slot) && !base.equipped[slot]) delete equipped[slot];
  }
  if (gender === "f") delete equipped.barba;
  return { ...cfg, gender, equipped };
}

export type ValidationResult = { ok: true; config: AvatarConfig } | { ok: false; error: string };

/** Valida o que veio do navegador contra o catálogo e o progresso REAL do aluno. */
export function validateAvatar(input: unknown, items: readonly AvatarItem[], progress: { level: number; xp: number }): ValidationResult {
  const o = (input ?? {}) as Record<string, unknown>;
  const gender = o.gender === "f" ? "f" : o.gender === "m" ? "m" : null;
  if (!gender) return { ok: false, error: "Escolha avatar masculino ou feminino." };
  const skin = SKIN_TONES.find((s) => s.id === o.skin)?.id;
  if (!skin) return { ok: false, error: "Tom de pele inválido." };
  const hairColor = HAIR_COLORS.find((h) => h.id === o.hairColor)?.id;
  if (!hairColor) return { ok: false, error: "Cor de cabelo inválida." };
  const faceIn = (o.face ?? {}) as Record<string, unknown>;
  const face = { ...DEFAULT_FACE } as Record<FaceKey, string>;
  for (const k of Object.keys(FACE_OPTIONS) as FaceKey[]) {
    if (faceIn[k] === undefined) continue;
    if (!FACE_OPTIONS[k].some((x) => x.id === faceIn[k])) return { ok: false, error: "Característica do rosto inválida." };
    face[k] = faceIn[k] as string;
  }
  const bodyIn = (o.body ?? {}) as Record<string, unknown>;
  const body = { ...DEFAULT_BODY };
  for (const s of BODY_SLIDERS) {
    const v = bodyIn[s.id];
    if (v === undefined) continue;
    if (typeof v !== "number" || !Number.isFinite(v) || v < 0 || v > 100) return { ok: false, error: "Ajuste do corpo fora da faixa permitida." };
    body[s.id] = Math.round(v);
  }
  const eqIn = (o.equipped ?? {}) as Record<string, unknown>;
  const byId = new Map(items.map((i) => [i.id, i]));
  const equipped: Partial<Record<Slot, string>> = {};
  for (const [slot, id] of Object.entries(eqIn)) {
    if (!(SLOTS as readonly string[]).includes(slot)) return { ok: false, error: "Peça inválida." };
    if (id === null || id === undefined || id === "") continue;
    const it = typeof id === "string" ? byId.get(id) : undefined;
    if (!it || it.slot !== slot) return { ok: false, error: "Peça inexistente no guarda-roupa." };
    if (!fits(it, gender)) return { ok: false, error: `“${it.name}” não está disponível para este avatar.` };
    if (!isUnlocked(it, progress)) return { ok: false, error: `“${it.name}” ainda está bloqueado (nível ${it.minLevel}${it.minXp ? ` e ${it.minXp} XP` : ""}).` };
    equipped[slot as Slot] = it.id;
  }
  if (gender === "f" && equipped.barba) return { ok: false, error: "Barba não está disponível para o avatar feminino." };
  for (const slot of SLOTS) {
    if (OPTIONAL_SLOTS.has(slot) || equipped[slot]) continue;
    const fallback = defaultAvatar(gender, items).equipped[slot];
    if (fallback) equipped[slot] = fallback;
  }
  if (equipped.uniforme) for (const s of UNIFORM_REPLACES) if (OPTIONAL_SLOTS.has(s)) delete equipped[s];
  return { ok: true, config: { gender, skin, hairColor, face: face as Face, body, equipped } };
}
