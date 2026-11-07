/**
 * Lógica pura (sem DOM) da Skull Orb do Mentor: estados, alvos de energia por estado, suavização e
 * geração procedural dos raios que percorrem a caveira. Fica separada do canvas para poder ser testada.
 */

/** Energia do áudio (0 a 1): volume geral e três faixas de frequência. */
export type Bands = {
  vol: number;
  low: number;
  mid: number;
  high: number;
  /** Só a voz do Mentor e só o microfone do aluno (0 a 1), para a caveira distinguir falar de ouvir. */
  me?: number;
  mic?: number;
};
export const SILENCE: Bands = { vol: 0, low: 0, mid: 0, high: 0 };

export type SkullEstado = "idle" | "listening" | "thinking" | "speaking" | "high" | "error" | "disconnected";
export type Conexao = "off" | "connecting" | "live" | "error";

export type Pt = { x: number; y: number };
export type Bolt = { pts: Pt[]; branches: Pt[][]; born: number; life: number; width: number };

/** Gerador pseudoaleatório com semente (os testes precisam de raios reproduzíveis). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Qual estado visual vale agora. Ouvir e falar vêm do áudio real; pensar é o intervalo entre os dois. */
export function resolveEstado(i: { conn: Conexao; me: number; mic: number; peak: number; awaiting: boolean }): SkullEstado {
  if (i.conn === "error") return "error";
  if (i.conn === "off") return "disconnected";
  if (i.conn === "connecting") return "thinking";
  if (i.me > 0.06) return i.peak > 0.55 ? "high" : "speaking";
  if (i.mic > 0.06) return "listening";
  return i.awaiting ? "thinking" : "idle";
}

/** Valores-alvo (0 a 1, exceto onde dito) de cada estado; o desenho caminha até eles suavemente. */
export type Alvo = {
  /** energia geral da caveira */ energy: number;
  /** brilho base dos olhos */ eye: number;
  /** raios por segundo */ bolts: number;
  /** velocidade das partículas (1 = normal) */ speed: number;
  /** halo atrás do crânio */ halo: number;
  /** brilho dos anéis */ ring: number;
  /** oscilação de falha (só erro) */ glitch: number;
};
export const ALVOS: Record<SkullEstado, Alvo> = {
  idle: { energy: 0.4, eye: 0.3, bolts: 0.7, speed: 0.6, halo: 0.35, ring: 0.35, glitch: 0 },
  listening: { energy: 0.5, eye: 0.38, bolts: 1.2, speed: 0.8, halo: 0.45, ring: 0.5, glitch: 0 },
  thinking: { energy: 0.62, eye: 0.62, bolts: 2.6, speed: 1.25, halo: 0.55, ring: 0.8, glitch: 0 },
  speaking: { energy: 0.72, eye: 0.55, bolts: 3, speed: 1.1, halo: 0.65, ring: 0.7, glitch: 0 },
  high: { energy: 1, eye: 0.95, bolts: 8, speed: 2, halo: 1, ring: 1, glitch: 0 },
  error: { energy: 0.34, eye: 0.22, bolts: 0.9, speed: 0.5, halo: 0.25, ring: 0.3, glitch: 1 },
  disconnected: { energy: 0.18, eye: 0.14, bolts: 0.25, speed: 0.35, halo: 0.2, ring: 0.2, glitch: 0 },
};

/** Aproxima `cur` de `to` com tempo independente da taxa de quadros (sobe com `up`, desce com `down`, por quadro a 60 fps). */
export function ease(cur: number, to: number, up: number, down: number, f60: number): number {
  const rate = to > cur ? up : down;
  return cur + (to - cur) * (1 - Math.pow(1 - rate, f60));
}

/** Pontos de referência da caveira original (caveira.webp), de 0 a 1 na imagem. */
export const NODES = {
  crown: { x: 0.5, y: 0.2 },
  forehead: { x: 0.5, y: 0.29 },
  foreheadL: { x: 0.42, y: 0.26 },
  foreheadR: { x: 0.59, y: 0.26 },
  templeL: { x: 0.37, y: 0.33 },
  templeR: { x: 0.645, y: 0.33 },
  eyeL: { x: 0.4, y: 0.46 },
  eyeR: { x: 0.605, y: 0.46 },
  cheekL: { x: 0.35, y: 0.57 },
  cheekR: { x: 0.655, y: 0.57 },
  nose: { x: 0.5, y: 0.585 },
  teeth: { x: 0.5, y: 0.67 },
  jawL: { x: 0.42, y: 0.69 },
  jawR: { x: 0.585, y: 0.69 },
  outL: { x: 0.25, y: 0.45 },
  outR: { x: 0.76, y: 0.46 },
} as const satisfies Record<string, Pt>;
export type NodeId = keyof typeof NODES;

