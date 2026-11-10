"use client";

import { useTransition } from "react";
import { setRewardStatusAction } from "./actions";

export function RewardButtons({ id, status }: { id: string; status: "pendente" | "enviado" | "cancelado" }) {
  const [pending, start] = useTransition();
  const go = (to: "pendente" | "enviado" | "cancelado") => start(() => void setRewardStatusAction(id, to));
  return (
    <div className="flex gap-2">
      {status !== "enviado" && <button type="button" disabled={pending} onClick={() => go("enviado")} className="rounded-md bg-black px-3 py-1.5 t-tiny font-bold text-white disabled:opacity-50">Marcar enviado</button>}
      {status !== "pendente" && <button type="button" disabled={pending} onClick={() => go("pendente")} className="rounded-md border border-linha px-3 py-1.5 t-tiny font-bold disabled:opacity-50">Voltar p/ pendente</button>}
    </div>
  );
}
