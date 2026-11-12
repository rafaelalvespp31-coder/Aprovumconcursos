"use client";

import Link from "next/link";
import { useRef, type CSSProperties, type PointerEvent as RPointerEvent, type ReactNode } from "react";
import { Bell, ChevronDown, ChevronRight, ListTree, Menu, PanelLeftClose, Plus, TrendingUp, X, type LucideIcon } from "lucide-react";
import type { ShellSummary } from "@/server/queries";
import { SubjectsSubmenu } from "./subjects-submenu";

export interface MenuItem {
  id: string;
  href: string;
  label: string;
  icon: LucideIcon;
  desc: string;
  also?: string[];
  hidden?: boolean;
  badge?: string;
}

// ---------------------------------------------------------------------------
// Artes dos cartões (SVG leve, animado por CSS; nada de imagem pesada)
// ---------------------------------------------------------------------------
const ARTES: Record<string, ReactNode> = {
  painel: (
    <svg viewBox="0 0 200 64" preserveAspectRatio="xMaxYMid slice" aria-hidden>
      <defs>
        <radialGradient id="mtA1" cx="62%" cy="38%" r="60%">
          <stop offset="0" stopColor="#ff3b30" stopOpacity=".95" />
          <stop offset=".45" stopColor="#b30000" stopOpacity=".55" />
          <stop offset="1" stopColor="#b30000" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="200" height="64" fill="url(#mtA1)" />
      <g className="mt-nuvens" fill="#ff5a4f" opacity=".28">
        <ellipse cx="70" cy="14" rx="34" ry="5" />
        <ellipse cx="150" cy="22" rx="40" ry="6" />
        <ellipse cx="110" cy="8" rx="26" ry="4" />
      </g>
      <path d="M40 64 L92 34 L108 42 L126 22 L140 30 L158 40 L200 64 Z" fill="#0b0b0b" />
      <path d="M0 64 L50 46 L78 54 L112 44 L150 56 L200 50 L200 64 Z" fill="#050505" />
      <path d="M126 22 v-13" stroke="#111" strokeWidth="1.4" />
      <path className="mt-bandeira" d="M126.6 9 q5 -2.4 9 0 t8 0 v7 q-4 2.2 -8 0 t-9 0 z" fill="#ff1e1e" />
      <path d="M120 23.5 a1.6 1.6 0 1 1 .1 0 M119 25 h2.4 l.8 6 h-1.2 l-.5 -3.4 -.5 3.4 h-1.2 z" fill="#000" />
    </svg>
  ),
  quiz: (
    <svg viewBox="0 0 200 64" preserveAspectRatio="xMaxYMid slice" aria-hidden>
      <ellipse cx="128" cy="62" rx="62" ry="14" fill="#ff1e1e" opacity=".5" className="mt-pulso" />
      <path d="M92 18 q36 -10 72 0 q14 4 18 30 q3 20 -9 20 q-9 0 -18 -14 h-54 q-9 14 -18 14 q-12 0 -9 -20 q4 -26 18 -30 z" fill="#101010" stroke="#3a3a3a" strokeWidth="1.2" />
      <path d="M104 30 v12 M98 36 h12" stroke="#8a8a8a" strokeWidth="3.2" strokeLinecap="round" />
      <circle cx="152" cy="30" r="3.2" fill="#ff1e1e" className="mt-pisca" />
      <circle cx="160" cy="37" r="3.2" fill="#ff5a4f" />
      <circle cx="144" cy="37" r="3.2" fill="#5a5a5a" />
      <circle cx="152" cy="44" r="3.2" fill="#b30000" />
      <circle cx="120" cy="48" r="6" fill="#1c1c1c" stroke="#444" />
      <circle cx="138" cy="48" r="6" fill="#1c1c1c" stroke="#444" />
      <rect x="123" y="24" width="12" height="4" rx="2" fill="#ff1e1e" opacity=".85" />
    </svg>
  ),
  questoes: (
    <svg viewBox="0 0 200 64" preserveAspectRatio="xMaxYMid slice" aria-hidden>
      <g transform="rotate(-8 130 32)">
        <rect x="84" y="-4" width="96" height="76" rx="3" fill="#191919" stroke="#333" />
        {[10, 28, 46].map((y, i) => (
          <g key={y}>
            <rect x="94" y={y} width="11" height="11" rx="2" fill="none" stroke="#8a8a8a" strokeWidth="1.4" />
            <path className="mt-check" style={{ animationDelay: `${i * 0.5}s` }} d={`M96 ${y + 5} l3.4 3.6 l6.4 -8.6`} fill="none" stroke="#ff1e1e" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            <rect x="112" y={y + 2} width="52" height="2.6" rx="1.3" fill="#565656" />
            <rect x="112" y={y + 7.5} width="34" height="2.2" rx="1.1" fill="#3a3a3a" />
          </g>
        ))}
      </g>
      <g className="mt-caneta">
        <path d="M150 34 L196 6 l4 6 L156 40 z" fill="#0c0c0c" stroke="#555" strokeWidth=".9" />
        <path d="M150 34 l-8 9 l14 -3 z" fill="#b8b8b8" />
      </g>
    </svg>
  ),
  evolucao: (
    <svg viewBox="0 0 200 64" preserveAspectRatio="xMaxYMid slice" aria-hidden>
      <g stroke="#2a2a2a" strokeWidth=".6">
        <path d="M80 52 h112 M80 38 h112 M80 24 h112 M80 10 h112" />
      </g>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <rect key={i} className="mt-barra" style={{ animationDelay: `${i * 0.12}s` }} x={96 + i * 16} y={50 - (6 + i * 7.5)} width="9" height={6 + i * 7.5} rx="1.2" fill={i > 3 ? "#e9c9c9" : "#7a4a4a"} opacity={0.55 + i * 0.09} />
      ))}
      <path className="mt-seta" d="M90 50 C120 46 150 34 180 8" fill="none" stroke="#ff1e1e" strokeWidth="2.2" strokeLinecap="round" pathLength={1} />
      <path d="M172 6 l10 0 l-3 9 z" fill="#ff1e1e" />
    </svg>
  ),
  concursos: (
    <svg viewBox="0 0 200 64" preserveAspectRatio="xMaxYMid slice" aria-hidden>
      <g transform="skewX(-10)">
        <rect x="104" y="2" width="90" height="62" fill="#161616" stroke="#333" />
        <rect x="104" y="2" width="90" height="10" fill="#2a1010" />
        {[0, 1, 2].map((r) =>
          [0, 1, 2, 3, 4].map((c) => (
            <rect key={`${r}${c}`} x={108 + c * 17.2} y={15 + r * 16} width="14" height="13" rx="1.4" fill="#1f1f1f" stroke="#383838" strokeWidth=".7" />
          )),
        )}
        <circle className="mt-pulso" cx="166.6" cy="37.5" r="8.5" fill="none" stroke="#ff1e1e" strokeWidth="1.8" />
        <circle cx="166.6" cy="37.5" r="2" fill="#ff1e1e" />
      </g>
    </svg>
  ),
  "aprovum-ai": (
    <svg viewBox="0 0 200 64" preserveAspectRatio="xMaxYMid slice" aria-hidden>
      <defs>
        <radialGradient id="mtA2" cx="70%" cy="50%" r="55%">
          <stop offset="0" stopColor="#ff2d55" stopOpacity=".75" />
          <stop offset=".6" stopColor="#a1004a" stopOpacity=".3" />
          <stop offset="1" stopColor="#a1004a" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="200" height="64" fill="url(#mtA2)" />
      <g fill="none" stroke="#ff5a7a" strokeWidth=".9" opacity=".8">
        <path className="mt-circuito" d="M60 20 h34 l8 8 h24" />
        <path className="mt-circuito" style={{ animationDelay: ".6s" }} d="M70 46 h30 l8 -8 h18" />
        <path className="mt-circuito" style={{ animationDelay: "1.2s" }} d="M176 14 h14 M172 50 h20 M180 32 h18" />
      </g>
      <path d="M150 6 q-22 0 -24 20 l-7 12 q-1 3 3 3 h3 v8 q0 6 7 6 h6 v9 h26 v-16 q10 -8 10 -22 q0 -20 -24 -20 z" fill="#0c0c10" stroke="#ff2d55" strokeWidth="1.1" />
      <g fill="#ff2d55">
        <circle className="mt-pisca" cx="146" cy="22" r="2.2" />
        <circle className="mt-pisca" style={{ animationDelay: ".5s" }} cx="160" cy="18" r="1.8" />
        <circle className="mt-pisca" style={{ animationDelay: "1s" }} cx="164" cy="32" r="2.2" />
        <circle className="mt-pisca" style={{ animationDelay: "1.4s" }} cx="150" cy="36" r="1.8" />
      </g>
      <path d="M146 22 L160 18 L164 32 L150 36 Z M146 22 L164 32 M160 18 L150 36" fill="none" stroke="#ff7a95" strokeWidth=".8" opacity=".9" />
    </svg>
  ),
  redacao: (
    <svg viewBox="0 0 200 64" preserveAspectRatio="xMaxYMid slice" aria-hidden>
      <g transform="rotate(-14 140 34)">
        <rect x="96" y="-6" width="92" height="80" rx="2" fill="#1b1b1b" stroke="#3a3a3a" />
        <rect x="118" y="6" width="48" height="6" rx="1" fill="#2c2c2c" stroke="#555" strokeWidth=".6" />
        {[20, 27, 34, 41, 48, 55].map((y, i) => (
          <rect key={y} className="mt-linha" style={{ animationDelay: `${i * 0.25}s` }} x="106" y={y} width={i % 3 === 2 ? 44 : 70} height="2" rx="1" fill="#4d4d4d" />
        ))}
      </g>
    </svg>
  ),
};

