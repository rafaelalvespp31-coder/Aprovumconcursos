/**
 * Respiração do soldado, marcada a partir do áudio `respiracao.m4a` (loop de 14,568 s):
 * cada ciclo tem uma inspiração longa e suave seguida de uma expiração curta e forte.
 * Os tempos vieram da análise do áudio (energia entre 1,8 e 6,5 kHz, onde o ar aparece).
 */
export const BREATH_LOOP = 14.568;

/** [início da inspiração, fim da inspiração, início da expiração, fim da expiração] em segundos. */
const CYCLES: Array<[number, number, number, number]> = [
  [0.82, 1.52, 1.84, 2.1],
  [2.72, 3.44, 3.7, 3.95],
  [4.6, 5.36, 5.66, 5.95],
  [6.5, 7.2, 7.38, 7.8],
  [8.3, 8.95, 9.22, 9.72],
  [10.22, 10.9, 11.0, 11.3],
  [12.1, 12.75, 12.84, 13.15],
];

type Ease = (x: number) => number;
const sine: Ease = (x) => 0.5 - 0.5 * Math.cos(Math.PI * x);
const inOutCubic: Ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2);
/** Inspiração: sobe macio até ~92% no fim do puxar o ar e termina de encher devagar (sem quinas). */
const inhale =
  (r: number): Ease =>
  (x) =>
    0.92 * inOutCubic(Math.min(1, x / r)) + 0.08 * sine(x);
/** Expiração: o ar sai de uma vez (≈80% no fim do sopro) e o peito assenta devagar. */
const exhale =
  (r: number): Ease =>
  (x) => {
    const k = Math.log2(1 / 0.2) / r;
    return (1 - 2 ** (-k * x)) / (1 - 2 ** -k);
  };

/** Quadros-chave do peito (0 = vazio, 1 = cheio) com a curva que leva até cada um. */
const KEYS: Array<{ t: number; v: number; e: Ease }> = [];
CYCLES.forEach(([a, b, c, d], i) => {
  const prevC = i ? CYCLES[i - 1]![2] : CYCLES[CYCLES.length - 1]![2] - BREATH_LOOP;
  const prevD = i ? CYCLES[i - 1]![3] : CYCLES[CYCLES.length - 1]![3] - BREATH_LOOP;
  KEYS.push({ t: a, v: 0.04, e: exhale((prevD - prevC) / (a - prevC)) }); // solta o ar e assenta
  KEYS.push({ t: c, v: 1, e: inhale((b - a) / (c - a)) }); // puxa o ar e segura um instante
  void d;
});
// Fecha o loop: do último ciclo até a primeira inspiração da próxima volta.
const FIRST = KEYS[0]!;
KEYS.push({ t: FIRST.t + BREATH_LOOP, v: FIRST.v, e: FIRST.e });
const EXHALES = CYCLES.map((c) => c[2]);

/** Tabela a 120 Hz (calculada uma vez): consulta barata a cada quadro. */
const HZ = 120;
const TABLE = (() => {
  const n = Math.ceil(BREATH_LOOP * HZ);
  const out = new Float32Array(n + 1);
  for (let i = 0; i <= n; i++) {
    let t = i / HZ;
    if (t < FIRST.t) t += BREATH_LOOP;
    let k = 1;
    while (k < KEYS.length - 1 && KEYS[k]!.t < t) k++;
    const p = KEYS[k - 1]!;
    const q = KEYS[k]!;
    const x = Math.min(1, Math.max(0, (t - p.t) / (q.t - p.t)));
    out[i] = p.v + (q.v - p.v) * q.e(x);
  }
  return out;
})();

export interface BreathPose {
  /** Peito: 0 (vazio) a 1 (cheio). */
  chest: number;
  /** Tranco da expiração: mola amortecida (positivo = para baixo), ~0 fora dela. */
  kick: number;
}

/** Pose da respiração no tempo `t` (s) do loop do áudio. */
export function breathAt(t: number): BreathPose {
  const u = ((t % BREATH_LOOP) + BREATH_LOOP) % BREATH_LOOP;
  const f = u * HZ;
  const i = Math.floor(f);
  const chest = TABLE[i]! + (TABLE[Math.min(i + 1, TABLE.length - 1)]! - TABLE[i]!) * (f - i);
  let kick = 0;
  for (const c of EXHALES) {
    let dt = u - c;
    if (dt < 0) dt += BREATH_LOOP;
    if (dt < 0.9) kick += Math.exp(-dt * 7.5) * Math.sin(dt * Math.PI * 2 * 2.6);
  }
  return { chest, kick };
}
