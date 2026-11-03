/**
 * Personagens em arte 2D (enquanto os modelos 3D não chegam): o masculino é o personagem
 * oficial do layout APROVUM, recortado do fundo. Pontos de referência em coordenadas da imagem
 * (0–1, origem no topo) para animar respiração, cabeça e piscadas.
 */
export interface Portrait {
  src: string;
  lids: string;
  aspect: number;
  centerX: number;
  neckY: number;
  shoulderY: number;
  chestY: number;
  waistY: number;
  eyes: Array<{ x0: number; y0: number; x1: number; y1: number }>;
}

export const PORTRAITS: Partial<Record<"m" | "f", Portrait>> = {
  m: {
    src: "/avatar/masculino.webp",
    lids: "/avatar/masculino-palpebras.png",
    aspect: 578 / 1584,
    centerX: 0.4671,
    neckY: 0.1477,
    shoulderY: 0.1856,
    chestY: 0.2778,
    waistY: 0.4697,
    eyes: [
      { x0: 0.3893, y0: 0.0764, x1: 0.4464, y1: 0.0865 },
      { x0: 0.4862, y0: 0.0764, x1: 0.5433, y1: 0.0865 },
    ],
  },
};
