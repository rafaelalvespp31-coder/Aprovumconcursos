"use client";

let ctx: AudioContext | null = null;
let armed = false;

function getCtx(): AudioContext | null {
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx ??= new AC();
    return ctx;
  } catch {
    return null;
  }
}

/**
 * Navegadores (principalmente Safari/iPhone e Chrome) só liberam áudio depois de um toque/clique/tecla.
 * O contexto era criado dentro de um efeito (fora do gesto) e ficava mudo; aqui ele é criado e "destravado"
 * no primeiro gesto do aluno, bem antes do cronômetro chegar aos 10 segundos.
 */
export function armTickSound(): void {
  if (armed || typeof window === "undefined") return;
  armed = true;
  const unlock = () => {
    const c = getCtx();
    if (!c) return;
    const go = () => {
      try {
        const b = c.createBuffer(1, 1, 22050); // buffer mudo: garante a liberação no iOS
        const s = c.createBufferSource();
        s.buffer = b;
        s.connect(c.destination);
        s.start(0);
      } catch {
        /* segue */
      }
    };
    if (c.state === "suspended") void c.resume().then(go, () => {});
    else go();
    if (c.state === "running") ["pointerdown", "touchend", "click", "keydown"].forEach((e) => window.removeEventListener(e, unlock, true));
  };
  ["pointerdown", "touchend", "click", "keydown"].forEach((e) => window.addEventListener(e, unlock, true));
}

function beep(c: AudioContext, t: number, freq: number, dur: number, vol: number, type: OscillatorType = "square"): void {
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(vol, t + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(gain).connect(c.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

/**
 * Contagem final (sintetizada, sem arquivo): dos 10 aos 6 segundos faz "tic-tac" a cada segundo;
 * dos 5 aos 1 faz um bip agudo duplo, mais alto e urgente; em 0 toca um bipe longo.
 * Falha em silêncio.
 */
export function playCountdownBeep(sec: number): void {
  try {
    const c = getCtx();
    if (!c) return;
    const play = () => {
      const t = c.currentTime + 0.01;
      if (sec <= 0) beep(c, t, 440, 0.7, 0.5, "sawtooth");
      else if (sec <= 5) {
        beep(c, t, 1320, 0.09, 0.45);
        beep(c, t + 0.14, 1320, 0.09, 0.45);
      } else beep(c, t, sec % 2 === 0 ? 760 : 1080, 0.09, 0.4);
    };
    if (c.state === "suspended") void c.resume().then(play, () => {});
    else play();
  } catch {
    /* sem áudio: segue sem som */
  }
}

/** Compatibilidade: tic/tac simples. */
export function playTick(tac: boolean): void {
  playCountdownBeep(tac ? 8 : 7);
}
