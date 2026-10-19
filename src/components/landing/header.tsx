"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Menu, X } from "lucide-react";

const LINKS = [
  { href: "#inicio", label: "Início" },
  { href: "#como-funciona", label: "Como Funciona" },
  { href: "#recursos", label: "Recursos" },
];

/**
 * Cabeçalho da landing: logo oficial, navegação para as seções da página e acesso ao
 * login/cadastro (ou ao painel, para quem já entrou). No celular, menu que abre e fecha.
 */
export function LandingHeader({ loggedIn }: { loggedIn: boolean }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState("#inicio");
  const btnRef = useRef<HTMLButtonElement>(null);

  // Destaca o link da seção visível.
  useEffect(() => {
    const ids = LINKS.map((l) => l.href.slice(1));
    const els = ids.map((id) => document.getElementById(id)).filter((e): e is HTMLElement => !!e);
    if (!els.length || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (vis) setActive(`#${vis.target.id}`);
      },
      { rootMargin: "-30% 0px -60% 0px" },
    );
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        btnRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const actions = loggedIn ? (
    <Link href="/painel" className="lp-btn lp-btn-vermelho">
      Ir para o painel
    </Link>
  ) : (
    <>
      <Link href="/entrar" className="lp-btn lp-btn-vermelho">
        Entrar
      </Link>
      <Link href="/cadastro" className="lp-btn lp-btn-contorno">
        Criar conta
      </Link>
    </>
  );

  return (
    <header className="lp-header">
      <div className="lp-header-in">
        <Link href="/" aria-label="APROVUM — início" className="lp-logo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/aprovum-logo-escura.png" alt="APROVUM — Sua preparação. Seu próximo cargo." width={523} height={107} />
        </Link>
        <nav aria-label="Seções da página" className="lp-nav">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} aria-current={active === l.href ? "true" : undefined}>
              {l.label}
            </a>
          ))}
        </nav>
        <div className="lp-header-acoes">{actions}</div>
        <button ref={btnRef} type="button" className="lp-menu-btn" aria-label={open ? "Fechar menu" : "Abrir menu"} aria-expanded={open} aria-controls="lp-menu" onClick={() => setOpen((o) => !o)}>
          {open ? <X className="size-6" aria-hidden /> : <Menu className="size-6" aria-hidden />}
        </button>
      </div>
      {open && (
        <div id="lp-menu" className="lp-menu">
          <nav aria-label="Menu" className="flex flex-col">
            {LINKS.map((l) => (
              <a key={l.href} href={l.href} onClick={() => setOpen(false)}>
                {l.label}
              </a>
            ))}
          </nav>
          <div className="lp-menu-acoes">{actions}</div>
        </div>
      )}
    </header>
  );
}
