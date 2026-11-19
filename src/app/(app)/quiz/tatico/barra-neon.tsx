"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Barra de rolagem própria (vermelho neon), sempre visível, para a tela que a contém (o pai mais próximo que rola).
 * A barra nativa depende do navegador/sistema (some sozinha, fica fina), por isso esta é desenhada e arrastável.
 */
export function BarraNeon() {
  const marca = useRef<HTMLDivElement>(null);
  const [m, setM] = useState({ top: 0, h: 0, ativo: false });
  const arrasto = useRef<{ y: number; scroll: number } | null>(null);

  useEffect(() => {
    const el = marca.current?.parentElement;
    if (!el) return;
    const medir = () => {
      const { scrollHeight, clientHeight, scrollTop } = el;
      if (scrollHeight <= clientHeight + 1) return setM((o) => (o.ativo ? { top: 0, h: 0, ativo: false } : o));
      const h = Math.max(64, (clientHeight * clientHeight) / scrollHeight);
      const top = (scrollTop / (scrollHeight - clientHeight)) * (clientHeight - h);
      setM({ top, h, ativo: true });
    };
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    Array.from(el.children).forEach((c) => ro.observe(c));
    const mo = new MutationObserver(medir);
    mo.observe(el, { childList: true, subtree: true });
    el.addEventListener("scroll", medir, { passive: true });
    window.addEventListener("resize", medir);
    return () => {
      ro.disconnect();
      mo.disconnect();
      el.removeEventListener("scroll", medir);
      window.removeEventListener("resize", medir);
    };
  }, []);

  const el = () => marca.current?.parentElement ?? null;
  const baixar = (e: React.PointerEvent) => {
    const p = el();
    if (!p) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    arrasto.current = { y: e.clientY, scroll: p.scrollTop };
  };
  const mover = (e: React.PointerEvent) => {
    const p = el();
    const a = arrasto.current;
    if (!p || !a) return;
    const livre = p.clientHeight - m.h;
    if (livre <= 0) return;
    p.scrollTop = a.scroll + ((e.clientY - a.y) / livre) * (p.scrollHeight - p.clientHeight);
  };
  const clicarTrilho = (e: React.MouseEvent) => {
    const p = el();
    if (!p || e.target !== e.currentTarget) return;
    p.scrollBy({ top: (e.clientY < m.top + m.h / 2 ? -1 : 1) * p.clientHeight * 0.85, behavior: "smooth" });
  };

  return (
    <div ref={marca} className="bn-trilho" data-ativo={m.ativo} onClick={clicarTrilho} aria-hidden>
      <div className="bn-polegar" style={{ height: m.h, transform: `translateY(${m.top}px)` }} onPointerDown={baixar} onPointerMove={mover} onPointerUp={() => (arrasto.current = null)} onPointerCancel={() => (arrasto.current = null)} />
    </div>
  );
}
