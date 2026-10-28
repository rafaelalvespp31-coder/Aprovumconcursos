"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Compass, GripHorizontal, Maximize2, Minus, RotateCcw } from "lucide-react";
import { mentorPanelAction } from "@/app/(app)/mentor/actions";
import { MentorChat } from "./mentor-chat";
import { MentorPriorities } from "./mentor-priorities";
import type { MentorPanelState } from "./types";

const BUBBLE = 58;
const MARGIN = 8;
const STALE_MS = 60_000;
const KEY_POS = "aprovum_mentor_pos";
const KEY_OPEN = "aprovum_mentor_aberto";
const KEY_TAB = "aprovum_mentor_aba";

type Pos = { dx: number; dy: number };
type Tab = "prioridades" | "conversa";

const read = <T,>(k: string, fallback: T): T => {
  try {
    const v = localStorage.getItem(k);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
};
const save = (k: string, v: unknown) => {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {
    /* navegador sem armazenamento: só não lembra */
  }
};
const noop = () => () => {};
const subscribeResize = (cb: () => void) => {
  window.addEventListener("resize", cb);
  return () => window.removeEventListener("resize", cb);
};
const defaultPos = (w: number): Pos => (w < 1024 ? { dx: 14, dy: 104 } : { dx: 24, dy: 116 });
const clamp = (p: Pos, w: number, h: number): Pos => ({
  dx: Math.min(Math.max(MARGIN, p.dx), Math.max(MARGIN, w - BUBBLE - MARGIN)),
  dy: Math.min(Math.max(MARGIN, p.dy), Math.max(MARGIN, h - BUBBLE - MARGIN)),
});

/**
 * Mentor APROVUM flutuante: acompanha o aluno em todas as telas. Minimizado, é uma bolha com o
 * número de prioridades (arrastável); aberto, mostra as prioridades e o assistente guiado.
 * Carrega uma vez e só recalcula ao abrir, se os dados estiverem velhos ou a tela mudou.
 */
export function MentorFloat({ base = "", demos }: { base?: string; /** Galeria: estados em memória (?mentor=…). */ demos?: Record<string, MentorPanelState> }) {
  const pathname = usePathname();
  const params = useSearchParams();
  const demo = demos ? (demos[params.get("mentor") ?? "ok"] ?? demos.ok) : undefined;

  const mounted = useSyncExternalStore(noop, () => true, () => false);
  const vpKey = useSyncExternalStore(subscribeResize, () => `${window.innerWidth}x${window.innerHeight}`, () => "1280x800");
  const [vw, vh] = vpKey.split("x").map(Number) as [number, number];
  const vp = { w: vw, h: vh };

  const [loadedData, setData] = useState<MentorPanelState | null>(null);
  const data = demo ?? loadedData;
  const [loadId, setLoadId] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  // Lembrados no navegador (lidos só no cliente; no servidor nada é desenhado).
  const [open, setOpen] = useState(() => (typeof window === "undefined" ? false : read<boolean>(KEY_OPEN, false)));
  const [tab, setTab] = useState<Tab>(() => (typeof window === "undefined" ? "prioridades" : read<Tab>(KEY_TAB, "prioridades")));
  const [savedPos, setPos] = useState<Pos | null>(() => (typeof window === "undefined" ? null : read<Pos | null>(KEY_POS, null)));
  const pos = clamp(savedPos ?? defaultPos(vw), vw, vh);
  const [teaser, setTeaser] = useState(false);
  const [dragging, setDragging] = useState(false);
  const loaded = useRef<{ at: number; path: string } | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const bubbleRef = useRef<HTMLButtonElement>(null);
  const drag = useRef<{ x: number; y: number; start: Pos; moved: boolean; id: number } | null>(null);
  const justDragged = useRef(false);

  const hidden = pathname === `${base}/mentor`;

  const apply = (d: MentorPanelState) => {
    loaded.current = { at: Date.now(), path: window.location.pathname };
    setData(d);
    setLoadId((n) => n + 1);
    setRefreshing(false);
  };
  const request = () => mentorPanelAction().catch((): MentorPanelState => ({ state: "erro" }));
  const load = (silent: boolean) => {
    if (demo) return;
    if (silent) setRefreshing(true);
    else setData(null);
    void request().then(apply);
  };

  // Primeira carga: uma só por abertura do app (o Mentor fica montado entre as telas).
  const isDemo = Boolean(demo);
  useEffect(() => {
    if (isDemo) return;
    let alive = true;
    void mentorPanelAction()
      .catch((): MentorPanelState => ({ state: "erro" }))
      .then((d) => {
        if (!alive) return;
        loaded.current = { at: Date.now(), path: window.location.pathname };
        setData(d);
        setLoadId((n) => n + 1);
      });
    return () => {
      alive = false;
    };
  }, [isDemo]);

  const pending = data?.state === "ok" && !data.result.insufficientData ? data.visible.filter((r) => r.kind !== "manutencao").length : 0;

  // Um aviso discreto uma vez por sessão, quando há prioridades e o Mentor está minimizado.
  useEffect(() => {
    if (open || !pending) return;
    let shown = false;
    try {
      shown = sessionStorage.getItem("aprovum_mentor_aviso") === "1";
    } catch {
      /* sem armazenamento */
    }
    if (shown) return;
    const t1 = setTimeout(() => {
      setTeaser(true);
      try {
        sessionStorage.setItem("aprovum_mentor_aviso", "1");
      } catch {
        /* sem armazenamento */
      }
    }, 1200);
    const t2 = setTimeout(() => setTeaser(false), 8000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [pending, open]);

  const setOpenSaved = (v: boolean) => {
    setOpen(v);
    setTeaser(false);
    save(KEY_OPEN, v);
    if (v) {
      const l = loaded.current;
      if (!demo && l && (Date.now() - l.at > STALE_MS || l.path !== window.location.pathname)) load(true);
      requestAnimationFrame(() => panelRef.current?.focus());
    } else requestAnimationFrame(() => bubbleRef.current?.focus());
  };
  const setTabSaved = (t: Tab) => {
    setTab(t);
    save(KEY_TAB, t);
  };

  // Esc minimiza.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenSaved(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // Arrastar (bolha sempre; painel pelo topo no computador).
  const onDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("a,[data-sem-arrastar]")) return;
    drag.current = { x: e.clientX, y: e.clientY, start: pos, moved: false, id: e.pointerId };
  };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const mx = e.clientX - d.x;
    const my = e.clientY - d.y;
    if (!d.moved && Math.hypot(mx, my) < 5) return;
    if (!d.moved) {
      d.moved = true;
      setDragging(true);
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    }
    setPos(clamp({ dx: d.start.dx - mx, dy: d.start.dy - my }, vp.w, vp.h));
  };
  const onUp = (e: React.PointerEvent) => {
    const d = drag.current;
    drag.current = null;
    if (!d || d.id !== e.pointerId) return;
    if (d.moved) {
      justDragged.current = true;
      setDragging(false);
      save(KEY_POS, pos);
    }
  };
  /** O clique que encerra um arraste não abre o Mentor. */
  const wasDrag = () => {
    const v = justDragged.current;
    justDragged.current = false;
    return v;
  };

  if (hidden || !mounted) return null;

  const mobile = vp.w < 640;
  const afterNav = () => {
    if (mobile) setOpenSaved(false);
  };

  // Painel no computador: ancorado no canto da bolha, sempre inteiro na tela.
  const panelW = Math.min(390, vp.w - 2 * MARGIN);
  const panelH = Math.min(620, vp.h - 2 * MARGIN);
  const right = Math.min(Math.max(MARGIN, pos.dx), vp.w - panelW - MARGIN);
  const bottom = Math.min(Math.max(MARGIN, pos.dy), vp.h - panelH - MARGIN);
  const panelStyle: React.CSSProperties = mobile ? {} : { right, bottom, width: panelW, height: panelH };

  return (
    <>
      {!open && (
        <div className={`mentor-flut ${vw - pos.dx - BUBBLE / 2 < vw / 2 ? "is-esquerda" : ""}`} style={{ right: pos.dx, bottom: pos.dy }} data-testid="mentor-flutuante" data-estado={data?.state ?? "carregando"}>
          {teaser && pending > 0 && (
            <button type="button" className="mentor-aviso" onClick={() => setOpenSaved(true)} data-testid="mentor-aviso">
              {data?.state === "ok" && data.name ? `${data.name}, ` : ""}tenho {pending === 1 ? "1 prioridade" : `${pending} prioridades`} para você.
            </button>
          )}
          <button
            ref={bubbleRef}
            type="button"
            className={`mentor-bolha ${dragging ? "is-arrastando" : ""}`}
            aria-label={`Abrir o Mentor APROVUM${pending ? ` (${pending} ${pending === 1 ? "prioridade" : "prioridades"})` : ""}`}
            aria-expanded={false}
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onUp}
            onClick={() => {
              if (!wasDrag()) setOpenSaved(true);
            }}
            data-testid="mentor-bolha"
          >
            <Compass className="h-6 w-6" aria-hidden />
            {pending > 0 && (
              <span className="mentor-badge" aria-hidden>
                {pending}
              </span>
            )}
            {data === null && <span className="mentor-bolha-carregando" aria-hidden />}
          </button>
        </div>
      )}

      {open && (
        <div
          ref={panelRef}
          tabIndex={-1}
          role="dialog"
          aria-modal="false"
          aria-labelledby="mentor-flut-titulo"
          className={`mentor-painel ${mobile ? "is-folha" : ""} ${dragging ? "is-arrastando" : ""}`}
          style={panelStyle}
          data-testid="mentor-painel"
          data-estado={data?.state ?? "carregando"}
        >
          <div
            className={`mentor-painel-topo ${mobile ? "" : "cursor-grab"}`}
            onPointerDown={mobile ? undefined : onDown}
            onPointerMove={mobile ? undefined : onMove}
            onPointerUp={mobile ? undefined : onUp}
            onPointerCancel={mobile ? undefined : onUp}
          >
            <span className="pc-ico" aria-hidden>
              <Compass className="h-4 w-4" />
            </span>
            <h2 id="mentor-flut-titulo" className="min-w-0 flex-1 truncate text-[14.5px] font-bold text-white">
              Mentor APROVUM
            </h2>
            {!mobile && <GripHorizontal className="h-4 w-4 text-white/40" aria-hidden />}
            <Link href={`${base}/mentor`} onClick={() => setOpenSaved(false)} className="mentor-topo-btn" aria-label="Abrir o Mentor em tela cheia" title="Tela cheia">
              <Maximize2 className="h-4 w-4" aria-hidden />
            </Link>
            <button type="button" data-sem-arrastar onClick={() => setOpenSaved(false)} className="mentor-topo-btn" aria-label="Minimizar o Mentor" title="Minimizar" data-testid="mentor-minimizar">
              <Minus className="h-4 w-4" aria-hidden />
            </button>
          </div>

          {data?.state === "ok" && (
            <div className="mentor-abas" role="tablist" aria-label="Seções do Mentor">
              {(["prioridades", "conversa"] as const).map((t) => (
                <button key={t} type="button" role="tab" id={`mentor-aba-${t}`} aria-selected={tab === t} aria-controls={`mentor-sec-${t}`} onClick={() => setTabSaved(t)} className={tab === t ? "is-on" : ""}>
                  {t === "prioridades" ? `Prioridades${pending ? ` (${pending})` : ""}` : "Conversar"}
                </button>
              ))}
              {refreshing && <span className="ml-auto self-center pr-1 text-[11px] text-[#64666D]">Atualizando…</span>}
            </div>
          )}

          <div className="mentor-painel-corpo">
            {data === null ? (
              <div className="space-y-2.5" data-testid="mentor-carregando" aria-busy>
                <div className="h-3 w-40 animate-pulse rounded bg-[#ECEDF0]" />
                <div className="h-5 w-3/4 animate-pulse rounded bg-[#ECEDF0]" />
                <div className="h-3 w-2/3 animate-pulse rounded bg-[#ECEDF0]" />
                <div className="mt-3 h-10 w-44 animate-pulse rounded-[10px] bg-[#ECEDF0]" />
                <span className="sr-only">Carregando as recomendações do Mentor…</span>
              </div>
            ) : data.state === "sessao" ? (
              <div>
                <p className="text-[14px] font-semibold text-[#08090B]">Sua sessão expirou.</p>
                <p className="mt-1 text-[13px] text-[#64666D]">Entre novamente para ver as recomendações do seu Mentor.</p>
                <a href={`/entrar?next=${encodeURIComponent(pathname)}`} className="pc-botao mt-3">
                  Entrar
                </a>
              </div>
            ) : data.state === "erro" ? (
              <div role="alert">
                <p className="text-[14px] font-semibold text-[#08090B]">Não foi possível carregar o Mentor agora.</p>
                <button type="button" onClick={() => load(false)} className="pc-botao mt-3">
                  <RotateCcw className="h-4 w-4" aria-hidden /> Tentar de novo
                </button>
              </div>
            ) : (
              <>
                <section id="mentor-sec-prioridades" role="tabpanel" aria-labelledby="mentor-aba-prioridades" hidden={tab !== "prioridades"}>
                  {data.name && <p className="mb-2 text-[12.5px] text-[#64666D]">Olá, {data.name}. Isto é o que mais importa agora:</p>}
                  <MentorPriorities
                    key={demo ? params.get("mentor") ?? "ok" : loadId}
                    result={data.result}
                    visible={data.visible}
                    base={base}
                    demo={Boolean(demo)}
                    compact
                    onNavigate={afterNav}
                    onExpired={() => setData({ state: "sessao" })}
                  />
                </section>
                <section id="mentor-sec-conversa" role="tabpanel" aria-labelledby="mentor-aba-conversa" hidden={tab !== "conversa"} className="flex h-full min-h-0 flex-col">
                  <MentorChat result={data.result} visible={data.visible} lessons={data.lessons} base={base} compact onNavigate={afterNav} />
                </section>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
