"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/**
 * Fundo da APROVUM: a caveira tática em tela cheia, atrás de um vidro fumê. Tudo é coordenado
 * com a rolagem (GSAP ScrollTrigger com scrub): ao descer, a caveira se aproxima, a fumaça corre,
 * as brasas sobem e o vidro desfoca mais; ao subir, tudo volta na mesma ordem. A velocidade da
 * rolagem inclina levemente a imagem, que assenta de volta quando a tela para.
 */
export function FundoCaveira({ dark = false }: { dark?: boolean }) {
  const raiz = useRef<HTMLDivElement>(null);
  const path = usePathname();

  useEffect(() => {
    const el = raiz.current;
    if (!el) return;
    gsap.registerPlugin(ScrollTrigger);
    const q = <T extends HTMLElement>(s: string) => el.querySelector<T>(s)!;
    const img = q(".fc-img");
    const fumA = q(".fc-fumaca-a");
    const fumB = q(".fc-fumaca-b");
    const brasa = q(".fc-brasa");
    const brilho = q(".fc-brilho");
    const vidro = q(".fc-vidro");

    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: { trigger: document.documentElement, start: "top top", end: "bottom bottom", scrub: 0.9, invalidateOnRefresh: true },
      });
      tl.fromTo(img, { scale: 1.06, yPercent: 0 }, { scale: 1.34, yPercent: -7 }, 0)
        .fromTo(fumA, { xPercent: -10, yPercent: 8, opacity: 0.55 }, { xPercent: 16, yPercent: -14, opacity: 0.9 }, 0)
        .fromTo(fumB, { xPercent: 12, yPercent: -6, opacity: 0.85 }, { xPercent: -18, yPercent: 12, opacity: 0.5 }, 0)
        .fromTo(brasa, { yPercent: 10 }, { yPercent: -38 }, 0)
        .fromTo(brilho, { opacity: 0.5, scale: 0.9 }, { opacity: 1, scale: 1.15 }, 0)
        .fromTo(vidro, { "--fc-blur": "1.5px" }, { "--fc-blur": "8px" }, 0);

      // Velocidade da rolagem: a caveira inclina para o lado em que a tela anda e assenta ao parar.
      const girar = gsap.quickTo(img, "rotation", { duration: 0.6, ease: "power3.out" });
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
    return () => mm.revert();
  }, []);

  // A altura da página muda a cada rota: recalcula o trecho de rolagem.
  useEffect(() => {
    const t = setTimeout(() => ScrollTrigger.refresh(), 400);
    return () => clearTimeout(t);
  }, [path]);

  return (
    <div ref={raiz} className={`fc ${dark ? "fc-escuro" : ""}`} aria-hidden>
      <div className="fc-img" />
      <div className="fc-brilho" />
      <div className="fc-fumaca fc-fumaca-a" />
      <div className="fc-fumaca fc-fumaca-b" />
      <div className="fc-brasa" />
      <div className="fc-vidro" />
    </div>
  );
}
