import Link from "next/link";
import { ChevronRight, Flame, Zap } from "lucide-react";
import "./caveira-empurra.css";
import { OFFERS, OFFER_KEYS, PLAN_NAMES, installmentOf } from "@/domain/plans/offers";

/** A faixa sai do ar sozinha quando novembro acaba (horário de Brasília). */
export function blackNovemberActive(now: Date = new Date()): boolean {
  const mes = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", month: "2-digit" }).format(now);
  return mes === "11";
}

/** Caveira parado na pose de empurrar, encostado na lateral do card. Decorativo. */
function CaveiraEmpurra() {
  return (
    <span className="cvr" aria-hidden data-testid="caveira-empurra">
      <span className="cvr-chao" />
      {/* eslint-disable-next-line @next/next/no-img-element -- recorte pequeno e fixo (4x), sem otimizador para não perder nitidez */}
      <img src="/home/caveira-empurra.webp" alt="" width={67} height={64} decoding="async" />
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
      <span className="bnv-item bnv-selo">
        <Flame aria-hidden />
        <span>BLACK</span>
        {/* Vão entre as palavras: é por onde desce a perna do Caveira, sem cobrir nenhuma letra. */}
        <span className="bnv-vao" aria-hidden>
          <span className="bnv-assento" />
          {/* eslint-disable-next-line @next/next/no-img-element -- recorte fixo (4x) da arte oficial, sem otimizador para não perder nitidez */}
          <img className="bnv-caveira" src="/home/caveira-sentado.webp" alt="" width={94} height={110} decoding="async" />
        </span>
        <span>NOVEMBER</span>
      </span>
      <span className="bnv-item bnv-frase">SUA APROVAÇÃO NÃO ESPERA <i>{"///"}</i> ESCOLHA SEU PLANO</span>
      {planos.flatMap((p) => [
        <Link key={p.k} href={href} className={`bnv-item bnv-plano bnv-${p.k}`} tabIndex={oculto ? -1 : 0} data-testid={oculto ? undefined : `bn-plano-${p.k}`}>
          <span className="bnv-nome">{p.nome}</span>
          <strong>{p.preco}</strong>
          <small>{p.det}</small>
        </Link>,
        // O Caveira empurra o card do Comando Supremo (parado; ver scripts/caveira-rig.py).
        ...(p.k === "vitalicio" ? [<CaveiraEmpurra key="caveira" />] : []),
      ])}
      <span className="bnv-item bnv-frase"><Zap aria-hidden />ACESSO IMEDIATO <i>{"///"}</i> APROVUM</span>
    </div>
  );
  return (
    <aside className="bnv" aria-label="Black November APROVUM" data-testid="black-november">
      <p className="sr-only">{resumo}</p>
      {/* Brasas e fumaça em camadas, em toda a faixa (decorativo, atrás do conteúdo). */}
      <div className="bnv-fx" aria-hidden>
        <span className="bnv-brasa" />
        <span className="bnv-fumo bnv-fumo-a" />
        <span className="bnv-fumo bnv-fumo-b" />
        <span className="bnv-fumo bnv-fumo-c" />
      </div>
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