const FRONTAL: NodeId[] = ["crown", "forehead", "foreheadL", "foreheadR"];
const LATERAL: NodeId[] = ["templeL", "templeR", "cheekL", "cheekR"];
const OLHOS: NodeId[] = ["eyeL", "eyeR"];
const NASAL_MAXILAR: NodeId[] = ["nose", "teeth", "jawL", "jawR"];
const FORA: NodeId[] = ["outL", "outR"];
const ALL = [...FRONTAL, ...LATERAL, ...OLHOS, ...NASAL_MAXILAR] as NodeId[];

const pick = <T,>(r: () => number, list: readonly T[]): T => list[Math.floor(r() * list.length) % list.length]!;

/**
 * Escolhe de onde a descarga parte e para onde vai. Mais intensidade: saltos mais longos e mais
 * laterais saindo do crânio; menos: faíscas curtas entre regiões vizinhas.
 */
export function pickNodes(r: () => number, intensity: number): { a: NodeId; b: NodeId } {
  const k = r();
  if (k < 0.22) return { a: pick(r, OLHOS), b: pick(r, [...FRONTAL, ...LATERAL]) }; // olho -> testa/têmpora
  if (k < 0.3 + intensity * 0.3) return { a: pick(r, LATERAL), b: pick(r, intensity > 0.55 ? FORA : ALL) }; // laterais
  if (k < 0.6) return { a: pick(r, FRONTAL), b: pick(r, [...OLHOS, ...LATERAL]) };
  if (k < 0.8) return { a: pick(r, NASAL_MAXILAR), b: pick(r, [...NASAL_MAXILAR, ...OLHOS]) };
  const a = pick(r, ALL);
  let b = pick(r, ALL);
  if (b === a) b = pick(r, FRONTAL);
  return { a, b };
}

/** Relâmpago por deslocamento do ponto médio: `levels` níveis dão 2^levels + 1 pontos, com as pontas fixas. */
export function makeBolt(r: () => number, a: Pt, b: Pt, jitter: number, levels = 4): Pt[] {
  let pts: Pt[] = [a, b];
  let amp = jitter;
  for (let l = 0; l < levels; l++) {
    const next: Pt[] = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const p = pts[i]!;
      const q = pts[i + 1]!;
      const dx = q.x - p.x;
      const dy = q.y - p.y;
      const len = Math.hypot(dx, dy) || 1;
      const off = (r() * 2 - 1) * amp;
      next.push(p, { x: (p.x + q.x) / 2 - (dy / len) * off, y: (p.y + q.y) / 2 + (dx / len) * off });
    }
    next.push(pts[pts.length - 1]!);
    pts = next;
    amp *= 0.55;
  }
  return pts;
}

/** Descarga completa (tronco + 0 a 2 ramificações) entre dois pontos já em coordenadas do desenho. */
export function spawnBolt(r: () => number, a: Pt, b: Pt, now: number, intensity: number): Bolt {
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  const pts = makeBolt(r, a, b, len * (0.22 + 0.12 * r()), 4);
  const branches: Pt[][] = [];
  const n = r() < 0.35 + intensity * 0.4 ? 1 + (r() < intensity ? 1 : 0) : 0;
  for (let i = 0; i < n; i++) {
    const at = pts[2 + Math.floor(r() * (pts.length - 5))]!;
    const ang = Math.atan2(b.y - a.y, b.x - a.x) + (r() < 0.5 ? -1 : 1) * (0.5 + r() * 0.8);
    const l = len * (0.18 + r() * 0.22);
    branches.push(makeBolt(r, at, { x: at.x + Math.cos(ang) * l, y: at.y + Math.sin(ang) * l }, l * 0.3, 3));
  }
  return { pts, branches, born: now, life: 0.2 + r() * 0.28 + intensity * 0.12, width: 0.8 + r() * 0.9 + intensity * 0.7 };
}

/** Fase de um raio entre 0 e 1: a ponta corre pelo crânio no começo e a cauda some depois. */
export function boltSpan(age: number, life: number): { head: number; tail: number; alpha: number } {
  const t = Math.min(1, Math.max(0, age / life));
  return { head: Math.min(1, t / 0.35), tail: Math.max(0, (t - 0.45) / 0.55), alpha: Math.pow(1 - t, 1.4) };
}
