"use client";

import { LogOut } from "lucide-react";

/** Limpa o cache privado do service worker antes de sair. */
export function LogoutButton({ variant = "texto" }: { variant?: "texto" | "icone" }) {
  const clear = () => navigator.serviceWorker?.controller?.postMessage("clear-private");
  if (variant === "icone") {
    return (
      <button
        type="submit"
        onClick={clear}
        aria-label="Sair"
        title="Sair"
        className="flex h-10 w-10 items-center justify-center rounded-[12px] border border-[#F0F0FF] bg-white transition hover:bg-[#F5F3FF]"
      >
        <LogOut className="h-4 w-4" aria-hidden />
      </button>
    );
  }
  return (
    <button type="submit" onClick={clear} className="font-semibold text-azul underline underline-offset-2">
      Sair
    </button>
  );
}
