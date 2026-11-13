import Link from "next/link";
import { ChevronRight, Flame, Zap } from "lucide-react";
import "./caveira-empurra.css";
import { OFFERS, OFFER_KEYS, PLAN_NAMES, installmentOf } from "@/domain/plans/offers";

/** A faixa sai do ar sozinha quando novembro acaba (horário de Brasília). */
export function blackNovemberActive(now: Date = new Date()): boolean {
  const mes = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", month: "2-digit" }).format(now);
  return mes === "11";
}

/** Caveira articulado (11 peças): pernas atrás, tronco com braço e cabeça por cima. Decorativo. */
function CaveiraEmpurra() {
  return (
    <span className="cvr" aria-hidden data-testid="caveira-empurra">
      <span className="cvr-chao" />
      <span className="cvr-rig">
        <i className="cvr-far" />
        <i className="cvr-thb"><i className="cvr-shb"><i className="cvr-btb" /></i></i>
        <i className="cvr-thf"><i className="cvr-shf"><i className="cvr-btf" /></i></i>
        <i className="cvr-torso"><i className="cvr-ua"><i className="cvr-fa" /></i><i className="cvr-head" /></i>
      </span>
    </span>
  );
}

/**
 * Faixa corrente "Black November": passa em loop entre o banner do topo e o palco do avatar.
 * Os valores são os preços oficiais dos planos (os mesmos da tela Meu Plano) — nada de desconto inventado.
 * Pausa ao passar o mouse, tocar ou focar; cada plano e o botão levam para a tela de planos.
 */
export function BlackNovemberTicker({ href = "/plano" }: { href?: string }) {
  const planos = OFFER_KEYS.map((k) => {
    const inst = installmentOf(k);
    return { k, nome: PLAN_NAMES[k].name.toUpperCase(), preco: inst ? `${inst.count}x ${inst.value}` : OFFERS[k].price, det: inst ? `ou ${inst.cash} à vista` : OFFERS[k].per };
  });
  const resumo = `Black November APROVUM. ${planos.map((p) => `${p.nome}: ${p.preco}, ${p.det}`).join(". ")}.`;
  const trilho = (oculto: boolean) => (
    <div className="bnv-trilho" key={oculto ? "b" : "a"} aria-hidden={oculto || undefined}>
      <span className="bnv-item bnv-selo"><Flame aria-hidden /><span>BLACK NOVEMBER</span></span>
      <span className="bnv-item bnv-frase">SUA APROVAÇÃO NÃO ESPERA <i>{"///"}</i> ESCOLHA SEU PLANO</span>
      {planos.flatMap((p) => [
        <Link key={p.k} href={href} className={`bnv-item bnv-plano bnv-${p.k}`} tabIndex={oculto ? -1 : 0} data-testid={oculto ? undefined : `bn-plano-${p.k}`}>
          <span className="bnv-nome">{p.nome}</span>
          <strong>{p.preco}</strong>
          <small>{p.det}</small>
        </Link>,
        // O Caveira empurra o card do Comando Supremo (rig de recorte; ver scripts/caveira-rig.py).
        ...(p.k === "vitalicio" ? [<CaveiraEmpurra key="caveira" />] : []),
      ])}
      <span className="bnv-item bnv-frase"><Zap aria-hidden />ACESSO IMEDIATO <i>{"///"}</i> APROVUM</span>
    </div>
  );
  return (
    <aside className="bnv" aria-label="Black November APROVUM" data-testid="black-november">
      <p className="sr-only">{resumo}</p>
      <div className="bnv-janela">
        <div className="bnv-esteira">
          {trilho(false)}
          {trilho(true)}
        </div>
      </div>
      <Link href={href} className="bnv-cta" data-testid="bn-cta" aria-label="Ver planos"><span>VER PLANOS</span><ChevronRight aria-hidden /></Link>
    </aside>
  );
}
