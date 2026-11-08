"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITENS = [
  { href: "/redacao", label: "Início", exato: true },
  { href: "/redacao/escrever", label: "Escrever" },
  { href: "/redacao/temas", label: "Desafio de tema" },
  { href: "/redacao/historico", label: "Histórico" },
  { href: "/redacao/evolucao", label: "Evolução" },
  { href: "/redacao/exercicios", label: "Exercícios" },
  { href: "/redacao/professor", label: "Professor" },
];

export function RedacaoNav() {
  const path = usePathname();
  // A página inicial da Redação Elite tem o próprio painel de atalhos.
  if (path === "/redacao") return null;
  return (
    <nav aria-label="Redação Elite" className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1" data-testid="redacao-nav">
      {ITENS.map((i) => {
        const on = i.exato ? path === i.href : path === i.href || path.startsWith(`${i.href}/`);
        return (
          <Link key={i.href} href={i.href} aria-current={on ? "page" : undefined} className={`shrink-0 rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition-colors ${on ? "border-[#08090B] bg-[#08090B] text-white" : "border-[#E6E7EB] bg-white text-[#3A3C42] hover:border-[#E50914] hover:text-[#E50914]"}`}>
            {i.label}
          </Link>
        );
      })}
    </nav>
  );
}
