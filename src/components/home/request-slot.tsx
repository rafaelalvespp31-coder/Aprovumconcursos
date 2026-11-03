"use client";

import type { CSSProperties } from "react";
import { AvatarRequestBox, type AvatarRequestInfo, type RequestAction } from "@/components/avatar/avatar-request";

/**
 * "Solicitar meu avatar": o botão é o da arte do layout; o envio usa o fluxo existente
 * (AvatarRequestBox, sem alterações), que abre logo abaixo do palco.
 */
export function RequestTrigger({ box }: { box: CSSProperties }) {
  const open = () => {
    const btn = document.querySelector<HTMLButtonElement>(".cl-req [data-testid=avatar-solicitar-botao]");
    btn?.click();
    requestAnimationFrame(() => document.querySelector(".cl-req")?.scrollIntoView({ behavior: "smooth", block: "nearest" }));
  };
  return <button type="button" className="cl-hit" style={box} onClick={open} aria-label="Solicitar meu avatar — personalize ainda mais seu operador" data-testid="solicitar-avatar" />;
}

export function RequestSlot({ initial, action }: { initial: AvatarRequestInfo | null; action: RequestAction }) {
  return (
    <div className="cl-req">
      <AvatarRequestBox initial={initial} action={action} />
    </div>
  );
}
