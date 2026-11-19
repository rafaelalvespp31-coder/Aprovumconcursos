"use client";

import { useEffect, useRef } from "react";

/**
 * Barra de rolagem própria (vermelho neon), sempre visível, para a tela que a contém (o pai mais próximo que rola).
 * Move o polegar direto no DOM (sem re-render do React) e responde na hora: arrastar rola junto e clicar no trilho
 * pula para o ponto clicado.
 */
export function BarraNeon() {
  const trilho = useRef<HTMLDivElement>(null);
  const polegar = useRef<HTMLDivElement>(null);
  const arrasto = useRef<{ dy: number } | null>(null);

  useEffect(() => {
    const t = trilho.current;
    const th = polegar.current;
    const el = t?.parentElement;
    if (!t || !th || !el) return;
    let raf = 0;
    const medir = () => {
      raf = 0;
      const { scrollHeight, clientHeight, scrollTop } = el;
      if (scrollHeight <= clientHeight + 1) {
        t.dataset.ativo = "false";
        return;
      }
      t.dataset.ativo = "true";
      const h = Math.max(64, (clientHeight * clientHeight) / scrollHeight);
      th.style.height = `${h}px`;
      th.style.transform = `translate3d(0,${(scrollTop / (scrollHeight - clientHeight)) * (clientHeight - h)}px,0)`;
    };
    const agendar = () => {
      if (!raf) raf = requestAnimationFrame(medir);
    };
    const ro = new ResizeObserver(agendar);
    ro.observe(el);
    Array.from(el.children).forEach((c) => ro.observe(c));
    const mo = new MutationObserver(agendar);
    mo.observe(el, { childList: true, subtree: true });
    el.addEventListener("scroll", medir, { passive: true });
    window.addEventListener("resize", agendar);
    agendar();
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      mo.disconnect();
      el.removeEventListener("scroll", medir);
      window.removeEventListener("resize", agendar);
    };
  }, []);

  /** Leva o centro do polegar até a posição do ponteiro e rola na hora. */
  const irPara = (clientY: number, dy: number) => {
    const t = trilho.current;
    const th = polegar.current;
    const el = t?.parentElement;
    if (!t || !th || !el) return;
    const h = th.offsetHeight;
    const livre = el.clientHeight - h;
    if (livre <= 0) return;
    const topo = Math.min(livre, Math.max(0, clientY - dy - t.getBoundingClientRect().top));
    el.scrollTo({ top: (topo / livre) * (el.scrollHeight - el.clientHeight), behavior: "instant" });
  };
  const baixar = (e: React.PointerEvent) => {
    const th = polegar.current;
    if (!th) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    const r = th.getBoundingClientRect();
    // Clicou no polegar: segura onde pegou. Clicou no trilho: o polegar pula para lá (pelo centro) e já segue o mouse.
    const dentro = e.target === th;
    arrasto.current = { dy: dentro ? e.clientY - r.top : r.height / 2 };
    if (!dentro) irPara(e.clientY, r.height / 2);
  };
  const mover = (e: React.PointerEvent) => {
    if (arrasto.current) irPara(e.clientY, arrasto.current.dy);
  };
  const soltar = () => (arrasto.current = null);

  return (
    <div ref={trilho} className="bn-trilho" data-ativo="false" onPointerDown={baixar} onPointerMove={mover} onPointerUp={soltar} onPointerCancel={soltar} aria-hidden>
      <div ref={polegar} className="bn-polegar" />
    </div>
  );
}
