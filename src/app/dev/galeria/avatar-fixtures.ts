import type { AvatarItem } from "@/domain/avatar/catalog";

/** Galeria: parte do catálogo inicial (o mesmo da migration), sem arquivos 3D. */
const it = (id: string, slot: AvatarItem["slot"], name: string, o: Partial<AvatarItem> = {}): AvatarItem => ({ id, slot, name, genders: ["m", "f"], minLevel: 1, minXp: 0, isDefault: false, previewUrl: null, modelUrl: null, meta: {}, sort: 0, ...o });
export const demoAvatarItems: AvatarItem[] = [
  it("base_masculino", "base", "Modelo masculino", { genders: ["m"], isDefault: true }),
  it("base_feminino", "base", "Modelo feminino", { genders: ["f"], isDefault: true }),
  it("cabelo_m_curto", "cabelo", "Curto clássico", { genders: ["m"], isDefault: true, sort: 1 }),
  it("cabelo_m_raspado", "cabelo", "Raspado", { genders: ["m"], sort: 2 }),
  it("cabelo_m_crespo", "cabelo", "Crespo", { genders: ["m"], sort: 3 }),
  it("cabelo_f_rabo", "cabelo", "Rabo de cavalo", { genders: ["f"], isDefault: true, sort: 1 }),
  it("cabelo_f_cacheado", "cabelo", "Cacheado", { genders: ["f"], sort: 2 }),
  it("barba_cheia", "barba", "Barba cheia", { genders: ["m"] }),
  it("camiseta_oficial", "camiseta", "Camiseta oficial APROVUM", { isDefault: true, sort: 1 }),
  it("camiseta_camuflada", "camiseta", "Camiseta camuflada APROVUM", { minLevel: 5, sort: 2 }),
  it("uniforme_policia_penal", "uniforme", "Inspirado na Polícia Penal", { minLevel: 10, sort: 1 }),
  it("uniforme_prf", "uniforme", "Inspirado na Polícia Rodoviária Federal", { minLevel: 20, minXp: 5000, sort: 2 }),
  it("moletom_aprovum", "jaqueta", "Moletom caveira APROVUM", { minLevel: 3 }),
  it("calca_tatica", "calca", "Calça tática preta", { isDefault: true }),
  it("bermuda_cargo", "calca", "Bermuda cargo"),
  it("coturno_tatico", "calcado", "Coturno tático", { isDefault: true }),
  it("tenis_aprovum", "calcado", "Tênis APROVUM vermelho", { minLevel: 6 }),
  it("bone_aprovum", "bone", "Boné caveira APROVUM", { minLevel: 3 }),
  it("oculos_taticos", "oculos", "Óculos táticos", { minLevel: 6 }),
  it("relogio_tatico", "acessorio", "Relógio tático"),
];
