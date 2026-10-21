"use client";

import Link from "next/link";
import { useRef, type KeyboardEvent } from "react";
import { BookOpen, ChartNoAxesColumnIncreasing, Clock3, Gamepad2, House, Plus, Target, type LucideIcon } from "lucide-react";

export type BottomNavId = "painel" | "trilhas" | "quiz" | "questoes" | "revisoes" | "desempenho" | "novo";

interface Item {
  id: BottomNavId;
  label: string;
  /** Nome acessível quando o rótulo curto não basta. */
  aria?: string;
  icon: LucideIcon;
  path: string;
}

/** As sete opções, nesta ordem, ligadas às rotas reais do app. */
export const BOTTOM_NAV_ITEMS: readonly Item[] = [
  { id: "painel", label: "Painel", icon: House, path: "/painel" },
  { id: "trilhas", label: "Estudos", icon: BookOpen, path: "/trilhas" },
  { id: "quiz", label: "Jogo", aria: "Modo Jogo", icon: Gamepad2, path: "/quiz" },
  { id: "questoes", label: "Questões", icon: Target, path: "/questoes" },
  { id: "revisoes", label: "Revisões", icon: Clock3, path: "/revisoes" },
  { id: "desempenho", label: "Evolução", aria: "Evolução (desempenho)", icon: ChartNoAxesColumnIncreasing, path: "/desempenho" },
  { id: "novo", label: "Novo", aria: "Novo estudo", icon: Plus, path: "/nova-trilha" },
];

/**
 * Menu inferior APROVUM: cápsula preta com sete opções e seleção vermelha deslizante.
 * No celular fica fixo no rodapé (respeitando a área segura); no computador, centralizado
 * no rodapé da área de conteúdo. O item ativo vem da rota atual.
 */
export function BottomNavigation({ activeId, basePath = "" }: { activeId: BottomNavId | null; basePath?: string }) {
  const index = BOTTOM_NAV_ITEMS.findIndex((i) => i.id === activeId);
  const refs = useRef<Array<HTMLAnchorElement | null>>([]);

  // Setas ←/→, Home e End movem o foco entre as opções (o Tab continua funcionando).
  const onKeyDown = (e: KeyboardEvent<HTMLAnchorElement>, i: number) => {
    const last = BOTTOM_NAV_ITEMS.length - 1;
    const to = e.key === "ArrowRight" ? (i === last ? 0 : i + 1) : e.key === "ArrowLeft" ? (i === 0 ? last : i - 1) : e.key === "Home" ? 0 : e.key === "End" ? last : null;
    if (to === null) return;
    e.preventDefault();
    refs.current[to]?.focus();
  };

  return (
    <div className="bn-wrap">
      <nav aria-label="Menu principal" className="bn" data-testid="menu-inferior">
        {index >= 0 && BOTTOM_NAV_ITEMS[index]!.id !== "novo" && (
          <span className="bn-luz" style={{ transform: `translateX(calc(${index} * (100% + var(--bn-gap))))` }} aria-hidden />
        )}
        {BOTTOM_NAV_ITEMS.map((it, i) => {
          const on = it.id === activeId;
          return (
            <Link
              key={it.id}
              ref={(el) => {
                refs.current[i] = el;
              }}
              href={`${basePath}${it.path}`}
              aria-current={on ? "page" : undefined}
              aria-label={it.aria}
              onKeyDown={(e) => onKeyDown(e, i)}
              className={`bn-item ${on ? "bn-ativo" : ""} ${it.id === "novo" ? "bn-novo" : ""}`}
            >
              <it.icon className="bn-ico" strokeWidth={on ? 2.4 : 2} aria-hidden />
              <span className="bn-txt">{it.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
