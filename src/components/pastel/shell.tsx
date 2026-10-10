"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  ArrowRight,
  Bell,
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
  Sparkles,
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

// ---------------------------------------------------------------------------
// Toast (mensagens curtas de confirmação, como no design original)
// ---------------------------------------------------------------------------
const ToastCtx = createContext<(msg: string) => void>(() => {});
export const usePastelToast = () => useContext(ToastCtx);

interface NavItem {
  id: string;
  href: string;
  label: string;
  icon: LucideIcon;
  num: string;
  desc: string;
  also?: string[];
  title: string;
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

function navItems(s: ShellSummary, base: string): NavItem[] {
  return [
    { id: "painel", href: `${base}/painel`, label: "Painel", icon: House, num: "1", desc: "Visão geral", title: "" },
    { id: "trilhas", href: `${base}/trilhas`, label: "Trilhas", icon: MapIcon, num: "2", desc: plural(s.counts.trails, "trilha", "trilhas"), also: [`${base}/trilha`, `${base}/aula`, `${base}/nova-trilha`], title: "Suas trilhas" },
    { id: "questoes", href: `${base}/questoes`, label: "Questões", icon: CircleHelp, num: "3", desc: `Banco ${s.counts.questions}`, also: [`${base}/simulado`], title: "Banco de questões" },
    { id: "revisoes", href: `${base}/revisoes`, label: "Revisões", icon: Clock3, num: "4", desc: plural(s.counts.dueReviews, "pendente", "pendentes"), title: "Revisões" },
    { id: "desempenho", href: `${base}/desempenho`, label: "Desempenho", icon: ChartColumn, num: "5", desc: plural(s.counts.answered, "resposta", "respostas"), title: "Desempenho" },
    { id: "perfil", href: `${base}/perfil`, label: "Perfil", icon: Settings, num: "6", desc: `Nível ${s.level}`, title: "Perfil & conquistas" },
  ];
}

/** Rotas sem questões na tela: só nelas os atalhos 1–6 navegam (nas outras, 1–5 escolhem alternativas). */
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
      if (e.key >= "1" && e.key <= "6") {
        const item = items[Number(e.key) - 1];
        if (item) router.push(item.href);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [items, router, shortcutsOn]);

  const isPainel = active?.id === "painel";
  const title = isPainel ? (
    <>
      {summary.name ? `Olá, ${summary.name} ` : "Olá! "}
      <span className="inline-block animate-[float_3s_ease-in-out_infinite]" aria-hidden>👋</span>
    </>
  ) : (
    active?.title ?? "Nível Aprovado"
  );

