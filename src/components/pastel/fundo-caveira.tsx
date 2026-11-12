"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/**
 * Fundo da APROVUM: o vídeo da caveira tática em tela cheia, atrás de um vidro fumê. O vídeo não
 * toca sozinho: a ROLAGEM é o controle. Ao descer, o soldado se transforma na caveira quadro a
 * quadro (sequência de 100 quadros num canvas, GSAP ScrollTrigger com scrub); ao subir, o vídeo
 * volta. A câmera se aproxima, a fumaça corre, as brasas sobem e o vidro desfoca junto. A
 * velocidade da rolagem inclina levemente a imagem, que assenta quando a tela para.
 */
const QUADROS = 100;
const INICIO = 0.4; // no topo da página o vídeo começa no soldado; o fim da rolagem é a caveira
const PX_TOTAL = 1800; // rolagem necessária para o vídeo chegar ao fim
const src = (i: number) => `/video/caveira/f${String(i + 1).padStart(3, "0")}.webp`;
export function FundoCaveira({ dark = false }: { dark?: boolean }) {
  const raiz = useRef<HTMLDivElement>(null);
  const path = usePathname();

  useEffect(() => {
    const el = raiz.current;
    if (!el) return;
    gsap.registerPlugin(ScrollTrigger);
    const q = <T extends HTMLElement>(s: string) => el.querySelector<T>(s)!;
    const tela = q<HTMLCanvasElement>(".fc-img");
    const ctx = tela.getContext("2d", { alpha: false })!;
    const quadros: (HTMLImageElement | undefined)[] = new Array(QUADROS);
    let atual = -1;
    let vivo = true;

    // Desenha o quadro (ou o mais próximo já carregado), preenchendo a tela como "cover".
    const desenhar = (idx: number) => {
      let k = idx;
      while (k >= 0 && !quadros[k]) k--;
      if (k < 0) {
        k = idx;
        while (k < QUADROS && !quadros[k]) k++;
      }
      const im = quadros[k];
      if (!im) return;
      const cw = tela.width, ch = tela.height;
      const r = Math.max(cw / im.naturalWidth, ch / im.naturalHeight);
      const w = im.naturalWidth * r, h = im.naturalHeight * r;
      ctx.drawImage(im, (cw - w) / 2, (ch - h) * 0.28, w, h);
      atual = idx;
    };
    const medir = () => {
      const d = Math.min(window.devicePixelRatio || 1, 1.5);
      tela.width = Math.round(window.innerWidth * d);
      tela.height = Math.round(window.innerHeight * d);
      if (atual >= 0) desenhar(atual);
    };
    medir();
    window.addEventListener("resize", medir);
    // Carrega primeiro o quadro do topo, depois o resto (do mais perto para o mais longe).
    const ini = Math.round(INICIO * (QUADROS - 1));
    const ordem = Array.from({ length: QUADROS }, (_, i) => i).sort((a, b) => Math.abs(a - ini) - Math.abs(b - ini));
    const carregar = (n: number) => {
      if (!vivo || n >= ordem.length) return;
      const i = ordem[n]!;
      const im = new Image();
      im.decoding = "async";
      im.onload = () => {
        quadros[i] = im;
        if (i === ini || i === atual) desenhar(atual < 0 ? ini : atual);
        carregar(n + 1);
      };
      im.onerror = () => carregar(n + 1);
      im.src = src(i);
    };
    carregar(0);
    const fumA = q(".fc-fumaca-a");
    const fumB = q(".fc-fumaca-b");
    const brasa = q(".fc-brasa");
    const brilho = q(".fc-brilho");
    const vidro = q(".fc-vidro");

    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      // O trecho de rolagem é, no máximo, PX_TOTAL; em páginas curtas usa a página inteira.
      const fim = () => Math.min(PX_TOTAL, Math.max(1, ScrollTrigger.maxScroll(window)));
      const video = { t: INICIO };
      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: { trigger: document.documentElement, start: 0, end: () => fim(), scrub: 0.7, invalidateOnRefresh: true },
      });
      tl.fromTo(video, { t: INICIO }, { t: 1, onUpdate: () => desenhar(Math.round(video.t * (QUADROS - 1))) }, 0)
        .fromTo(tela, { scale: 1.02, yPercent: 0 }, { scale: 1.12, yPercent: -3 }, 0)
        .fromTo(fumA, { xPercent: -10, yPercent: 8, opacity: 0.55 }, { xPercent: 16, yPercent: -14, opacity: 0.9 }, 0)
        .fromTo(fumB, { xPercent: 12, yPercent: -6, opacity: 0.85 }, { xPercent: -18, yPercent: 12, opacity: 0.5 }, 0)
        .fromTo(brasa, { yPercent: 10 }, { yPercent: -38 }, 0)
        .fromTo(brilho, { opacity: 0.5, scale: 0.9 }, { opacity: 1, scale: 1.15 }, 0)
        .fromTo(vidro, { "--fc-blur": "1px" }, { "--fc-blur": "4px" }, 0);

      // Velocidade da rolagem: a caveira inclina para o lado em que a tela anda e assenta ao parar.
      const girar = gsap.quickTo(tela, "rotation", { duration: 0.6, ease: "power3.out" });
      const st = ScrollTrigger.create({
        start: 0,
        end: "max",
        onUpdate: (self) => girar(gsap.utils.clamp(-1.4, 1.4, self.getVelocity() / -900)),
      });
      const parar = gsap.delayedCall(0.12, () => girar(0)).pause();
      const onScroll = () => parar.restart(true);
      window.addEventListener("scroll", onScroll, { passive: true });

      // Respiração contínua da fumaça (independe da rolagem, só dá vida quando a tela está parada).
      gsap.to([fumA, fumB], { scale: 1.08, duration: 7, ease: "sine.inOut", yoyo: true, repeat: -1, stagger: 1.5 });
      gsap.to(brilho, { filter: "brightness(1.25)", duration: 2.4, ease: "sine.inOut", yoyo: true, repeat: -1 });

      return () => {
        window.removeEventListener("scroll", onScroll);
        st.kill();
        parar.kill();
      };
    });
    return () => {
      vivo = false;
      window.removeEventListener("resize", medir);
      mm.revert();
    };
  }, []);

  // A altura da página muda a cada rota: recalcula o trecho de rolagem.
  useEffect(() => {
    const t = setTimeout(() => ScrollTrigger.refresh(), 400);
    return () => clearTimeout(t);
  }, [path]);

  return (
    <div ref={raiz} className={`fc ${dark ? "fc-escuro" : ""}`} aria-hidden>
      <canvas className="fc-img" />
      <div className="fc-brilho" />
      <div className="fc-fumaca fc-fumaca-a" />
      <div className="fc-fumaca fc-fumaca-b" />
      <div className="fc-brasa" />
      <div className="fc-vidro" />
    </div>
  );
}
