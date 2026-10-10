"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/icons";

// No celular, o Perfil fica no cabeçalho para manter 5 destinos de estudo na barra inferior.
const ITEMS: Array<{ href: string; label: string; icon: IconName; also?: string[]; mobile: boolean }> = [
  { href: "/painel", label: "Painel", icon: "painel", mobile: true },
  { href: "/trilhas", label: "Trilhas", icon: "trilhas", also: ["/aula", "/nova-trilha"], mobile: true },
  { href: "/questoes", label: "Questões", icon: "questoes", mobile: true },
  { href: "/revisoes", label: "Revisões", icon: "revisoes", mobile: true },
  { href: "/desempenho", label: "Desempenho", icon: "grafico", mobile: true },
  { href: "/perfil", label: "Perfil", icon: "perfil", mobile: false },
];

export function AppNav({ variant }: { variant: "lateral" | "inferior" }) {
  const path = usePathname();
  const active = (i: (typeof ITEMS)[number]) =>
    [i.href, ...(i.also ?? [])].some((p) => path === p || path.startsWith(`${p}/`));

  if (variant === "lateral") {
    return (
      <nav aria-label="Principal" className="flex flex-col gap-1">
        {ITEMS.map((i) => (
          <Link
            key={i.href}
            href={i.href}
            aria-current={active(i) ? "page" : undefined}
            className="flex items-center gap-3 rounded-md px-3 py-2 font-semibold text-tinta-suave hover:bg-nevoa hover:text-tinta aria-[current=page]:bg-nevoa aria-[current=page]:text-azul-escuro"
          >
            <Icon name={i.icon} />
            {i.label}
          </Link>
        ))}
      </nav>
    );
  }
  return (
    <nav
      aria-label="Principal"
      className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-linha bg-superficie pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      {ITEMS.filter((i) => i.mobile).map((i) => (
        <Link
          key={i.href}
          href={i.href}
          aria-current={active(i) ? "page" : undefined}
          className="flex h-16 flex-col items-center justify-center gap-1 t-tiny font-semibold text-tinta-fraca aria-[current=page]:text-azul"
        >
          <Icon name={i.icon} />
          {i.label}
        </Link>
      ))}
    </nav>
  );
}

/** Atalho para o perfil no cabeçalho do celular. */
export function ProfileLink() {
  const path = usePathname();
  return (
    <Link
      href="/perfil"
      aria-label="Perfil e configurações"
      aria-current={path.startsWith("/perfil") ? "page" : undefined}
      className="flex size-11 items-center justify-center rounded-full text-tinta-suave hover:bg-nevoa aria-[current=page]:text-azul"
    >
      <Icon name="perfil" />
    </Link>
  );
}
