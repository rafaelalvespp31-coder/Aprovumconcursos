/** Quantidade de efeitos por capacidade do aparelho. O motor reduz sozinho se os quadros demorarem. */
export interface Qualidade {
  nivel: "baixa" | "media" | "alta";
  /** limite da densidade de pixels do canvas */
  dpr: number;
  orbParticulas: number;
  orbitais: number;
  subida: number;
  brasasFundo: number;
  brasasMeio: number;
  brasasGrandes: number;
  faiscas: number;
  fumaca: boolean;
}

const NIVEIS: Record<Qualidade["nivel"], Qualidade> = {
  baixa: { nivel: "baixa", dpr: 1, orbParticulas: 800, orbitais: 90, subida: 20, brasasFundo: 70, brasasMeio: 40, brasasGrandes: 4, faiscas: 12, fumaca: true },
  media: { nivel: "media", dpr: 1.5, orbParticulas: 1600, orbitais: 160, subida: 36, brasasFundo: 150, brasasMeio: 80, brasasGrandes: 6, faiscas: 24, fumaca: true },
  alta: { nivel: "alta", dpr: 2, orbParticulas: 2600, orbitais: 240, subida: 56, brasasFundo: 260, brasasMeio: 140, brasasGrandes: 7, faiscas: 36, fumaca: true },
};

export interface Aparelho { memoria?: number; nucleos?: number; toqueGrosso: boolean; larguraTela: number }

/** Escolhe o nível inicial: celulares fracos começam em "baixa", celulares comuns em "média" e desktop em "alta". */
export function nivelInicial(a: Aparelho): Qualidade["nivel"] {
  if (a.toqueGrosso || a.larguraTela < 700) {
    if ((a.memoria !== undefined && a.memoria <= 3) || (a.nucleos !== undefined && a.nucleos <= 4)) return "baixa";
    return "media";
  }
  if ((a.memoria !== undefined && a.memoria <= 2) || (a.nucleos !== undefined && a.nucleos <= 2)) return "media";
  return "alta";
}

export function qualidadeDe(nivel: Qualidade["nivel"]): Qualidade { return { ...NIVEIS[nivel] }; }

export function nivelAbaixo(n: Qualidade["nivel"]): Qualidade["nivel"] | null { return n === "alta" ? "media" : n === "media" ? "baixa" : null; }

export function lerAparelho(): Aparelho {
  const nav = navigator as Navigator & { deviceMemory?: number };
  return {
    memoria: nav.deviceMemory,
    nucleos: nav.hardwareConcurrency,
    toqueGrosso: typeof matchMedia === "function" && matchMedia("(pointer: coarse)").matches,
    larguraTela: Math.min(screen.width, innerWidth),
  };
}
