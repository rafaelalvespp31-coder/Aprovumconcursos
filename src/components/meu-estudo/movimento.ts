"use client";

import { useEffect, useRef, useState } from "react";

const semMovimento = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Aparelho modesto: desliga os efeitos secundários (partículas, parallax), mantendo o visual. */
export function aparelhoLeve(): boolean {
  if (typeof navigator === "undefined") return false;
  const n = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  return (n.deviceMemory !== undefined && n.deviceMemory <= 2) || (n.hardwareConcurrency !== undefined && n.hardwareConcurrency <= 2) || !!n.connection?.saveData;
}

/** Número que sobe até o valor (uma vez, ~700 ms). Com menos movimento, mostra o valor direto. */
export function useContagem(valor: number, ms = 700): number {
  const [n, setN] = useState(valor);
  const de = useRef(0);
  useEffect(() => {
    if (semMovimento() || valor === de.current) return;
    const inicio = de.current;
    let raf = 0;
    let t0 = 0;
    const passo = (t: number) => {
      t0 ||= t;
      const k = Math.min(1, (t - t0) / ms);
      const e = 1 - Math.pow(1 - k, 3);
      setN(Math.round(inicio + (valor - inicio) * e));
      if (k < 1) raf = requestAnimationFrame(passo);
      else de.current = valor;
    };
    raf = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(raf);
  }, [valor, ms]);
  return n;
}

/**
 * Revela ao entrar na tela os elementos [data-rev] dentro de `raiz`. Só esconde o que está
 * fora da tela no momento da montagem: sem JS (ou com menos movimento) tudo fica visível.
 */
export function useRevelar(raiz: React.RefObject<HTMLElement | null>, chave: unknown) {
  useEffect(() => {
    const el = raiz.current;
    if (!el || semMovimento() || !("IntersectionObserver" in window)) return;
    const alvos = [...el.querySelectorAll<HTMLElement>("[data-rev]:not(.me-visto)")];
    const io = new IntersectionObserver(
      (entradas) => {
        for (const e of entradas) {
          if (!e.isIntersecting) continue;
          e.target.classList.add("me-visto");
          e.target.classList.remove("me-oculto");
          io.unobserve(e.target);
        }
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    const alturaTela = window.innerHeight;
    for (const a of alvos) {
      if (a.getBoundingClientRect().top > alturaTela * 0.92) a.classList.add("me-oculto");
      else a.classList.add("me-visto");
      io.observe(a);
    }
    return () => io.disconnect();
  }, [raiz, chave]);
}

/** Parallax discreto por ponteiro (só onde há mouse); escreve --px/--py no elemento. */
export function useParallax(ref: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el || semMovimento() || aparelhoLeve() || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    let raf = 0;
    const mover = (e: PointerEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        el.style.setProperty("--px", (((e.clientX - r.left) / r.width - 0.5) * 2).toFixed(3));
        el.style.setProperty("--py", (((e.clientY - r.top) / r.height - 0.5) * 2).toFixed(3));
      });
    };
    const sair = () => {
      cancelAnimationFrame(raf);
      el.style.setProperty("--px", "0");
      el.style.setProperty("--py", "0");
    };
    el.addEventListener("pointermove", mover, { passive: true });
    el.addEventListener("pointerleave", sair, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("pointermove", mover);
      el.removeEventListener("pointerleave", sair);
    };
  }, [ref]);
}

/** Troca de estado com View Transition quando o navegador oferece (senão, troca direta). */
export function comTransicao(troca: () => void, depois?: () => void) {
  const d = document as Document & { startViewTransition?: (cb: () => void) => { finished: Promise<void> } };
  if (!d.startViewTransition || semMovimento()) {
    troca();
    depois?.();
    return;
  }
  d.startViewTransition(troca).finished.then(() => depois?.(), () => depois?.());
}
