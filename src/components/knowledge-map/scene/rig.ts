/**
 * Estado da câmera, compartilhado entre a cena 3D e a HUD sem re-renderizar o React:
 * a HUD muda os alvos (zoom, foco, giro) e a cena interpola até eles a cada quadro.
 */
export const LIMITS = { distMin: 12, distMax: 110, pitchMin: 0.16, pitchMax: 0.92, yawMax: 0.9, focusRadius: 48 };
export const OVERVIEW = { focus: [0, -6] as [number, number], dist: 58, yaw: 0, pitch: 0.36 };

export const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

export class CameraRig {
  /** Ponto do chão para onde a câmera olha (x, z): alvo e valor atual. */
  focus: [number, number] = [...OVERVIEW.focus];
  focusNow: [number, number] = [OVERVIEW.focus[0], OVERVIEW.focus[1] + 26];
  /** Distância da câmera ao foco. */
  dist = OVERVIEW.dist;
  distNow = OVERVIEW.dist + 18;
  /** Giro (rad) em volta do foco; 0 = câmera ao sul olhando para o norte. */
  yaw = OVERVIEW.yaw;
  yawNow = OVERVIEW.yaw;
  /** Direção de referência do giro: o usuário gira até ±yawMax em volta dela. */
  baseYaw = 0;
  /** Inclinação (rad) acima do horizonte. */
  pitch = OVERVIEW.pitch;
  pitchNow = OVERVIEW.pitch - 0.1;
  /** Mouse normalizado (-1..1): leve movimento do olhar e do fuzil. */
  pointer: [number, number] = [0, 0];
  pointerNow: [number, number] = [0, 0];
  /** Arrastar: "girar" muda yaw/pitch; "mover" desloca o foco no chão. */
  dragMode: "girar" | "mover" = "girar";
  /** Movimento reduzido (prefers-reduced-motion): sem balanço e transições instantâneas. */
  reduced = false;
  /** Tela em pé (celular): visão geral mais alta e afastada para caber mais território. */
  portrait = false;
  /** Fuzil abaixado enquanto um território está em foco (deixa a vista livre). */
  lowered = false;

  setLowered(v: boolean) {
    this.lowered = v;
  }
  setPortrait(v: boolean) {
    if (this.portrait === v) return;
    this.portrait = v;
    if (this.baseYaw === 0 && this.focus[0] === OVERVIEW.focus[0] && this.focus[1] === OVERVIEW.focus[1]) this.overview();
  }

  setReduced(v: boolean) {
    this.reduced = v;
  }
  setPointer(x: number, y: number) {
    this.pointer = [clamp(x, -1, 1), clamp(y, -1, 1)];
  }
  setDragMode(m: "girar" | "mover") {
    this.dragMode = m;
  }

  /** Interpola os valores atuais até os alvos (chamado a cada quadro pela cena). */
  step(dtRaw: number) {
    const dt = Math.min(dtRaw, 0.05);
    const k = this.reduced ? 1 : 1 - Math.exp(-dt * 3.2);
    const kp = 1 - Math.exp(-dt * 4);
    this.focusNow[0] += (this.focus[0] - this.focusNow[0]) * k;
    this.focusNow[1] += (this.focus[1] - this.focusNow[1]) * k;
    this.distNow += (this.dist - this.distNow) * k;
    // Caminho mais curto no giro (sem dar a volta inteira).
    let dy = this.yaw - this.yawNow;
    while (dy > Math.PI) dy -= Math.PI * 2;
    while (dy < -Math.PI) dy += Math.PI * 2;
    this.yawNow += dy * k;
    this.pitchNow += (this.pitch - this.pitchNow) * k;
    this.pointerNow[0] += (this.pointer[0] - this.pointerNow[0]) * kp;
    this.pointerNow[1] += (this.pointer[1] - this.pointerNow[1]) * kp;
  }

  private clampFocus() {
    const [x, z] = this.focus;
    const r = Math.hypot(x, z);
    if (r > LIMITS.focusRadius) this.focus = [(x / r) * LIMITS.focusRadius, (z / r) * LIMITS.focusRadius];
  }
  zoom(factor: number) {
    this.dist = clamp(this.dist * factor, LIMITS.distMin, LIMITS.distMax);
  }
  rotate(dYaw: number, dPitch: number) {
    this.yaw = clamp(this.yaw + dYaw, this.baseYaw - LIMITS.yawMax, this.baseYaw + LIMITS.yawMax);
    this.pitch = clamp(this.pitch + dPitch, LIMITS.pitchMin, LIMITS.pitchMax);
  }
  /** Desloca o foco no plano do chão, relativo à direção da câmera. */
  pan(dx: number, dz: number) {
    const s = this.dist / 40;
    const c = Math.cos(this.yaw);
    const n = Math.sin(this.yaw);
    this.focus = [this.focus[0] + (dx * c + dz * n) * s, this.focus[1] + (-dx * n + dz * c) * s];
    this.clampFocus();
  }
  /** Seleção: a nova chamada substitui o alvo anterior (a transição em curso muda de rumo). */
  focusOn(pos: [number, number], dist: number, pitch = 0.42, yaw?: number) {
    this.focus = [pos[0], pos[1]];
    if (yaw !== undefined) {
      // Mantém o yaw contínuo (evita saltos de 2π) e passa a girar em volta da nova direção.
      let y = yaw;
      while (y - this.yaw > Math.PI) y -= Math.PI * 2;
      while (y - this.yaw < -Math.PI) y += Math.PI * 2;
      this.yaw = y;
      this.baseYaw = y;
    }
    this.dist = clamp(dist, LIMITS.distMin, LIMITS.distMax);
    // Visão mais de cima ao aproximar: nada do cenário esconde o território escolhido.
    this.pitch = clamp(Math.max(this.pitch, pitch), LIMITS.pitchMin, LIMITS.pitchMax);
    this.clampFocus();
  }
  center() {
    this.yaw = this.baseYaw;
    this.pitch = OVERVIEW.pitch;
  }
  overview() {
    this.focus = [...OVERVIEW.focus];
    this.dist = this.portrait ? 96 : OVERVIEW.dist;
    // Volta para o norte pelo caminho mais curto.
    let y = OVERVIEW.yaw;
    while (y - this.yaw > Math.PI) y -= Math.PI * 2;
    while (y - this.yaw < -Math.PI) y += Math.PI * 2;
    this.yaw = y;
    this.baseYaw = y;
    this.pitch = this.portrait ? 0.66 : OVERVIEW.pitch;
  }
}

/**
 * Direção da câmera para olhar um ponto do mapa com o núcleo ao fundo (o núcleo nunca fica
 * entre a câmera e o território escolhido). 0 = câmera ao sul.
 */
export function viewYawFor(pos: [number, number]): number {
  return Math.hypot(pos[0], pos[1]) < 6 ? 0 : Math.atan2(pos[0], pos[1]);
}
