"use client";

import Link from "next/link";
import { useState, useTransition, type CSSProperties } from "react";
import { OFFERS, type OfferKey } from "@/domain/plans/offers";
import type { ChoosePlanResult } from "./actions";

/**
 * "Meu Plano": a arte oficial (1212 × 1298) fica exatamente como foi enviada; as áreas clicáveis
 * de cada plano ficam por cima, na mesma posição. Escolher um plano pede confirmação.
 */
const W = 1212;
const H = 1298;
const box = (x: number, y: number, w: number, h: number): CSSProperties => ({ left: `${(x / W) * 100}%`, top: `${(y / H) * 100}%`, width: `${(w / W) * 100}%`, height: `${(h / H) * 100}%` });

type Card = { id: "gratuito" | OfferKey; x: number; y: number; w: number; h: number; label: string };
const CARDS: Card[] = [
  { id: "gratuito", x: 30, y: 482, w: 232, h: 518, label: "Plano Gratuito — acesso gratuito" },
  { id: "mensal", x: 272, y: 497, w: 215, h: 483, label: "Assinar Plano Mensal — R$ 37,00 por mês" },
  { id: "semestral", x: 495, y: 475, w: 222, h: 525, label: "Assinar Plano Semestral — R$ 197,00 por 6 meses" },
  { id: "anual", x: 728, y: 500, w: 214, h: 480, label: "Assinar Plano Anual — R$ 347,00 por 12 meses" },
  { id: "vitalicio", x: 955, y: 478, w: 235, h: 527, label: "Assinar Plano Vitalício — R$ 697,00, acesso para sempre" },
];

export function PlanoView({ current, choose }: { current: "gratuito" | OfferKey; choose: (plan: string) => Promise<ChoosePlanResult> }) {
  const [sel, setSel] = useState<OfferKey | null>(null);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const close = () => (setSel(null), setDone(false), setError(null));
  const confirm = () =>
    start(async () => {
      if (!sel) return;
      const r = await choose(sel);
      if (!r.ok) return setError(r.error);
      if (r.url) window.location.assign(r.url);
      else setDone(true);
    });

  return (
    <div className="plano" data-testid="meu-plano">
      <div className="plano-arte">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/plano/escolha-seu-plano.webp" alt="Escolha seu plano APROVUM: Gratuito, Mensal R$ 37, Semestral R$ 197, Anual R$ 347 e Vitalício R$ 697" width={W} height={H} />
        {CARDS.map((c) =>
          c.id === "gratuito" ? (
            <Link key={c.id} href="/painel" className="plano-hit" style={box(c.x, c.y, c.w, c.h)} aria-label={c.label} data-testid="plano-gratuito" />
          ) : (
            <button key={c.id} type="button" className="plano-hit" style={box(c.x, c.y, c.w, c.h)} aria-label={c.label} onClick={() => setSel(c.id as OfferKey)} data-testid={`plano-${c.id}`} />
          ),
        )}
        {CARDS.filter((c) => c.id === current).map((c) => (
          <span key={c.id} className="plano-atual" style={box(c.x, 1006, c.w, 26)} data-testid="plano-atual">SEU PLANO ATUAL</span>
        ))}
      </div>

      {sel && (
        <div className="plano-fundo" role="dialog" aria-modal="true" aria-label={OFFERS[sel].label} data-testid="plano-dialogo" onClick={(e) => e.target === e.currentTarget && close()}>
          <div className="plano-caixa">
            {done ? (
              <>
                <p className="plano-k">PEDIDO ENVIADO</p>
                <p className="plano-t">{OFFERS[sel].label}</p>
                <p className="plano-s" data-testid="plano-enviado">Recebemos o seu pedido. A equipe APROVUM libera o plano assim que o pagamento for confirmado.</p>
                <button type="button" className="plano-b" onClick={close}>Fechar</button>
              </>
            ) : (
              <>
                <p className="plano-k">VOCÊ ESCOLHEU</p>
                <p className="plano-t">{OFFERS[sel].label}</p>
                <p className="plano-p">{OFFERS[sel].price}</p>
                <p className="plano-s">{OFFERS[sel].per}</p>
                {error && <p role="alert" className="plano-e">{error}</p>}
                <button type="button" className="plano-b" disabled={pending} onClick={confirm} data-testid="plano-confirmar">{pending ? "Enviando…" : "Confirmar pedido"}</button>
                <button type="button" className="plano-c" onClick={close}>Voltar</button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
