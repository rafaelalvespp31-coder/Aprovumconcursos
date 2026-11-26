import type { Bands } from "@/components/mentor/skull-orb-fx";

export interface AlvosVozRadio {
  /** raiz da barra: recebe --v (volume 0..1) e --b0..--b4 (energia por cartão, como um equalizador) */
  raiz: HTMLElement;
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
  const reduzido = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  // um canvas dentro de cada cartão (atrás do texto): a onda é uma só, contínua, e cada cartão mostra o seu pedaço
  const cards = Array.from(a.raiz.querySelectorAll<HTMLCanvasElement>("canvas.at-radio"));
  if (!cards.length) return () => {};
  type P = { cv: HTMLCanvasElement; ctx: CanvasRenderingContext2D; x0: number; w: number; h: number };
  const parts: P[] = [];
  for (const cv of cards) { const c = cv.getContext("2d"); if (c) parts.push({ cv, ctx: c, x0: 0, w: 0, h: 0 }); }
  let totalW = 0, dpr = 1;
  const ajustar = () => {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    const gr = (a.raiz.querySelector(".at-grade") as HTMLElement).getBoundingClientRect();
    totalW = gr.width;
    for (const p of parts) {
      const r = p.cv.getBoundingClientRect();
      p.x0 = r.left - gr.left; p.w = r.width; p.h = r.height;
      p.cv.width = Math.max(1, Math.round(r.width * dpr));
      p.cv.height = Math.max(1, Math.round(r.height * dpr));
      p.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
  };
  ajustar();
  const ro = new ResizeObserver(ajustar);
  ro.observe(a.raiz);

  // suavização: sobe rápido (ataque), desce devagar (soltura), para não "piscar"
  let vol = 0, low = 0, mid = 0, high = 0, picos = 0;
  const hist: { v: number; l: number; m: number; h: number }[] = [];
  let acum = 0, total = 0, last = 0, raf = 0, t0 = 0, vivo = true;
  const suave = (atual: number, alvo: number, dt: number) => atual + (alvo - atual) * (1 - Math.exp(-dt * (alvo > atual ? 24 : 7)));
  // ruído determinístico barato (sem Math.random por amostra: o traçado não "tremelica" sozinho)

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
    const n = Math.ceil(totalW / PASSO) + 2;
    while (acum >= 1 / HZ) {
      acum -= 1 / HZ;
      hist.push({ v: vol, l: low, m: mid, h: high });
      total++;
      if (hist.length > n) hist.shift();
    }

    // ---- desenho: a mesma onda atravessa os cartões, por dentro de cada um (o vão entre eles fica vazio) ----
    const fala = a.raiz.classList.contains("is-fala");
    const nTot = Math.ceil(totalW / PASSO) + 2;
    const k0 = nTot - hist.length;
    const amostra = (i: number) => {
      // média de 5 amostras vizinhas: traço suave, sem serrilhado
      let v = 0, l = 0, m = 0, hh = 0, c = 0;
      for (let d = -2; d <= 2; d++) { const q = hist[i + d - k0]; if (q) { v += q.v; l += q.l; m += q.m; hh += q.h; c++; } }
      return c ? { v: v / 5, l: l / 5, m: m / 5, h: hh / 5 } : null;
    };
    const sinalEm = (i: number, escala: number, fase: number) => {
      const smp = amostra(i);
      const ph = i + total + fase;
      const respira = Math.sin(ts / 900 + i * 0.03) * 0.05; // linha de rádio ligada, mesmo sem voz
      if (!smp) return respira;
      const sinal = smp.l * 0.95 * Math.sin(ph * 0.11 + smp.l * 1.6)
        + smp.m * 0.7 * Math.sin(ph * 0.29 + 1.1) * (0.65 + 0.35 * Math.sin(ph * 0.045))
        + smp.h * 0.4 * Math.sin(ph * 0.7 + 2.4);
      return respira + sinal * Math.min(1, smp.v * 1.6) * escala;
    };
    for (const p of parts) {
      const { ctx, w, h, x0 } = p;
      ctx.clearRect(0, 0, w, h);
      const cy = h * 0.46, maxA = h * 0.3;
      const passo = Math.max(PASSO, 2);
      const camada = (escala: number, fase: number, largura: number, cor: string, alfa: number, brilho: number, glow: string) => {
        ctx.beginPath();
        for (let x = 0; x <= w + 0.5; x += passo) {
          const i = Math.round((x0 + x) / PASSO);
          const y = cy + sinalEm(i, escala, fase) * maxA;
          if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.lineWidth = largura; ctx.lineJoin = "round"; ctx.lineCap = "round";
        ctx.strokeStyle = cor; ctx.globalAlpha = alfa; ctx.shadowColor = glow; ctx.shadowBlur = brilho;
        ctx.stroke();
      };
      const forte = Math.min(1, picos * 1.4);
      if (fala) {
        camada(1.25, 60, 7, "rgba(255,120,100,1)", 0.12 + forte * 0.12, 0, "transparent"); // halo largo e suave
        camada(0.6, 140, 1, "rgba(255,225,215,1)", 0.45, 6, "rgba(255,150,130,0.8)");     // fio de eco
        camada(1, 0, 2.2, "rgba(255,255,255,1)", 0.96, 10 + forte * 10, "rgba(255,140,120,0.95)"); // fio principal, quase branco
      } else {
        camada(1, 0, 1.6, "rgba(225,6,0,1)", 0.75, 6, "rgba(225,6,0,0.5)");
      }
      ctx.globalAlpha = 1; ctx.shadowBlur = 0;
    }
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);

  return () => {
    vivo = false;
    cancelAnimationFrame(raf);
    ro.disconnect();
    for (const p of parts) p.ctx.clearRect(0, 0, p.w, p.h);
    const s = a.raiz.style;
    s.removeProperty("--v");
    for (let i = 0; i < 5; i++) s.removeProperty(`--b${i}`);
    if (a.esfera) { a.esfera.style.transform = ""; a.esfera.style.filter = ""; }
    a.deslocamento?.setAttribute("scale", "0");
  };
}
