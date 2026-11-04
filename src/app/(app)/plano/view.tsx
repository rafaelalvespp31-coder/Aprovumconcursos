"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition, type CSSProperties, type ReactNode } from "react";
import { OFFERS, type OfferKey } from "@/domain/plans/offers";
import type { ChoosePlanResult } from "./actions";
import { PayBox } from "./pay";

/**
 * "Meu Plano": a arte oficial (1212 × 1298) é a mesma, em faixas coladas: topo, cartões dos planos,
 * vantagens e rodapé. No computador as faixas se juntam e preenchem a largura; no celular os planos
 * viram um carrossel (cada plano em tamanho legível) e as vantagens ficam em 2 colunas.
 * Escolher um plano pede confirmação.
 */
const W = 1212;
const H = 1298;
const ART = "/plano/escolha-seu-plano.webp";

/** Recorte da arte: mostra só o retângulo x,y,w,h da imagem original, na proporção certa. */
function Crop({ x, y, w, h, className = "", children, label, grow }: { x: number; y: number; w: number; h: number; className?: string; children?: ReactNode; label?: string; grow?: number }) {
  const style = {
    ...(grow ? { "--w": grow } : {}),
    aspectRatio: `${w} / ${h}`,
    backgroundImage: `url(${ART})`,
    backgroundSize: `${(W / w) * 100}% ${(H / h) * 100}%`,
    backgroundPosition: `${W === w ? 0 : (x / (W - w)) * 100}% ${H === h ? 0 : (y / (H - h)) * 100}%`,
  } as CSSProperties;
  return (
    <div className={`pl-crop ${className}`} style={style} role={label ? "img" : undefined} aria-label={label}>
      {children}
    </div>
  );
}

const CARD_Y = 432;
const CARD_H = 604;
type Card = { id: "gratuito" | OfferKey; x: number; w: number; label: string };
const CARDS: Card[] = [
  { id: "gratuito", x: 0, w: 267, label: "Plano Gratuito — acesso gratuito" },
  { id: "mensal", x: 267, w: 224, label: "Assinar Plano Mensal — R$ 37,00 por mês" },
  { id: "semestral", x: 491, w: 231, label: "Assinar Plano Semestral — R$ 197,00 por 6 meses" },
  { id: "anual", x: 722, w: 226, label: "Assinar Plano Anual — R$ 347,00 por 12 meses" },
  { id: "vitalicio", x: 948, w: 264, label: "Assinar Plano Vitalício — R$ 697,00, acesso para sempre" },
];
const PERKS = [
  { x: 0, w: 300 },
  { x: 300, w: 285 },
  { x: 585, w: 320 },
  { x: 905, w: 307 },
];
const PERK_Y = 1036;
const PERK_H = 74;

export function PlanoView({ current, choose, mp = null }: { current: "gratuito" | OfferKey; choose: (plan: string) => Promise<ChoosePlanResult>; mp?: { publicKey: string; email: string | null } | null }) {
  const router = useRouter();
  const paid = useCallback(() => router.refresh(), [router]);
  const [sel, setSel] = useState<OfferKey | null>(null);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const track = useRef<HTMLDivElement>(null);

  // No celular o carrossel abre no plano atual (ou no Semestral, o mais escolhido).
  useEffect(() => {
    const t = track.current;
    if (!t || t.scrollWidth <= t.clientWidth + 2) return;
    const el = t.querySelector<HTMLElement>(`[data-card="${current === "gratuito" ? "semestral" : current}"]`);
    if (el) t.scrollLeft = el.offsetLeft - (t.clientWidth - el.clientWidth) / 2;
  }, [current]);

  const close = () => (setSel(null), setDone(false), setError(null));
  const confirm = () =>
    start(async () => {
      if (!sel) return;
      const r = await choose(sel);
      if (!r.ok) return setError(r.error);
      setDone(true);
    });

  return (
    <div className="plano" data-testid="meu-plano">
      <Crop x={0} y={0} w={W} h={CARD_Y} className="pl-topo" label="Escolha seu plano APROVUM: Gratuito, Mensal R$ 37, Semestral R$ 197, Anual R$ 347 e Vitalício R$ 697" />
      <p className="pl-dica" aria-hidden>Deslize para ver todos os planos</p>
      <div className="pl-cards" ref={track}>
        {CARDS.map((c) => (
          <div key={c.id} className="pl-card" data-card={c.id} style={{ "--w": c.w } as CSSProperties}>
            <Crop x={c.x} y={CARD_Y} w={c.w} h={CARD_H}>
              {c.id === "gratuito" ? (
                <Link href="/painel" className="pl-hit" aria-label={c.label} data-testid="plano-gratuito" />
              ) : (
                <button type="button" className="pl-hit" aria-label={c.label} onClick={() => setSel(c.id as OfferKey)} data-testid={`plano-${c.id}`} />
              )}
              {c.id === current && (
                <span className="pl-atual" data-testid="plano-atual">SEU PLANO ATUAL</span>
              )}
            </Crop>
          </div>
        ))}
      </div>
      <div className="pl-vantagens">
        {PERKS.map((k) => (
          <Crop key={k.x} x={k.x} y={PERK_Y} w={k.w} h={PERK_H} grow={k.w} className="pl-vant" />
        ))}
      </div>
      <Crop x={0} y={PERK_Y + PERK_H} w={W} h={H - PERK_Y - PERK_H} className="pl-rodape" />
      {sel && (
        <div className="plano-fundo" role="dialog" aria-modal="true" aria-label={OFFERS[sel].label} data-testid="plano-dialogo" onClick={(e) => e.target === e.currentTarget && close()}>
          <div className={`plano-caixa ${mp ? "plano-caixa-pg" : ""}`}>
            {mp ? (
              <PayBox offer={sel} publicKey={mp.publicKey} email={mp.email} onClose={close} onPaid={paid} />
            ) : done ? (
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