  return (
    <ToastCtx.Provider value={setToast}>
      <div className="pastel relative min-h-screen w-full overflow-x-hidden font-[Inter,system-ui,sans-serif] text-[#1E1B4B] antialiased selection:bg-[#7C6BFF]/20">
        <div className="pointer-events-none fixed inset-0 max-w-[100vw] overflow-hidden bg-[#FFF9F3]" />
        <div className="pointer-events-none fixed inset-0 max-w-[100vw] overflow-hidden" aria-hidden>
          <div className="absolute -top-[220px] -left-[140px] h-[min(620px,80vw)] w-[min(620px,80vw)] animate-[meshMove_18s_ease-in-out_infinite] rounded-full bg-[#E8E6FF]/70 blur-[70px]" />
          <div className="absolute -top-[120px] -right-[120px] h-[min(560px,70vw)] w-[min(560px,70vw)] animate-[meshMove_22s_ease-in-out_infinite_2s] rounded-full bg-[#FFE9E0]/60 blur-[70px]" />
          <div className="absolute bottom-[-120px] left-[24%] h-[min(520px,70vw)] w-[min(720px,90vw)] animate-[meshMove_20s_ease-in-out_infinite_1s] rounded-full bg-[#E0F5FF]/60 blur-[80px]" />
          <div className="absolute top-[50%] right-[10%] h-[min(380px,60vw)] w-[min(380px,60vw)] animate-[meshMove_24s_ease-in-out_infinite_0.5s] rounded-full bg-[#F3E5FF]/50 blur-[60px]" />
        </div>

        <div className="relative flex min-h-screen w-full max-w-[100vw]">
          {/* Barra lateral (desktop) */}
          <aside
            className={`sticky top-0 z-30 hidden h-screen shrink-0 flex-col transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] lg:flex ${collapsed ? "w-[100px]" : "w-[320px]"}`}
            style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
          >
            <div className="glass m-4 flex flex-1 flex-col overflow-hidden rounded-[32px] border border-white bg-white/70 shadow-[0_16px_48px_rgba(124,107,255,0.10),inset_0_1px_0_white]">
              <div className="flex items-center gap-3.5 p-[22px]">
                <Link
                  href={`${basePath}/painel`}
                  aria-label="Nível Aprovado — ir para o painel"
                  className="group relative flex h-[48px] w-[48px] shrink-0 items-center justify-center overflow-hidden rounded-[16px] bg-gradient-to-br from-[#7C6BFF] via-[#8B7FFF] to-[#5B8DEF] shadow-[0_8px_24px_rgba(124,107,255,0.40),inset_0_1px_0_rgba(255,255,255,0.4)]"
                >
                  <span className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                  <Sparkles className="relative z-10 h-6 w-6 text-white transition-transform duration-500 group-hover:rotate-12" aria-hidden />
                </Link>
                {!collapsed && (
                  <div className="leading-[0.95]">
                    <div className="font-[Space_Grotesk] text-[17px] font-[700] tracking-tight">Nível</div>
                    <div className="text-gradient -mt-0.5 font-[Space_Grotesk] text-[17px] font-[800]">Aprovado</div>
                    <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#6F6D92]">Estudo por tema</div>
                  </div>
                )}
              </div>

              <div className="relative flex-1 px-3">
                {activeIndex >= 0 && (
                  <div
                    aria-hidden
                    className="absolute left-3 right-3 h-[56px] rounded-[18px] bg-gradient-to-r from-[#7C6BFF] to-[#5B8DEF] shadow-[0_10px_24px_rgba(124,107,255,0.32),inset_0_1px_0_rgba(255,255,255,0.3)] transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
                    style={{ transform: `translateY(${activeIndex * 64}px)` }}
                  />
                )}
                <nav aria-label="Principal" className="relative space-y-2">
                  {items.map((s) => {
                    const on = active?.id === s.id;
                    return (
                      <Link
                        key={s.id}
                        href={s.href}
                        aria-current={on ? "page" : undefined}
                        aria-label={collapsed ? s.label : undefined}
                        onClick={() => {
                          if (path === s.href) setToast(`${s.label} já está aberto ✨`);
                        }}
                        className={`group relative flex h-[56px] w-full items-center gap-3.5 rounded-[18px] px-4 text-left text-[14.5px] font-medium transition-all duration-300 ${on ? "text-white" : "text-[#6B6A8A] hover:bg-white/60 hover:text-[#1E1B4B]"}`}
                      >
                        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] transition-all duration-300 ${on ? "bg-white/20 text-white" : "bg-[#F5F3FF] group-hover:rotate-[-6deg] group-hover:scale-110 group-hover:bg-white"}`}>
                          <s.icon className="h-[18px] w-[18px]" aria-hidden />
                        </span>
                        {!collapsed && (
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-2">
                              <span className={`font-semibold tracking-tight ${on ? "text-white" : ""}`}>{s.label}</span>
                              {!on && shortcutsOn && (
                                <span className="rounded-full border border-[#EDE9FF] bg-[#F5F3FF] px-1.5 py-0.5 text-[10px]" aria-label={`atalho ${s.num}`}>{s.num}</span>
                              )}
                            </span>
                            <span className={`mt-0.5 block text-[11px] leading-none ${on ? "text-white/80" : "text-[#6F6D92]"}`} data-testid={`nav-desc-${s.id}`}>{s.desc}</span>
                          </span>
                        )}
                        {!collapsed && on && <ChevronRight className="h-4 w-4 text-white/70 transition-transform group-hover:translate-x-0.5" aria-hidden />}
                        {collapsed && (
                          <span className="pointer-events-none absolute left-[84px] top-1/2 z-50 -translate-y-1/2 whitespace-nowrap rounded-[12px] bg-[#1E1B4B] px-3 py-2 text-[12px] font-medium text-white opacity-0 shadow-xl transition-all duration-300 group-hover:translate-x-1 group-hover:opacity-100">
                            {s.label} <span className="text-white/50">[{s.num}]</span>
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </nav>
              </div>

              <div className="mt-auto p-4">
                {!collapsed ? (
                  <>
                    <PastelCard delay={600} noTilt glowColor="124,107,255" className="!rounded-[20px] !shadow-none border-[#EDE9FF] bg-gradient-to-br from-[#F5F3FF] to-[#EEF2FF]">
                      <div className="p-4" data-testid="streak-card">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-[14px] shadow" aria-hidden>🔥</div>
                            <div>
                              <div className="text-[13px] font-bold leading-none">
                                {summary.streak.current > 0 ? `Streak ${plural(summary.streak.current, "dia", "dias")}!` : "Sem sequência ainda"}
                              </div>
                              <div className="text-[11px] text-[#6B6A8A]">{summary.streak.message}</div>
                            </div>
                          </div>
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1E1B4B]" aria-hidden>
                            <Crown className="h-3.5 w-3.5 text-[#FBBF24]" />
                          </div>
                        </div>
                        <div className="mt-3 flex h-2 gap-1 overflow-hidden rounded-full bg-white" role="img" aria-label={`Estudou em ${summary.streak.last7.filter(Boolean).length} dos últimos 7 dias`}>
                          {summary.streak.last7.map((on, i) => (
                            <div key={i} className={`h-full flex-1 rounded-full ${on ? "bg-gradient-to-r from-[#7C6BFF] to-[#5B8DEF]" : "bg-[#EDE9FF]"}`} style={{ opacity: on ? 0.4 + i * 0.09 : 1 }} />
                          ))}
                        </div>
                      </div>
                    </PastelCard>
                    <div className="mt-3 flex gap-2">
                      <button type="button" onClick={toggleCollapsed} className="flex h-10 flex-1 items-center justify-center gap-2 rounded-[12px] border border-[#F0F0FF] bg-white text-[12px] font-semibold transition hover:bg-[#F5F3FF]">
                        <PanelLeftClose className="h-4 w-4" aria-hidden /> Recolher
                      </button>
                      <Link
                        href={`${basePath}/revisoes`}
                        aria-label={`Revisões pendentes: ${summary.counts.dueReviews}`}
                        className="relative flex h-10 w-10 items-center justify-center rounded-[12px] border border-[#F0F0FF] bg-white transition hover:bg-[#F5F3FF]"
                      >
                        <Bell className="h-4 w-4" aria-hidden />
                        {summary.counts.dueReviews > 0 && (
                          <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-[#FF8E6B] px-1 text-center text-[10px] font-bold leading-4 text-white">{summary.counts.dueReviews}</span>
                        )}
                      </Link>
                      {logout}
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col gap-2">
                    <button type="button" onClick={toggleCollapsed} aria-label="Expandir barra lateral" className="flex h-12 w-full items-center justify-center rounded-[16px] border border-[#F0F0FF] bg-white transition hover:bg-[#F5F3FF]">
                      <PanelLeftOpen className="h-5 w-5" aria-hidden />
                    </button>
                    <div className="flex h-12 w-full items-center justify-center rounded-[16px] bg-gradient-to-br from-[#7C6BFF] to-[#5B8DEF] text-[13px] font-bold text-white shadow-lg" title={`Sequência: ${summary.streak.current} dia(s)`}>
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
            <header className="sticky top-0 z-20 border-b border-white/60 bg-[#FFF9F3]/60 backdrop-blur-[18px]" style={{ top: "env(safe-area-inset-top, 0px)" }}>
              <div className="flex h-[88px] items-center justify-between gap-4 px-5 lg:px-10">
                <div className="flex min-w-0 flex-1 items-center gap-4">
                  <Link
                    href={`${basePath}/perfil`}
                    aria-label="Perfil e conquistas"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] border border-[#F0F0FF] bg-white shadow lg:hidden"
                  >
                    <UserRound className="h-5 w-5" aria-hidden />
                  </Link>
                  <div className="min-w-0">
                    {isPainel || active?.id === "perfil" ? (
                      <h1 className="flex items-center gap-2 truncate font-[Space_Grotesk] text-[24px] font-[800] leading-none tracking-[-0.02em] sm:text-[28px] lg:text-[34px]">{title}</h1>
                    ) : (
                      <p className="flex items-center gap-2 truncate font-[Space_Grotesk] text-[24px] font-[800] leading-none tracking-[-0.02em] sm:text-[28px] lg:text-[34px]">{title}</p>
                    )}
                    <div className="mt-2 hidden items-center gap-2 text-[13.5px] text-[#6B6A8A] sm:flex">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full border border-[#EDE9FF] bg-[#F5F3FF]" aria-hidden>
                        <Target className="h-3.5 w-3.5 text-[#7C6BFF]" />
                      </span>
                      <span className="truncate">
                        {isPainel ? (notice ?? "Um tema por vez: todas as formas de ensino, depois todas as questões.") : `${active?.desc ?? ""}${shortcutsOn ? " • atalhos 1-6" : ""}`}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2.5">
                  <QuickSearch inputRef={searchRef} basePath={basePath} items={items} />
                  <Link
                    href={`${basePath}/nova-trilha`}
                    className="group relative flex h-11 items-center gap-2 rounded-[14px] bg-gradient-to-r from-[#7C6BFF] to-[#5B8DEF] px-5 text-[13.5px] font-semibold text-white shadow-[0_10px_24px_rgba(124,107,255,0.30),inset_0_1px_0_rgba(255,255,255,0.35)] transition-all hover:-translate-y-0.5 hover:shadow-[0_14px_32px_rgba(124,107,255,0.42)]"
                  >
                    <Plus className="h-4 w-4" aria-hidden /> <span className="hidden sm:inline">Nova trilha</span>
                    <span className="sm:hidden">Nova</span>
                    <Sparkles className="h-3.5 w-3.5 opacity-70 transition-transform group-hover:rotate-12" aria-hidden />
                  </Link>
                </div>
              </div>
            </header>

            <ConnectivityBanner />
            <main className="px-4 py-7 pb-28 sm:px-5 lg:px-10 lg:pb-12">
              <div key={active?.id ?? path} className="animate-[enter_0.5s_cubic-bezier(0.34,1.56,0.64,1)]">{children}</div>
            </main>

            {/* Barra flutuante (celular) */}
            <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 p-3 pb-[calc(12px+env(safe-area-inset-bottom))] lg:hidden">
              <nav aria-label="Principal (celular)" className="glass pointer-events-auto mx-auto flex max-w-[520px] items-center justify-between rounded-[22px] border border-white bg-white/80 p-2 shadow-[0_16px_40px_rgba(30,27,75,0.14)]">
                {items.slice(0, 5).map((s) => {
                  const on = active?.id === s.id;
                  return (
                    <Link
                      key={s.id}
                      href={s.href}
                      aria-label={s.label}
                      aria-current={on ? "page" : undefined}
                      className={`flex h-11 w-11 items-center justify-center rounded-[14px] transition-all ${on ? "bg-[#1E1B4B] text-white shadow" : "text-[#6F6D92]"}`}
                    >
                      <s.icon className="h-5 w-5" aria-hidden />
                    </Link>
                  );
                })}
                <Link
                  href={`${basePath}/nova-trilha`}
                  aria-label="Nova trilha"
                  className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-gradient-to-br from-[#7C6BFF] to-[#5B8DEF] text-white shadow-[0_6px_16px_rgba(124,107,255,0.35)]"
                >
                  <Plus className="h-5 w-5" aria-hidden />
                </Link>
              </nav>
            </div>
          </div>
        </div>

        <div className="pointer-events-none fixed bottom-24 left-1/2 z-[80] flex -translate-x-1/2 flex-col items-center gap-2 lg:bottom-6" aria-live="polite">
          {toast && (
            <div className="pointer-events-auto flex animate-[enter_0.45s_cubic-bezier(0.34,1.56,0.64,1)] items-center gap-2.5 rounded-[16px] border border-white/10 bg-[#1E1B4B] px-5 py-3 text-[13px] font-medium text-white shadow-[0_16px_40px_rgba(30,27,75,0.28)]" role="status">
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
function QuickSearch({ inputRef, basePath, items }: { inputRef: React.RefObject<HTMLInputElement | null>; basePath: string; items: NavItem[] }) {
  const api = useStudyApi();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [found, setFound] = useState<{ term: string; items: SearchItem[] }>({ term: "", items: [] });
  const [cursor, setCursor] = useState(0);
  const toast = usePastelToast();

  const pages: SearchItem[] = useMemo(
    () => items.map((i) => ({ type: "Página" as const, name: i.label, href: i.href })).concat([{ type: "Página" as const, name: "Nova trilha", href: `${basePath}/nova-trilha` }]),
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
      <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6F6D92]" aria-hidden />
      <input
        ref={inputRef}
        value={q}
        role="combobox"
        aria-expanded={open && !!q}
        aria-controls="busca-resultados"
        aria-label="Buscar trilhas, temas e revisões"
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
        className="h-11 w-[220px] rounded-[14px] border border-[#F0F0FF] bg-white/80 pl-10 pr-4 text-[13px] shadow-[0_2px_12px_rgba(124,107,255,0.06)] outline-none transition-all placeholder:text-[#6F6D92] focus:border-[#7C6BFF]/30 focus:shadow-[0_4px_20px_rgba(124,107,255,0.12)] xl:w-[260px]"
      />
      {open && q && (
        <div id="busca-resultados" role="listbox" className="absolute left-0 right-0 top-[52px] z-50 overflow-hidden rounded-[16px] border border-[#F0F0FF] bg-white shadow-[0_16px_48px_rgba(30,27,75,0.12)]">
          {list.length ? (
            list.map((s, i) => (
              <button
                key={`${s.type}-${s.href}-${s.name}`}
                type="button"
                role="option"
                aria-selected={i === cursor}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => go(s)}
                className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-[#F5F3FF] aria-selected:bg-[#F5F3FF]"
              >
                <span className="min-w-0 truncate text-[13px]">
                  <span className="mr-2 rounded bg-[#F5F3FF] px-1.5 py-0.5 text-[10px]">{s.type}</span>
                  {s.name}
                </span>
                <ArrowRight className="h-3.5 w-3.5 shrink-0 text-[#6F6D92]" aria-hidden />
              </button>
            ))
          ) : (
            <div className="px-4 py-3 text-[13px] text-[#6F6D92]">{loading || term.length < 2 ? "Buscando…" : "Nada encontrado"}</div>
          )}
        </div>
      )}
    </div>
  );
}
