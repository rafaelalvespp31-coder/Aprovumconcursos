/**
 * Lógica pura (sem DOM) da esfera de pontos do Mentor: suavização do áudio, histórico de volume que
 * viaja pelos anéis (a sílaba "anda" pela esfera) e deformação do raio. Separada do canvas para testar.
 */

export const TAU = Math.PI * 2;
export const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));

/** Aproxima `cur` de `target`: sobe rápido (acompanha a sílaba) e desce devagar (some sem tranco). Independe do FPS. */
export function follow(cur: number, target: number, dt: number, up = 16, down = 3.4): number {
  const k = 1 - Math.exp(-(target > cur ? up : down) * dt);
  return cur + (target - cur) * k;
}

/** Histórico circular do volume, uma amostra a cada 1/60 s. `at(d)` devolve o valor de d amostras atrás. */
export class Historia {
  private buf: Float32Array;
  private i = 0;
  constructor(n = 96) {
    this.buf = new Float32Array(n);
  }
  push(v: number) {
    this.i = (this.i + 1) % this.buf.length;
    this.buf[this.i] = v;
  }
  at(d: number): number {
    const n = this.buf.length;
    const x = clamp(d, 0, n - 2);
    const a = Math.floor(x);
    const f = x - a;
    const v0 = this.buf[(this.i - a + n * 2) % n]!;
    const v1 = this.buf[(this.i - a - 1 + n * 2) % n]!;
    return v0 + (v1 - v0) * f;
  }
}

/**
 * Energia do anel `i` de `n`: o equador lê o volume de agora e os anéis mais distantes leem o de instantes
 * atrás, então cada sílaba nasce no meio e corre até os polos.
 */
export function ringAmp(h: Historia, i: number, n: number, spread = 2.4): number {
  const mid = (n - 1) / 2;
  return h.at(Math.abs(i - mid) * spread);
}

export type Forma = {
  /** número de ondas ao longo da latitude (sobe com as frequências médias) */ k: number;
  /** fase da onda */ ph: number;
  /** tempo em s */ t: number;
  /** grave suavizado 0..1 */ low: number;
  /** agudo suavizado 0..1 */ high: number;
};

/** Raio relativo de um ponto (1 = esfera perfeita): formato de vaso/ampulheta que a voz esculpe. */
export function radiusAt(phi: number, theta: number, ringI: number, amp: number, f: Forma): number {
  const wave = Math.sin(phi * f.k + f.ph);
  const breath = 0.035 * Math.sin(f.t * 1.1 + phi * 3) + 0.05 * f.low;
  const lean = 1 + 0.07 * amp * Math.sin(theta * 2 + phi * 2.3 + f.t * 1.4);
  const sparkle = 1 + 0.05 * f.high * Math.sin(theta * 7 - f.t * 8 + ringI);
  return clamp((1 + 0.42 * amp * wave + breath) * lean * sparkle, 0.42, 1.25);
}

/** Posição (em px, relativa ao centro) e profundidade de um ponto depois de girar e projetar. */
export function projetar(x0: number, y0: number, z0: number, yaw: number, tilt: number, roll: number, R: number) {
  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);
  const x1 = x0 * cy + z0 * sy;
  const z1 = -x0 * sy + z0 * cy;
  const ct = Math.cos(tilt);
  const st = Math.sin(tilt);
  const y2 = y0 * ct - z1 * st;
  const z2 = y0 * st + z1 * ct;
  const cr = Math.cos(roll);
  const sr = Math.sin(roll);
  const x3 = x1 * cr - y2 * sr;
  const y3 = x1 * sr + y2 * cr;
  const persp = 1 / Math.max(0.35, 1 - z2 * 0.14);
  return { x: x3 * R * persp, y: y3 * R * persp, z: z2, persp };
}
