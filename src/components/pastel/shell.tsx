"use client";

import { releaseStaleScrollLock, watchStuckScroll } from "@/lib/scroll-lock";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { RotatingQuote } from "./rotating-quote";
import { createContext, Fragment, ViewTransition, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  ArrowRight,
  Bell,
  Menu,
  Gamepad2,
  ChartColumn,
  CircleHelp,
  Clock3,
  Video,
  BrainCircuit,
  Landmark,
  LayoutGrid,
  Crown,
  House,
  Map as MapIcon,
  PenLine,
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
import { StudyClock } from "./study-clock";
import { MenuTatico } from "./menu-tatico";
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
  // Grupos recolhíveis: "Estudos" (matérias) e "Evolução" (Desempenho e Revisões).
  const [estudosAberto, setEstudosAberto] = useStored("na:menu-estudos-aberto", true);
  const [evolucaoAberta, setEvolucaoAberta] = useStored("na:menu-evolucao-aberta", false);
  const [collapsed, setCollapsedStored] = useStored("na:sidebar-recolhida", false);
  const toggleCollapsed = () => setCollapsedStored(!collapsed);
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
            className={`sticky top-0 z-30 hidden h-screen shrink-0 flex-col transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] lg:flex ${collapsed ? "w-[92px]" : "w-[304px] xl:w-[324px]"}`}
            style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
          >
            <MenuTatico
              variant="desktop"
              items={items}
              summary={summary}
              basePath={basePath}
              path={path}
              activeId={active?.id ?? null}
              collapsed={collapsed}
              onToggleCollapsed={toggleCollapsed}
              onSame={(label) => setToast(`${label} já está aberto ✨`)}
              estudosAberto={estudosAberto}
              onToggleEstudos={() => setEstudosAberto(!estudosAberto)}
              evolucaoAberta={evolucaoAberta}
              onToggleEvolucao={() => setEvolucaoAberta(!evolucaoAberta)}
              logout={logout}
              isAula={isAula}
            />
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
            <MobileMenu menuRef={menuRef} items={items} summary={summary} basePath={basePath} activeId={active?.id ?? null} />
            <ConnectivityBanner />
            <main
              className={isPainel ? "pb-28 lg:px-0 lg:py-0 lg:pb-0" : "px-4 py-7 pb-28 sm:px-5 lg:px-10 lg:pb-12"}
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


/** Menu do celular (hambúrguer): gaveta lateral com o mesmo menu tático do computador. */
function MobileMenu({ menuRef, items, summary, basePath, activeId }: { menuRef: React.RefObject<HTMLDialogElement | null>; items: NavItem[]; summary: ShellSummary; basePath: string; activeId: string | null }) {
  const path = usePathname();
  const [estudosAberto, setEstudosAberto] = useState(true);
  const [evolucaoAberta, setEvolucaoAberta] = useState(activeId === "desempenho" || activeId === "revisoes");
  // Fecha com animação de saída (a gaveta desliza de volta antes do diálogo sumir).
  const fechar = useCallback(() => {
    const d = menuRef.current;
    if (!d?.open || d.dataset.saindo) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return d.close();
    d.dataset.saindo = "1";
    setTimeout(() => {
      delete d.dataset.saindo;
      d.close();
    }, 240);
  }, [menuRef]);
  return (
    <dialog
      ref={menuRef}
      aria-label="Menu"
      className="mt-gaveta"
      onCancel={(e) => {
        e.preventDefault();
        fechar();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) fechar();
      }}
    >
      <MenuTatico
        variant="mobile"
        items={items}
        summary={summary}
        basePath={basePath}
        path={path}
        activeId={activeId}
        onClose={fechar}
        estudosAberto={estudosAberto}
        onToggleEstudos={() => setEstudosAberto((v) => !v)}
        evolucaoAberta={evolucaoAberta}
        onToggleEvolucao={() => setEvolucaoAberta((v) => !v)}
        isAula={path.includes("/aula")}
      />
    </dialog>
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
