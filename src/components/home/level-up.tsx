"use client";

import { useState, useTransition } from "react";

/** Aviso de LEVEL UP (níveis alcançados e ainda não vistos). Fechar marca como visto no servidor. */
export function LevelUp({ levels, ack }: { levels: number[]; ack: () => Promise<void> }) {
  const [open, setOpen] = useState(levels.length > 0);
  const [, start] = useTransition();
  if (!open || levels.length === 0) return null;
  const top = levels[levels.length - 1];
  const close = () => {
    setOpen(false);
    start(() => ack());
  };
  return (
    <div className="hm-lvup" role="dialog" aria-modal="true" aria-labelledby="hm-lvup-t" data-testid="level-up" onClick={close}>
      <div className="hm-lvup-box" onClick={(e) => e.stopPropagation()}>
        <p className="hm-lvup-k">Promoção registrada</p>
        <p id="hm-lvup-t" className="hm-lvup-t">LEVEL UP!</p>
        <p className="hm-lvup-n">
          Nível <b>{top}</b>
        </p>
        <p className="hm-lvup-s">Seu XP de missões reais te levou ao próximo nível. Continue a operação.</p>
        <button type="button" className="hm-btn" onClick={close} autoFocus>
          Continuar
        </button>
      </div>
    </div>
  );
}
