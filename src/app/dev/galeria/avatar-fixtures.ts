import type { AvatarItem } from "@/domain/avatar/catalog";

/** Galeria: o catálogo do layout (mesmas miniaturas da migration), sem arquivos 3D. */
const it = (id: string, slot: AvatarItem["slot"], name: string, o: Partial<AvatarItem> = {}): AvatarItem => ({ id, slot, name, genders: ["m", "f"], minLevel: 1, minXp: 0, isDefault: false, previewUrl: null, modelUrl: null, meta: {}, sort: 0, ...o });
const roupa = (id: string, slot: AvatarItem["slot"], name: string, n: number, o: Partial<AvatarItem> = {}) => it(id, slot, name, { previewUrl: `/avatar/ui/roupa-${id}.webp`, meta: { roupas: n }, ...o });
const rosto = (id: string, slot: AvatarItem["slot"], name: string, n: number, file: string, o: Partial<AvatarItem> = {}) => it(id, slot, name, { previewUrl: `/avatar/ui/${file}.webp`, meta: { grade: n }, ...o });
export const demoAvatarItems: AvatarItem[] = [
  it("base_masculino", "base", "Modelo masculino", { genders: ["m"], isDefault: true }),
  it("base_feminino", "base", "Modelo feminino", { genders: ["f"], isDefault: true }),
  roupa("camiseta_oficial", "camiseta", "Camiseta oficial APROVUM", 1, { isDefault: true }),
  roupa("camiseta_preta", "camiseta", "Camiseta preta básica", 2),
  roupa("uniforme_prf", "uniforme", "Inspirado na Polícia Rodoviária Federal", 3, { minLevel: 20 }),
  roupa("uniforme_policia_penal", "uniforme", "Inspirado na Polícia Penal", 4, { minLevel: 10 }),
  roupa("uniforme_tatico_aprovum", "uniforme", "Uniforme tático APROVUM", 5, { minLevel: 10 }),
  roupa("uniforme_social", "uniforme", "Traje social", 6, { minLevel: 5 }),
  roupa("moletom_aprovum", "jaqueta", "Moletom caveira APROVUM", 7, { minLevel: 3 }),
  roupa("polo_tatica", "camiseta", "Polo tática bege", 8, { minLevel: 5 }),
  roupa("jaqueta_camuflada", "jaqueta", "Jaqueta camuflada", 9, { minLevel: 12 }),
  roupa("jaqueta_aprovum", "jaqueta", "Jaqueta APROVUM", 10, { minLevel: 30, minXp: 5000 }),
  rosto("cabelo_m_curto", "cabelo", "Curto clássico", 1, "cabelo-cabelo_m_curto", { genders: ["m"], isDefault: true }),
  rosto("cabelo_m_degrade", "cabelo", "Degradê", 2, "cabelo-cabelo_m_degrade", { genders: ["m"] }),
  rosto("cabelo_m_cacheado", "cabelo", "Cacheado médio", 3, "cabelo-cabelo_m_cacheado", { genders: ["m"] }),
  rosto("cabelo_m_crespo", "cabelo", "Crespo", 4, "cabelo-cabelo_m_crespo", { genders: ["m"] }),
  rosto("cabelo_f_rabo", "cabelo", "Rabo de cavalo", 1, "cabelo-cabelo_f_rabo", { genders: ["f"], isDefault: true }),
  rosto("cabelo_f_liso_longo", "cabelo", "Liso longo", 2, "cabelo-cabelo_f_liso_longo", { genders: ["f"] }),
  rosto("cabelo_f_medio", "cabelo", "Médio ondulado", 3, "cabelo-cabelo_f_medio", { genders: ["f"] }),
  rosto("cabelo_f_cacheado", "cabelo", "Cacheado", 4, "cabelo-cabelo_f_cacheado", { genders: ["f"] }),
  rosto("barba_rala", "barba", "Barba rala", 2, "barba-barba_rala", { genders: ["m"] }),
  rosto("barba_cheia", "barba", "Barba cheia", 3, "barba-barba_cheia", { genders: ["m"] }),
  rosto("cavanhaque", "barba", "Barba lenhador", 4, "barba-cavanhaque", { genders: ["m"] }),
  rosto("bone_aprovum", "bone", "Boné caveira APROVUM", 1, "acessorio-bone_aprovum", { minLevel: 3 }),
  rosto("oculos_taticos", "oculos", "Óculos táticos", 2, "acessorio-oculos_taticos", { minLevel: 6 }),
  rosto("headset_tatico", "acessorio", "Abafador tático", 3, "acessorio-headset_tatico", { minLevel: 10 }),
  rosto("balaclava", "acessorio", "Balaclava", 4, "acessorio-balaclava", { minLevel: 15 }),
  it("calca_tatica", "calca", "Calça tática preta", { isDefault: true }),
  it("bermuda_cargo", "calca", "Bermuda cargo"),
  it("coturno_tatico", "calcado", "Coturno tático", { isDefault: true }),
  it("tenis_aprovum", "calcado", "Tênis APROVUM vermelho", { minLevel: 6 }),
];
