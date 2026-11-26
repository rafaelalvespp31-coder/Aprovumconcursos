import type { Bands } from "@/components/mentor/skull-orb-fx";

export interface AlvosVozRadio {
  /** raiz da barra: recebe --v (volume 0..1) e --b0..--b4 (energia por cartão, como um equalizador) */
  raiz: HTMLElement;
  /** osciloscópio que atravessa os cartões */
  canvas: HTMLCanvasElement;
  /** esfera do Mentor: escala, brilho e deformação seguem a voz */
  esfera: HTMLVideoElement | null;
  turbulencia: SVGFETurbulenceElement | null;
  deslocamento: SVGFEDisplacementMapElement | null;
  filtroId: string;
  level: { current: (() => Bands) | null };
}

const PASSO = 2; // px entre amostras do traçado
const HZ = 90; // amostras por segundo (velocidade com que a onda corre, igual em qualquer tela)

/**
 * Enquanto o Mentor conversa: lê a energia real do áudio (volume, graves, médios, agudos, quadro a quadro) e
 * (1) desenha um sinal de rádio/osciloscópio que corre pela barra, passando por cima e entre os cartões, a partir do
 * histórico de amostras do áudio; (2) faz a esfera pulsar e deformar com a voz; (3) publica a energia nas variáveis CSS
 * para os cartões acenderem em vermelho no ritmo de cada faixa de frequência. Devolve a função que desliga tudo.
 */
