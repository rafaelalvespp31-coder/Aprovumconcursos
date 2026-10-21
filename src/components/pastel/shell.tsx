"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { RotatingQuote } from "./rotating-quote";
import { createContext, Fragment, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  ArrowRight,
  Bell,
  Menu,
  X,
  Gamepad2,
  ChartColumn,
  ChevronRight,
  CircleHelp,
  Clock3,
  Crown,
  House,
  Map as MapIcon,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Search,
  Settings,
  Target,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { ConnectivityBanner } from "@/components/pwa";
import { useStudyApi } from "@/components/study-api";
import type { SearchItem } from "@/app/(app)/study-actions";
import type { ShellSummary } from "@/server/queries";
import { useStored } from "@/components/use-stored";
import { PastelCard } from "./card";
import { SubjectsSubmenu } from "./subjects-submenu";

// ---------------------------------------------------------------------------
// Toast (mensagens curtas de confirmação, como no design original)
// ---------------------------------------------------------------------------
const ToastCtx = createContext<(msg: string) => void>(() => {});
export const usePastelToast = () => useContext(ToastCtx);

interface NavItem {
  id: string;
  href: string;
  label: string;
  /** Rótulo curto da barra inferior do celular. */
  short?: string;
  icon: LucideIcon;
  num: string;
  desc: string;
  also?: string[];
  title: string;
  /** Linha de apoio do cabeçalho (quando difere do `desc` da barra lateral). */
  subtitle?: string;
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

function navItems(s: ShellSummary, base: string): NavItem[] {
  return [
    { id: "painel", href: `${base}/painel`, label: "Painel", icon: House, num: "1", desc: "Visão geral", title: "" },
    { id: "trilhas", href: `${base}/trilhas`, label: "Estudos", icon: MapIcon, num: "2", desc: plural(s.counts.trails, "conteúdo", "conteúdos"), also: [`${base}/trilha`, `${base}/aula`, `${base}/nova-trilha`], title: "Seus estudos" },
    { id: "quiz", href: `${base}/quiz`, label: "Modo Jogo", short: "Jogo", icon: Gamepad2, num: "3", desc: "Complete a lei", title: "Modo Jogo" },
    { id: "questoes", href: `${base}/questoes`, label: "Questões", icon: CircleHelp, num: "4", desc: plural(s.counts.notebooks, "caderno", "cadernos"), title: "Cadernos de Questões", subtitle: "Organize, acesse e continue sua jornada rumo à aprovação." },
    { id: "revisoes", href: `${base}/revisoes`, label: "Revisões", icon: Clock3, num: "5", desc: plural(s.counts.dueReviews, "pendente", "pendentes"), title: "Revisões" },
    { id: "desempenho", href: `${base}/desempenho`, label: "Desempenho", short: "Evolução", icon: ChartColumn, num: "6", desc: plural(s.counts.answered, "resposta", "respostas"), title: "Desempenho" },
    { id: "perfil", href: `${base}/perfil`, label: "Perfil", icon: Settings, num: "7", desc: `Nível ${s.level}`, title: "Perfil & conquistas" },
  ];
}

const PAGE_HEADINGS: Array<{ path: string; title: string; subtitle: string }> = [
  { path: "/questoes/cadernos/novo", title: "Questões", subtitle: "Selecione os filtros abaixo para encontrar as questões que você deseja resolver." },
];

/** Rotas sem questões na tela: só nelas os atalhos 1–7 navegam (nas outras, 1–5 escolhem alternativas). */
const SHORTCUT_ROUTES = ["painel", "trilhas", "desempenho", "perfil"];

/**
 * Casco "Leveza Pastel": barra lateral de vidro com destaque deslizante, cabeçalho com
 * busca (⌘K) e "Nova trilha", barra flutuante no celular e toasts.
 * Tudo navega para rotas reais; contadores vêm do banco (ShellSummary).
 */
export function PastelShell({
  summary,
  children,
  logout,
  basePath = "",
  notice,
}: {
  summary: ShellSummary;
  children: ReactNode;
  logout?: ReactNode;
  /** Prefixo das rotas (a galeria de desenvolvimento usa /dev/galeria). */
  basePath?: string;
  notice?: ReactNode;
}) {
  const path = usePathname();
  const router = useRouter();
  const items = useMemo(() => navItems(summary, basePath), [summary, basePath]);
  const active = items.find((i) => [i.href, ...(i.also ?? [])].some((p) => path === p || path.startsWith(`${p}/`))) ?? null;
  const activeIndex = active ? items.indexOf(active) : -1;
  // Submenu de matérias logo abaixo de "Estudos": o destaque deslizante dos itens
  // seguintes desce a altura do submenu (medida no navegador).
  const studiesIndex = items.findIndex((i) => i.id === "trilhas");
  const subRef = useRef<HTMLDivElement>(null);
  const [subH, setSubH] = useState(0);
  useEffect(() => {
    const el = subRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSubH(el.offsetHeight));
    ro.observe(el);
    return () => ro.disconnect();
  });
  const [collapsed, setCollapsedStored] = useStored("na:sidebar-recolhida", false);
  const toggleCollapsed = () => setCollapsedStored(!collapsed);
  const [toast, setToast] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  const shortcutsOn = !!active && SHORTCUT_ROUTES.includes(active.id) && !path.startsWith(`${basePath}/aula`);
  // Modo Jogo: cabeçalho escuro, contínuo com o palco preto da página.
  const dark = active?.id === "quiz";
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const typing = !!target.closest("input, textarea, select, [contenteditable=true]");
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        searchRef.current?.focus();
        return;
      }
      if (!shortcutsOn || typing || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key >= "1" && e.key <= "7") {
        const item = items[Number(e.key) - 1];
        if (item) router.push(item.href);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [items, router, shortcutsOn]);

  const isPainel = active?.id === "painel";
  // Página de Estudos: cabeçalho com saudação (desktop) e logo + menu (celular).
  const isEstudos = path === `${basePath}/trilhas`;
  // Aula: no celular, cabeçalho com menu (árvore de aulas no menu); no desktop, árvore na barra lateral.
  const isAula = path.startsWith(`${basePath}/aula`);
  // Páginas internas com cabeçalho próprio (título e linha de apoio).
  const heading = PAGE_HEADINGS.find((h) => path === `${basePath}${h.path}`) ?? null;
  const title = heading ? heading.title : isPainel ? (
    <>
      {summary.name ? `Olá, ${summary.name} ` : "Olá! "}
      <span className="inline-block animate-[float_3s_ease-in-out_infinite]" aria-hidden>👋</span>
    </>
  ) : (
    active?.title ?? "APROVUM"
  );

  return (
    <ToastCtx.Provider value={setToast}>
      <div className="pastel relative min-h-screen w-full overflow-x-clip font-[Inter,system-ui,sans-serif] text-[#0A0A0A] antialiased selection:bg-[#E10600]/25">
        <div className={`pointer-events-none fixed inset-0 max-w-[100vw] overflow-hidden ${dark ? "bg-[#070707]" : "bg-white"}`} />
        <div className="pointer-events-none fixed inset-0 max-w-[100vw] overflow-hidden" aria-hidden>
          <div className="absolute -top-[220px] -left-[140px] h-[min(620px,80vw)] w-[min(620px,80vw)] animate-[meshMove_18s_ease-in-out_infinite] rounded-full bg-[#E10600]/[0.05] blur-[70px]" />
          <div className="absolute -top-[120px] -right-[120px] h-[min(560px,70vw)] w-[min(560px,70vw)] animate-[meshMove_22s_ease-in-out_infinite_2s] rounded-full bg-black/[0.025] blur-[70px]" />
          <div className="absolute bottom-[-120px] left-[24%] h-[min(520px,70vw)] w-[min(720px,90vw)] animate-[meshMove_20s_ease-in-out_infinite_1s] rounded-full bg-[#E10600]/[0.05] blur-[80px]" />
          <div className="absolute top-[50%] right-[10%] h-[min(380px,60vw)] w-[min(380px,60vw)] animate-[meshMove_24s_ease-in-out_infinite_0.5s] rounded-full bg-black/[0.025] blur-[60px]" />
        </div>

        <div className="relative flex min-h-screen w-full max-w-[100vw]">
          {/* Barra lateral (desktop) */}
          <aside
            className={`sticky top-0 z-30 hidden h-screen shrink-0 flex-col transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] lg:flex ${collapsed ? "w-[100px]" : "w-[272px] xl:w-[292px]"}`}
            style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
          >
            <div className="barra-lateral m-4 flex min-h-0 flex-1 flex-col overflow-hidden rounded-[32px] border border-[#1F1F1F] bg-[#0A0A0A] text-white shadow-[0_16px_48px_rgba(225,6,0,0.10),inset_0_1px_0_rgba(255,255,255,0.05)]">
              <div className="barra-topo flex items-center gap-3.5 p-[22px]">
                <Link
                  href={`${basePath}/painel`}
                  aria-label="APROVUM — ir para o painel"
                  className="group relative flex h-[52px] w-[52px] shrink-0 items-center justify-center overflow-hidden rounded-[16px] border border-[#2A2A2A] bg-black shadow-[0_8px_24px_rgba(225,6,0,0.30)]"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/icons/aprovum-mark.png" alt="" className="h-full w-full scale-110 object-cover transition-transform duration-500 group-hover:scale-125" />
                </Link>
                {!collapsed && (
                  <div className="leading-none">
                    <div className="font-[Space_Grotesk] text-[21px] font-[700] tracking-[0.04em]">
                      APRO<span className="text-[#F80000]">V</span>UM
                    </div>
                    <div className="mt-1.5 text-[8.5px] font-semibold uppercase tracking-[0.16em] text-[#A3A3A3]">Sua preparação. Seu próximo cargo.</div>
                  </div>
                )}
              </div>

              <div className="relative min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-3 [scrollbar-width:none]">
                {activeIndex >= 0 && (
                  <div
                    aria-hidden
                    className="barra-indicador absolute left-3 right-3 rounded-[18px] bg-gradient-to-r from-[#FF1E1E] to-[#B30000] shadow-[0_10px_24px_rgba(225,6,0,0.32),inset_0_1px_0_rgba(255,255,255,0.3)] transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
                    style={{
                      transform:
                        !collapsed && summary.subjects.length > 0 && subH > 0 && activeIndex > studiesIndex
                          ? `translateY(calc(${activeIndex} * var(--passo) + ${subH}px + var(--passo) - var(--item)))`
                          : `translateY(calc(${activeIndex} * var(--passo)))`,
                    }}
                  />
                )}
                <nav aria-label="Principal" className="barra-nav relative flex flex-col">
                  {items.map((s) => {
                    const on = active?.id === s.id;
                    return (
                      <Fragment key={s.id}>
                      <Link
                        href={s.href}
                        aria-current={on ? "page" : undefined}
                        aria-label={collapsed ? s.label : undefined}
                        onClick={() => {
                          if (path === s.href) setToast(`${s.label} já está aberto ✨`);
                        }}
                        className={`barra-item group relative flex w-full items-center gap-3.5 rounded-[18px] px-4 text-left text-[14.5px] font-medium transition-all duration-300 ${on ? "text-white" : "text-[#B3B3B3] hover:bg-white/[0.06] hover:text-white"}`}
                      >
                        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] transition-all duration-300 ${on ? "bg-white/20 text-white" : "bg-[#1A1A1A] group-hover:rotate-[-6deg] group-hover:scale-110 group-hover:bg-[#1C1C1C]"}`}>
                          <s.icon className="h-[18px] w-[18px]" aria-hidden />
                        </span>
                        {!collapsed && (
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-2">
                              <span className={`font-semibold tracking-tight ${on ? "text-white" : ""}`}>{s.label}</span>
                              {!on && shortcutsOn && (
                                <span className="rounded-full border border-[#2E2E2E] bg-[#1A1A1A] px-1.5 py-0.5 text-[10px]" aria-label={`atalho ${s.num}`}>{s.num}</span>
                              )}
                            </span>
                            <span className={`mt-0.5 block text-[11px] leading-none ${on ? "text-white/80" : "text-[#A3A3A3]"}`} data-testid={`nav-desc-${s.id}`}>{s.desc}</span>
                          </span>
                        )}
                        {!collapsed && on && <ChevronRight className="h-4 w-4 text-white/70 transition-transform group-hover:translate-x-0.5" aria-hidden />}
                        {collapsed && (
                          <span className="pointer-events-none absolute left-[84px] top-1/2 z-50 -translate-y-1/2 whitespace-nowrap rounded-[12px] border border-[#333] bg-[#1C1C1C] px-3 py-2 text-[12px] font-medium text-white opacity-0 shadow-xl transition-all duration-300 group-hover:translate-x-1 group-hover:opacity-100">
                            {s.label} <span className="text-white/50">[{s.num}]</span>
                          </span>
                        )}
                      </Link>
                      {s.id === "trilhas" && !collapsed && summary.subjects.length > 0 && (
                        <div ref={subRef}>
                          <SubjectsSubmenu subjects={summary.subjects} base={basePath} path={path} />
                        </div>
                      )}
                      </Fragment>
                    );
                  })}
                </nav>
                {isAula && !collapsed && <div id="aula-arvore-desktop" className="mt-4 border-t border-white/10 px-1 pt-4" />}
              </div>

              <div className="barra-base mt-auto shrink-0 p-4">
                {!collapsed ? (
                  <>
                    <PastelCard delay={600} noTilt glowColor="225,6,0" className={`barra-streak ${isAula || isPainel ? "!hidden" : ""} !rounded-[20px] !shadow-none border-[#2E2E2E] bg-gradient-to-br from-[#1A1A1A] to-[#120606]`}>
                      <div className="p-4" data-testid="streak-card">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#161616] text-[14px] shadow" aria-hidden>🔥</div>
                            <div>
                              <div className="text-[13px] font-bold leading-none">
                                {summary.streak.current > 0 ? `Streak ${plural(summary.streak.current, "dia", "dias")}!` : "Sem sequência ainda"}
                              </div>
                              <div className="text-[11px] text-[#B3B3B3]">{summary.streak.message}</div>
                            </div>
                          </div>
                          <div className="flex h-7 w-7 items-center justify-center rounded-full border border-[#E10600]/60 bg-black" aria-hidden>
                            <Crown className="h-3.5 w-3.5 text-[#FF2A2A]" />
                          </div>
                        </div>
                        <div className="mt-3 flex h-2 gap-1 overflow-hidden rounded-full bg-[#161616]" role="img" aria-label={`Estudou em ${summary.streak.last7.filter(Boolean).length} dos últimos 7 dias`}>
                          {summary.streak.last7.map((on, i) => (
                            <div key={i} className={`h-full flex-1 rounded-full ${on ? "bg-gradient-to-r from-[#FF1E1E] to-[#B30000]" : "bg-[#2A2A2A]"}`} style={{ opacity: on ? 0.4 + i * 0.09 : 1 }} />
                          ))}
                        </div>
                      </div>
                    </PastelCard>
                    <div className="mt-3 flex gap-2">
                      <button type="button" onClick={toggleCollapsed} className="flex h-10 flex-1 items-center justify-center gap-2 rounded-[12px] border border-[#2A2A2A] bg-[#161616] text-[12px] font-semibold transition hover:bg-[#1A1A1A]">
                        <PanelLeftClose className="h-4 w-4" aria-hidden /> Recolher
                      </button>
                      <Link
                        href={`${basePath}/revisoes`}
                        aria-label={`Revisões pendentes: ${summary.counts.dueReviews}`}
                        className="relative flex h-10 w-10 items-center justify-center rounded-[12px] border border-[#2A2A2A] bg-[#161616] transition hover:bg-[#1A1A1A]"
                      >
                        <Bell className="h-4 w-4" aria-hidden />
                        {summary.counts.dueReviews > 0 && (
                          <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-[#E10600] px-1 text-center text-[10px] font-bold leading-4 text-white">{summary.counts.dueReviews}</span>
                        )}
                      </Link>
                      {logout}
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col gap-2">
                    <button type="button" onClick={toggleCollapsed} aria-label="Expandir barra lateral" className="flex h-12 w-full items-center justify-center rounded-[16px] border border-[#2A2A2A] bg-[#161616] transition hover:bg-[#1A1A1A]">
                      <PanelLeftOpen className="h-5 w-5" aria-hidden />
                    </button>
                    <div className="flex h-12 w-full items-center justify-center rounded-[16px] bg-gradient-to-br from-[#FF1E1E] to-[#B30000] text-[13px] font-bold text-white shadow-lg" title={`Sequência: ${summary.streak.current} dia(s)`}>
                      <span aria-hidden>🔥</span>
                      <span className="sr-only">Sequência de {summary.streak.current} dia(s)</span>
                      <span aria-hidden className="ml-0.5">{summary.streak.current}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </aside>

          <div className="min-w-0 flex-1">
            <header
              className={`sticky top-0 z-20 border-b backdrop-blur-[18px] ${dark ? "border-transparent bg-[#070707] text-white" : "border-black/[0.06] bg-white/75"}`}
              style={{ top: "env(safe-area-inset-top, 0px)" }}
            >
              {isEstudos ? (
                <EstudosHeader summary={summary} basePath={basePath} items={items} searchRef={searchRef} />
              ) : (
                <>
                {isAula && <EstudosHeader summary={summary} basePath={basePath} items={items} searchRef={searchRef} mobileOnly />}
                <div className={isAula ? "hidden lg:block" : undefined}>
              <div className="flex h-[88px] items-center justify-between gap-4 px-5 lg:px-10">
                <div className="flex min-w-0 flex-1 items-center gap-4">
                  {dark && (
                    <span className="jogo-cabecalho-barras hidden sm:block" aria-hidden>
                      {"//"}
                    </span>
                  )}
                  <Link
                    href={`${basePath}/perfil`}
                    aria-label="Perfil e conquistas"
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] border shadow lg:hidden ${dark ? "border-white/15 bg-[#161616] text-white" : "border-[#E5E5E5] bg-[#F5F5F5]"}`}
                  >
                    <UserRound className="h-5 w-5" aria-hidden />
                  </Link>
                  <div className="min-w-0">
                    {isPainel ? (
                      // Painel: a saudação com o nome fica no banner principal; aqui, só o lema.
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="h-7 w-[3px] shrink-0 rounded-full bg-[#D90A00]" aria-hidden />
                        <RotatingQuote uniform className="text-[14px] leading-tight sm:text-[16px] lg:text-[18px]" />
                      </div>
                    ) : active?.id === "perfil" ? (
                      <h1 className="flex items-center gap-2 truncate font-[Space_Grotesk] text-[24px] font-[800] leading-none tracking-[-0.02em] sm:text-[28px] lg:text-[34px]">{title}</h1>
                    ) : (
                      <p className="flex items-center gap-2 truncate font-[Space_Grotesk] text-[24px] font-[800] leading-none tracking-[-0.02em] sm:text-[28px] lg:text-[34px]">{title}</p>
                    )}
                    <div className={`mt-2 hidden items-center gap-2 text-[13.5px] sm:flex ${dark ? "text-white/65" : "text-[#4D4D4D]"}`}>
                      <span className={`flex h-6 w-6 items-center justify-center rounded-full border ${dark ? "border-white/15 bg-[#161616]" : "border-[#E0E0E0] bg-[#F4F4F4]"}`} aria-hidden>
                        <Target className="h-3.5 w-3.5 text-[#FF1E1E]" />
                      </span>
                      <span className="truncate">
                        {isPainel ? (notice ?? "Um conteúdo por vez: aula completa e três níveis — fácil, médio e difícil.") : `${heading?.subtitle ?? active?.subtitle ?? active?.desc ?? ""}${shortcutsOn ? " • atalhos 1-7" : ""}`}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2.5">
                  <QuickSearch inputRef={searchRef} basePath={basePath} items={items} dark={dark} />
                  {dark && (
                    <>
                      <Link
                        href={`${basePath}/revisoes`}
                        aria-label={`Revisões pendentes: ${summary.counts.dueReviews}`}
                        className="relative hidden h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-[#111113] text-white transition hover:border-[#FF1E1E]/60 md:flex"
                      >
                        <Bell className="h-5 w-5" aria-hidden />
                        {summary.counts.dueReviews > 0 && (
                          <span className="absolute -right-0.5 -top-0.5 min-w-[18px] rounded-full bg-[#E10600] px-1 text-center text-[10.5px] font-bold leading-[18px] text-white">{summary.counts.dueReviews}</span>
                        )}
                      </Link>
                      <Link
                        href={`${basePath}/perfil`}
                        aria-label="Perfil e conquistas"
                        className="hidden h-11 w-11 items-center justify-center rounded-full border-2 border-white/70 bg-[#111113] text-white transition hover:border-[#FF1E1E] lg:flex"
                      >
                        <UserRound className="h-5 w-5" aria-hidden />
                      </Link>
                    </>
                  )}
                </div>
              </div>
                </div>
                </>
              )}
            </header>

            <ConnectivityBanner />
            <main className="px-4 py-7 pb-28 sm:px-5 lg:px-10 lg:pb-12">
              <div key={active?.id ?? path} className="animate-[enter_0.5s_cubic-bezier(0.34,1.56,0.64,1)]">{children}</div>
            </main>

            {/* Barra flutuante (celular) */}
            <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 p-3 pb-[calc(12px+env(safe-area-inset-bottom))] lg:hidden">
              <nav aria-label="Principal (celular)" className="glass pointer-events-auto mx-auto flex max-w-[520px] items-stretch justify-between gap-0.5 rounded-[22px] border border-[#262626] bg-[#0E0E0E]/90 p-1.5 shadow-[0_16px_40px_rgba(0,0,0,0.14)]">
                {items.slice(0, 6).map((s) => {
                  const on = active?.id === s.id;
                  return (
                    <Link
                      key={s.id}
                      href={s.href}
                      aria-label={s.short ? s.label : undefined}
                      aria-current={on ? "page" : undefined}
                      className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-[14px] px-0.5 py-1.5 transition-all ${on ? "bg-[#E10600] text-white shadow" : "text-[#A3A3A3]"}`}
                    >
                      <s.icon className="h-5 w-5 shrink-0" aria-hidden />
                      <span className="whitespace-nowrap text-[9.5px] font-semibold leading-tight tracking-[-0.02em]">{s.short ?? s.label}</span>
                    </Link>
                  );
                })}
                <Link
                  href={`${basePath}/nova-trilha`}
                  aria-label="Novo estudo"
                  className="flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-[14px] bg-gradient-to-br from-[#FF1E1E] to-[#B30000] px-0.5 py-1.5 text-white shadow-[0_6px_16px_rgba(225,6,0,0.35)]"
                >
                  <Plus className="h-5 w-5 shrink-0" aria-hidden />
                  <span className="whitespace-nowrap text-[9.5px] font-semibold leading-tight">Novo</span>
                </Link>
              </nav>
            </div>
          </div>
        </div>

        <div className="pointer-events-none fixed bottom-24 left-1/2 z-[80] flex -translate-x-1/2 flex-col items-center gap-2 lg:bottom-6" aria-live="polite">
          {toast && (
            <div className="pointer-events-auto flex animate-[enter_0.45s_cubic-bezier(0.34,1.56,0.64,1)] items-center gap-2.5 rounded-[16px] border border-[#E10600]/50 bg-[#141414] px-5 py-3 text-[13px] font-medium text-white shadow-[0_16px_40px_rgba(0,0,0,0.28)]" role="status">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/15" aria-hidden>✨</span>
              {toast}
            </div>
          )}
        </div>
      </div>
    </ToastCtx.Provider>
  );
}

// ---------------------------------------------------------------------------
// Busca (⌘K): atalhos de navegação + trilhas, temas e revisões reais do aluno
// ---------------------------------------------------------------------------
function QuickSearch({ inputRef, basePath, items, dark = false }: { inputRef: React.RefObject<HTMLInputElement | null>; basePath: string; items: NavItem[]; dark?: boolean }) {
  const api = useStudyApi();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [found, setFound] = useState<{ term: string; items: SearchItem[] }>({ term: "", items: [] });
  const [cursor, setCursor] = useState(0);
  const toast = usePastelToast();

  const pages: SearchItem[] = useMemo(
    () => items.map((i) => ({ type: "Página" as const, name: i.label, href: i.href })).concat([{ type: "Página" as const, name: "Novo estudo", href: `${basePath}/nova-trilha` }]),
    [items, basePath],
  );

  const term = q.trim().toLowerCase();
  useEffect(() => {
    const t0 = q.trim();
    if (t0.length < 2) return;
    let alive = true;
    const t = setTimeout(async () => {
      const r = await api.search(t0);
      if (alive) setFound({ term: t0.toLowerCase(), items: r.ok ? r.data : [] });
    }, 200);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [q, api]);
  const results = term.length >= 2 && found.term === term ? found.items : [];
  const loading = term.length >= 2 && found.term !== term;
  const list = [...pages.filter((p) => term && p.name.toLowerCase().includes(term)), ...results].slice(0, 9);

  const go = useCallback(
    (item: SearchItem) => {
      setOpen(false);
      setQ("");
      toast(`Abrindo ${item.name}`);
      router.push(item.href);
    },
    [router, toast],
  );

  return (
    <div className="relative hidden md:flex">
      <Search className={`absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 ${dark ? "text-white/80" : "text-[#5C5C5C]"}`} aria-hidden />
      <input
        ref={inputRef}
        value={q}
        role="combobox"
        aria-expanded={open && !!q}
        aria-controls="busca-resultados"
        aria-label="Buscar estudos, temas e revisões"
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(!!e.target.value);
          setCursor(0);
        }}
        onFocus={() => q && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setOpen(false);
            (e.target as HTMLInputElement).blur();
          } else if (e.key === "ArrowDown") {
            e.preventDefault();
            setCursor((c) => Math.min(c + 1, Math.max(list.length - 1, 0)));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setCursor((c) => Math.max(c - 1, 0));
          } else if (e.key === "Enter" && list[cursor]) {
            e.preventDefault();
            go(list[cursor]);
          }
        }}
        placeholder="Buscar (⌘K) ..."
        className={`h-11 w-[220px] rounded-[14px] border pl-10 pr-4 text-[13px] outline-none transition-all xl:w-[260px] ${dark ? "border-white/15 bg-[#111113] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.02)] placeholder:text-white/70 focus:border-[#FF1E1E]/60 focus:shadow-[0_0_20px_rgba(225,6,0,0.25)] xl:w-[340px]" : "border-[#E5E5E5] bg-white/95 shadow-[0_2px_12px_rgba(225,6,0,0.06)] placeholder:text-[#5C5C5C] focus:border-[#FF1E1E]/30 focus:shadow-[0_4px_20px_rgba(225,6,0,0.12)]"}`}
      />
      {open && q && (
        <div id="busca-resultados" role="listbox" className="absolute left-0 right-0 top-[52px] z-50 overflow-hidden rounded-[16px] border border-[#E5E5E5] bg-[#F5F5F5] shadow-[0_16px_48px_rgba(0,0,0,0.12)]">
          {list.length ? (
            list.map((s, i) => (
              <button
                key={`${s.type}-${s.href}-${s.name}`}
                type="button"
                role="option"
                aria-selected={i === cursor}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => go(s)}
                className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-[#F4F4F4] aria-selected:bg-[#F4F4F4]"
              >
                <span className="min-w-0 truncate text-[13px]">
                  <span className="mr-2 rounded bg-[#F4F4F4] px-1.5 py-0.5 text-[10px]">{s.type}</span>
                  {s.name}
                </span>
                <ArrowRight className="h-3.5 w-3.5 shrink-0 text-[#5C5C5C]" aria-hidden />
              </button>
            ))
          ) : (
            <div className="px-4 py-3 text-[13px] text-[#5C5C5C]">{loading || term.length < 2 ? "Buscando…" : "Nada encontrado"}</div>
          )}
        </div>
      )}
    </div>
  );
}


