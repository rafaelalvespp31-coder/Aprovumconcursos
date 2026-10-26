"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function BankNav({ admin }: { admin: boolean }) {
  const path = usePathname();
  const items = [
    { href: "/banco", label: "Painel" },
    { href: "/banco/questoes", label: "Questões" },
    { href: "/banco/importar", label: "Enviar questões" },
    { href: "/banco/fontes", label: "Fontes" },
    { href: "/banco/assuntos", label: "Matérias e assuntos" },
    ...(admin ? [{ href: "/banco/equipe", label: "Equipe" }] : []),
  ];
  return (
    <nav aria-label="Banco de questões" className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-3 pb-2">
      {items.map((i) => {
        const active = i.href === "/banco" ? path === "/banco" : path.startsWith(i.href);
        return (
          <Link
            key={i.href}
            href={i.href}
            aria-current={active ? "page" : undefined}
            className={`whitespace-nowrap rounded-md px-3 py-2 text-[14px] font-semibold transition ${
              active ? "bg-[#e10600] text-white" : "text-white/65 hover:bg-white/[0.06] hover:text-white"
            }`}
          >
            {i.label}
          </Link>
        );
      })}
    </nav>
  );
}