const COM_ARTE = new Set(Object.keys(ARTES));
/** Itens discretos do rodapé da lista (como no layout de referência). */
const COMPACTOS = new Set(["depoimentos", "perfil", "plano"]);

function Selo({ texto }: { texto: string }) {
  return (
    <span className="mt-selo">
      {texto}
    </span>
  );
}

/** Efeitos de ponteiro: holofote que segue o cursor e onda no toque. */
function useEfeitos() {
  const mover = (e: RPointerEvent<HTMLElement>) => {
    const alvo = (e.target as HTMLElement).closest<HTMLElement>(".mt-card, .mt-linha-item");
    if (!alvo) return;
    const r = alvo.getBoundingClientRect();
    alvo.style.setProperty("--mx", `${e.clientX - r.left}px`);
    alvo.style.setProperty("--my", `${e.clientY - r.top}px`);
  };
  const tocar = (e: RPointerEvent<HTMLElement>) => {
    const alvo = (e.target as HTMLElement).closest<HTMLElement>(".mt-card, .mt-linha-item");
    if (!alvo || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const r = alvo.getBoundingClientRect();
    const onda = document.createElement("span");
    onda.className = "mt-onda";
    onda.style.left = `${e.clientX - r.left}px`;
    onda.style.top = `${e.clientY - r.top}px`;
    alvo.appendChild(onda);
    onda.addEventListener("animationend", () => onda.remove(), { once: true });
  };
  return { onPointerMove: mover, onPointerDown: tocar };
}

export function MenuTatico({
  variant,
  items,
  summary,
  basePath,
  path,
  activeId,
  collapsed = false,
  onToggleCollapsed,
  onClose,
  onSame,
  estudosAberto,
  onToggleEstudos,
  evolucaoAberta,
  onToggleEvolucao,
  logout,
  isAula = false,
}: {
  variant: "desktop" | "mobile";
  items: MenuItem[];
  summary: ShellSummary;
  basePath: string;
  path: string;
  activeId: string | null;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
  /** Celular: fecha a gaveta (também chamado ao navegar). */
  onClose?: () => void;
  onSame?: (label: string) => void;
  estudosAberto: boolean;
  onToggleEstudos: () => void;
  evolucaoAberta: boolean;
  onToggleEvolucao: () => void;
  logout?: ReactNode;
  isAula?: boolean;
}) {
  const efeitos = useEfeitos();
  const rolagem = useRef<HTMLDivElement>(null);
  const movel = variant === "mobile";
  const rec = !movel && collapsed;
  const visiveis = items.filter((s) => !s.hidden && s.id !== "revisoes" && s.id !== "desempenho");
  const principais = visiveis.filter((s) => !COMPACTOS.has(s.id) && s.id !== "novo");
  const compactos = visiveis.filter((s) => COMPACTOS.has(s.id));
  const novo = items.find((s) => s.id === "novo");
  const evolucao = ["desempenho", "revisoes"].map((id) => items.find((i) => i.id === id)).filter((i): i is MenuItem => !!i);
  const dentroEvolucao = evolucao.some((f) => f.id === activeId);
  const temMaterias = summary.subjects.length > 0;
  const aoNavegar = (s: MenuItem) => () => {
    if (path === s.href) onSame?.(s.label);
    onClose?.();
  };
  let ordem = 0;
  const i = () => ({ "--i": ordem++ }) as CSSProperties;

  // ------------------------------------------------------------ trilho recolhido (desktop)
  if (rec) {
    const trilho = [...principais.slice(0, 2), ...(novo ? [novo] : []), ...principais.slice(2), ...compactos];
    return (
      <div className="mt mt-rec barra-lateral is-rec" data-testid="menu-tatico" {...efeitos}>
        <button type="button" onClick={onToggleCollapsed} aria-label="Expandir barra lateral" title="Expandir menu" className="mt-rec-topo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/aprovum-mark.png" alt="" />
          <span className="mt-rec-ham"><Menu aria-hidden /></span>
        </button>
        <div className="mt-rolagem" ref={rolagem}>
          <nav aria-label="Principal" className="mt-rec-nav">
            {trilho.map((s) => {
              const on = activeId === s.id;
              return (
                <Link key={s.id} href={s.href} aria-label={s.label} title={s.label} aria-current={on ? "page" : undefined} className="mt-rec-item" data-id={s.id} data-tier={s.id === "plano" ? summary.plan : undefined} style={i()}>
                  <s.icon aria-hidden />
                  {s.badge === "Novo" && !on && <span className="mt-rec-ponto" aria-hidden />}
                  <span className="mt-dica" aria-hidden>{s.label}</span>
                </Link>
              );
            })}
            <Link href={`${basePath}/desempenho`} aria-label="Evolução" title="Evolução" aria-current={dentroEvolucao ? "page" : undefined} className="mt-rec-item" style={i()}>
              <TrendingUp aria-hidden />
              <span className="mt-dica" aria-hidden>Evolução</span>
            </Link>
          </nav>
        </div>
      </div>
    );
  }

  // ------------------------------------------------------------ menu completo
  return (
    <div className={`mt ${movel ? "mt-movel" : "mt-desk barra-lateral"}`} data-testid="menu-tatico" {...efeitos}>
      <div className="mt-brasa" aria-hidden />
      <header className="mt-topo">
        <Link href={`${basePath}/painel`} onClick={onClose} aria-label="APROVUM — ir para o painel" className="mt-logo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/aprovum-login-logo.png" alt="APROVUM — Sua preparação. Seu próximo cargo." width={523} height={107} />
        </Link>
        {movel ? (
          <button type="button" onClick={onClose} aria-label="Fechar menu" className="mt-fechar">
            <X aria-hidden />
          </button>
        ) : (
          <button type="button" onClick={onToggleCollapsed} aria-label="Recolher menu lateral" title="Recolher menu" className="mt-fechar mt-fechar-desk">
            <Menu aria-hidden />
          </button>
        )}
      </header>

      <div className="mt-rolagem" ref={rolagem}>
        <nav aria-label={movel ? "Menu principal" : "Principal"} className="mt-nav">
          {principais.map((s) => {
            const on = activeId === s.id;
            const arte = COM_ARTE.has(s.id);
            const Cartao = (
              <Link
                href={s.href}
                onClick={aoNavegar(s)}
                aria-current={on ? "page" : undefined}
                className={`mt-card ${s.id === "painel" ? "mt-heroi" : ""} ${s.badge === "Novo" ? "mt-novo" : ""}`}
                data-id={s.id}
                style={i()}
              >
                {arte && <span className="mt-arte" aria-hidden>{ARTES[s.id]}</span>}
                <span className="mt-ico" aria-hidden><s.icon /></span>
                <span className="mt-txt">
                  <span className="mt-nome">
                    {s.label}
                    {s.badge && <Selo texto={s.badge} />}
                  </span>
                  <span className="mt-desc" data-testid={movel ? undefined : `nav-desc-${s.id}`}>{s.desc}</span>
                </span>
                <ChevronRight className="mt-seta-ir" aria-hidden />
              </Link>
            );

            if (s.id === "trilhas") {
              return (
                <div key={s.id} className={`mt-grupo ${estudosAberto && temMaterias ? "is-aberto" : ""}`} style={i()}>
                  <div className="mt-grupo-topo">
                    <Link href={s.href} onClick={aoNavegar(s)} aria-current={on ? "page" : undefined} className="mt-card mt-card-grupo" data-id={s.id}>
                      <span className="mt-ico" aria-hidden><s.icon /></span>
                      <span className="mt-txt">
                        <span className="mt-nome">{s.label}</span>
                      </span>
                      <span className="mt-pilula" data-testid={movel ? undefined : `nav-desc-${s.id}`}>{s.desc}</span>
                    </Link>
                    {temMaterias && (
                      <button type="button" className="mt-grupo-botao" aria-expanded={estudosAberto} aria-label={estudosAberto ? "Recolher matérias" : "Mostrar matérias"} data-testid={movel ? "estudos-toggle-movel" : "estudos-toggle"} onClick={onToggleEstudos}>
                        <ChevronDown aria-hidden />
                      </button>
                    )}
                  </div>
                  {temMaterias && estudosAberto && (
                    <div className="mt-grupo-corpo">
                      <SubjectsSubmenu subjects={summary.subjects} base={basePath} path={path} variant={movel ? "menu" : "lateral"} onNavigate={onClose} />
                    </div>
                  )}
                  {novo && (
                    <Link href={novo.href} onClick={aoNavegar(novo)} aria-current={activeId === "novo" ? "page" : undefined} className="mt-novo-estudo">
                      <Plus aria-hidden /> {novo.label}
                      <span>{novo.desc}</span>
                    </Link>
                  )}
                </div>
              );
            }

            return (
              <div key={s.id} className="contents">
                {Cartao}
                {s.id === "aprovum-ai" && (
                  <Link
                    href={`${basePath}/meu-concurso`}
                    onClick={onClose}
                    aria-current={path.startsWith(`${basePath}/meu-concurso`) ? "page" : undefined}
                    data-testid="nav-edital-verticalizado"
                    className="mt-sublink"
                  >
                    <ListTree aria-hidden /> Edital Verticalizado <ChevronRight aria-hidden />
                  </Link>
                )}
                {s.id === "questoes" && evolucao.length > 0 && (
                  <div className={`mt-grupo mt-grupo-arte ${evolucaoAberta ? "is-aberto" : ""}`} style={i()}>
                    <button type="button" aria-expanded={evolucaoAberta} data-testid={movel ? "evolucao-toggle-movel" : "evolucao-toggle"} onClick={onToggleEvolucao} className={`mt-card ${dentroEvolucao ? "is-dentro" : ""}`} data-id="evolucao">
                      <span className="mt-arte" aria-hidden>{ARTES.evolucao}</span>
                      <span className="mt-ico" aria-hidden><TrendingUp /></span>
                      <span className="mt-txt">
                        <span className="mt-nome">Evolução</span>
                        <span className="mt-desc">Seu progresso</span>
                      </span>
                      <ChevronDown className="mt-seta-ir mt-seta-grupo" aria-hidden />
                    </button>
                    {evolucaoAberta && (
                      <ul className="mt-grupo-corpo mt-sub" aria-label="Evolução">
                        {evolucao.map((f) => (
                          <li key={f.id}>
                            <Link href={f.href} onClick={aoNavegar(f)} aria-current={activeId === f.id ? "page" : undefined} className="mt-linha-item">
                              <f.icon aria-hidden />
                              <span>{f.label}</span>
                              <ChevronRight aria-hidden />
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          <div className="mt-compactos" style={i()}>
            {compactos.map((s) => {
              const on = activeId === s.id;
              return (
                <Link
                  key={s.id}
                  href={s.href}
                  onClick={aoNavegar(s)}
                  aria-current={on ? "page" : undefined}
                  className="mt-card mt-compacto"
                  data-id={s.id}
                  data-tier={s.id === "plano" ? summary.plan : undefined}
                  data-testid={s.id === "plano" && !movel ? "plano-card" : undefined}
                >
                  <span className="mt-ico" aria-hidden><s.icon /></span>
                  <span className="mt-txt">
                    <span className="mt-nome">{s.label}</span>
                    <span className="mt-desc" data-testid={movel ? undefined : `nav-desc-${s.id}`}>{s.id === "plano" ? summary.planInfo.label : s.desc}</span>
                  </span>
                  <ChevronRight className="mt-seta-ir" aria-hidden />
                </Link>
              );
            })}
          </div>
        </nav>
        {isAula && <div id={movel ? "aula-arvore-movel" : "aula-arvore-desktop"} className="mt-arvore" />}
      </div>

      <footer className="mt-base">
        {!movel && (
          <div className="mt-acoes">
            <button type="button" onClick={onToggleCollapsed} className="mt-acao mt-acao-larga">
              <PanelLeftClose aria-hidden /> Recolher
            </button>
            <Link href={`${basePath}/revisoes`} aria-label={`Revisões pendentes: ${summary.counts.dueReviews}`} className="mt-acao">
              <Bell aria-hidden />
              {summary.counts.dueReviews > 0 && <span className="mt-acao-n">{summary.counts.dueReviews}</span>}
            </Link>
            {logout}
          </div>
        )}
        <div className="mt-assinatura">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/aprovum-login-logo.png" alt="" width={523} height={107} />
          <span aria-hidden />
          <em>Estude. Evolua. Conquiste.</em>
        </div>
      </footer>
    </div>
  );
}
