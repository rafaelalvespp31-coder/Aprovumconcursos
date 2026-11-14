"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

const KEY = "na:dica-ferramentas:v1";

/**
 * Mãozinha flutuante que aponta para a barra de ferramentas (marcar trecho, post-it, tirar dúvida…).
 * Aparece uma vez ao abrir a aula; tocar nela (ou no X) dispensa e não volta mais neste aparelho.
 * Acompanha a barra ao rolar e nunca bloqueia o estudo (só a mão e o balão recebem toque).
 */
export function ToolsHint({ barRef }: { barRef: React.RefObject<HTMLElement | null> }) {
  const [on, setOn] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const raf = useRef(0);

  useEffect(() => {
    let seen = false;
    try { seen = localStorage.getItem(KEY) === "1"; } catch { /* sem storage: mostra */ }
    if (seen) return;
    const t = setTimeout(() => setOn(true), 1400);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!on) return;
    const place = () => {
      const bar = barRef.current;
      const r = bar?.getBoundingClientRect();
      const vh = window.innerHeight;
      const vw = window.innerWidth;
      const top = r ? Math.min(Math.max(r.bottom + 4, 70), vh - 230) : 120;
      const x = r ? Math.min(Math.max(r.left + r.width * 0.5, 60), vw - 60) : vw / 2;
      setPos({ x, y: top });
    };
    const sched = () => { cancelAnimationFrame(raf.current); raf.current = requestAnimationFrame(place); };
    place();
    window.addEventListener("scroll", sched, { passive: true });
    window.addEventListener("resize", sched);
    // Usou a barra (qualquer toque nela): a dica cumpriu o papel.
    const bar = barRef.current;
    const used = () => dismiss();
    bar?.addEventListener("click", used);
    const auto = setTimeout(() => dismiss(false), 25000);
    return () => {
      cancelAnimationFrame(raf.current);
      window.removeEventListener("scroll", sched);
      window.removeEventListener("resize", sched);
      bar?.removeEventListener("click", used);
      clearTimeout(auto);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [on]);

  function dismiss(remember = true) {
    setOn(false);
    if (remember) { try { localStorage.setItem(KEY, "1"); } catch { /* ok */ } }
  }

  if (!on || !pos || typeof document === "undefined") return null;
  return createPortal(
    <div className="th-wrap" style={{ left: pos.x, top: pos.y }} data-st data-testid="tools-hint" role="status">
      <button type="button" className="th-mao" onClick={() => dismiss()} aria-label="Entendi: fechar a dica das ferramentas">
        <span className="th-anel" aria-hidden />
        <span className="th-emoji" aria-hidden>👆</span>
      </button>
      <div className="th-balao">
        <button type="button" className="th-x" onClick={() => dismiss()} aria-label="Fechar dica"><X size={14} /></button>
        <strong>Novas ferramentas de estudo!</strong>
        <span>Selecione um trecho e use <b>Post-it</b>, <b>Tirar dúvida</b> e <b>Gerar revisão</b> aqui na barra.</span>
      </div>
    </div>,
    document.body,
  );
}
