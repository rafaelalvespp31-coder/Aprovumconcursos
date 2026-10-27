import * as THREE from "three";

/**
 * Texturas geradas no próprio navegador (canvas): brilho, fumaça, janelas e letreiros.
 * Nada é baixado de fora — leve e funciona offline.
 */
const cache = new Map<string, THREE.Texture>();

function canvasTexture(key: string, w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void, srgb = true): THREE.Texture {
  const hit = cache.get(key);
  if (hit) return hit;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d")!);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  cache.set(key, t);
  return t;
}

/** Halo radial (brilho de luzes, núcleo, pulsos). */
export const glowTexture = () =>
  canvasTexture("glow", 128, 128, (g) => {
    const r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    r.addColorStop(0, "rgba(255,255,255,1)");
    r.addColorStop(0.18, "rgba(255,255,255,0.75)");
    r.addColorStop(0.45, "rgba(255,255,255,0.18)");
    r.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = r;
    g.fillRect(0, 0, 128, 128);
  });

/** Fumaça: manchas irregulares, macias nas bordas. */
export const smokeTexture = () =>
  canvasTexture("smoke", 256, 256, (g) => {
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 46; i++) {
      const x = 128 + (rnd() - 0.5) * 120;
      const y = 128 + (rnd() - 0.5) * 120;
      const rad = 30 + rnd() * 60;
      const r = g.createRadialGradient(x, y, 0, x, y, rad);
      const a = 0.06 + rnd() * 0.08;
      r.addColorStop(0, `rgba(255,255,255,${a})`);
      r.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = r;
      g.fillRect(0, 0, 256, 256);
    }
  });

/** Fogo: núcleo amarelo, borda laranja/vermelha. */
export const fireTexture = () =>
  canvasTexture("fire", 128, 128, (g) => {
    const r = g.createRadialGradient(64, 78, 2, 64, 64, 62);
    r.addColorStop(0, "rgba(255,240,180,1)");
    r.addColorStop(0.25, "rgba(255,150,40,0.9)");
    r.addColorStop(0.6, "rgba(220,40,10,0.35)");
    r.addColorStop(1, "rgba(120,0,0,0)");
    g.fillStyle = r;
    g.fillRect(0, 0, 128, 128);
  });

/** Janelas acesas de prédios (emissiva), com andares apagados aleatórios. */
export const windowsTexture = () =>
  canvasTexture("windows", 128, 256, (g) => {
    g.fillStyle = "#000";
    g.fillRect(0, 0, 128, 256);
    let seed = 11;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let y = 4; y < 256; y += 9) {
      const dark = rnd() < 0.35;
      for (let x = 4; x < 128; x += 8) {
        if (dark || rnd() < 0.45) continue;
        const warm = rnd();
        g.fillStyle = warm < 0.6 ? "rgba(255,170,90,0.9)" : warm < 0.85 ? "rgba(255,80,60,0.9)" : "rgba(200,220,255,0.8)";
        g.fillRect(x, y, 4, 4);
      }
    }
  });

/** Letreiro (texto) em textura transparente. */
export function labelTexture(text: string, color = "#ffffff", font = "700 64px 'Chakra Petch', 'Orbitron', sans-serif", w = 512, h = 96): THREE.Texture {
  return canvasTexture(`label:${text}:${color}:${font}`, w, h, (g) => {
    g.clearRect(0, 0, w, h);
    g.font = font;
    g.fillStyle = color;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.shadowColor = color;
    g.shadowBlur = 18;
    g.fillText(text, w / 2, h / 2);
  });
}

/** Grade tática do chão (linhas finas). */
export const gridTexture = () =>
  canvasTexture("grid", 256, 256, (g) => {
    g.clearRect(0, 0, 256, 256);
    g.strokeStyle = "rgba(255,255,255,0.55)";
    g.lineWidth = 2;
    g.strokeRect(0, 0, 256, 256);
    g.strokeStyle = "rgba(255,255,255,0.18)";
    g.lineWidth = 1;
    for (let i = 64; i < 256; i += 64) {
      g.beginPath();
      g.moveTo(i, 0);
      g.lineTo(i, 256);
      g.moveTo(0, i);
      g.lineTo(256, i);
      g.stroke();
    }
  });

/** Ruído determinístico (value noise) para o relevo. */
export function noise2(x: number, y: number): number {
  const h = (i: number, j: number) => {
    const s = Math.sin(i * 127.1 + j * 311.7) * 43758.5453;
    return s - Math.floor(s);
  };
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const a = h(xi, yi);
  const b = h(xi + 1, yi);
  const c = h(xi, yi + 1);
  const d = h(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

export function fbm(x: number, y: number, oct = 4): number {
  let s = 0;
  let amp = 0.5;
  let f = 1;
  for (let i = 0; i < oct; i++) {
    s += amp * noise2(x * f, y * f);
    f *= 2.03;
    amp *= 0.5;
  }
  return s;
}

/** Altura do terreno: plano perto do núcleo/territórios, colinas no meio, montanhas ao fundo. */
export function terrainHeight(x: number, z: number): number {
  const r = Math.hypot(x, z);
  const base = (fbm(x * 0.03, z * 0.03) - 0.5) * 2.2;
  if (r < 46) return base * 0.25 - 0.4;
  const t = Math.min(1, (r - 46) / 70);
  const hills = (fbm(x * 0.018 + 3, z * 0.018 - 7, 5) - 0.35) * 26 * t * t;
  const far = r > 120 ? Math.pow(Math.min(1, (r - 120) / 80), 1.4) * (fbm(x * 0.012, z * 0.012, 5) * 70) : 0;
  return base * 0.6 - 0.4 + Math.max(0, hills) + far;
}

export function disposeTextureCache() {
  for (const t of cache.values()) t.dispose();
  cache.clear();
}
