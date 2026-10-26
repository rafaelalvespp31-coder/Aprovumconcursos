"use client";

import Link from "next/link";
import { useRef, type KeyboardEvent } from "react";
import { BookOpen, ChartNoAxesColumnIncreasing, Clock3, Gamepad2, House, Plus, Target, type LucideIcon } from "lucide-react";

export type BottomNavId = "painel" | "trilhas" | "quiz" | "questoes" | "revisoes" | "desempenho" | "novo";

interface Item {
  id: BottomNavId;
  label: string;
  /** Linha de apoio (só no computador). */
  sub: string;
  /** Nome acessível quando o rótulo curto não basta. */
  aria?: string;
  icon: LucideIcon;
  path: string;
}

/** As sete opções, nesta ordem, ligadas às rotas reais do app. */
export const BOTTOM_NAV_ITEMS: readonly Item[] = [
  { id: "painel", label: "Painel", sub: "Sua evolução em tempo real", icon: House, path: "/painel" },
  { id: "trilhas", label: "Estudos", sub: "Sua base para a aprovação", icon: BookOpen, path: "/trilhas" },
  { id: "quiz", label: "Jogo", sub: "Estude jogando e evolua mais", aria: "Modo Jogo", icon: Gamepad2, path: "/quiz" },
  { id: "questoes", label: "Questões", sub: "Resolva, confira e aprenda", icon: Target, path: "/questoes" },
  { id: "revisoes", label: "Revisões", sub: "Fixe o que já estudou", icon: Clock3, path: "/revisoes" },
  { id: "desempenho", label: "Evolução", sub: "Acompanhe seu progresso", aria: "Evolução (desempenho)", icon: ChartNoAxesColumnIncreasing, path: "/desempenho" },
  { id: "novo", label: "Novo", sub: "Crie novos estudos", aria: "Novo estudo", icon: Plus, path: "/nova-trilha" },
];

/**
 * Menu inferior APROVUM: moldura chanfrada com sete blocos; o bloco da seção aberta fica
 * vermelho, iluminado e com barras de luz. No celular fica fixo no rodapé (área segura);
 * no computador, centralizado no rodapé da área de conteúdo. O ativo vem da rota atual.
 */
export function BottomNavigation({ activeId, basePath = "" }: { activeId: BottomNavId | null; basePath?: string }) {
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
      <div className="bn-moldura">
        <nav aria-label="Menu principal" className="bn" data-testid="menu-inferior">
          <span className="bn-fundo" aria-hidden />
          {BOTTOM_NAV_ITEMS.map((it, i) => {
            const on = it.id === activeId;
            const icon = <it.icon className="bn-ico" strokeWidth={on ? 2.4 : 2.1} aria-hidden />;
            return (
              <div key={it.id} className={`bn-cel ${on ? "bn-cel-ativa" : ""}`}>
                {on && <span className="bn-luz-cima" aria-hidden />}
                <Link
                  ref={(el) => {
                    refs.current[i] = el;
                  }}
                  href={`${basePath}${it.path}`}
                  aria-current={on ? "page" : undefined}
                  aria-label={it.aria}
                  onKeyDown={(e) => onKeyDown(e, i)}
                  className={`bn-item ${on ? "bn-ativo" : ""}`}
                >
                  {it.id === "novo" ? <span className="bn-novo-ico">{icon}</span> : icon}
                  <span className="bn-txt">{it.label}</span>
                  <span className="bn-sub" aria-hidden>
                    {it.sub}
                  </span>
                </Link>
                {on && <span className="bn-luz-baixo" aria-hidden />}
              </div>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