// ---------------------------------------------------------------------------
// Cabeçalho da página de Estudos
// ---------------------------------------------------------------------------
function EstudosHeader({ summary, basePath, items, searchRef, mobileOnly = false }: { summary: ShellSummary; basePath: string; items: NavItem[]; searchRef: React.RefObject<HTMLInputElement | null>; mobileOnly?: boolean }) {
  const menuRef = useRef<HTMLDialogElement>(null);
  const path = usePathname();
  const bell = (
    <Link
      href={`${basePath}/revisoes`}
      aria-label={`Revisões pendentes: ${summary.counts.dueReviews}`}
      className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[#0A0A0A] transition hover:bg-black/[0.05]"
    >
      <Bell className="h-[22px] w-[22px]" aria-hidden />
      {summary.counts.dueReviews > 0 && (
        <span className="absolute right-0.5 top-0.5 min-w-[18px] rounded-full bg-[#F01820] px-1 text-center text-[10.5px] font-bold leading-[18px] text-white ring-2 ring-white">{summary.counts.dueReviews}</span>
      )}
    </Link>
  );
  const avatar = (
    <Link href={`${basePath}/perfil`} aria-label="Perfil e conquistas" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#080808] text-white shadow-[0_6px_16px_rgba(0,0,0,0.18)] transition hover:ring-2 hover:ring-[#F01820]/60">
      <UserRound className="h-5 w-5" aria-hidden />
    </Link>
  );
  return (
    <>
      {/* Celular: menu, logo, avisos e perfil */}
      <div className="flex h-[72px] items-center gap-3 px-4 lg:hidden">
        <button type="button" onClick={() => menuRef.current?.showModal()} aria-label="Abrir menu" aria-haspopup="dialog" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] text-[#0A0A0A] hover:bg-black/[0.05]">
          <Menu className="h-6 w-6" aria-hidden />
        </button>
        <Link href={`${basePath}/painel`} aria-label="APROVUM — ir para o painel" className="min-w-0 flex-1 border-l border-[#E5E8ED] pl-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/aprovum-logo-escura.png" alt="APROVUM — Sua preparação. Seu próximo cargo." width={523} height={107} className="h-auto w-full max-w-[210px]" />
        </Link>
        {bell}
        <span className="h-7 w-px bg-[#E5E8ED]" aria-hidden />
        {avatar}
      </div>
      {/* Desktop: saudação com o nome real, busca, avisos e perfil */}
      <div className={`hidden h-[88px] items-center justify-between gap-4 px-10 ${mobileOnly ? "" : "lg:flex"}`}>
        <div className="flex min-w-0 items-center gap-5">
          <span className="estudos-barras" aria-hidden>{"///"}</span>
          <div className="min-w-0">
            <h1 className="flex items-center gap-2 truncate font-[Space_Grotesk] text-[28px] font-[800] leading-none tracking-[-0.02em] xl:text-[30px]">
              {summary.name ? `Olá, ${summary.name}` : "Olá!"} <span className="inline-block animate-[float_3s_ease-in-out_infinite]" aria-hidden>👋</span>
            </h1>
            <p className="mt-1.5 truncate text-[15px] font-medium text-[#15171B]">
              <span className="text-[#F01820]">Disciplina</span> hoje, <span className="text-[#F01820]">resultado</span> amanhã.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <QuickSearch inputRef={searchRef} basePath={basePath} items={items} />
          {bell}
          <span className="h-8 w-px bg-[#E5E8ED]" aria-hidden />
          {avatar}
        </div>
      </div>

      {/* Menu do celular (hambúrguer) */}
      <dialog
        ref={menuRef}
        aria-label="Menu"
        className="m-0 h-dvh max-h-none w-[min(86vw,340px)] max-w-none bg-transparent p-0 backdrop:bg-black/50 open:animate-[enter_0.3s_ease-out]"
        onClick={(e) => {
          if (e.target === e.currentTarget) e.currentTarget.close();
        }}
      >
        <nav aria-label="Menu principal" className="flex h-full flex-col overflow-y-auto bg-[#0A0A0A] px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] text-white">
          <div className="flex items-center justify-between gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/aprovum-login-logo.png" alt="APROVUM" width={523} height={107} className="h-auto w-[190px]" />
            <button type="button" onClick={() => menuRef.current?.close()} aria-label="Fechar menu" className="flex h-11 w-11 items-center justify-center rounded-[12px] bg-white/[0.06] hover:bg-white/[0.12]">
              <X className="h-5 w-5" aria-hidden />
            </button>
          </div>
          <ul className="mt-6 flex flex-col gap-1.5">
            {items.map((s) => {
              const on = path === s.href || (s.also ?? []).some((a) => path.startsWith(a));
              return (
                <li key={s.id}>
                  <Link
                    href={s.href}
                    onClick={() => menuRef.current?.close()}
                    aria-current={on ? "page" : undefined}
                    className={`flex min-h-14 items-center gap-3.5 rounded-[16px] px-3.5 ${on ? "bg-gradient-to-r from-[#FF1E1E] to-[#B30000] text-white" : "text-[#C9C9C9] hover:bg-white/[0.06]"}`}
                  >
                    <span className={`flex h-9 w-9 items-center justify-center rounded-[12px] ${on ? "bg-white/20" : "bg-[#1A1A1A]"}`}>
                      <s.icon className="h-[18px] w-[18px]" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold">{s.label}</span>
                      <span className={`block text-[11.5px] ${on ? "text-white/80" : "text-[#9A9A9A]"}`}>{s.desc}</span>
                    </span>
                  </Link>
                  {s.id === "trilhas" && <SubjectsSubmenu subjects={summary.subjects} base={basePath} path={path} variant="menu" onNavigate={() => menuRef.current?.close()} />}
                </li>
              );
            })}
          </ul>
          <Link
            href={`${basePath}/nova-trilha`}
            onClick={() => menuRef.current?.close()}
            className="mt-4 flex min-h-12 items-center justify-center gap-2 rounded-[16px] bg-gradient-to-br from-[#FF1E1E] to-[#B30000] font-semibold text-white"
          >
            <Plus className="h-5 w-5" aria-hidden /> Novo estudo
          </Link>
          {path.includes("/aula") && <div id="aula-arvore-movel" className="mt-5 border-t border-white/10 pt-4" />}
        </nav>
      </dialog>
    </>
  );
}
