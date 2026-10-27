"use client";

import { Component, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  BookOpen,
  Brain,
  ChartLine,
  ChartNoAxesColumnIncreasing,
  Clock3,
  Cpu,
  Crosshair,
  FileText,
  Filter,
  Gamepad2,
  Gavel,
  House,
  Landmark,
  List,
  LocateFixed,
  Map as MapIcon,
  Minus,
  Move,
  Plus,
  RotateCcw,
  Scale,
  Search,
  Shield,
  Target,
  X,
  type LucideIcon,
} from "lucide-react";
import { buildKnowledgeMap, emptyTerritory, radarPoint, searchMap, type KnowledgeMap, type MapTopic, type SearchHit, type Territory, type TerritoryIcon } from "@/domain/knowledge-map/model";
import type { ThemeCard } from "@/domain/studies/home";
import { CameraRig, viewYawFor } from "./scene/rig";
import type { Anchor } from "./scene/scene";
import { terrainHeight } from "./scene/textures";
import "./knowledge-ops.css";
import { ART, ART_ORDER_DRAWN, ImageStage, PlateCamera, slotFor } from "./image-stage";

const Scene = dynamic(() => import("./scene/scene"), { ssr: false, loading: () => <div className={"km-loading"}>Carregando o território…</div> });

const ICONS: Record<TerritoryIcon, LucideIcon> = {
  livro: BookOpen,
  chip: Cpu,
  cerebro: Brain,
  balanca: Scale,
  pilar: Landmark,
  escudo: Shield,
  martelo: Gavel,
  documento: FileText,
  grafico: ChartLine,
  alvo: Crosshair,
};

type Situacao = "todos" | "nao_iniciados" | "andamento" | "concluidos";
const SITUACAO: Record<Situacao, string> = { todos: "Todos", nao_iniciados: "Não iniciados", andamento: "Em andamento", concluidos: "Concluídos" };

const matchSit = (t: MapTopic, f: Situacao) => (f === "todos" ? true : f === "nao_iniciados" ? !t.study : f === "concluidos" ? !!t.study?.done : !!t.study && !t.study.done);

class SceneBoundary extends Component<{ onError: () => void; children: ReactNode }, { failed: boolean }> {
  override state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  override componentDidCatch() {
    this.props.onError();
  }
  override render() {
    return this.state.failed ? null : this.props.children;
  }
}

function hasWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

export interface KnowledgeOpsProps {
  themes: ThemeCard[];
  /** Prefixo das rotas (galeria de desenvolvimento usa "/dev/galeria"). */
  base?: string;
  name?: string | null;
  /** "Começar estudo" (abre a confirmação existente). */
  onStart: (topic: { id: string; title: string; discipline: string }) => void;
}

/**
 * APROVUM — Knowledge Operations: o mapa do conhecimento em primeira pessoa.
 * Camada A: cena 3D (carregada sob demanda). Camada B: HUD em HTML acessível, que também
 * funciona sozinha (lista) quando o WebGL não está disponível.
 */
