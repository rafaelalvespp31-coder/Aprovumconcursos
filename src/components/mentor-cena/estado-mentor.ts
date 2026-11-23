import type { FaseMentor } from "@/components/missao/falar-mentor";

/** Quanto cada efeito da cena responde ao estado do Mentor (1 = repouso). */
export interface AlvoCena {
  /** ganho de brilho da esfera */
  brilho: number;
  /** velocidade das partículas internas */
  rapidez: number;
  /** partículas internas em espiral (0 a 1) */
  espiral: number;
  /** força da pulsação do anel */
  pulso: number;
  /** frequência das faíscas e descargas */
  faiscas: number;
  /** luz da esfera sobre as brasas, a fumaça e a mão */
  luz: number;
  /** ondas de energia saindo da esfera */
  ondas: number;
  /** velocidade das brasas */
  brasas: number;
}

export const REPOUSO: AlvoCena = { brilho: 1, rapidez: 1, espiral: 0, pulso: 0.35, faiscas: 1, luz: 1, ondas: 0, brasas: 1 };

const ALVOS: Record<FaseMentor, AlvoCena> = {
  repouso: REPOUSO,
  escutando: { brilho: 1.35, rapidez: 1.7, espiral: 0.15, pulso: 0.6, faiscas: 1.5, luz: 1.7, ondas: 0.85, brasas: 1.5 },
  processando: { brilho: 1.3, rapidez: 2.1, espiral: 1, pulso: 1, faiscas: 3.2, luz: 1.5, ondas: 0.3, brasas: 1.3 },
  respondendo: { brilho: 1.2, rapidez: 1.4, espiral: 0, pulso: 0.7, faiscas: 1.6, luz: 1.4, ondas: 0.4, brasas: 1.2 },
  erro: { brilho: 0.45, rapidez: 0.35, espiral: 0, pulso: 0.1, faiscas: 0.3, luz: 0.6, ondas: 0, brasas: 0.7 },
};

/** Alvo da cena para a fase real da conversa. Em "respondendo" o áudio (0 a 1) acentua brilho, pulso e faíscas. */
export function alvoDaFase(fase: FaseMentor, audio = 0): AlvoCena {
  const base = ALVOS[fase] ?? REPOUSO;
  if (fase !== "respondendo" && fase !== "escutando") return base;
  const a = Math.min(1, Math.max(0, audio));
  return { ...base, brilho: base.brilho + a * 0.7, pulso: Math.min(1.4, base.pulso + a * 0.8), faiscas: base.faiscas + a * 2.2, ondas: base.ondas + a * 0.6, rapidez: base.rapidez + a * 0.5 };
}

/** Aproxima `atual` de `alvo` aos poucos (a volta ao repouso é gradual). `taxa` é a velocidade por segundo. */
export function suavizar(atual: AlvoCena, alvo: AlvoCena, dt: number, taxa = 2.2): AlvoCena {
  const k = 1 - Math.exp(-Math.max(0, dt) * taxa);
  const r = { ...atual };
  for (const c of Object.keys(alvo) as (keyof AlvoCena)[]) r[c] = atual[c] + (alvo[c] - atual[c]) * k;
  return r;
}
