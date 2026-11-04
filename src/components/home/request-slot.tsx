"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { AvatarRequestBox, type AvatarRequestInfo, type RequestAction } from "@/components/avatar/avatar-request";

/**
 * "Solicitar meu avatar": o botão é o da arte do layout; o envio usa o fluxo existente
 * (AvatarRequestBox, sem alterações), que abre logo abaixo do palco.
 */
export function RequestTrigger({ box, locked = false }: { box: CSSProperties; locked?: boolean }) {
  // Conta gratuita: o avatar padrão não muda; o botão leva ao Meu Plano.
  if (locked) return <Link href="/plano" className="cl-hit" style={box} aria-label="Avatar personalizado: disponível nos planos pagos — ver Meu Plano" title="Avatar personalizado: exclusivo dos planos pagos" data-testid="solicitar-avatar-plano" />;
  const open = () => {
    const btn = document.querySelector<HTMLButtonElement>(".cl-req [data-testid=avatar-solicitar-botao]");
    btn?.click();
    requestAnimationFrame(() => document.querySelector(".cl-req")?.scrollIntoView({ behavior: "smooth", block: "nearest" }));
  };
  return <button type="button" className="cl-hit" style={box} onClick={open} aria-label="Solicitar meu avatar — personalize ainda mais seu operador" data-testid="solicitar-avatar" />;
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
