"use client";

import Link from "next/link";
import { useRef, type CSSProperties, type KeyboardEvent } from "react";
import { BookOpen, ChartNoAxesColumnIncreasing, ChevronDown, ChevronUp, CircleUserRound, Clock3, Crown, Gamepad2, House, Target, type LucideIcon } from "lucide-react";
import { useStored } from "@/components/use-stored";

export type BottomNavId = "painel" | "trilhas" | "quiz" | "questoes" | "revisoes" | "desempenho" | "plano" | "area";

interface Item {
  id: BottomNavId;
  label: string;
  /** Linha de apoio (só no computador). */
  sub: string;
  /** Nome acessível quando o rótulo curto não basta. */
  aria?: string;
  icon: LucideIcon;
  path: string;
  /** Mostra só no computador ou só no celular (padrão: nos dois). */
  only?: "desktop" | "mobile";
}

/** As seis opções, nesta ordem, ligadas às rotas reais do app. */
export const BOTTOM_NAV_ITEMS: readonly Item[] = [
  { id: "painel", label: "Painel", sub: "Sua evolução em tempo real", icon: House, path: "/painel" },
  { id: "trilhas", label: "Estudos", sub: "Sua base para a aprovação", icon: BookOpen, path: "/trilhas" },
  { id: "quiz", label: "Jogo", sub: "Estude jogando e evolua mais", aria: "Modo Jogo", icon: Gamepad2, path: "/quiz" },
  { id: "questoes", label: "Questões", sub: "Resolva, confira e aprenda", icon: Target, path: "/questoes" },
  { id: "revisoes", label: "Revisões", sub: "Fixe o que já estudou", icon: Clock3, path: "/revisoes", only: "desktop" },
  { id: "desempenho", label: "Evolução", sub: "Acompanhe seu progresso", aria: "Evolução (desempenho)", icon: ChartNoAxesColumnIncreasing, path: "/desempenho", only: "desktop" },
  { id: "area", label: "Minha área", sub: "Todos os menus", aria: "Minha área (Área do Aluno)", icon: CircleUserRound, path: "/area-do-aluno", only: "mobile" },
  { id: "plano", label: "Meu Plano", sub: "Escolha seu plano", icon: Crown, path: "/plano", only: "mobile" },
];

/**
 * Menu inferior APROVUM: dock de vidro com seis opções e uma "lente" vermelha que desliza até a
 * opção da rota atual (a posição vem de --i, calculada para celular e computador). No celular fica
 * flutuando no rodapé (área segura); no computador, centralizado no rodapé da área de conteúdo.
 */
export function BottomNavigation({ activeId, basePath = "", plan = "gratuito" }: { activeId: BottomNavId | null; basePath?: string; plan?: "gratuito" | "pago" | "vitalicio" }) {
  const refs = useRef<Array<HTMLAnchorElement | null>>([]);
  // No computador o menu pode ser recolhido (fica só um botão para abrir), como o menu lateral.
  const [collapsed, setCollapsed] = useStored("na:menu-inferior-recolhido", false);

  // Setas ←/→, Home e End movem o foco entre as opções (o Tab continua funcionando).
  const onKeyDown = (e: KeyboardEvent<HTMLAnchorElement>, i: number) => {
    // Só entram as opções visíveis neste tamanho de tela (as outras ficam com display:none).
    const vis = BOTTOM_NAV_ITEMS.map((_, k) => k).filter((k) => refs.current[k] && refs.current[k]!.offsetParent !== null);
    const pos = vis.indexOf(i);
    if (pos < 0 || !vis.length) return;
    const last = vis.length - 1;
    const to = e.key === "ArrowRight" ? vis[pos === last ? 0 : pos + 1] : e.key === "ArrowLeft" ? vis[pos === 0 ? last : pos - 1] : e.key === "Home" ? vis[0] : e.key === "End" ? vis[last] : null;
    if (to == null) return;
    e.preventDefault();
    refs.current[to]?.focus();
  };

  // Posição da lente entre as opções visíveis em cada tamanho de tela.
  const posEm = (visivel: (it: Item) => boolean) => BOTTOM_NAV_ITEMS.filter(visivel).findIndex((it) => it.id === activeId);
  const im = posEm((it) => it.only !== "desktop");
  const id = posEm((it) => it.only !== "mobile");
  const planoAtivo = activeId === "plano" ? plan : undefined;

  return (
    <div className="bn-wrap" data-recolhido={collapsed ? "1" : undefined}>
      <button type="button" className="bn-abrir" onClick={() => setCollapsed(false)} aria-label="Mostrar o menu inferior" aria-expanded={false} data-testid="abrir-menu-inferior">
        <ChevronUp className="h-4 w-4" aria-hidden /> Menu
      </button>
      <div className="bn-moldura">
        <button type="button" className="bn-recolher" onClick={() => setCollapsed(true)} aria-label="Recolher o menu inferior" aria-expanded title="Recolher menu" data-testid="recolher-menu-inferior">
          <ChevronDown className="h-4 w-4" aria-hidden />
        </button>
        <nav
          aria-label="Menu principal"
          className="bn"
          data-testid="menu-inferior"
          data-sem-ativo={im < 0 && id < 0 ? "" : undefined}
          data-lente={planoAtivo}
          style={{ "--im": Math.max(im, 0), "--id": Math.max(id, 0) } as CSSProperties}
        >
          <span className="bn-fundo" aria-hidden />
          <span className="bn-lente" aria-hidden>
            <span className="bn-lente-corpo" />
            <span className="bn-lente-laser" />
          </span>
          {BOTTOM_NAV_ITEMS.map((it, i) => {
            const on = it.id === activeId;
            const icon = <it.icon className="bn-ico" strokeWidth={on ? 2.4 : 2.1} aria-hidden />;
            return (
              <div key={it.id} data-tier={it.id === "plano" ? plan : undefined} className={`bn-cel ${on ? "bn-cel-ativa" : ""} ${it.only === "desktop" ? "bn-so-d" : it.only === "mobile" ? "bn-so-m" : ""}`}>
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
                  {icon}
                  <span className="bn-txt">{it.label}</span>
                  <span className="bn-sub" aria-hidden>
                    {it.sub}
                  </span>
                </Link>
              </div>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
