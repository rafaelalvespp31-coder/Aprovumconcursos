/**
 * Som do soldado no mapa: respiração ofegante em loop e a fala quando ele mira numa matéria.
 * Só é baixado quando o aluno liga o som. Os volumes passam pelo Web Audio (no iPhone o
 * `volume` do <audio> é fixo), e a respiração abaixa enquanto ele fala.
 */
const BREATH = { src: "/audio/respiracao.m4a", gain: 0.55, duck: 0.15 };
const VOICE = { src: "/audio/voz-soldado.m4a", gain: 0.9 };
/** Depois de uma fala, espera um pouco antes de poder falar de novo (não vira repetição). */
const VOICE_REST_MS = 4000;

type Ctx = typeof AudioContext;

export class SoldierAudio {
  private ctx: AudioContext | null = null;
  private breath: HTMLAudioElement | null = null;
  private voice: HTMLAudioElement | null = null;
  private breathGain: GainNode | null = null;
  private restUntil = 0;
  private on = false;

  /** Chamado dentro do gesto do aluno (clique em "Som"): cria e toca a respiração. */
  start() {
    this.on = true;
    if (!this.breath) {
      const b = new Audio(BREATH.src);
      b.loop = true;
      b.preload = "auto";
      const v = new Audio(VOICE.src);
      v.preload = "auto";
      v.addEventListener("ended", () => this.voiceEnded());
      this.breath = b;
      this.voice = v;
      const AC: Ctx | undefined = window.AudioContext ?? (window as unknown as { webkitAudioContext?: Ctx }).webkitAudioContext;
      if (AC) {
        try {
          const ctx = new AC();
          const bg = ctx.createGain();
          bg.gain.value = BREATH.gain;
          ctx.createMediaElementSource(b).connect(bg).connect(ctx.destination);
          const vg = ctx.createGain();
          vg.gain.value = VOICE.gain;
          ctx.createMediaElementSource(v).connect(vg).connect(ctx.destination);
          this.ctx = ctx;
          this.breathGain = bg;
        } catch {
          // Sem Web Audio: usa o volume do próprio elemento.
          b.volume = BREATH.gain;
          v.volume = VOICE.gain;
        }
      } else {
        b.volume = BREATH.gain;
        v.volume = VOICE.gain;
      }
    }
    this.ctx?.resume().catch(() => undefined);
    this.breath.play().catch(() => undefined);
  }

  stop() {
    this.on = false;
    this.breath?.pause();
    this.voice?.pause();
    this.setBreath(BREATH.gain, 0);
  }

  /** Aba oculta: pausa tudo; ao voltar, retoma a respiração (se o som estava ligado). */
  hide() {
    this.breath?.pause();
    this.voice?.pause();
  }
  show() {
    if (this.on) this.breath?.play().catch(() => undefined);
  }

  /** O soldado mirou numa matéria: fala (se não estiver falando nem acabou de falar). */
  speak() {
    const v = this.voice;
    if (!this.on || !v || !v.paused || performance.now() < this.restUntil) return;
    v.currentTime = 0;
    this.setBreath(BREATH.duck, 0.25);
    v.play().catch(() => this.voiceEnded());
  }

  private voiceEnded() {
    this.restUntil = performance.now() + VOICE_REST_MS;
    this.setBreath(BREATH.gain, 0.8);
  }

  private setBreath(value: number, seconds: number) {
    const g = this.breathGain;
    const ctx = this.ctx;
    if (g && ctx) {
      const now = ctx.currentTime;
      g.gain.cancelScheduledValues(now);
      g.gain.setValueAtTime(g.gain.value, now);
      g.gain.linearRampToValueAtTime(value, now + seconds);
    } else if (this.breath) this.breath.volume = value;
  }

  /**
   * Tempo atual do loop da respiração (s), para a animação acompanhar o som quadro a quadro.
   * O `currentTime` do áudio anda aos saltos em alguns navegadores: usa o relógio da página
   * ancorado nele e só reancora quando se afasta (sem trancos). Som desligado: null.
   */
  breathTime(nowMs: number): number | null {
    const b = this.breath;
    if (!this.on || !b || b.paused || b.readyState < 2) {
      this.anchor = null;
      return null;
    }
    const ct = b.currentTime;
    const est = this.anchor ? this.anchor.ct + (nowMs - this.anchor.at) / 1000 : ct;
    const dur = b.duration || 0;
    // Diferença considerando a volta do loop (o áudio recomeça do zero).
    let diff = ct - est;
    if (dur) diff = ((((diff + dur / 2) % dur) + dur) % dur) - dur / 2;
    if (!this.anchor || Math.abs(diff) > 0.08) this.anchor = { ct, at: nowMs };
    const t = this.anchor.ct + (nowMs - this.anchor.at) / 1000;
    return dur ? t % dur : t;
  }
  private anchor: { ct: number; at: number } | null = null;

  dispose() {
    this.stop();
    this.ctx?.close().catch(() => undefined);
  }
}
