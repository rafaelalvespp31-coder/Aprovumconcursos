"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState, useSyncExternalStore, useTransition, type CSSProperties, type ReactNode } from "react";
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

/** Celular: cartões nativos (texto nítido, um por linha, na largura da tela). Computador: a arte inteira. */
const subscribeMobile = (cb: () => void) => {
  const m = window.matchMedia("(max-width: 819px)");
  m.addEventListener("change", cb);
  return () => m.removeEventListener("change", cb);
};
const useMobile = () => useSyncExternalStore(subscribeMobile, () => window.matchMedia("(max-width: 819px)").matches, () => false);

const PERKS_FREE = ["1 matéria por dia", "1 tema por dia", "3 questões por dia", "Aulas (demonstração)", "Mapas mentais (demo)", "Mentor IA (1 por dia)"];
const PERKS_PAID = ["Acesso completo", "Questões ilimitadas", "Mapas mentais", "Mnemônicos", "Mentor IA avançado", "Simulados e muito mais!"];
// Ícone de cada plano: recorte da arte oficial.
const ICON: Record<Card["id"], { x: number; y: number; w: number; h: number }> = {
  gratuito: { x: 85, y: 430, w: 130, h: 88 },
  mensal: { x: 325, y: 445, w: 115, h: 85 },
  semestral: { x: 565, y: 435, w: 85, h: 55 },
  anual: { x: 795, y: 450, w: 100, h: 80 },
  vitalicio: { x: 1020, y: 445, w: 110, h: 65 },
};
const NAME: Record<Card["id"], string> = { gratuito: "GRATUITO", mensal: "MENSAL", semestral: "SEMESTRAL", anual: "ANUAL", vitalicio: "VITALÍCIO" };

function MobileCard({ id, current, onPick }: { id: Card["id"]; current: boolean; onPick: (k: OfferKey) => void }) {
  const free = id === "gratuito";
  const o = free ? null : OFFERS[id];
  const ic = ICON[id];
  return (
    <article className={`pm pm-${id}`} data-testid={`plano-cartao-${id}`}>
      {id === "semestral" && <p className="pm-fita">MAIS ESCOLHIDO</p>}
      <Crop x={ic.x} y={ic.y} w={ic.w} h={ic.h} className="pm-ico" grow={ic.w} />
      <p className="pm-k">PLANO</p>
      <h2 className="pm-n">{NAME[id]}</h2>
      {free ? (
        <>
          <p className="pm-tag">DEGUSTAÇÃO</p>
          <p className="pm-sub">Conheça a plataforma e experimente a qualidade APROVUM.</p>
        </>
      ) : (
        <p className="pm-preco">
          <b>{o!.price}</b>
          <span>{o!.per}</span>
        </p>
      )}
      <ul className="pm-lista">
        {(free ? PERKS_FREE : PERKS_PAID).map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>
      {free ? (
        <Link href="/painel" className="pm-btn pm-btn-free" aria-label="Plano Gratuito — acesso gratuito" data-testid="plano-gratuito">
          ACESSO GRATUITO
        </Link>
      ) : (
        <button type="button" className="pm-btn" aria-label={`Assinar ${o!.label} — ${o!.price} ${o!.per}`} onClick={() => onPick(id as OfferKey)} data-testid={`plano-${id}`}>
          ASSINAR AGORA
        </button>
      )}
      {id === "vitalicio" && <p className="pm-nota">INVESTIMENTO PARA TODA A VIDA!</p>}
      {free && <p className="pm-nota pm-nota-free">Ideal para você conhecer todo o poder da APROVUM.</p>}
      {current && (
        <span className="pm-atual" data-testid="plano-atual">
          SEU PLANO ATUAL
        </span>
      )}
    </article>
  );
}

export function PlanoView({ current, choose, mp = null }: { current: "gratuito" | OfferKey; choose: (plan: string) => Promise<ChoosePlanResult>; mp?: { publicKey: string; email: string | null } | null }) {
  const router = useRouter();
  const paid = useCallback(() => router.refresh(), [router]);
  const [sel, setSel] = useState<OfferKey | null>(null);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const mobile = useMobile();

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
      {mobile ? (
        <div className="pm-lista-planos">
          {CARDS.map((c) => (
            <MobileCard key={c.id} id={c.id} current={c.id === current} onPick={setSel} />
          ))}
        </div>
      ) : (
        <div className="pl-cards">
          {CARDS.map((c) => (
            <div key={c.id} className="pl-card" style={{ "--w": c.w } as CSSProperties}>
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
      )}
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
