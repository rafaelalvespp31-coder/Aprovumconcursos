"use client";

import { releaseStaleScrollLock, watchStuckScroll } from "@/lib/scroll-lock";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { RotatingQuote } from "./rotating-quote";
import { createContext, Fragment, ViewTransition, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  ArrowRight,
  Bell,
  Menu,
  X,
  Gamepad2,
  ChartColumn,
  ChevronDown,
  ChevronRight,
  TrendingUp,
  CircleHelp,
  Clock3,
  Video,
  BrainCircuit,
  Landmark,
  LayoutGrid,
  Crown,
  House,
  Map as MapIcon,
  PanelLeftClose,
  PanelLeftOpen,
  PenLine,
  Plus,
  Search,
  Settings,
  Target,
  UserRound,
  ListTree,
  type LucideIcon,
} from "lucide-react";
import { ConnectivityBanner } from "@/components/pwa";
import { useStudyApi } from "@/components/study-api";
import type { SearchItem } from "@/app/(app)/study-actions";
import type { ShellSummary } from "@/server/queries";
import { useStored } from "@/components/use-stored";
import { StudyClock } from "./study-clock";
import { SubjectsSubmenu } from "./subjects-submenu";
import { BottomNavigation, type BottomNavId } from "./bottom-navigation";

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
  /** Rota sem item na barra lateral (ex.: Área do Aluno, do celular). */
  hidden?: boolean;
  /** Selo ao lado do nome no menu (ex.: "Em breve"). */
  badge?: string;
}

function NavBadge({ texto, on }: { texto: string; on: boolean }) {
  const novo = texto === "Novo";
  return (
    <span
      data-testid="nav-badge"
      className={`${novo ? "mp-novo " : ""}shrink-0 whitespace-nowrap rounded-full px-1.5 py-[2px] text-[8.5px] font-bold uppercase leading-none tracking-[0.04em] ${on ? "bg-white text-[#C8000A]" : "bg-[#E50914] text-white"}`}
    >
      {texto}
    </span>
  );
}

/** Itens recém-lançados: ganham destaque (fundo avermelhado, borda e selo "Novo" pulsando) no menu. */
const itemNovo = (s: { badge?: string }, on: boolean) => (s.badge === "Novo" && !on ? "mp-item-novo" : "");

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

function navItems(s: ShellSummary, base: string): NavItem[] {
  return [
    { id: "painel", href: `${base}/painel`, label: "Painel", icon: House, num: "1", desc: "Visão geral", title: "" },
    { id: "trilhas", href: `${base}/trilhas`, label: "Estudos", icon: MapIcon, num: "2", desc: plural(s.counts.trails, "conteúdo", "conteúdos"), also: [`${base}/trilha`, `${base}/aula`], title: "Seus estudos" },
    { id: "novo", href: `${base}/nova-trilha`, label: "Novo Estudo", icon: Plus, num: "3", desc: "Mapa do conhecimento", title: "Novo estudo", subtitle: "Escolha a matéria e a aula no mapa." },
    { id: "quiz", href: `${base}/quiz`, label: "Modo Jogo", short: "Jogo", icon: Gamepad2, num: "4", desc: "Complete a lei", title: "Modo Jogo" },
    { id: "questoes", href: `${base}/questoes`, label: "Questões", icon: CircleHelp, num: "5", desc: plural(s.counts.notebooks, "caderno", "cadernos"), title: "Cadernos de Questões", subtitle: "Organize, acesse e continue sua jornada rumo à aprovação." },
    { id: "revisoes", href: `${base}/revisoes`, label: "Revisões", icon: Clock3, num: "6", desc: plural(s.counts.dueReviews, "pendente", "pendentes"), title: "Revisões" },
    { id: "desempenho", href: `${base}/desempenho`, label: "Desempenho", short: "Evolução", icon: ChartColumn, num: "7", desc: plural(s.counts.answered, "resposta", "respostas"), title: "Desempenho" },
    { id: "concursos", href: `${base}/concursos`, label: "Concursos", icon: Landmark, num: "8", desc: "Editais e provas", title: "Concursos", subtitle: "Concursos cadastrados, vagas e datas de prova." },
    { id: "aprovum-ai", href: `${base}/aprovum-ai`, label: "APROVUM AI", icon: BrainCircuit, num: "", desc: "Edital em preparação", title: "APROVUM AI", subtitle: "Seu concurso. Sua preparação. Nossa inteligência.", badge: "Novo" },
    { id: "redacao", href: `${base}/redacao`, label: "Redação Elite", short: "Redação", icon: PenLine, num: "", desc: "Escreva e seja corrigido", title: "APROVUM REDAÇÃO ELITE", subtitle: "ESCREVA. CORRIJA. EVOLUA. CONQUISTE.", badge: "Novo" },
    { id: "depoimentos", href: `${base}/depoimentos`, label: "Depoimentos", icon: Video, num: "9", desc: "Histórias de aprovados", title: "Depoimentos", subtitle: "Quem chegou lá conta como foi a trajetória até a aprovação." },
    { id: "perfil", href: `${base}/perfil`, label: "Perfil", icon: Settings, num: "0", desc: `Nível ${s.level}`, title: "Perfil" },
    { id: "plano", href: `${base}/plano`, label: "Meu Plano", icon: Crown, num: "", desc: "Escolha seu plano", title: "Meu Plano", subtitle: "Conquiste mais. Estude sem limites." },
    { id: "area", href: `${base}/area-do-aluno`, label: "Área do Aluno", icon: LayoutGrid, num: "", desc: "Todos os menus", title: "Área do Aluno", subtitle: "Todos os menus do seu painel num só lugar.", hidden: true },
  ];
}

