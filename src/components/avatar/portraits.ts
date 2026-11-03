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
  /** Cenário do layout (o personagem é desenhado por cima, no mesmo lugar da arte original). */
  backdrop?: { src: string; w: number; h: number; figure: { x: number; y: number; w: number; h: number } };
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
    backdrop: { src: "/avatar/ui/palco-fundo.webp", w: 562, h: 840, figure: { x: 147, y: 3, w: 289, h: 792 } },
    eyes: [
      { x0: 0.3893, y0: 0.0764, x1: 0.4464, y1: 0.0865 },
      { x0: 0.4862, y0: 0.0764, x1: 0.5433, y1: 0.0865 },
    ],
  },
};
