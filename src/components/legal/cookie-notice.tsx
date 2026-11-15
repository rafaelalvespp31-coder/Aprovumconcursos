"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const KEY = "na:aviso-cookies:v1";

/** Aviso de cookies: só informa (usamos apenas cookies essenciais) e lembra do "ok" neste aparelho. */
export function CookieNotice() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    try { if (!localStorage.getItem(KEY)) setShow(true); } catch { setShow(true); }
  }, []);
  if (!show) return null;
  const ok = () => { try { localStorage.setItem(KEY, "1"); } catch { /* ok */ } setShow(false); };
  return (
    <section role="region" aria-label="Aviso de cookies" data-testid="aviso-cookies"
      className="fixed inset-x-3 bottom-3 z-[70] mx-auto flex max-w-xl flex-col gap-3 rounded-2xl border border-white/25 bg-[#111] p-4 text-[13px] leading-snug text-white shadow-2xl sm:flex-row sm:items-center">
      <p className="flex-1">
        Usamos apenas cookies essenciais (login e preferências). Não usamos rastreamento nem publicidade.{" "}
        <Link href="/cookies" className="font-semibold underline underline-offset-2">Política de Cookies</Link>
        {" · "}
        <Link href="/privacidade" className="font-semibold underline underline-offset-2">Privacidade</Link>
      </p>
      <button type="button" onClick={ok} className="min-h-11 rounded-xl bg-[#E10600] px-5 text-[14px] font-bold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">Entendi</button>
    </section>
  );
}