/** Atalho logo abaixo de APROVUM AI: o edital do aluno organizado por matéria e assunto. */
function EditalVerticalizadoLink({ href, active, onNavigate }: { href: string; active: boolean; onNavigate?: () => void }) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      data-testid="nav-edital-verticalizado"
      className={`mb-1 ml-[22px] mt-0.5 flex items-center gap-2 rounded-[12px] py-2 pl-3 pr-3 text-[13px] font-semibold transition-colors ${active ? "bg-gradient-to-r from-[#FF1E1E] to-[#B30000] text-white" : "text-[#C9C9C9] hover:bg-white/[0.06] hover:text-white"}`}
    >
      <span aria-hidden className={`h-4 w-px ${active ? "bg-white/60" : "bg-[#E50914]/70"}`} />
      <ListTree className="h-[15px] w-[15px] shrink-0" aria-hidden />
      <span className="whitespace-nowrap">Edital Verticalizado</span>
    </Link>
  );
}

/** Grupo "Evolução": Desempenho e Revisões ficam dentro dele (recolhível; na barra recolhida vira um ícone). */
function EvolucaoGrupo({
  items,
  collapsed,
  open,
  onToggle,
  activeId,
  basePath,
  path,
  onSame,
}: {
  items: NavItem[];
  collapsed: boolean;
  open: boolean;
  onToggle: () => void;
  activeId: string | null;
  basePath: string;
  path: string;
  onSame: (label: string) => void;
}) {
  const filhos = ["desempenho", "revisoes"].map((id) => items.find((i) => i.id === id)).filter((i): i is NavItem => !!i);
  const dentro = filhos.some((f) => f.id === activeId);
  if (collapsed) {
    return (
      <Link
        href={`${basePath}/desempenho`}
        aria-label="Evolução"
        title="Evolução"
        aria-current={dentro ? "page" : undefined}
        className={`barra-item group relative flex w-full items-center justify-center rounded-[18px] ${dentro ? "text-white" : "text-[#B3B3B3] hover:bg-white/[0.06] hover:text-white"}`}
      >
        <span className={`flex h-9 w-9 items-center justify-center rounded-[12px] ${dentro ? "bg-white/20" : "bg-[#1A1A1A]"}`}>
          <TrendingUp className="h-[18px] w-[18px]" aria-hidden />
        </span>
      </Link>
    );
  }
  return (
    <>
      <button
        type="button"
        aria-expanded={open}
        data-testid="evolucao-toggle"
        onClick={onToggle}
        className={`barra-item group relative flex w-full items-center gap-3.5 rounded-[18px] px-4 text-left text-[14.5px] font-medium transition-colors duration-300 ${dentro ? "text-white" : "text-[#B3B3B3] hover:bg-white/[0.06] hover:text-white"}`}
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] bg-[#1A1A1A] transition-all duration-300 group-hover:rotate-[-6deg] group-hover:scale-110">
          <TrendingUp className="h-[18px] w-[18px]" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold tracking-tight">Evolução</span>
          <span className="mt-0.5 block text-[11px] leading-none text-[#A3A3A3]">Seu progresso</span>
        </span>
        <ChevronDown className={`size-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden />
      </button>
      {open && (
        <ul className="barra-subgrupo" aria-label="Evolução">
          {filhos.map((f) => {
            const on = activeId === f.id;
            return (
              <li key={f.id}>
                <Link
                  href={f.href}
                  aria-current={on ? "page" : undefined}
                  onClick={() => {
                    if (path === f.href) onSame(f.label);
                  }}
                  className={`barra-sub group flex items-center gap-3 rounded-[14px] px-3 text-[13.5px] font-semibold transition-colors ${on ? "text-white" : "text-[#B3B3B3] hover:bg-white/[0.06] hover:text-white"}`}
                >
                  <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-[10px] ${on ? "bg-white/20" : "bg-[#1A1A1A]"}`}>
                    <f.icon className="h-4 w-4" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1 truncate">{f.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
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
  floating,
}: {
  summary: ShellSummary;
  children: ReactNode;
  logout?: ReactNode;
  /** Prefixo das rotas (a galeria de desenvolvimento usa /dev/galeria). */
  basePath?: string;
  notice?: ReactNode;
  /** Elementos flutuantes que acompanham todas as telas (ex.: o Mentor), fora da animação de troca de tela. */
  floating?: ReactNode;
}) {
  const path = usePathname();
  // Rede de segurança: ao trocar de página (ou voltar do cache) sem nenhuma trava ativa, a rolagem nunca fica presa.
  useEffect(() => {
    releaseStaleScrollLock();
  }, [path]);
  useEffect(() => watchStuckScroll(), []);
  const router = useRouter();
  const items = useMemo(() => navItems(summary, basePath), [summary, basePath]);
  const active = items.find((i) => [i.href, ...(i.also ?? [])].some((p) => path === p || path.startsWith(`${p}/`))) ?? null;
  const activeIndex = active ? items.indexOf(active) : -1;
  // Grupos recolhíveis: "Estudos" (matérias) e "Evolução" (Desempenho e Revisões).
  const [estudosAberto, setEstudosAberto] = useStored("na:menu-estudos-aberto", true);
  const [evolucaoAberta, setEvolucaoAberta] = useStored("na:menu-evolucao-aberta", false);
  // Quem recolhe manda: nem estando na página de Estudos o grupo reabre sozinho.
  const estudosVisivel = estudosAberto;
  const evolucaoVisivel = evolucaoAberta;
  // O destaque deslizante acompanha o item ativo medindo-o no navegador (os grupos mudam a altura).
  const navRef = useRef<HTMLElement>(null);
  const [ind, setInd] = useState<{ top: number; h: number } | null>(null);
  const [collapsed, setCollapsedStored] = useStored("na:sidebar-recolhida", false);
  const toggleCollapsed = () => setCollapsedStored(!collapsed);
  useLayoutEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const measure = () => {
      const el = nav.querySelector<HTMLElement>('[aria-current="page"]');
      if (!el) return setInd(null);
      const next = { top: el.offsetTop + nav.offsetTop, h: el.offsetHeight };
      setInd((p) => (p && p.top === next.top && p.h === next.h ? p : next));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(nav);
    return () => ro.disconnect();
  }, [path, collapsed, estudosVisivel, evolucaoVisivel, summary.subjects, activeIndex]);
  const [toast, setToast] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  const shortcutsOn = !!active && SHORTCUT_ROUTES.includes(active.id) && !path.startsWith(`${basePath}/aula`);
  // Modo Jogo: cabeçalho escuro, contínuo com o palco preto da página.
  // Resolver um caderno (/questoes/cadernos/<id>, exceto "novo"): mesmo cabeçalho escuro.
  const isNotebookRun = new RegExp(`^${basePath}/questoes/cadernos/(?!novo$)[^/]+$`).test(path);
  // Painel (avatar): fundo branco como as demais telas; só o Modo Jogo e a resolução de caderno são escuros.
  const dark = active?.id === "quiz" || active?.id === "plano" || isNotebookRun;
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
      if (e.key >= "1" && e.key <= "9") {
        const item = items[Number(e.key) - 1];
        if (item) router.push(item.href);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [items, router, shortcutsOn]);

  const isPainel = active?.id === "painel";
  const bottomActive: BottomNavId | null = path.startsWith(`${basePath}/nova-trilha`)
    ? "novo"
    : active && ["painel", "trilhas", "quiz", "questoes", "plano"].includes(active.id)
      ? (active.id as BottomNavId)
      : active && ["area", "revisoes", "desempenho", "concursos", "aprovum-ai", "depoimentos", "perfil"].includes(active.id)
        ? "area"
        : null;
  // Página de Estudos: cabeçalho com saudação (desktop) e logo + menu (celular).
  const isEstudos = path === `${basePath}/trilhas`;
  // Aula: no celular, cabeçalho com menu (árvore de aulas no menu); no desktop, árvore na barra lateral.
  const isAula = path.startsWith(`${basePath}/aula`);
  // Telas de estudo (aula e assunto): mostram o cronômetro de estudo do dia.
  const isNovoEstudo = path.startsWith(`${basePath}/nova-trilha`);
  const isStudy = isAula || path.startsWith(`${basePath}/trilhas/`) || path === `${basePath}/trilha`;
  // Páginas internas com cabeçalho próprio (título e linha de apoio).
  const heading =
    PAGE_HEADINGS.find((h) => path === `${basePath}${h.path}`) ??
    (isNotebookRun ? { path: "", title: "Questões", subtitle: "Selecione a alternativa correta e avance no seu objetivo." } : null);
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
      {isStudy && <StudyClock />}
      <div className="mv-progresso" aria-hidden />
      <div className="pastel relative min-h-screen w-full overflow-x-clip font-[Inter,system-ui,sans-serif] text-[#0A0A0A] antialiased selection:bg-[#E10600]/25">
        <div className={`pointer-events-none fixed inset-0 max-w-[100vw] overflow-hidden ${dark ? "bg-[#070707]" : "bg-white"}`} />
        <div className={`aprovum-fundo pointer-events-none fixed inset-0 max-w-[100vw] ${dark ? "aprovum-fundo-escuro" : ""}`} aria-hidden />
        <div className="pointer-events-none fixed inset-0 max-w-[100vw] overflow-hidden" aria-hidden>
          <div className="absolute -top-[220px] -left-[140px] h-[min(620px,80vw)] w-[min(620px,80vw)] animate-[meshMove_18s_ease-in-out_infinite] rounded-full bg-[#E10600]/[0.05] blur-[70px]" />
          <div className="absolute -top-[120px] -right-[120px] h-[min(560px,70vw)] w-[min(560px,70vw)] animate-[meshMove_22s_ease-in-out_infinite_2s] rounded-full bg-black/[0.025] blur-[70px]" />
          <div className="absolute bottom-[-120px] left-[24%] h-[min(520px,70vw)] w-[min(720px,90vw)] animate-[meshMove_20s_ease-in-out_infinite_1s] rounded-full bg-[#E10600]/[0.05] blur-[80px]" />
          <div className="absolute top-[50%] right-[10%] h-[min(380px,60vw)] w-[min(380px,60vw)] animate-[meshMove_24s_ease-in-out_infinite_0.5s] rounded-full bg-black/[0.025] blur-[60px]" />
        </div>

        <div className="relative flex min-h-screen w-full max-w-[100vw]">
          {/* Barra lateral (desktop) */}
          <aside
            className={`sticky top-0 z-30 hidden h-screen shrink-0 flex-col transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] lg:flex ${collapsed ? "w-[92px]" : "w-[272px] xl:w-[292px]"}`}
            style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
          >
            <div className={`barra-lateral ${collapsed ? "is-rec" : ""} m-4 flex min-h-0 flex-1 flex-col overflow-hidden rounded-[32px] border border-[#1F1F1F] bg-[#0A0A0A] text-white shadow-[0_16px_48px_rgba(225,6,0,0.10),inset_0_1px_0_rgba(255,255,255,0.05)]`}>
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

              <div className="barra-rolagem relative min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-3 [scrollbar-width:none]">
                {ind && (
                  <div
                    aria-hidden
                    data-tier={active?.id === "plano" ? summary.plan : undefined}
                    className="barra-indicador absolute left-3 right-3 rounded-[18px] bg-gradient-to-r from-[#FF1E1E] to-[#B30000] shadow-[0_10px_24px_rgba(225,6,0,0.32),inset_0_1px_0_rgba(255,255,255,0.3)] transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
                    style={{ transform: `translateY(${ind.top}px)`, height: ind.h }}
                  />
                )}
                <nav ref={navRef} aria-label="Principal" className="barra-nav relative flex flex-col">
                  {items.filter((s) => s.id !== "revisoes" && s.id !== "desempenho" && !s.hidden).map((s) => {
                    const on = active?.id === s.id;
                    return (
                      <Fragment key={s.id}>
                      <div className="relative">
                      <Link
                        href={s.href}
                        aria-current={on ? "page" : undefined}
                        aria-label={collapsed ? s.label : undefined}
                        title={collapsed ? s.label : undefined}
                        onClick={() => {
                          if (path === s.href) setToast(`${s.label} já está aberto ✨`);
                        }}
                        className={`barra-item ${itemNovo(s, on)} ${s.id === "plano" ? `mp-brilho mp-${summary.plan}` : ""} group relative flex w-full items-center gap-3.5 rounded-[18px] px-4 text-left text-[14.5px] font-medium transition-all duration-300 ${on ? "text-white" : "text-[#B3B3B3] hover:bg-white/[0.06] hover:text-white"}`}
                      >
                        <span className={`${s.id === "plano" ? "mp-ico" : ""} ${s.badge === "Novo" && collapsed ? "relative" : ""} flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] transition-all duration-300 ${on ? "bg-white/20 text-white" : "bg-[#1A1A1A] group-hover:rotate-[-6deg] group-hover:scale-110 group-hover:bg-[#1C1C1C]"}`}>
                          <s.icon className="h-[18px] w-[18px]" aria-hidden />
                          {collapsed && s.badge === "Novo" && !on && <span aria-hidden className="mp-novo absolute right-1.5 top-1.5 !h-2 !w-2 !rounded-full !p-0" />}
                        </span>
                        {!collapsed && (
                          <span className="mp-txt min-w-0 flex-1">
                            <span className="flex items-center gap-1.5">
                              <span className={`whitespace-nowrap font-semibold tracking-tight ${on ? "text-white" : ""}`}>{s.label}</span>
                              {s.badge && <NavBadge texto={s.badge} on={on} />}
                            </span>
                            <span className={`mt-0.5 block text-[11px] leading-none ${on ? "text-white/80" : "text-[#A3A3A3]"}`} data-testid={`nav-desc-${s.id}`}>{s.desc}</span>
                          </span>
                        )}
                        {!collapsed && on && s.id !== "trilhas" && <ChevronRight className="mp-chev h-4 w-4 text-white/70 transition-transform group-hover:translate-x-0.5" aria-hidden />}
                      </Link>
                      {s.id === "trilhas" && !collapsed && summary.subjects.length > 0 && (
                        <button
                          type="button"
                          className="barra-grupo-toggle"
                          aria-expanded={estudosVisivel}
                          aria-label={estudosVisivel ? "Recolher matérias" : "Mostrar matérias"}
                          data-testid="estudos-toggle"
                          onClick={() => setEstudosAberto(!estudosVisivel)}
                        >
                          <ChevronDown className={`size-4 transition-transform ${estudosVisivel ? "rotate-180" : ""}`} aria-hidden />
                        </button>
                      )}
                      </div>
                      {s.id === "aprovum-ai" && !collapsed && <EditalVerticalizadoLink href={`${basePath}/meu-concurso`} active={path.startsWith(`${basePath}/meu-concurso`)} />}
                      {s.id === "trilhas" && !collapsed && summary.subjects.length > 0 && estudosVisivel && (
                        <SubjectsSubmenu subjects={summary.subjects} base={basePath} path={path} />
                      )}
                      {s.id === "questoes" && (
                        <EvolucaoGrupo
                          items={items}
                          collapsed={collapsed}
                          open={evolucaoVisivel}
                          onToggle={() => setEvolucaoAberta(!evolucaoVisivel)}
                          activeId={active?.id ?? null}
                          basePath={basePath}
                          path={path}
                          onSame={(label) => setToast(`${label} já está aberto ✨`)}
                        />
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
                    <Link
                      href={`${basePath}/plano`}
                      data-tier={summary.plan}
                      data-testid="plano-card"
                      aria-label={`${summary.planInfo.label} — ver meu plano`}
                      className={`sb-plano barra-streak ${isAula ? "!hidden" : ""}`}
                    >
                      <span className="sb-plano-ico" aria-hidden><Crown className="h-5 w-5" /></span>
                      <span className="sb-plano-txt">
                        <span className="sb-plano-rotulo">Seu plano</span>
                        <span className="sb-plano-nome">{summary.planInfo.label}</span>
                        <span className="sb-plano-sub">{summary.planInfo.tagline}</span>
                      </span>
                      <ChevronRight className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
                    </Link>
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
                    <Link href={`${basePath}/plano`} data-tier={summary.plan} className="sb-plano sb-plano-rail" aria-label={`${summary.planInfo.label} — ver meu plano`} title={summary.planInfo.label}>
                      <Crown className="h-5 w-5" aria-hidden />
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </aside>

          <div className="min-w-0 flex-1">
            <header
              className={`mv-cabecalho sticky top-0 z-20 border-b backdrop-blur-[18px] ${dark ? "border-transparent bg-[#070707] text-white" : "border-black/[0.06] bg-white/75"} ${isPainel ? "max-lg:hidden" : ""}`}
              style={{ top: "env(safe-area-inset-top, 0px)" }}
            >
              {isEstudos ? (
                <EstudosHeader summary={summary} basePath={basePath} items={items} searchRef={searchRef} menuRef={menuRef} />
              ) : (
                <>
                {isAula && <EstudosHeader summary={summary} basePath={basePath} items={items} searchRef={searchRef} menuRef={menuRef} mobileOnly />}
                <div className={isAula ? "hidden lg:block" : undefined}>
              <div className="flex h-[88px] items-center justify-between gap-4 px-5 lg:px-10">
                <div className="flex min-w-0 flex-1 items-center gap-4">
                  {dark && (
                    <span className="jogo-cabecalho-barras hidden sm:block" aria-hidden>
                      {"//"}
                    </span>
                  )}
                  <MenuButton menuRef={menuRef} dark={dark} />
                  <Link
                    href={`${basePath}/perfil`}
                    aria-label="Perfil"
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
                      <h1 className="block truncate font-[Space_Grotesk] text-[clamp(19px,5.6vw,24px)] font-[800] leading-[1.15] tracking-[-0.02em] sm:text-[28px] lg:text-[34px]">{title}</h1>
                    ) : (
                      <p className="block truncate font-[Space_Grotesk] text-[clamp(19px,5.6vw,24px)] font-[800] leading-[1.15] tracking-[-0.02em] sm:text-[28px] lg:text-[34px]">{title}</p>
                    )}
                    <div className={`mt-2 hidden items-center gap-2 text-[13.5px] sm:flex ${dark ? "text-white/65" : "text-[#4D4D4D]"}`}>
                      <span className={`flex h-6 w-6 items-center justify-center rounded-full border ${dark ? "border-white/15 bg-[#161616]" : "border-[#E0E0E0] bg-[#F4F4F4]"}`} aria-hidden>
                        <Target className="h-3.5 w-3.5 text-[#FF1E1E]" />
                      </span>
                      <span className="truncate">
                        {isPainel ? (notice ?? "Um conteúdo por vez: aula completa e três níveis — fácil, médio e difícil.") : `${heading?.subtitle ?? active?.subtitle ?? active?.desc ?? ""}`}
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
                        aria-label="Perfil"
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

            {isPainel && (
              <div className="fixed left-3 z-30 lg:hidden" style={{ top: "calc(env(safe-area-inset-top, 0px) + 10px)" }}>
                <span className="flex rounded-[12px] bg-black/55 backdrop-blur-md"><MenuButton menuRef={menuRef} dark /></span>
              </div>
            )}
            <MobileMenu menuRef={menuRef} items={items} summary={summary} basePath={basePath} />
            <ConnectivityBanner />
            <main
              className={isPainel ? "pb-28 lg:px-10 lg:py-7 lg:pb-12" : "px-4 py-7 pb-28 sm:px-5 lg:px-10 lg:pb-12"}
              data-compacto={isStudy || isNovoEstudo ? undefined : ""}
              data-mv={isStudy || isNovoEstudo ? undefined : ""}
            >
              {isStudy && <div id="estudo-relogio-slot" className="mb-3 flex justify-center lg:hidden" />}
              {/* Troca de página: o conteúdo antigo sai e o novo entra (View Transitions); menu e cabeçalho ficam parados. */}
              <ViewTransition key={active?.id ?? path} enter="pagina" exit="pagina" default="none">
                <div className="mv-pagina">{children}</div>
              </ViewTransition>
            </main>

            {/* Menu inferior: só no celular. No computador, o menu é o da barra lateral. */}
            <div className="lg:hidden">
              <BottomNavigation activeId={bottomActive} basePath={basePath} plan={summary.plan} />
            </div>
          </div>
        </div>

        {floating}

        <div className="pointer-events-none fixed bottom-28 left-1/2 z-[80] flex -translate-x-1/2 flex-col items-center gap-2 lg:bottom-32" aria-live="polite">
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
    () => items.map((i) => ({ type: "Página" as const, name: i.label, href: i.href })),
    [items],
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


/** Menu do celular (hambúrguer): um só para todas as telas; o botão de cada cabeçalho abre este diálogo. */
function MobileMenu({ menuRef, items, summary, basePath }: { menuRef: React.RefObject<HTMLDialogElement | null>; items: NavItem[]; summary: ShellSummary; basePath: string }) {
  const path = usePathname();
  // Grupo "Evolução" (Desempenho e Revisões), igual ao da barra lateral do computador.
  const evolucao = ["desempenho", "revisoes"].map((id) => items.find((i) => i.id === id)).filter((i): i is NavItem => !!i);
  const dentroEvolucao = evolucao.some((f) => path === f.href);
  const [evolucaoAberta, setEvolucaoAberta] = useState(dentroEvolucao);
  return (
    <>
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
            {items.filter((s) => s.id !== "novo" && s.id !== "revisoes" && s.id !== "desempenho" && !s.hidden).map((s) => {
              const on = path === s.href || (s.also ?? []).some((a) => path.startsWith(a));
              return (
                <Fragment key={s.id}>
                <li>
                  <Link
                    href={s.href}
                    onClick={() => menuRef.current?.close()}
                    aria-current={on ? "page" : undefined}
                    className={`${itemNovo(s, on)} flex min-h-14 items-center gap-3.5 rounded-[16px] px-3.5 ${on ? "bg-gradient-to-r from-[#FF1E1E] to-[#B30000] text-white" : "text-[#C9C9C9] hover:bg-white/[0.06]"}`}
                  >
                    <span className={`flex h-9 w-9 items-center justify-center rounded-[12px] ${on ? "bg-white/20" : "bg-[#1A1A1A]"}`}>
                      <s.icon className="h-[18px] w-[18px]" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2 font-semibold">{s.label}{s.badge && <NavBadge texto={s.badge} on={on} />}</span>
                      <span className={`block text-[11.5px] ${on ? "text-white/80" : "text-[#9A9A9A]"}`}>{s.desc}</span>
                    </span>
                  </Link>
                  {s.id === "aprovum-ai" && <EditalVerticalizadoLink href={`${basePath}/meu-concurso`} active={path.startsWith(`${basePath}/meu-concurso`)} onNavigate={() => menuRef.current?.close()} />}
                  {s.id === "trilhas" && <SubjectsSubmenu subjects={summary.subjects} base={basePath} path={path} variant="menu" onNavigate={() => menuRef.current?.close()} />}
                </li>
                {s.id === "questoes" && evolucao.length > 0 && (
                  <li>
                    <button
                      type="button"
                      aria-expanded={evolucaoAberta}
                      data-testid="evolucao-toggle-movel"
                      onClick={() => setEvolucaoAberta((v) => !v)}
                      className={`flex min-h-14 w-full items-center gap-3.5 rounded-[16px] px-3.5 text-left ${dentroEvolucao ? "text-white" : "text-[#C9C9C9] hover:bg-white/[0.06]"}`}
                    >
                      <span className="flex h-9 w-9 items-center justify-center rounded-[12px] bg-[#1A1A1A]">
                        <TrendingUp className="h-[18px] w-[18px]" aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold">Evolução</span>
                        <span className="block text-[11.5px] text-[#9A9A9A]">Seu progresso</span>
                      </span>
                      <ChevronDown className={`size-4 shrink-0 transition-transform ${evolucaoAberta ? "rotate-180" : ""}`} aria-hidden />
                    </button>
                    {evolucaoAberta && (
                      <ul aria-label="Evolução" className="mt-1 flex flex-col gap-1 pl-4">
                        {evolucao.map((f) => {
                          const fOn = path === f.href;
                          return (
                            <li key={f.id}>
                              <Link
                                href={f.href}
                                onClick={() => menuRef.current?.close()}
                                aria-current={fOn ? "page" : undefined}
                                className={`flex min-h-12 items-center gap-3 rounded-[14px] px-3 ${fOn ? "bg-gradient-to-r from-[#FF1E1E] to-[#B30000] text-white" : "text-[#C9C9C9] hover:bg-white/[0.06]"}`}
                              >
                                <span className={`flex h-8 w-8 items-center justify-center rounded-[10px] ${fOn ? "bg-white/20" : "bg-[#1A1A1A]"}`}>
                                  <f.icon className="h-4 w-4" aria-hidden />
                                </span>
                                <span className="min-w-0 flex-1">
                                  <span className="block text-[14px] font-semibold">{f.label}</span>
                                  <span className={`block text-[11px] ${fOn ? "text-white/80" : "text-[#9A9A9A]"}`}>{f.desc}</span>
                                </span>
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </li>
                )}
                </Fragment>
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

function MenuButton({ menuRef, dark = false }: { menuRef: React.RefObject<HTMLDialogElement | null>; dark?: boolean }) {
  return (
    <button type="button" onClick={() => menuRef.current?.showModal()} aria-label="Abrir menu" aria-haspopup="dialog" data-testid="abrir-menu" className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] lg:hidden ${dark ? "text-white hover:bg-white/10" : "text-[#0A0A0A] hover:bg-black/[0.05]"}`}>
      <Menu className="h-6 w-6" aria-hidden />
    </button>
  );
}

// ---------------------------------------------------------------------------
// Cabeçalho da página de Estudos
// ---------------------------------------------------------------------------
function EstudosHeader({ summary, basePath, items, searchRef, menuRef, mobileOnly = false }: { summary: ShellSummary; basePath: string; items: NavItem[]; searchRef: React.RefObject<HTMLInputElement | null>; menuRef: React.RefObject<HTMLDialogElement | null>; mobileOnly?: boolean }) {
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
    <Link href={`${basePath}/perfil`} aria-label="Perfil" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#080808] text-white shadow-[0_6px_16px_rgba(0,0,0,0.18)] transition hover:ring-2 hover:ring-[#F01820]/60">
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

    </>
  );
}
