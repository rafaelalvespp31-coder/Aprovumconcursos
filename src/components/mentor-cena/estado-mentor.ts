import type { FaseMentor } from "@/components/missao/falar-mentor";

/** Quanto cada efeito da cena responde ao estado do Mentor (1 = repouso). Tudo é gradual: nada pisca nem é emitido pela esfera. */
export interface AlvoCena {
  /** ganho de brilho da esfera */
  brilho: number;
  /** velocidade das partículas internas */
  rapidez: number;
  /** partículas internas em espiral (0 a 1) */
  espiral: number;
  /** quanto a esfera respira (pulsação lenta do anel) */
  pulso: number;
  /** frequência das faíscas do ambiente */
  faiscas: number;
  /** luz da esfera sobre as brasas, a fumaça e a mão */
  luz: number;
  /** velocidade das brasas */
  brasas: number;
}

export const REPOUSO: AlvoCena = { brilho: 1, rapidez: 1, espiral: 0, pulso: 0.35, faiscas: 1, luz: 1, brasas: 1 };

const ALVOS: Record<FaseMentor, AlvoCena> = {
  repouso: REPOUSO,
  escutando: { brilho: 1.12, rapidez: 1.25, espiral: 0, pulso: 0.4, faiscas: 1, luz: 1.2, brasas: 1.15 },
  processando: { brilho: 1.15, rapidez: 1.6, espiral: 0.8, pulso: 0.55, faiscas: 1.5, luz: 1.25, brasas: 1.15 },
  respondendo: { brilho: 1.05, rapidez: 1.15, espiral: 0, pulso: 0.4, faiscas: 1, luz: 1.1, brasas: 1.05 },
  erro: { brilho: 0.5, rapidez: 0.4, espiral: 0, pulso: 0.1, faiscas: 0.4, luz: 0.6, brasas: 0.75 },
};

/** Alvo da cena para a fase real da conversa. Ao falar ou escutar, o áudio (0 a 1, já suavizado) só aumenta de leve brilho, luz e velocidade. */
export function alvoDaFase(fase: FaseMentor, audio = 0): AlvoCena {
  const base = ALVOS[fase] ?? REPOUSO;
  if (fase !== "respondendo" && fase !== "escutando") return base;
  const a = Math.min(1, Math.max(0, audio));
  return { ...base, brilho: base.brilho + a * 0.3, luz: base.luz + a * 0.35, rapidez: base.rapidez + a * 0.3, pulso: base.pulso + a * 0.3 };
}

/** Aproxima `atual` de `alvo` aos poucos (a volta ao repouso é gradual). `taxa` é a velocidade por segundo. */
export function suavizar(atual: AlvoCena, alvo: AlvoCena, dt: number, taxa = 2.2): AlvoCena {
  const k = 1 - Math.exp(-Math.max(0, dt) * taxa);
  const r = { ...atual };
  for (const c of Object.keys(alvo) as (keyof AlvoCena)[]) r[c] = atual[c] + (alvo[c] - atual[c]) * k;
  return r;
}

/** Envelope do áudio para a esfera: sobe e desce devagar, sem picos (sobe em ~0,15 s e solta em ~0,4 s). */
export function suavizarAudio(atual: number, alvo: number, dt: number): number {
  const taxa = alvo > atual ? 7 : 2.6;
  return atual + (alvo - atual) * (1 - Math.exp(-Math.max(0, dt) * taxa));
}
