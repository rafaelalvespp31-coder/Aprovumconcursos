"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import "./caveira-popup.css";

interface Props {
  campaignId: string;
  days: number;
  markSeen: (campaignId: string) => Promise<void>;
}

const PARTICULAS = Array.from({ length: 14 }, (_, i) => ({
  left: `${(i * 37 + 8) % 96}%`,
  delay: `${((i * 0.43) % 4).toFixed(2)}s`,
  dur: `${(5 + (i % 5)).toFixed(1)}s`,
  size: 2 + (i % 3),
}));

/** Popup surpresa "O Caveira ficou maluco": aparece uma vez por concessão; o registro vai ao banco ao fechar. */
export function CaveiraPopup({ campaignId, days, markSeen }: Props) {
  const [open, setOpen] = useState(true);
  const [saindo, setSaindo] = useState(false);
  const registrado = useRef(false);
  const botao = useRef<HTMLButtonElement>(null);

  const fechar = () => {
    if (saindo) return;
    if (!registrado.current) {
      registrado.current = true;
      void markSeen(campaignId).catch(() => undefined);
    }
    setSaindo(true);
    window.setTimeout(() => setOpen(false), 280);
  };

  useEffect(() => {
    // Registra a exibição assim que aparece: fechar a aba também conta como visto.
    if (!registrado.current) {
      registrado.current = true;
      void markSeen(campaignId).catch(() => undefined);
    }
    botao.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") fechar();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!open) return null;
  const dd = String(days).padStart(2, "0");
  return (
    <div className={`cvp-fundo${saindo ? " cvp-saindo" : ""}`} role="dialog" aria-modal="true" aria-labelledby="cvp-titulo" onClick={(e) => e.target === e.currentTarget && fechar()}>
      <div className="cvp-cartao">
        <div className="cvp-luz" aria-hidden />
        <div className="cvp-particulas" aria-hidden>
          {PARTICULAS.map((p, i) => (
            <i key={i} style={{ left: p.left, width: p.size, height: p.size, animationDelay: p.delay, animationDuration: p.dur }} />
          ))}
        </div>
        <button type="button" className="cvp-x" onClick={fechar} aria-label="Fechar">
          <X size={18} aria-hidden />
        </button>
        <div className="cvp-caveira">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/mentor/caveira.webp" alt="" width={168} height={168} decoding="async" />
        </div>
        <h2 id="cvp-titulo" className="cvp-titulo">O CAVEIRA FICOU MALUCO! 💀</h2>
        <p className="cvp-chamada">VOCÊ GANHOU {days} DIAS!</p>
        <p className="cvp-msg">“O Caveira resolveu abrir o arsenal e liberar uma degustação PREMIUM para você!”</p>
        <div className="cvp-destaque">
          <span className="cvp-num" aria-hidden>{dd}</span>
          <span className="cvp-rotulo">{dd} DIAS DE ACESSO TOTAL</span>
        </div>
        <p className="cvp-desc">“Todas as funcionalidades. Todos os recursos. Sem limitações do plano gratuito.”</p>
        <p className="cvp-comp">“É isso mesmo. O Caveira pagou a conta dessa vez! Aproveite cada segundo.”</p>
        <button ref={botao} type="button" className="cvp-botao" onClick={fechar}>LIBERAR MEU ACESSO</button>
        <p className="cvp-final">SUA MISSÃO COMEÇA AGORA.</p>
      </div>
    </div>
  );
}
