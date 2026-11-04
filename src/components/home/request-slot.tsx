"use client";

import Link from "next/link";
import type { CSSProperties } from "react";

/** Ícone e texto nítidos do botão (a arte de fundo traz só a moldura). */
function Rotulo() {
  return (
    <span className="cl-solic" aria-hidden>
      <svg viewBox="0 0 28 24" fill="none" stroke="#0b0b0c" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><circle cx="10" cy="7.5" r="4.6" /><path d="M2 22v-1.6a6.4 6.4 0 0 1 6.4-6.4h3.2a6.4 6.4 0 0 1 6.4 6.4V22z" /><path d="M23 7v8M19 11h8" strokeWidth="2.2" /></svg>
      <span className="cl-solic-txt"><b>SOLICITAR MEU AVATAR</b><small>Personalize ainda mais seu operador</small></span>
    </span>
  );
}
import { AvatarRequestBox, type AvatarRequestInfo, type RequestAction } from "@/components/avatar/avatar-request";

/**
 * "Solicitar meu avatar": o botão é o da arte do layout; o envio usa o fluxo existente
 * (AvatarRequestBox, sem alterações), que abre logo abaixo do palco.
 */
export function RequestTrigger({ box, locked = false }: { box: CSSProperties; locked?: boolean }) {
  // Conta gratuita: o avatar padrão não muda; o botão leva ao Meu Plano.
  if (locked) return <Link href="/plano" className="cl-hit" style={box} aria-label="Avatar personalizado: disponível nos planos pagos — ver Meu Plano" title="Avatar personalizado: exclusivo dos planos pagos" data-testid="solicitar-avatar-plano"><Rotulo /></Link>;
  const open = () => {
    const btn = document.querySelector<HTMLButtonElement>(".cl-req [data-testid=avatar-solicitar-botao]");
    btn?.click();
    requestAnimationFrame(() => document.querySelector(".cl-req")?.scrollIntoView({ behavior: "smooth", block: "nearest" }));
  };
  return <button type="button" className="cl-hit" style={box} onClick={open} aria-label="Solicitar meu avatar — personalize ainda mais seu operador" data-testid="solicitar-avatar"><Rotulo /></button>;
}

function openRequest() {
  document.querySelector<HTMLButtonElement>(".cl-req [data-testid=avatar-solicitar-botao]")?.click();
  requestAnimationFrame(() => document.querySelector(".cl-req .avr-caixa")?.scrollIntoView({ block: "nearest" }));
}

/** O estado do pedido (pendente ou recusado) e o envio da foto. Avatar pronto não mostra mensagem. */
export function RequestSlot({ initial, action }: { initial: AvatarRequestInfo | null; action: RequestAction }) {
  return (
    <div className="cl-req" onClick={(e) => (e.target as HTMLElement).closest(".avr-status") && openRequest()}>
      <AvatarRequestBox initial={initial} action={action} />
    </div>
  );
}