export function KnowledgeOps({ themes, base = "", name, onStart }: KnowledgeOpsProps) {
  const full = useMemo(() => buildKnowledgeMap(themes), [themes]);
  const [filterDisc, setFilterDisc] = useState<Set<string>>(new Set());
  const [sit, setSit] = useState<Situacao>("todos");
  const map: KnowledgeMap = useMemo(() => {
    const territories = full.territories
      .filter((t) => !filterDisc.size || filterDisc.has(t.id))
      .map((t) => ({ ...t, topics: t.topics.filter((x) => matchSit(x, sit)) }))
      .filter((t) => sit === "todos" || t.topics.length);
    return { ...full, territories };
  }, [full, filterDisc, sit]);

  const [mode3d, setMode3d] = useState<"verificando" | "3d" | "lista">("verificando");
  const [quality, setQuality] = useState<"alta" | "baixa">("alta");
  const [portrait, setPortrait] = useState(false);
  // Objeto mutável compartilhado com a cena (a cena lê a cada quadro; não dispara re-render).
  const [rig] = useState(() => new CameraRig());
  const controls = rig;
  // Palco: "arte" (a arte de referência, com câmera 2D) é o padrão; "3d" é a cena procedural.
  const [stageKind, setStageKind] = useState<"arte" | "3d">("arte");
  const [cam] = useState(() => new PlateCamera());
  const dragged = useRef(false);
  // Alvo da mira do soldado (matéria em foco ou sob o cursor), lido a cada quadro pelo palco.
  const aim = useRef<[number, number] | null>(null);

  const [selT, setSelT] = useState<string | null>(null);
  const [selTopic, setSelTopic] = useState<string | null>(null);
  const [coreOpen, setCoreOpen] = useState(false);
  const [dragMode, setDragMode] = useState<"girar" | "mover">("girar");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [hint, setHint] = useState(true);
  const labels = useRef(new Map<string, HTMLElement>());
  const root = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);

  const territory = map.territories.find((t) => t.id === selT) ?? full.territories.find((t) => t.id === selT) ?? (selT && ART_ORDER_DRAWN.includes(selT) ? emptyTerritory(selT) : null);
  const topic = territory?.topics.find((t) => t.id === selTopic) ?? full.territories.flatMap((t) => t.topics).find((t) => t.id === selTopic) ?? null;

  // Ambiente: WebGL, tela, movimento reduzido, rolagem da página travada enquanto o mapa está aberto.
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    rig.setReduced(reduced);
    cam.setReduced(reduced);
    const sem3d = new URLSearchParams(window.location.search).get("sem3d") === "1";
    const update = () => {
      const p = window.innerHeight > window.innerWidth;
      setPortrait(p);
      rig.setPortrait(p);
      setQuality(p || window.innerWidth < 900 || (navigator.hardwareConcurrency ?? 8) <= 4 ? "baixa" : "alta");
    };
    // Fora do render (o servidor não conhece a tela nem o WebGL).
    const t0 = setTimeout(() => {
      update();
      setMode3d(!sem3d && hasWebGL() ? "3d" : "lista");
    }, 0);
    window.addEventListener("resize", update);
    const html = document.documentElement;
    const prev = html.style.overflow;
    html.style.overflow = "hidden";
    const t = setTimeout(() => setHint(false), 7000);
    return () => {
      window.removeEventListener("resize", update);
      html.style.overflow = prev;
      clearTimeout(t);
      clearTimeout(t0);
      document.body.style.cursor = "";
    };
  }, [rig, cam]);

  const art = stageKind === "arte";
  // Espaço ocupado pelo painel de detalhes (lateral no computador, inferior no celular).
  const panelInset = () => (window.innerWidth <= 900 ? { bottom: window.innerHeight * 0.5 } : { right: 400 });
  const selectTerritory = (t: Territory) => {
      setCoreOpen(false);
      setSelT(t.id);
      setSelTopic(null);
      controls.focusOn(t.pos, 36, 0.55, viewYawFor(t.pos));
      // O soldado mira na matéria; a câmera só desloca se ela estiver fora da área central.
      aim.current = slotFor(t.id).base;
      cam.reveal(slotFor(t.id).base, panelInset());
  };
  const selectTopic = (t: Territory, x: MapTopic) => {
      setCoreOpen(false);
      setSelT(t.id);
      setSelTopic(x.id);
      controls.focusOn(x.pos, 26, 0.5, viewYawFor(t.pos));
      aim.current = slotFor(t.id).base;
      cam.reveal(slotFor(t.id).base, panelInset());
  };
  const overview = () => {
    setSelT(null);
    setSelTopic(null);
    setCoreOpen(false);
    controls.overview();
    cam.overview();
    aim.current = null;
  };
  const selectCore = () => {
    setSelT(null);
    setSelTopic(null);
    setCoreOpen(true);
    controls.focusOn([0, 0], 36);
    aim.current = slotFor("direito_penal").base;
    cam.reveal(slotFor("direito_penal").base, panelInset());
  };
  const zoomIn = useCallback(() => (art ? cam.zoomBy(1.25) : controls.zoom(0.78)), [art, cam, controls]);
  const zoomOut = useCallback(() => (art ? cam.zoomBy(0.8) : controls.zoom(1.28)), [art, cam, controls]);
  const centerView = useCallback(() => (art ? cam.center() : controls.center()), [art, cam, controls]);

  // Teclado: Esc volta um nível; +/- zoom; setas exploram; "/" busca; 0 visão geral.
  const search = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement;
      if (document.querySelector("dialog[open]")) return;
      if (e.key === "Escape") {
        if (filtersOpen || listOpen || navOpen) {
          setFiltersOpen(false);
          setListOpen(false);
          setNavOpen(false);
        } else if (selTopic) setSelTopic(null);
        else if (selT || coreOpen) overview();
        return;
      }
      if (typing) return;
      if (e.key === "/") {
        e.preventDefault();
        search.current?.focus();
      } else if (e.key === "+" || e.key === "=") zoomIn();
      else if (e.key === "-") zoomOut();
      else if (e.key === "0" || e.key === "Home") overview();
      else if (art) {
        if (e.key === "ArrowLeft") cam.pan(60, 0);
        else if (e.key === "ArrowRight") cam.pan(-60, 0);
        else if (e.key === "ArrowUp") cam.pan(0, 60);
        else if (e.key === "ArrowDown") cam.pan(0, -60);
      } else if (e.key === "ArrowLeft") controls.rotate(0.08, 0);
      else if (e.key === "ArrowRight") controls.rotate(-0.08, 0);
      else if (e.key === "ArrowUp") controls.pan(0, -4);
      else if (e.key === "ArrowDown") controls.pan(0, 4);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [controls, cam, art, zoomIn, zoomOut, overview, selT, selTopic, coreOpen, filtersOpen, listOpen, navOpen]);

  // Mouse/toque: olhar acompanha o cursor; arrastar gira ou move; roda e pinça aproximam.
  useEffect(() => {
    const el = stage.current;
    if (!el || (!art && mode3d !== "3d")) return;
    const pts = new Map<number, { x: number; y: number }>();
    let pinch = 0;
    let travel = 0;
    const down = (e: PointerEvent) => {
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      travel = 0;
      dragged.current = false;
      if (pts.size === 2) {
        const [a, b] = [...pts.values()];
        pinch = Math.hypot(a!.x - b!.x, a!.y - b!.y);
      }
      setHint(false);
    };
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      if (e.pointerType === "mouse") {
        const px = ((e.clientX - r.left) / r.width) * 2 - 1;
        const py = ((e.clientY - r.top) / r.height) * 2 - 1;
        rig.setPointer(px, py);
        cam.setPointer(px, py);
      }
      const p = pts.get(e.pointerId);
      if (!p) return;
      const dx = e.clientX - p.x;
      const dy = e.clientY - p.y;
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      travel += Math.abs(dx) + Math.abs(dy);
      if (travel > 6) dragged.current = true;
      if (pts.size === 2) {
        const [a, b] = [...pts.values()];
        const d = Math.hypot(a!.x - b!.x, a!.y - b!.y);
        if (pinch > 0 && d > 0) {
          if (art) {
            const r = el.getBoundingClientRect();
            cam.zoomBy(d / pinch, [(a!.x + b!.x) / 2 - r.left, (a!.y + b!.y) / 2 - r.top]);
          }
          else controls.zoom(pinch / d);
        }
        pinch = d;
        return;
      }
      if (art) cam.pan(dx, dy);
      else if (rig.dragMode === "mover") controls.pan(-dx * 0.09, -dy * 0.09);
      else controls.rotate(-dx * 0.0035, dy * 0.0025);
    };
    const up = (e: PointerEvent) => {
      pts.delete(e.pointerId);
      if (pts.size < 2) pinch = 0;
    };
    const leave = () => {
      rig.setPointer(0, 0);
      cam.setPointer(0, 0);
    };
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      if (art) {
        const r = el.getBoundingClientRect();
        cam.zoomBy(Math.exp(-Math.max(-120, Math.min(120, e.deltaY)) * 0.0016), [e.clientX - r.left, e.clientY - r.top]);
      }
      else controls.zoom(Math.exp(e.deltaY * 0.0012));
      setHint(false);
    };
    el.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    el.addEventListener("pointerleave", leave);
    el.addEventListener("wheel", wheel, { passive: false });
    return () => {
      el.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      el.removeEventListener("pointerleave", leave);
      el.removeEventListener("wheel", wheel);
    };
  }, [controls, rig, cam, art, mode3d]);

  useEffect(() => rig.setDragMode(dragMode), [rig, dragMode]);
  useEffect(() => rig.setLowered(!!selT || coreOpen), [rig, selT, coreOpen]);

  // Placas holográficas: territórios sempre; assuntos só do território selecionado.
  const anchors: Anchor[] = useMemo(() => {
    const out: Anchor[] = map.territories.map((t) => ({ key: `t:${t.id}`, pos: [t.pos[0], terrainHeight(t.pos[0], t.pos[1]) + 11, t.pos[1]] }));
    const sel = map.territories.find((t) => t.id === selT);
    if (sel) for (const x of sel.topics) out.push({ key: `a:${x.id}`, pos: [x.pos[0], terrainHeight(x.pos[0], x.pos[1]) + 3.4, x.pos[1]] });
    return out;
  }, [map, selT]);

  // Palco "arte": matérias reais + as instalações da arte ainda sem aulas ("em breve").
  const filtering = filterDisc.size > 0 || sit !== "todos";
  const artTerritories: Territory[] = useMemo(() => {
    const ids = new Set(map.territories.map((t) => t.id));
    const extra = filtering ? [] : ART_ORDER_DRAWN.filter((id) => !ids.has(id)).map((id) => emptyTerritory(id));
    return [...map.territories, ...extra];
  }, [map, filtering]);
  const plates = art ? artTerritories : map.territories;
  // Assuntos da matéria em foco: coluna ao lado da instalação (à esquerda quando ela fica à direita).
  const topicOffsets = useMemo(() => {
    const out = new Map<string, [number, number]>();
    const t = artTerritories.find((x) => x.id === selT);
    if (!t) return out;
    const right = slotFor(t.id).base[0] > ART.w * 0.62;
    const n = t.topics.length;
    t.topics.forEach((x, i) => out.set(x.id, [right ? -230 : 70, 30 + (i - (n - 1) / 2) * 38]));
    return out;
  }, [artTerritories, selT]);
  const viewRect = useRef<SVGRectElement>(null);
  const onView = useCallback((r: { x: number; y: number; w: number; h: number }) => {
    const el = viewRect.current;
    if (!el) return;
    // A arte é uma vista em perspectiva: o radar mostra a área enquadrada sobre ela.
    el.setAttribute("x", (8 + r.x * 84).toFixed(2));
    el.setAttribute("y", (20 + r.y * 60).toFixed(2));
    el.setAttribute("width", (r.w * 84).toFixed(2));
    el.setAttribute("height", (r.h * 60).toFixed(2));
  }, []);

  // Radar: cone de visão e posição da câmera, escritos direto no SVG (sem re-render).
  const cone = useRef<SVGGElement>(null);
  const onHeading = useCallback((yaw: number, focus: [number, number], dist: number) => {
    const g = cone.current;
    if (!g) return;
    const cx = focus[0] + Math.sin(yaw) * dist * 0.85;
    const cz = focus[1] + Math.cos(yaw) * dist * 0.85;
    const [x, y] = radarPoint([cx, cz]);
    g.setAttribute("transform", `translate(${(x * 100).toFixed(2)} ${(y * 100).toFixed(2)}) rotate(${((-yaw * 180) / Math.PI).toFixed(1)})`);
  }, []);

  const [lost, setLost] = useState(false);
  const show3d = !art && mode3d === "3d" && !lost;
  const showStage = art || show3d;
  const empty = full.territories.length === 0;
  const done = full.totals.done;

  const nav = [
    { label: "Mapa", href: `${base}/nova-trilha`, icon: MapIcon, current: true },
    { label: "Painel", href: `${base}/painel`, icon: House },
    { label: "Estudos", href: `${base}/trilhas`, icon: BookOpen },
    { label: "Questões", href: `${base}/questoes`, icon: Target },
    { label: "Revisões", href: `${base}/revisoes`, icon: Clock3 },
    { label: "Evolução", href: `${base}/desempenho`, icon: ChartNoAxesColumnIncreasing },
    { label: "Jogo", href: `${base}/quiz`, icon: Gamepad2 },
  ];

  return (
    <div ref={root} className={"km-root"} data-testid="knowledge-ops" data-modo={art ? "arte" : show3d ? "3d" : "lista"}>
      <h1 className="sr-only">Novo estudo — Central de operações: mapa do conhecimento</h1>

      {/* Camada A — mundo 3D */}
      <div ref={stage} className={"km-stage"}>
        {art && (
          <ImageStage
            cam={cam}
            territories={artTerritories}
            selected={selT}
            selectedTopic={selTopic}
            labels={labels}
            topicOffsets={topicOffsets}
            onView={onView}
            aim={aim}
            onSelect={(t) => !dragged.current && selectTerritory(t)}
            onSelectCore={() => !dragged.current && selectCore()}
            onSelectTopic={(t, x) => !dragged.current && selectTopic(t, x)}
          />
        )}
        {show3d && (
          <SceneBoundary onError={() => setStageKind("arte")}>
            <Scene
              map={map}
              rig={rig}
              quality={quality}
              portrait={portrait}
              selectedTerritory={selT}
              selectedTopic={selTopic}
              anchors={anchors}
              labels={labels}
              onHeading={onHeading}
              onSelectTerritory={selectTerritory}
              onSelectTopic={selectTopic}
              onSelectCore={selectCore}
              onContextLost={() => setLost(true)}
            />
          </SceneBoundary>
        )}
        {!showStage && mode3d !== "verificando" && <div className={"km-fallbackBg"} aria-hidden />}
        <div className={"km-vignette"} aria-hidden />
        {/* Placas holográficas (HTML, legíveis e clicáveis) */}
        {showStage && (
          <div className={"km-labels"} data-palco={art ? "arte" : "3d"}>
            {plates.map((t) => {
              const Icon = ICONS[t.icon];
              const sel = selT === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  ref={(el) => void (el ? labels.current.set(`t:${t.id}`, el) : labels.current.delete(`t:${t.id}`))}
                  className={"km-plate"}
                  data-sel={sel ? "1" : undefined}
                  data-dim={selT && !sel ? "1" : undefined}
                  style={{ ["--c" as string]: t.color, visibility: "hidden" }}
                  onClick={() => selectTerritory(t)}
                  onMouseEnter={() => {
                    if (!art) return;
                    aim.current = slotFor(t.id).base;
                  }}
                  onMouseLeave={() => {
                    if (!art) return;
                    aim.current = selT ? slotFor(selT).base : null;
                  }}
                  aria-label={t.topics.length ? `${t.label}: ${t.topics.length} assunto(s)${t.progress !== null ? `, progresso ${t.progress}%` : ""}` : `${t.label}: em breve, ainda sem aulas publicadas`}
                  data-testid="territorio"
                  data-vazio={t.topics.length ? undefined : "1"}
                >
                  <span className={"km-plateIcon"}>
                    <Icon aria-hidden />
                  </span>
                  <span className={"km-plateBody"}>
                    <span className={"km-plateName"}>{t.label}</span>
                    {!t.topics.length ? <span className={"km-plateNew"}>Em breve</span> : t.progress !== null ? <span className={"km-platePct"}>{t.progress}%</span> : <span className={"km-plateNew"}>Não iniciado</span>}
                    {t.topics.length > 0 && (
                      <>
                        <span className={"km-plateBar"}>
                          <i style={{ width: `${t.progress ?? 0}%` }} />
                        </span>
                        <span className={"km-plateMeta"}>
                          <BookOpen aria-hidden /> {t.topics.length} assunto{t.topics.length === 1 ? "" : "s"}
                        </span>
                      </>
                    )}
                  </span>
                </button>
              );
            })}
            {territory &&
              plates
                .find((t) => t.id === territory.id)
                ?.topics.map((x) => (
                  <button
                    key={x.id}
                    type="button"
                    ref={(el) => void (el ? labels.current.set(`a:${x.id}`, el) : labels.current.delete(`a:${x.id}`))}
                    className={"km-topicPlate"}
                    data-sel={selTopic === x.id ? "1" : undefined}
                    style={{ ["--c" as string]: territory.color, visibility: "hidden" }}
                    onClick={() => selectTopic(territory, x)}
                    data-testid="assunto-no-mapa"
                    title={x.title}
                  >
                    {x.study?.done ? "✓ " : ""}
                    {x.title}
                  </button>
                ))}
          </div>
        )}
      </div>

      {/* Camada B — HUD */}
      <header className={"km-top"}>
        <div className={"km-brand"}>
          <button type="button" className={"km-navToggle"} onClick={() => setNavOpen((v) => !v)} aria-expanded={navOpen} aria-label="Menu">
            <List aria-hidden />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/aprovum-wordmark.png" alt="APROVUM" className={"km-wordmark"} />
          <span className={"km-brandSep"} aria-hidden />
          <span className={"km-brandText"}>
            <b>Central de operações</b>
            <span>Mapa do conhecimento</span>
          </span>
        </div>
        <SearchBox map={full} inputRef={search} onPick={(h) => (h.kind === "materia" ? selectTerritory(h.territory) : selectTopic(h.territory, h.topic))} />
        <div className={"km-topRight"}>
          <label className={"km-contest"} title="As aulas do catálogo ainda não estão ligadas a concursos específicos: o mapa mostra todas.">
            <Crosshair aria-hidden />
            <span className="sr-only">Concurso</span>
            <select defaultValue="todos" aria-label="Concurso">
              <option value="todos">Todos os concursos</option>
            </select>
          </label>
          <div className={"km-progressChip"} aria-label={`Assuntos concluídos: ${done} de ${full.totals.topics}`}>
            <span>Concluídos</span>
            <b>
              {done}/{full.totals.topics}
            </b>
          </div>
          <Link href={`${base}/perfil`} className={"km-profile"}>
            <span className={"km-avatar"} aria-hidden>
              {(name ?? "A").slice(0, 1).toUpperCase()}
            </span>
            <span className={"km-profileText"}>
              <b>{name ?? "Seu perfil"}</b>
              <span>Aluno</span>
            </span>
          </Link>
        </div>
      </header>

      <nav className={"km-side"} data-open={navOpen ? "1" : undefined} aria-label="Navegação">
        <div className={"km-motto"} aria-hidden>
          <span>Foco</span>
          <span>Disciplina</span>
          <span>Evolução</span>
          <span>Aprovação</span>
          <i />
        </div>
        {nav.map((n) => (
          <Link key={n.label} href={n.href} className={"km-sideLink"} aria-current={n.current ? "page" : undefined}>
            <n.icon aria-hidden /> {n.label}
          </Link>
        ))}
        <Link href={`${base}/nova-trilha?modo=lista`} className={"km-sideLink"}>
          <List aria-hidden /> Ver em lista
        </Link>
      </nav>

      {/* Radar e visão geral */}
      <div className={"km-bottomLeft"}>
        <figure className={"km-radar"} aria-label="Radar: posição dos territórios e direção da câmera" data-testid="radar">
          <svg viewBox="0 0 100 100" role="img" aria-hidden>
            <defs>
              <radialGradient id="rg" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="rgba(215,25,32,0.18)" />
                <stop offset="100%" stopColor="rgba(8,9,12,0.65)" />
              </radialGradient>
            </defs>
            <circle cx="50" cy="50" r="48" fill="url(#rg)" stroke="rgba(255,69,69,0.6)" strokeWidth="0.8" />
            {[36, 24, 12].map((r) => (
              <circle key={r} cx="50" cy="50" r={r} fill="none" stroke="rgba(255,69,69,0.25)" strokeWidth="0.5" />
            ))}
            <line x1="50" y1="2" x2="50" y2="98" stroke="rgba(255,69,69,0.2)" strokeWidth="0.4" />
            <line x1="2" y1="50" x2="98" y2="50" stroke="rgba(255,69,69,0.2)" strokeWidth="0.4" />
            <g className={"km-sweep"}>
              <path d="M50 50 L50 2 A48 48 0 0 1 84 16 Z" fill="rgba(255,69,69,0.16)" />
            </g>
            {art && <rect ref={viewRect} x="30" y="30" width="40" height="30" fill="rgba(244,244,245,0.08)" stroke="rgba(244,244,245,0.6)" strokeWidth="0.6" />}
            <g ref={cone} style={{ display: art ? "none" : undefined }}>
              <path d="M0 0 L-9 -16 A18 18 0 0 1 9 -16 Z" fill="rgba(244,244,245,0.18)" stroke="rgba(244,244,245,0.5)" strokeWidth="0.4" />
              <path d="M0 -4 L3 3 L0 1.5 L-3 3 Z" fill="#ff4545" />
            </g>
            <circle cx="50" cy="50" r="2.4" fill="#ff4545" />
            {plates.map((t) => {
              const [x, y] = art ? [(8 + (slotFor(t.id).base[0] / ART.w) * 84) / 100, (20 + (slotFor(t.id).base[1] / ART.h) * 60) / 100] : radarPoint(t.pos);
              return <circle key={t.id} cx={x * 100} cy={y * 100} r={selT === t.id ? 3.2 : 2} fill={t.color} stroke={selT === t.id ? "#fff" : "none"} strokeWidth="0.8" />;
            })}
          </svg>
          <span className={"km-n"}>N</span>
          <span className={"km-sDir"}>S</span>
          <span className={"km-e"}>L</span>
          <span className={"km-o"}>O</span>
        </figure>
        <dl className={"km-overview"} aria-label="Visão geral do catálogo">
          <dt className={"km-ovTitle"}>Visão geral</dt>
          <dd>
            <span>Disciplinas</span>
            <b>{full.totals.disciplines}</b>
          </dd>
          <dd>
            <span>Assuntos</span>
            <b>{full.totals.topics}</b>
          </dd>
          <dd>
            <span>Questões</span>
            <b>{full.totals.questions.toLocaleString("pt-BR")}</b>
          </dd>
          <dd>
            <span>Seus estudos</span>
            <b>{full.totals.started}</b>
          </dd>
        </dl>
      </div>

      {/* Controles */}
      <div className={"km-controls"} role="toolbar" aria-label="Controles do mapa">
        {art ? (
          <button type="button" aria-pressed title="Arraste o cenário para explorar" onClick={() => setHint(true)}>
            <Move aria-hidden /> <span>Mover</span>
          </button>
        ) : (
          <button type="button" onClick={() => setDragMode((m) => (m === "girar" ? "mover" : "girar"))} aria-pressed={dragMode === "mover"} title="Arrastar move o mapa (em vez de girar)">
            <Move aria-hidden /> <span>{dragMode === "mover" ? "Mover" : "Girar"}</span>
          </button>
        )}
        <button type="button" onClick={zoomIn} aria-label="Aproximar">
          <Plus aria-hidden /> <span>Zoom +</span>
        </button>
        <button type="button" onClick={zoomOut} aria-label="Afastar">
          <Minus aria-hidden /> <span>Zoom −</span>
        </button>
        <button type="button" onClick={centerView}>
          <LocateFixed aria-hidden /> <span>Centralizar</span>
        </button>
        <button type="button" onClick={overview}>
          <RotateCcw aria-hidden /> <span>Visão geral</span>
        </button>
        <button type="button" onClick={() => setFiltersOpen((v) => !v)} aria-expanded={filtersOpen}>
          <Filter aria-hidden /> <span>Filtros{filterDisc.size || sit !== "todos" ? " •" : ""}</span>
        </button>
        <button type="button" onClick={() => setListOpen((v) => !v)} aria-expanded={listOpen}>
          <List aria-hidden /> <span>Lista</span>
        </button>
        {mode3d === "3d" && (
          <button
            type="button"
            onClick={() => {
              setStageKind((k) => (k === "arte" ? "3d" : "arte"));
              overview();
            }}
            aria-pressed={!art}
            title="Alterna entre o cenário cinematográfico e o mapa 3D"
          >
            <Crosshair aria-hidden /> <span>{art ? "Mapa 3D" : "Cenário"}</span>
          </button>
        )}
      </div>

      {filtersOpen && (
        <div className={"km-filters"} role="dialog" aria-label="Filtros do mapa">
          <div className={"km-panelHead"}>
            <b>Filtros</b>
            <button type="button" onClick={() => setFiltersOpen(false)} aria-label="Fechar filtros">
              <X aria-hidden />
            </button>
          </div>
          <fieldset>
            <legend>Situação</legend>
            {(Object.keys(SITUACAO) as Situacao[]).map((k) => (
              <label key={k}>
                <input type="radio" name="sit" checked={sit === k} onChange={() => setSit(k)} /> {SITUACAO[k]}
              </label>
            ))}
          </fieldset>
          <fieldset>
            <legend>Disciplinas</legend>
            {full.territories.map((t) => (
              <label key={t.id}>
                <input
                  type="checkbox"
                  checked={!filterDisc.size || filterDisc.has(t.id)}
                  onChange={(e) => {
                    const next = new Set(filterDisc.size ? filterDisc : full.territories.map((x) => x.id));
                    if (e.target.checked) next.add(t.id);
                    else next.delete(t.id);
                    setFilterDisc(next.size === full.territories.length ? new Set() : next);
                  }}
                />
                <i style={{ background: t.color }} aria-hidden /> {t.label}
              </label>
            ))}
          </fieldset>
          <button
            type="button"
            className={"km-ghost"}
            onClick={() => {
              setFilterDisc(new Set());
              setSit("todos");
            }}
          >
            Limpar filtros
          </button>
        </div>
      )}

      {(listOpen || !showStage) && mode3d !== "verificando" && (
        <section className={"km-list"} aria-label="Matérias e assuntos em lista" data-testid="lista-alternativa">
          <div className={"km-panelHead"}>
            <b>{showStage ? "Matérias e assuntos" : "Mapa em modo lista"}</b>
            {showStage && (
              <button type="button" onClick={() => setListOpen(false)} aria-label="Fechar lista">
                <X aria-hidden />
              </button>
            )}
          </div>
          {!showStage && <p className={"km-muted"}>{lost ? "O mapa 3D foi interrompido pelo navegador." : "Seu navegador não exibe o mapa 3D."} Escolha a matéria e o assunto por aqui.</p>}
          {map.territories.map((t) => (
            <div key={t.id} className={"km-listGroup"}>
              <button type="button" className={"km-listDisc"} style={{ ["--c" as string]: t.color }} onClick={() => selectTerritory(t)}>
                {t.label} <span>{t.topics.length}</span>
              </button>
              <ul>
                {t.topics.map((x) => (
                  <li key={x.id}>
                    <button type="button" onClick={() => selectTopic(t, x)} aria-current={selTopic === x.id ? "true" : undefined}>
                      {x.study?.done ? "✓ " : x.study ? "• " : ""}
                      {x.title}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      )}

      {/* Painel contextual */}
      {(territory || coreOpen) && (
        <aside className={"km-panel"} aria-label="Detalhes" data-testid="painel-contexto">
          <div className={"km-panelHead"}>
            <span className={"km-kicker"} style={{ color: territory?.color ?? "#ff4545" }}>
              {topic ? "Assunto" : territory ? "Disciplina" : "Núcleo"}
            </span>
            <button type="button" onClick={() => (topic ? setSelTopic(null) : overview())} aria-label={topic ? "Voltar à disciplina" : "Fechar"}>
              <X aria-hidden />
            </button>
          </div>
          {coreOpen && !territory && (
            <>
              <h2 className={"km-panelTitle"}>Núcleo Aprovum</h2>
              <p className={"km-muted"}>O centro do catálogo: todas as matérias publicadas partem daqui.</p>
              <ul className={"km-stats"}>
                <li>
                  <b>{full.totals.disciplines}</b> disciplinas
                </li>
                <li>
                  <b>{full.totals.topics}</b> assuntos
                </li>
                <li>
                  <b>{full.totals.questions.toLocaleString("pt-BR")}</b> questões
                </li>
                <li>
                  <b>{done}</b> concluídos por você
                </li>
              </ul>
            </>
          )}
          {territory && !topic && !territory.topics.length && (
            <>
              <h2 className={"km-panelTitle"}>{territory.label}</h2>
              <p className={"km-muted"}>Ainda não há aulas publicadas nesta matéria. Assim que a primeira for catalogada, ela aparece aqui.</p>
            </>
          )}
          {territory && !topic && territory.topics.length > 0 && (
            <>
              <h2 className={"km-panelTitle"}>{territory.label}</h2>
              <ul className={"km-stats"}>
                <li>
                  <b>{territory.topics.length}</b> assuntos
                </li>
                <li>
                  <b>{territory.questions.toLocaleString("pt-BR")}</b> questões
                </li>
                <li>
                  <b>{territory.started}</b> iniciados
                </li>
                <li>
                  <b>{territory.done}</b> concluídos
                </li>
              </ul>
              {territory.progress !== null ? (
                <div className={"km-meter"} aria-label={`Progresso médio: ${territory.progress}%`}>
                  <span>Progresso médio dos assuntos</span>
                  <b>{territory.progress}%</b>
                  <i style={{ width: `${territory.progress}%`, background: territory.color }} />
                </div>
              ) : (
                <p className={"km-muted"}>Você ainda não começou nenhum assunto desta matéria.</p>
              )}
              <h3 className={"km-sub"}>Assuntos</h3>
              <ul className={"km-topicList"}>
                {territory.topics.map((x) => (
                  <li key={x.id}>
                    <button type="button" onClick={() => selectTopic(territory, x)}>
                      <span>{x.title}</span>
                      <em>{x.study?.done ? "Concluído" : x.study ? `${x.study.pct}%` : "Novo"}</em>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
          {territory && topic && (
            <>
              <h2 className={"km-panelTitle"}>{topic.title}</h2>
              <p className={"km-muted"}>{territory.label}</p>
              <ul className={"km-stats"}>
                <li>
                  <b>{topic.questions}</b> questões
                </li>
                {topic.minutes > 0 && (
                  <li>
                    <b>~{topic.minutes}</b> min
                  </li>
                )}
                {topic.study && (
                  <>
                    <li>
                      <b>
                        {topic.study.lessonsDone}/{topic.study.lessonsTotal}
                      </b>{" "}
                      aulas
                    </li>
                    <li>
                      <b>
                        {topic.study.answered}/{topic.study.totalQuestions}
                      </b>{" "}
                      respondidas
                    </li>
                  </>
                )}
              </ul>
              {topic.study ? (
                <div className={"km-meter"} aria-label={`Seu progresso: ${topic.study.pct}%`}>
                  <span>{topic.study.done ? "Concluído" : "Seu progresso"}</span>
                  <b>{topic.study.pct}%</b>
                  <i style={{ width: `${topic.study.pct}%`, background: territory.color }} />
                </div>
              ) : (
                <p className={"km-muted"}>Você ainda não começou este assunto.</p>
              )}
              <div className={"km-actions"}>
                {topic.study ? (
                  <Link href={`${base}/trilhas/${topic.study.trailId}`} className={"km-primary"} aria-label={`Continuar estudando: ${topic.title}`}>
                    Continuar estudando
                  </Link>
                ) : (
                  <button type="button" className={"km-primary"} onClick={() => onStart({ id: topic.id, title: topic.title, discipline: territory.label })} aria-label={`Começar estudo: ${topic.title}`}>
                    Começar estudo
                  </button>
                )}
                <Link href={`${base}/trilhas`} className={"km-ghost"}>
                  Ver meus estudos
                </Link>
              </div>
            </>
          )}
          <button type="button" className={"km-back"} onClick={overview}>
            <RotateCcw aria-hidden /> Voltar à visão geral
          </button>
        </aside>
      )}

      {empty && (
        <div className={"km-empty"} role="status">
          <b>Novas aulas estão sendo cadastradas</b>
          <span>O mapa ganha territórios assim que as primeiras matérias forem publicadas.</span>
        </div>
      )}

      {showStage && hint && !empty && (
        <p className={"km-hint"} role="note">
          {portrait ? "Arraste para explorar · pinça para aproximar · toque num território" : art ? "Arraste para explorar · role para aproximar · clique num território" : "Mova o mouse para olhar · arraste para girar · role para aproximar · clique num território"}
        </p>
      )}

      <div className={"km-counter"} aria-label={`Assuntos concluídos ${done} de ${full.totals.topics}`}>
        <b>{done}</b>
        <span className={"km-counterSep"} />
        <span>{full.totals.topics}</span>
        <small>assuntos</small>
        <i style={{ width: `${full.totals.topics ? (done / full.totals.topics) * 100 : 0}%` }} />
      </div>

      <p className={"km-slogan"}>Conhecimento é a sua maior arma</p>
    </div>
  );
}

function SearchBox({ map, onPick, inputRef }: { map: KnowledgeMap; onPick: (h: SearchHit) => void; inputRef: React.RefObject<HTMLInputElement | null> }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const hits = useMemo(() => searchMap(map, q), [map, q]);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const keepOpen = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpen(true);
  };
  const pick = (h: SearchHit) => {
    onPick(h);
    setOpen(false);
    setQ("");
    inputRef.current?.blur();
  };
  return (
    <div className={"km-search"} role="search">
      <Search aria-hidden className={"km-searchIcon"} />
      <input
        ref={inputRef}
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          keepOpen();
          setActive(0);
        }}
        onFocus={keepOpen}
        onBlur={() => {
          closeTimer.current = setTimeout(() => setOpen(false), 150);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((a) => Math.min(hits.length - 1, a + 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => Math.max(0, a - 1));
          } else if (e.key === "Enter" && hits[active]) {
            e.preventDefault();
            pick(hits[active]!);
          } else if (e.key === "Escape") {
            e.stopPropagation();
            setQ("");
            setOpen(false);
          }
        }}
        placeholder="Buscar matéria, assunto ou concurso…"
        aria-label="Buscar matéria, assunto ou concurso"
        role="combobox"
        aria-expanded={open && q.trim().length > 0}
        aria-controls="km-resultados"
        aria-autocomplete="list"
        aria-activedescendant={open && hits[active] ? `km-r-${active}` : undefined}
      />
      {q ? (
        <button type="button" className={"km-searchClear"} onClick={() => setQ("")} aria-label="Limpar busca">
          <X aria-hidden />
        </button>
      ) : (
        <kbd className={"km-kbd"} aria-hidden>
          /
        </kbd>
      )}
      {open && q.trim() && (
        <ul id="km-resultados" role="listbox" className={"km-results"}>
          {hits.length ? (
            hits.map((h, i) => (
              <li
                key={h.kind === "materia" ? h.territory.id : h.topic.id}
                id={`km-r-${i}`}
                role="option"
                aria-selected={i === active}
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(h);
                }}
                onMouseEnter={() => setActive(i)}
              >
                <i style={{ background: h.territory.color }} aria-hidden />
                <span>{h.kind === "materia" ? h.territory.label : h.topic.title}</span>
                <em>{h.kind === "materia" ? "Matéria" : h.territory.label}</em>
              </li>
            ))
          ) : (
            <li className={"km-noHit"} role="option" aria-selected={false} aria-disabled>
              Nada encontrado no catálogo. Os concursos ainda não estão ligados às aulas: busque pela matéria ou pelo assunto.
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
