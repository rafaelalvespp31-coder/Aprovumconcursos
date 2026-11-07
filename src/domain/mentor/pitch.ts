/**
 * Tom (f0) da voz por autocorrelação normalizada, para a caveira acompanhar a entonação do Mentor.
 * Recebe um trecho curto do sinal (ex.: 1024 amostras) e devolve a frequência fundamental em Hz e o
 * quão "vozeado" o trecho é (0 a 1). Silêncio e ruído (sons surdos como "s" e "f") dão voiced baixo.
 */
export type Pitch = { f0: number; voiced: number };

const MIN_HZ = 70;
const MAX_HZ = 400;

export function detectPitch(x: ArrayLike<number>, sampleRate: number): Pitch {
  const n = x.length;
  let e0 = 0;
  for (let i = 0; i < n; i++) e0 += x[i]! * x[i]!;
  if (e0 / n < 1e-4) return { f0: 0, voiced: 0 }; // silêncio
  const minLag = Math.max(2, Math.floor(sampleRate / MAX_HZ));
  const maxLag = Math.min(n >> 1, Math.ceil(sampleRate / MIN_HZ));
  const st = n > 1500 ? 2 : 1; // janelas longas: amostra de 2 em 2 (metade do custo)
  const corr = new Float32Array(maxLag + 2);
  let best = 0;
  for (let lag = minLag; lag <= maxLag + 1 && lag < n; lag++) {
    let s = 0;
    let a = 0;
    let b = 0;
    for (let i = 0; i + lag < n; i += st) {
      const u = x[i]!;
      const v = x[i + lag]!;
      s += u * v;
      a += u * u;
      b += v * v;
    }
    const c = s / (Math.sqrt(a * b) || 1);
    corr[lag] = c;
    if (lag <= maxLag && c > best) best = c;
  }
  if (best < 0.5) return { f0: 0, voiced: Math.max(0, best) };
  // Primeiro pico forte (perto do máximo): evita pular para a oitava abaixo.
  let lag = 0;
  for (let l = minLag + 1; l <= maxLag; l++) {
    if (corr[l]! >= best * 0.9 && corr[l]! >= corr[l - 1]! && corr[l]! >= corr[l + 1]!) {
      lag = l;
      break;
    }
  }
  if (!lag) return { f0: 0, voiced: 0 };
  // Interpolação parabólica para afinar o pico.
  const y0 = corr[lag - 1]!;
  const y1 = corr[lag]!;
  const y2 = corr[lag + 1]!;
  const d = y0 - 2 * y1 + y2;
  const shift = d !== 0 ? (0.5 * (y0 - y2)) / d : 0;
  return { f0: sampleRate / (lag + shift), voiced: Math.min(1, best) };
}
