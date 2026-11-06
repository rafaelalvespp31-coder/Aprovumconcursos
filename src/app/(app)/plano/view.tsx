"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState, useTransition, type CSSProperties, type ReactNode } from "react";
import { OFFERS, PLAN_NAMES, installmentOf, type OfferKey } from "@/domain/plans/offers";
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

/** Cor do neon de cada plano (gratuito prata, pagos vermelho, semestral vermelho intenso, vitalício dourado). */
const NEON: Record<"gratuito" | OfferKey, { color: string; tier: "white" | "red" | "red-strong" | "gold" }> = {
  gratuito: { color: "#E5E7EB", tier: "white" },
  mensal: { color: "#FF1A1A", tier: "red" },
  semestral: { color: "#FF0000", tier: "red-strong" },
  anual: { color: "#FF1A1A", tier: "red" },
  vitalicio: { color: "#FFD700", tier: "gold" },
};

/** Linha neon que corre pelo contorno do cartão (SVG com traço curto animado). */
function NeonTrace({ id }: { id: "gratuito" | OfferKey }) {
  const n = NEON[id];
  return (
    <>
      <svg className="neon-border-svg" aria-hidden focusable="false" data-tier={n.tier} style={{ "--neon-color": n.color } as CSSProperties}>
        <rect className="neon-base" pathLength={100} />
        <rect className="neon-run" pathLength={100} strokeDasharray="20 80" />
      </svg>
      {id === "semestral" && (
        <svg className="neon-coroa" viewBox="0 0 24 24" aria-hidden focusable="false">
          <path d="M3 18h18l1.5-10-5.2 4.2L12 4 6.7 12.2 1.5 8 3 18Zm0 2h18v2H3z" fill="#FFD700" stroke="#B8860B" strokeWidth=".6" strokeLinejoin="round" />
        </svg>
      )}
    </>
  );
}

const CARD_Y = 432;
type Card = { id: "gratuito" | OfferKey; x: number; w: number; label: string };
const CARDS: Card[] = [
  { id: "gratuito", x: 0, w: 267, label: "Recruta — acesso gratuito" },
  { id: "mensal", x: 267, w: 224, label: "Assinar Combatente — R$ 37,00 por mês" },
  { id: "semestral", x: 491, w: 231, label: "Assinar Operador — R$ 197,00 por 6 meses" },
  { id: "anual", x: 722, w: 226, label: "Assinar Elite Tática — R$ 347,00 por 12 meses" },
  { id: "vitalicio", x: 948, w: 264, label: "Assinar Comando Supremo — R$ 697,00, acesso para sempre" },
];
const PERKS = [
  { x: 0, w: 300 },
  { x: 300, w: 285 },
  { x: 585, w: 320 },
  { x: 905, w: 307 },
];
const PERK_Y = 1036;
const PERK_H = 74;


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
const NAME: Record<Card["id"], string> = { gratuito: "RECRUTA", mensal: "COMBATENTE", semestral: "OPERADOR", anual: "ELITE TÁTICA", vitalicio: "COMANDO SUPREMO" };

function MobileCard({ id, current, onPick }: { id: Card["id"]; current: boolean; onPick: (k: OfferKey) => void }) {
  const free = id === "gratuito";
  const o = free ? null : OFFERS[id];
  const ic = ICON[id];
  const inst = free ? null : installmentOf(id as OfferKey);
  return (
    <article className={`pm pm-${id}`} data-testid={`plano-cartao-${id}`}>
      {id === "semestral" && <p className="pm-fita">MAIS ESCOLHIDO</p>}
      <NeonTrace id={id} />
      <Crop x={ic.x} y={ic.y} w={ic.w} h={ic.h} className="pm-ico" grow={ic.w} />
      <p className="pm-k">PLANO</p>
      <h2 className="pm-n">{NAME[id]}</h2>
      {free ? (
        <>
          <p className="pm-tag">{PLAN_NAMES.gratuito.tagline.toUpperCase()}</p>
          <p className="pm-sub">Conheça a plataforma e experimente a qualidade APROVUM.</p>
        </>
      ) : (
        <p className="pm-preco">
          {inst ? (
            <>
              <b className="pm-parc" data-testid={`plano-parcela-${id}`}><i>{inst.count}x</i> {inst.value}</b>
              <span>{o!.per}</span>
              <small className="pm-avista" data-testid={`plano-avista-${id}`}>ou {inst.cash} à vista</small>
            </>
          ) : (
            <>
              <b>{o!.price}</b>
              <span>{o!.per}</span>
            </>
          )}
        </p>
      )}
      <ul className="pm-lista">
        {(free ? PERKS_FREE : PERKS_PAID).map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>
      {free ? (
        <Link href="/painel" className="pm-btn pm-btn-free" aria-label="Recruta — acesso gratuito" data-testid="plano-gratuito">
          ACESSO GRATUITO
        </Link>
      ) : (
        <button type="button" className="pm-btn" aria-label={`Assinar ${o!.label} — ${inst ? `${inst.count}x ${inst.value} ou ${inst.cash} à vista` : `${o!.price} ${o!.per}`}`} onClick={() => onPick(id as OfferKey)} data-testid={`plano-${id}`}>
          ASSINAR AGORA
        </button>
      )}
      {!free && <p className="pm-sub">{PLAN_NAMES[id].tagline}</p>}
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
      <div className="pm-lista-planos" data-testid="plano-cartoes">
        {CARDS.map((c) => (
          <MobileCard key={c.id} id={c.id} current={c.id === current} onPick={setSel} />
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
