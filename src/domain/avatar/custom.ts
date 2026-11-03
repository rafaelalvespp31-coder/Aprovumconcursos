import { z } from "zod";

/**
 * Avatar personalizado (arte pronta anexada pela equipe): pontos do corpo para a respiração,
 * caixas dos olhos para as piscadas e validação dos parâmetros que vão para o banco.
 * Coordenadas normalizadas (0–1, origem no topo esquerdo da arte recortada).
 */

export interface BodyLandmarks {
  centerX: number;
  neckY: number;
  shoulderY: number;
  chestY: number;
  waistY: number;
}

export const DEFAULT_LANDMARKS: BodyLandmarks = { centerX: 0.5, neckY: 0.15, shoulderY: 0.19, chestY: 0.27, waistY: 0.42 };

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

/**
 * A partir da silhueta (para cada linha: primeira e última coluna com pixel visível, ou -1),
 * acha pescoço (linha mais estreita entre 9% e 22% da altura), ombros (primeira linha abaixo
 * do pescoço com 85% da largura máxima do tronco), peito e cintura.
 */
export function landmarksFromSilhouette(left: readonly number[], right: readonly number[], width: number): BodyLandmarks {
  const H = left.length;
  if (H < 50 || width < 10) return DEFAULT_LANDMARKS;
  const w = left.map((l, i) => (l < 0 ? 0 : right[i]! - l + 1));
  const at = (f: number) => Math.round(f * (H - 1));
  const minRow = (a: number, b: number) => {
    let best = at(a), bw = Infinity;
    for (let y = at(a); y <= at(b); y++) if (w[y]! > 0 && w[y]! < bw) (bw = w[y]!), (best = y);
    return best;
  };
  const neck = minRow(0.09, 0.22);
  let torsoMax = 0;
  for (let y = neck; y <= at(0.36); y++) torsoMax = Math.max(torsoMax, w[y]!);
  let shoulder = at(0.19);
  for (let y = neck + 1; y <= at(0.36); y++) if (w[y]! >= 0.85 * torsoMax) { shoulder = y; break; }
  const neckY = clamp(neck / H, 0.08, 0.24);
  const shoulderY = clamp(shoulder / H, neckY + 0.015, 0.32);
  const chestY = clamp(shoulderY + 0.085, shoulderY + 0.04, 0.4);
  const waistY = clamp(minRow(Math.max(0.32, chestY + 0.06), 0.48) / H, chestY + 0.06, 0.52);
  const l = left[neck]!, r = right[neck]!;
  const centerX = l >= 0 ? clamp((l + r) / 2 / width, 0.2, 0.8) : 0.5;
  return { centerX, neckY, shoulderY, chestY, waistY };
}

export interface EyeBox { x0: number; y0: number; x1: number; y1: number }

/**
 * Caixas das pálpebras a partir do centro de cada olho (cliques da equipe), na proporção das
 * artes oficiais: largura ≈ 0,59 e altura ≈ 0,29 da distância entre os olhos.
 */
export function eyeBoxes(a: { x: number; y: number }, b: { x: number; y: number }, width: number, height: number): [EyeBox, EyeBox] {
  const [L, R] = a.x <= b.x ? [a, b] : [b, a];
  const d = Math.hypot((R.x - L.x) * width, (R.y - L.y) * height);
  const hw = (0.59 * d) / 2 / width;
  const hh = (0.29 * d) / 2 / height;
  const box = (p: { x: number; y: number }): EyeBox => ({ x0: clamp(p.x - hw, 0, 1), y0: clamp(p.y - hh, 0, 1), x1: clamp(p.x + hw, 0, 1), y1: clamp(p.y + hh, 0, 1) });
  return [box(L), box(R)];
}

const unit = z.number().min(0).max(1);
const eyeSchema = z.object({ x0: unit, y0: unit, x1: unit, y1: unit }).refine((e) => e.x1 > e.x0 && e.y1 > e.y0 && e.x1 - e.x0 < 0.4 && e.y1 - e.y0 < 0.1, "olho inválido");

export const customParamsSchema = z
  .object({
    aspect: z.number().min(0.12).max(1.2),
    centerX: unit,
    neckY: unit,
    shoulderY: unit,
    chestY: unit,
    waistY: unit,
    eyes: z.tuple([eyeSchema, eyeSchema]),
  })
  .refine((p) => p.neckY < p.shoulderY && p.shoulderY < p.chestY && p.chestY < p.waistY, "pontos do corpo fora de ordem")
  .refine((p) => p.eyes[0].y1 < p.neckY && p.eyes[1].y1 < p.neckY, "olhos abaixo do pescoço");

export type CustomParams = z.infer<typeof customParamsSchema>;
