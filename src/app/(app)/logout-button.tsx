"use client";

/** Limpa o cache privado do service worker antes de sair. */
export function LogoutButton() {
  return (
    <button
      type="submit"
      onClick={() => navigator.serviceWorker?.controller?.postMessage("clear-private")}
      className="font-semibold text-azul underline underline-offset-2"
    >
      Sair
    </button>
  );
}
