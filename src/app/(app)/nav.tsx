"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/painel", label: "Painel", icon: "M4 11.5 12 5l8 6.5V20a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1z" },
  { href: "/trilhas", label: "Trilhas", icon: "M4 18h5v-4h5v-4h6M4 18v2h16V6" },
  { href: "/revisoes", label: "Revisões", icon: "M20 12a8 8 0 1 1-2.34-5.66M20 4v4h-4" },
  { href: "/perfil", label: "Perfil", icon: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8m-7 9a7 7 0 0 1 14 0" },
];

export function AppNav({ variant }: { variant: "lateral" | "inferior" }) {
  const path = usePathname();
  const active = (href: string) => path === href || path.startsWith(`${href}/`) || (href === "/trilhas" && (path.startsWith("/aula") || path.startsWith("/nova-trilha")));

  if (variant === "lateral") {
    return (
      <nav aria-label="Principal" className="flex flex-col gap-1">
        {ITEMS.map((i) => (
          <Link
            key={i.href}
            href={i.href}
            aria-current={active(i.href) ? "page" : undefined}
            className="flex items-center gap-3 rounded-md px-3 py-2 font-semibold text-tinta-suave hover:bg-nevoa hover:text-tinta aria-[current=page]:bg-nevoa aria-[current=page]:text-azul-escuro"
          >
            <Icon d={i.icon} />
            {i.label}
          </Link>
        ))}
      </nav>
    );
  }
  return (
    <nav
      aria-label="Principal"
      className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-4 border-t border-linha bg-superficie pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      {ITEMS.map((i) => (
        <Link
          key={i.href}
          href={i.href}
          aria-current={active(i.href) ? "page" : undefined}
          className="flex h-16 flex-col items-center justify-center gap-1 t-tiny font-semibold text-tinta-fraca aria-[current=page]:text-azul"
        >
          <Icon d={i.icon} />
          {i.label}
        </Link>
      ))}
    </nav>
  );
}

function Icon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  );
}