export function iniciarVozRadio(a: AlvosVozRadio): () => void {
  const ctx = a.canvas.getContext("2d");
  if (!ctx) return () => {};
  const reduzido = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  let w = 0, h = 0, dpr = 1;
  const ajustar = () => {
    const r = a.canvas.getBoundingClientRect();
    dpr = Math.min(2, window.devicePixelRatio || 1);
    w = r.width; h = r.height;
    a.canvas.width = Math.max(1, Math.round(w * dpr));
    a.canvas.height = Math.max(1, Math.round(h * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  ajustar();
  const ro = new ResizeObserver(ajustar);
  ro.observe(a.canvas);

  // suavização: sobe rápido (ataque), desce devagar (soltura), para não "piscar"
  let vol = 0, low = 0, mid = 0, high = 0, picos = 0;
  const hist: { v: number; l: number; m: number; h: number }[] = [];
  let acum = 0, total = 0, last = 0, raf = 0, t0 = 0, vivo = true;
  const suave = (atual: number, alvo: number, dt: number) => atual + (alvo - atual) * (1 - Math.exp(-dt * (alvo > atual ? 24 : 7)));
  // ruído determinístico barato (sem Math.random por amostra: o traçado não "tremelica" sozinho)
  const ruido = (n: number) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return (x - Math.floor(x)) * 2 - 1; };

  const frame = (ts: number) => {
    if (!vivo) return;
    if (!t0) t0 = ts;
    const dt = Math.min(0.05, (ts - (last || ts)) / 1000);
    last = ts;
    const b = a.level.current?.();
    const alvoV = b ? Math.min(1, Math.max(b.vol, b.me ?? 0) * 1.25) : 0;
    vol = suave(vol, alvoV, dt);
    low = suave(low, b ? Math.min(1, b.low * 1.2) : 0, dt);
    mid = suave(mid, b ? Math.min(1, b.mid * 1.2) : 0, dt);
    high = suave(high, b ? Math.min(1, b.high * 1.3) : 0, dt);
    picos = Math.max(vol, picos - dt * 1.6);

    // ---- variáveis CSS: volume e uma faixa de frequência por cartão (graves → agudos), como um equalizador ----
    const s = a.raiz.style;
    s.setProperty("--v", vol.toFixed(3));
    const faixas = [low, (low + mid) / 2, mid, (mid + high) / 2, high];
    faixas.forEach((f, i) => s.setProperty(`--b${i}`, Math.min(1, f * 0.6 + vol * 0.55).toFixed(3)));

    // ---- esfera: escala, brilho, saturação e deformação do fogo pelo volume e pelas faixas ----
    if (a.esfera && !reduzido) {
      const esc = 1 + vol * 0.2 + low * 0.1;
      a.esfera.style.transform = `scale(${esc.toFixed(3)})`;
      a.esfera.style.filter = `url(#${a.filtroId}) brightness(${(1 + vol * 0.85 + high * 0.25).toFixed(3)}) saturate(${(1 + vol * 0.7).toFixed(3)})`;
      const tt = (ts - t0) / 1000;
      a.turbulencia?.setAttribute("baseFrequency", `${(0.026 + 0.01 * Math.sin(tt * 1.7) + mid * 0.02).toFixed(4)} ${(0.03 + 0.01 * Math.cos(tt * 1.3) + high * 0.02).toFixed(4)}`);
      a.turbulencia?.setAttribute("seed", String(Math.floor(tt * (3 + high * 9)) % 40));
      a.deslocamento?.setAttribute("scale", (vol * 26 + low * 10).toFixed(2));
    }

    // ---- histórico do áudio: uma amostra por 1/HZ s (a onda corre da direita para a esquerda) ----
    acum += dt;
    const n = Math.ceil(w / PASSO) + 2;
    while (acum >= 1 / HZ) {
      acum -= 1 / HZ;
      hist.push({ v: vol, l: low, m: mid, h: high });
      total++;
      if (hist.length > n) hist.shift();
    }

    // ---- desenho ----
    ctx.clearRect(0, 0, w, h);
    const cy = h / 2;
    const maxA = h * 0.46;
    const tracado = (escala: number, fase: number, largura: number, cor: string, alfa: number, brilho: number) => {
      ctx.beginPath();
      const k0 = n - hist.length;
      for (let i = 0; i < n; i++) {
        const x = i * PASSO;
        const smp = hist[i - k0];
        const v = smp ? smp.v : 0, l = smp ? smp.l : 0, m = smp ? smp.m : 0, hh = smp ? smp.h : 0;
        const ph = (i - k0 + total) + fase;
        // sinal de rádio: três portadoras (grave larga, média, aguda fina) com modulação de amplitude pela voz + chiado
        const sinal = l * 0.9 * Math.sin(ph * 0.17 + l * 2.2) + m * 0.75 * Math.sin(ph * 0.46 + 1.1) * (0.6 + 0.4 * Math.sin(ph * 0.05)) + hh * 0.55 * Math.sin(ph * 1.15 + 2.4) + ruido(ph) * (0.05 + hh * 0.35);
        const env = Math.min(1, v * 1.5);
        const y = cy + sinal * env * maxA * escala + ruido(ph * 0.37) * 0.5;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.lineWidth = largura;
      ctx.lineJoin = "round";
      ctx.strokeStyle = cor;
      ctx.globalAlpha = alfa;
      ctx.shadowColor = "rgba(255,40,24,0.9)";
      ctx.shadowBlur = brilho;
      ctx.stroke();
    };
    const ativo = vol > 0.015 || picos > 0.02;
    // portadora parada (linha de rádio ligada, sem voz): linha fina com chiado
    ctx.globalAlpha = 1; ctx.shadowBlur = 0;
    if (!ativo) {
      ctx.beginPath();
      for (let i = 0; i < n; i++) { const y = cy + ruido(i + total) * 0.9; if (i === 0) ctx.moveTo(0, y); else ctx.lineTo(i * PASSO, y); }
      ctx.lineWidth = 1; ctx.strokeStyle = "rgba(120,0,0,0.55)"; ctx.stroke();
    } else {
      tracado(0.55, 37, 1, "#ffb4a8", 0.45, 6);          // eco fraco, fase deslocada
      tracado(1, 0, 4.2, "rgba(110,0,0,1)", 0.5, 0);     // contorno escuro (aparece sobre o cartão claro e o vermelho)
      tracado(1, 0, 2.2, "#ff2a1c", 1, 12);              // corpo vermelho com brilho
      tracado(1, 0, 1, "#fff4f0", 0.95, 4);              // núcleo quente
    }
    ctx.globalAlpha = 1; ctx.shadowBlur = 0;
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);

  return () => {
    vivo = false;
    cancelAnimationFrame(raf);
    ro.disconnect();
    ctx.clearRect(0, 0, w, h);
    const s = a.raiz.style;
    s.removeProperty("--v");
    for (let i = 0; i < 5; i++) s.removeProperty(`--b${i}`);
    if (a.esfera) { a.esfera.style.transform = ""; a.esfera.style.filter = ""; }
    a.deslocamento?.setAttribute("scale", "0");
  };
}
