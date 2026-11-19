"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Bell, BellRing, Compass, GripHorizontal, Maximize2, Minus, RotateCcw } from "lucide-react";
import { usePush } from "@/components/push/use-push";
import { GuiaInstalar } from "@/components/push/guia-instalar";
import { mentorPanelAction } from "@/app/(app)/mentor/actions";
import { MentorPriorities } from "./mentor-priorities";
import { MentorVoz } from "./mentor-voz";
import { MentorIcone } from "./mentor-icone";
import { VozView } from "./voz-view";
import { MentorGoalPlan } from "./mentor-goal-plan";
import type { StudyPlan } from "@/domain/mentor/plan";
import { SILENCE } from "./voz-orbe";
import type { MentorPanelState } from "./types";
import { textoAviso } from "@/domain/concursos-aviso";
import { brDay } from "@/domain/plans/limits";

const BUBBLE = 64;
const MARGIN = 8;
const STALE_MS = 60_000;
const KEY_POS = "aprovum_mentor_pos";
const KEY_OPEN = "aprovum_mentor_aberto";
const KEY_TAB = "aprovum_mentor_aba";
const KEY_CONC = "aprovum_mentor_concursos_dia";

type Pos = { dx: number; dy: number };
type Tab = "plano" | "prioridades" | "voz";

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
const fraseTeaser = ({ nome, raiox, pending, sorteio }: { nome: string | null; raiox: boolean; pending: number; sorteio: number }) => {
  const n = pending === 1 ? "1 novidade" : `${pending} novidades`;
  const f = [`${n} para você.`, `passa aqui: ${n}.`, `olha só, ${n}.`, `tenho ${n} esperando.`, `bora ver? ${n}.`];
  const t = f[Math.min(f.length - 1, Math.floor(sorteio * f.length))] as string;
  return `${nome ? `${nome}, ` : ""}${raiox ? "seu Raio-X foi publicado! " : ""}${t}`;
};

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
  // Prioridades dispensadas agora: saem do número, do selo e do balão sem esperar nova carga.
  const [chaves, setChaves] = useState<string[] | null>(null);
  const [goalOv, setGoalOv] = useState<{ goal: { contest: string } | null; plan: StudyPlan | null } | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  // Lembrados no navegador (lidos só no cliente; no servidor nada é desenhado).
  const [open, setOpen] = useState(() => (typeof window === "undefined" ? false : read<boolean>(KEY_OPEN, false)));
  const [tab, setTab] = useState<Tab>(() => (typeof window === "undefined" ? "plano" : read<string>(KEY_TAB, "plano") === "voz" ? "voz" : read<string>(KEY_TAB, "plano") === "prioridades" ? "prioridades" : "plano"));
  const [savedPos, setPos] = useState<Pos | null>(() => (typeof window === "undefined" ? null : read<Pos | null>(KEY_POS, null)));
  const pos = clamp(savedPos ?? defaultPos(vw), vw, vh);
  const [teaser, setTeaser] = useState(false);
  const push = usePush();
  const [sinoAberto, setSinoAberto] = useState(false);
  // Sininho: um toque já pede a permissão e ativa; nos outros casos mostra o que fazer.
  const tocarSino = () => {
    if (push.estado === "desligado" && !push.busy) void push.ligar();
    setSinoAberto((v) => !v);
  };
  const [dragging, setDragging] = useState(false);
  const loaded = useRef<{ at: number; path: string } | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const bubbleRef = useRef<HTMLButtonElement>(null);
  const drag = useRef<{ x: number; y: number; start: Pos; moved: boolean; id: number } | null>(null);
  const justDragged = useRef(false);

  // Some na página do Mentor (já está em tela cheia) e no Modo Jogo (a questão ocupa a tela toda).
  // Na leitura da aula o Mentor fica na barra de ferramentas de estudo (aula/[id]).
  const hidden = pathname === `${base}/mentor` || pathname === `${base}/quiz` || pathname.startsWith(`${base}/aula/`);

  const apply = (d: MentorPanelState) => {
    loaded.current = { at: Date.now(), path: window.location.pathname };
    setData(d);
    setChaves(null);
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
        setChaves(null);
        setLoadId((n) => n + 1);
      });
    return () => {
      alive = false;
    };
  }, [isDemo]);

  const avisos = data?.state === "ok" ? (data.notices?.length ?? 0) : 0;
  // Concursos abertos/previstos: o Mentor avisa de novo a cada dia (some quando o aluno toca em "Ver" ou "Ok").
  const hoje = brDay().day;
  const [concVisto, setConcVisto] = useState(() => (typeof window === "undefined" ? "" : read<string>(KEY_CONC, "")));
  const concRes = data?.state === "ok" ? data.concursos : null;
  // Sorteia uma vez por carregamento (sem mudar a cada render).
  const concTexto = useMemo(() => (concRes ? textoAviso(concRes) : null), [concRes]);
  const [sorteio] = useState(() => Math.random());
  const concNovo = concTexto && concVisto !== hoje ? 1 : 0;
  const dispensarConc = () => { setConcVisto(hoje); save(KEY_CONC, hoje); };
  const pending = (data?.state === "ok" && !data.result.insufficientData ? data.visible.filter((r) => r.kind !== "manutencao" && (!chaves || chaves.includes(r.key))).length : 0) + avisos + concNovo;

  // Selo no ícone do app instalado: novidades do Mentor + concursos abertos e previstos (some quando zera).
  const concAtivos = data?.state === "ok" && data.concursos ? data.concursos.abertos + data.concursos.previstos : 0;
  const seloTotal = pending - concNovo + concAtivos;
  useEffect(() => {
    if (isDemo || data?.state !== "ok") return;
    const nav = navigator as Navigator & { setAppBadge?: (n?: number) => Promise<void>; clearAppBadge?: () => Promise<void> };
    try {
      if (seloTotal > 0) void nav.setAppBadge?.(seloTotal)?.catch(() => undefined);
      else void nav.clearAppBadge?.()?.catch(() => undefined);
    } catch { /* sem suporte */ }
  }, [seloTotal, data?.state, isDemo]);

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
              {fraseTeaser({ nome: data?.state === "ok" ? data.name : null, raiox: avisos > 0, pending, sorteio })}
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
            <MentorIcone size={BUBBLE} />
            {pending > 0 && (
              <span className="mentor-badge" aria-hidden>
                {pending}
              </span>
            )}
            {data === null && <span className="mentor-bolha-carregando" aria-hidden />}
            <span className="mentor-minicard" data-testid="mentor-minicard">Mentor</span>
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
          className={`mentor-painel ${mobile ? "is-folha" : ""} ${dragging ? "is-arrastando" : ""} is-escuro`}
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
            {!mobile && <GripHorizontal className="h-4 w-4 text-white/60" aria-hidden />}
            <button type="button" data-sem-arrastar onClick={tocarSino} className="mentor-topo-btn relative" aria-label={push.estado === "ligado" ? "Avisos no celular ativos" : "Ativar avisos no celular"} title={push.estado === "ligado" ? "Avisos ativos" : "Ativar avisos no celular"} aria-expanded={sinoAberto} data-testid="mentor-avisos">
              {push.estado === "ligado" ? <BellRing className="h-4 w-4" aria-hidden /> : <Bell className="h-4 w-4" aria-hidden />}
              {push.estado !== "ligado" && push.estado !== "carregando" && <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-[#FF3B30]" aria-hidden />}
            </button>
            <Link href={`${base}/mentor`} onClick={() => setOpenSaved(false)} className="mentor-topo-btn" aria-label="Abrir o Mentor em tela cheia" title="Tela cheia">
              <Maximize2 className="h-4 w-4" aria-hidden />
            </Link>
            <button type="button" data-sem-arrastar onClick={() => setOpenSaved(false)} className="mentor-topo-btn" aria-label="Minimizar o Mentor" title="Minimizar" data-testid="mentor-minimizar">
              <Minus className="h-4 w-4" aria-hidden />
            </button>
          </div>

          {data?.state === "ok" && (
            <div className="mentor-abas" role="tablist" aria-label="Seções do Mentor">
              {(["plano", "prioridades", "voz"] as const).map((t) => (
                <button key={t} type="button" role="tab" id={`mentor-aba-${t}`} aria-selected={tab === t} aria-controls={`mentor-sec-${t}`} onClick={() => setTabSaved(t)} className={tab === t ? "is-on" : ""}>
                  {t === "plano" ? "Meu plano" : t === "prioridades" ? `Prioridades${pending ? ` (${pending})` : ""}` : "Voz"}
                </button>
              ))}
              {refreshing && <span className="ml-auto self-center pr-1 text-[11px] text-[#64666D]">Atualizando…</span>}
            </div>
          )}

          {sinoAberto && (
            <div className="border-b border-white/10 bg-[#141416] px-4 py-3 text-[13px] text-white" role="region" aria-label="Avisos no celular" data-testid="mentor-avisos-painel">
              <p className="font-bold">Avisos no celular</p>
              {push.estado === "ligado" && (
                <>
                  <p className="mt-1 text-[#4ADE80]">Ativos neste aparelho: revisões, concursos e novidades chegam mesmo com o app fechado.</p>
                  <button type="button" onClick={() => void push.desligar()} disabled={push.busy} className="mt-2 rounded-lg border border-white/30 px-3 py-1.5 text-[12.5px] font-bold disabled:opacity-60">Desativar</button>
                </>
              )}
              {push.estado === "desligado" && (
                <>
                  <p className="mt-1">{push.busy ? "Aguardando a sua permissão…" : "Toque em permitir quando o celular perguntar."}</p>
                  {!push.busy && <button type="button" onClick={() => void push.ligar()} className="mt-2 rounded-lg bg-white px-3 py-1.5 text-[12.5px] font-bold text-black">Ativar avisos</button>}
                </>
              )}
              {push.estado === "bloqueado" && <p className="mt-1">Os avisos estão bloqueados neste aparelho. Libere nas configurações do navegador ou do app para a APROVUM e toque no sino de novo.</p>}
              {push.estado === "sem-suporte" && <p className="mt-1">Este navegador não aceita avisos. No Android use o Chrome; no iPhone, o Safari com o app na Tela de Início.</p>}
              {push.estado === "ios-instalar" && (
                <>
                  <p className="mt-1">No iPhone, os avisos só funcionam com o app instalado na Tela de Início:</p>
                  <GuiaInstalar className="mt-2" />
                </>
              )}
              {push.estado === "carregando" && <p className="mt-1">Verificando…</p>}
              {push.msg && push.estado !== "ligado" && <p className="mt-1 text-[#FF6B6B]" role="alert">{push.msg}</p>}
              {push.estado === "desligado" && (
                <details className="mt-2"><summary className="cursor-pointer font-semibold">Colocar o app como ícone no celular</summary><GuiaInstalar className="mt-2" /></details>
              )}
            </div>
          )}

          {concNovo > 0 && concTexto && (
            <div className="flex items-start gap-2 border-b border-white/10 bg-[#2A0A0C] px-4 py-3 text-[13px] text-white" role="status" data-testid="mentor-concursos">
              <BellRing className="mt-0.5 h-4 w-4 shrink-0 text-[#E10600]" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="font-bold">{concTexto.title}</p>
                <p className="mt-0.5 text-white/80">{concTexto.body.replace(" Toque para ver.", "")}</p>
                <div className="mt-2 flex gap-2">
                  <Link href={`${base}/concursos`} onClick={() => { dispensarConc(); afterNav(); }} className="rounded-lg bg-white px-3 py-1.5 text-[12.5px] font-bold text-black">Ver concursos</Link>
                  <button type="button" onClick={dispensarConc} className="rounded-lg border border-white/30 px-3 py-1.5 text-[12.5px] font-bold">Ok</button>
                </div>
              </div>
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
                <section id="mentor-sec-plano" role="tabpanel" aria-labelledby="mentor-aba-plano" hidden={tab !== "plano"}>
                  <MentorGoalPlan goal={goalOv ? goalOv.goal : (data.goal ?? null)} plan={goalOv ? goalOv.plan : (data.plan ?? null)} name={data.name} onChange={(g, p) => setGoalOv({ goal: g, plan: p })} />
                </section>
                <section id="mentor-sec-prioridades" role="tabpanel" aria-labelledby="mentor-aba-prioridades" hidden={tab !== "prioridades"}>
                  {data.name && <p className="mb-2 text-[12.5px] text-[#64666D]">Olá, {data.name}. Isto é o que mais importa agora:</p>}
                  <MentorPriorities
                    onVisibleChange={setChaves}
                    key={demo ? params.get("mentor") ?? "ok" : loadId}
                    result={data.result}
                    visible={data.visible}
                    notices={data.notices}
                    base={base}
                    demo={Boolean(demo)}
                    compact
                    onNavigate={afterNav}
                    onExpired={() => setData({ state: "sessao" })}
                  />
                </section>
                <section id="mentor-sec-voz" role="tabpanel" aria-labelledby="mentor-aba-voz" hidden={tab !== "voz"} className="h-full min-h-0">
                  {tab === "voz" && (demo ? <VozView fase="pronto" left={110} limit={180} speaking={false} msg={null} level={() => SILENCE} base={base} onStart={() => {}} onStop={() => {}} /> : <MentorVoz base={base} />)}
                </section>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
