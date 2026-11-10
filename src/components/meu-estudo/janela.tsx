"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, X } from "lucide-react";
import { ICONES, PALETA } from "./base";

/** Janela (folha no celular, diálogo no desktop) com animação de entrada e de saída. */
export function Janela({ titulo, onClose, children, largo }: { titulo: string; onClose: () => void; children: (fechar: () => void) => React.ReactNode; largo?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [saindo, setSaindo] = useState(false);
  const fechar = useCallback(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return onClose();
    setSaindo(true);
    window.setTimeout(onClose, 190);
  }, [onClose]);
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && fechar();
    window.addEventListener("keydown", onKey);
    ref.current?.querySelector<HTMLElement>("input,button,select")?.focus();
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [fechar]);
  return (
    <div className={`me-fundo${saindo ? " me-saindo" : ""}`} onClick={(e) => e.target === e.currentTarget && fechar()}>
      <div ref={ref} className={`me-janela${largo ? " me-janela-larga" : ""}`} role="dialog" aria-modal="true" aria-label={titulo}>
        <div className="me-janela-topo">
          <h2>{titulo}</h2>
          <button type="button" onClick={fechar} aria-label="Fechar" className="me-x"><X size={18} aria-hidden /></button>
        </div>
        <div className="me-janela-corpo">{children(fechar)}</div>
      </div>
    </div>
  );
}

export function Cores({ valor, onChange }: { valor: string; onChange: (c: string) => void }) {
  return (
    <div className="me-cores" role="radiogroup" aria-label="Cor da pasta">
      {Object.entries(PALETA).map(([k, p]) => (
        <button key={k} type="button" role="radio" aria-checked={valor === k} aria-label={p.nome} title={p.nome} onClick={() => onChange(k)} className="me-cor" style={{ background: `linear-gradient(160deg,${p.light},${p.dark})` }}>
          {valor === k && <Check size={16} strokeWidth={3} aria-hidden />}
        </button>
      ))}
    </div>
  );
}

/** Escolha do ícone. `null` = automático pelo nome da pasta. */
export function Icones({ valor, onChange }: { valor: string | null; onChange: (i: string | null) => void }) {
  return (
    <div className="me-icones" role="radiogroup" aria-label="Ícone da pasta">
      <button type="button" role="radio" aria-checked={valor === null} onClick={() => onChange(null)} className="me-icone me-icone-auto">Auto</button>
      {Object.entries(ICONES).map(([k, { nome, G }]) => (
        <button key={k} type="button" role="radio" aria-checked={valor === k} aria-label={nome} title={nome} onClick={() => onChange(k)} className="me-icone">
          <G size={20} aria-hidden />
        </button>
      ))}
    </div>
  );
}
