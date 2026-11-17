"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bookmark, BookmarkCheck, Loader2, RotateCcw, X } from "lucide-react";
import { LOUSA_H, LOUSA_W, type ItemDesenho, type LinhaLousa, type Lousa } from "@/domain/mentor/lousa";
import "./mentor-lousa.css";

const COR: Record<string, string> = { azul: "#1d3a8a", preto: "#1a1a1f", vermelho: "#c62828", verde: "#1b7a43", grafite: "#1a1a1f", laranja: "#d9620b", roxo: "#6b2fa3", rosa: "#c2185b" };
const UPS = 20;
const SYNC_UPS = 38; // velocidade da caneta no quadro sincronizado (rápida, mas ainda legível)
const VIVO_UPS = 18; // quadro ao vivo: caneta rápida, as linhas entram assim que chegam
const LEAD_CHARS = 22; // começa a escrever a linha ~1,5 s antes de o Mentor falá-la // unidades de tempo por segundo (cada letra custa ~1 unidade)
const PAUSA = 4; // respiro entre linhas, como quem levanta o canetão

/** Tempo de cada letra: espaços e pontuação demoram mais, números um pouco mais, e há uma oscilação leve e fixa (humana). */
function custoLetra(ch: string, i: number): number {
  const jit = 0.78 + ((Math.sin(i * 12.9898 + ch.charCodeAt(0) * 78.233) * 43758.5453) % 1 + 1) % 1 * 0.55;
  if (ch === " ") return 1.5 * jit;
  if (/[,;:]/.test(ch)) return 3.2;
  if (/[.!?]/.test(ch)) return 4.2;
  if (/[0-9=+\-·÷×]/.test(ch)) return 1.4 * jit;
  if (/\p{Extended_Pictographic}/u.test(ch)) return 4;
  return jit;
}
/** Texto completo escrito pela linha (o "par" junta os dois lados com um intervalo para o tracejado). */
const totalFiguras = (l: LinhaLousa) => (l.figuras ?? []).reduce((a, g) => a + g.n, 0);
const textoDe = (l: LinhaLousa) => (l.tipo === "par" ? `${l.texto}\u2003${l.dir ?? ""}` : l.tipo === "espaco" ? "" : l.tipo === "figuras" ? l.texto + "\u200b".repeat(totalFiguras(l) * 4) : l.tipo === "desenho" ? l.texto + "\u200b".repeat((l.rabisco?.length ?? 0) * 6) : l.texto);
const cor = (c?: string, padrao = "azul") => COR[c ?? padrao] ?? COR.azul!;

/** Instante (acumulado) em que cada letra termina de ser escrita; o último valor é a duração da linha. */
function cronograma(l: LinhaLousa): number[] {
  const out: number[] = [];
  let a = 0;
  [...textoDe(l)].forEach((ch, i) => { a += custoLetra(ch, i); out.push(a); });
  return out;
}

function Marcador({ c }: { c: string }) {
  return (
    <svg className="lz-marc" viewBox="0 0 24 24" width="26" height="26" aria-hidden>
      <path d="M4 21l1-4 11-11 3 3-11 11z" fill="#15161a" stroke="#000" strokeWidth="1" strokeLinejoin="round" />
      <path d="M16 6l2.2-2.2a1.5 1.5 0 012.1 0l.9.9a1.5 1.5 0 010 2.1L19 9z" fill={c} stroke="#000" strokeWidth="1" strokeLinejoin="round" />
      <path d="M4 21l1-4 3 3z" fill={c} stroke="#000" strokeWidth="1" strokeLinejoin="round" />
    </svg>
  );
}

const ONDA = `M0 4${Array.from({ length: 16 }, (_, i) => ` q6 ${i % 2 ? 4 : -4} 12 0`).join("")}`;
function Sublinha({ tipo }: { tipo: "reta" | "onda" }) {
  return (
    <svg className="lz-sub" viewBox="0 0 200 8" preserveAspectRatio="none" aria-hidden>
      <path pathLength={1} d={tipo === "onda" ? ONDA : "M0 4 L200 4"} />
    </svg>
  );
}

function Marca({ m }: { m: NonNullable<LinhaLousa["marca"]> }) {
  return (
    <svg className="lz-mk" viewBox="0 0 24 24" aria-hidden>
      {m === "ok" && <polyline pathLength={1} points="3,13 9,19 21,5" />}
      {m === "estrela" && <polyline pathLength={1} points="12,2 14.8,8.8 22,9.3 16.5,14 18.2,21 12,17.2 5.8,21 7.5,14 2,9.3 9.2,8.8 12,2" />}
      {m === "seta_dir" && <path pathLength={1} d="M2 12H21M15 6l6 6-6 6" />}
      {m === "seta_baixo" && <path pathLength={1} d="M12 2V21M6 15l6 6 6-6" />}
    </svg>
  );
}

/** Escreve as primeiras `v` letras de `s`, cada trecho com a sua caneta; o círculo só entra com a linha pronta. */
function Escrito({ s, v, l, cor0, feito, lado }: { s: string; v: number; l: LinhaLousa; cor0: string; feito: boolean; lado?: "dir" }) {
  const ch = [...s];
  const cores: (string | undefined)[] = ch.map(() => undefined);
  const circ: boolean[] = ch.map(() => false);
  const marca = (trecho: string, f: (i: number) => void) => { const i = s.indexOf(trecho); if (i >= 0) for (let k = 0; k < [...trecho].length; k++) f(i + k); };
  for (const r of l.realce ?? []) marca(r.trecho, (i) => { cores[i] = COR[r.cor]; });
  if (feito && l.circular && (lado === "dir" || l.tipo !== "par")) marca(l.circular, (i) => { circ[i] = true; });
  const out: React.ReactNode[] = [];
  let i = 0;
  while (i < Math.min(v, ch.length)) {
    let j = i + 1;
    while (j < Math.min(v, ch.length) && cores[j] === cores[i] && circ[j] === circ[i]) j++;
    const ultimo = j === v && !feito;
    const corpo = ch.slice(i, ultimo ? j - 1 : j).join("");
    const nova = ultimo ? <span key={`n${j}`} className="lz-nova">{ch[j - 1]}</span> : null;
    const st = cores[i] ? { color: cores[i] } : undefined;
    const miolo = <>{corpo}{nova}</>;
    out.push(circ[i] ? <span key={i} className="lz-ci" style={st}>{miolo}</span> : <span key={i} style={st}>{miolo}</span>);
    i = j;
  }
  void cor0;
  return <>{out}</>;
}

function Traco({ it, d }: { it: ItemDesenho; d: number }) {
  const c = cor("cor" in it ? it.cor : undefined, "grafite");
  const st = { ["--d" as string]: `${d}s`, stroke: c } as React.CSSProperties;
  if (it.t === "emoji") return <text className="lz-em" x={it.x} y={it.y} fontSize={it.tam} style={{ ["--d" as string]: `${d}s` }}>{it.s}</text>;
  if (it.t === "texto") return <text className="lz-tx" x={it.x} y={it.y} style={{ ["--d" as string]: `${d}s`, fill: c }}>{it.s}</text>;
  if (it.t === "linha") {
    const ang = Math.atan2(it.y2 - it.y1, it.x2 - it.x1);
    const h = 10;
    return (
      <g>
        <path className="lz-tr" pathLength={1} d={`M${it.x1} ${it.y1}L${it.x2} ${it.y2}`} style={st} />
        {it.seta && <path className="lz-tr" pathLength={1} d={`M${it.x2 - h * Math.cos(ang - 0.5)} ${it.y2 - h * Math.sin(ang - 0.5)}L${it.x2} ${it.y2}L${it.x2 - h * Math.cos(ang + 0.5)} ${it.y2 - h * Math.sin(ang + 0.5)}`} style={{ ...st, ["--d" as string]: `${d + 0.5}s` }} />}
      </g>
    );
  }
  if (it.t === "ret") return <path className="lz-tr" pathLength={1} d={`M${it.x} ${it.y}h${it.w}v${it.h}h${-it.w}z`} style={st} />;
  if (it.t === "circ") return <path className="lz-tr" pathLength={1} d={`M${it.cx - it.r} ${it.cy}a${it.r} ${it.r} 0 1 0 ${2 * it.r} 0a${it.r} ${it.r} 0 1 0 ${-2 * it.r} 0`} style={st} />;
  return <path className="lz-tr" pathLength={1} d={`M${it.pts.map(([x, y]) => `${x} ${y}`).join("L")}`} style={st} />;
}

/**
 * Quadro branco do Mentor: abre quando o aluno pede uma conta, um exemplo ou um desenho. Um professor "escreve" de
 * cima para baixo, letra por letra, com recuos, sublinhados, caixas, círculos e setas, e depois traça o desenho.
 */
/** Ponto a `p` (0..1) do perímetro de um retângulo de cantos cortados, sentido horário, começando no topo-esquerdo. */
function pontoNoContorno(w: number, h: number, r: number, p: number): [number, number] {
  const pts: [number, number][] = [[r, 0], [w - r, 0], [w, r], [w, h - r], [w - r, h], [r, h], [0, h - r], [0, r], [r, 0]];
  const seg = pts.slice(1).map((q, i) => Math.hypot(q[0] - pts[i]![0], q[1] - pts[i]![1]));
  const tot = seg.reduce((a, b) => a + b, 0);
  let d = Math.max(0, Math.min(1, p)) * tot;
  for (let i = 0; i < seg.length; i++) {
    if (d <= seg[i]!) { const k = seg[i]! ? d / seg[i]! : 0; return [pts[i]![0] + (pts[i + 1]![0] - pts[i]![0]) * k, pts[i]![1] + (pts[i + 1]![1] - pts[i]![1]) * k]; }
    d -= seg[i]!;
  }
  return pts[0]!;
}

const T_VERMELHO = 1000; // ms para a caneta riscar o contorno do card
const T_QUADRO = 650; // ms para riscar a moldura do quadro branco
const T_ENCHE = 420; // ms para o quadro "encher" (fundo e título aparecem)

/** Abertura: uma caneta risca o contorno do card e a moldura do quadro; depois o quadro enche e a escrita começa. */
function Moldura({ onEncher, onFim }: { onEncher: () => void; onFim: () => void }) {
  const ref = useRef<SVGSVGElement>(null);
  const [dim, setDim] = useState({ w: 0, h: 0 });
  const [t, setT] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setDim({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    setDim({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);
  useEffect(() => {
    const t0 = performance.now();
    let raf = 0; let encheu = false;
    const f = (now: number) => {
      const el = now - t0;
      setT(el);
      if (!encheu && el >= T_VERMELHO + T_QUADRO) { encheu = true; onEncher(); }
      if (el < T_VERMELHO + T_QUADRO + T_ENCHE) raf = requestAnimationFrame(f); else onFim();
    };
    raf = requestAnimationFrame(f);
    return () => cancelAnimationFrame(raf);
  }, [onEncher, onFim]);
  const { w, h } = dim;
  const e1 = Math.min(1, t / T_VERMELHO);
  const e2 = Math.min(1, Math.max(0, (t - T_VERMELHO) / T_QUADRO));
  const eased = (x: number) => x * x * (3 - 2 * x);
  const ins = 46; // moldura do quadro: dentro do card (abaixo da faixa do título)
  const fase1 = e1 < 1;
  const [px, py] = fase1 ? pontoNoContorno(w, h, 10, eased(e1)) : pontoNoContorno(w - 20, h - ins - 12, 6, eased(e2));
  const ox = fase1 ? 0 : 10, oy = fase1 ? 0 : ins;
  const andando = t < T_VERMELHO + T_QUADRO;
  return (
    <svg ref={ref} className="lz-molde" aria-hidden>
      {w > 0 && (
        <>
          <rect x="1.5" y="1.5" width={w - 3} height={h - 3} rx="10" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - eased(e1)} stroke="#e50914" />
          <rect x="10" y={ins} width={w - 20} height={h - ins - 12} rx="6" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - eased(e2)} stroke="#aeb4bc" strokeWidth="4" />
          {andando && <g transform={`translate(${px + ox - 4} ${py + oy - 25}) rotate(${Math.sin(t / 55) * 4} 4 25)`}><Marcador c={fase1 ? "#e50914" : "#1d3a8a"} /></g>}
        </>
      )}
    </svg>
  );
}

const PENDENTE: Lousa = { mostrar: true, titulo: "", linhas: [], desenho: [] };

export function MentorLousa({ lousa: dados, sync, vivo, onSalvar, jaSalva, onClose }: { lousa: Lousa | null; /** Salva a lousa nas Ferramentas; devolve se deu certo. */ onSalvar?: () => Promise<boolean>; jaSalva?: boolean; /** Segue a voz: devolve quantas letras do roteiro já foram faladas. */ sync?: () => { c: number; fim: boolean }; /** Quadro escrito ao vivo: instante (relógio do áudio) em que cada linha começa a ser falada. */ vivo?: { quandos: number[]; agora: () => number }; onClose: () => void }) {
  const lousa = dados ?? PENDENTE;
  const linhas = lousa.linhas;
  const [baseVivo, setBaseVivo] = useState<number | null>(null);
  const crono = useMemo(() => linhas.map(cronograma), [linhas]);
  const dur = (j: number) => (crono[j]!.length ? crono[j]![crono[j]!.length - 1]! : 0);
  const inicios = useMemo(() => {
    let a = 0;
    return crono.map((c, j) => {
      // ao vivo: a linha começa quando o áudio chega nela (ou quando a anterior termina de ser escrita)
      const alvo = vivo && baseVivo !== null && vivo.quandos[j] !== undefined ? VIVO_UPS * Math.max(0, vivo.quandos[j]! - baseVivo) : 0;
      const x = Math.max(a, alvo);
      a = x + (c.length ? c[c.length - 1]! : 0) + PAUSA;
      return x;
    });
  }, [crono, vivo, baseVivo]);
  const total = linhas.length ? inicios[inicios.length - 1]! + dur(linhas.length - 1) + PAUSA : 0;
  const fl = useMemo(() => { let a = 0; return linhas.map((l) => { const w = l.fala.length; const o = { ini: a, w }; a += w; return o; }); }, [linhas]);
  const totalFala = fl.length ? fl[fl.length - 1]!.ini + fl[fl.length - 1]!.w : 0;
  const sincronizado = !!sync && totalFala > 0;
  const t0L = useRef<number[]>([]);
  /** Quantas letras da linha j já foram escritas no instante `pos`. */
  const letras = (j: number) => {
    if (sincronizado) {
      const c2 = crono[j]!;
      if (pos > totalFala) return c2.length;
      const ti = t0L.current[j];
      if (ti === undefined) return 0;
      const u = ((performance.now() - ti) / 1000) * SYNC_UPS; // a caneta corre à frente da fala: a linha já está escrita quando o Mentor a explica
      let n2 = 0; while (n2 < c2.length && c2[n2]! <= u) n2++; return n2;
    } const c = crono[j]!; const t0 = pos - inicios[j]!; let n = 0; while (n < c.length && c[n]! <= t0) n++; return n; };
  const [pos, setPos] = useState(0);
  const [rodada, setRodada] = useState(0);
  const [salvo, setSalvo] = useState<"nao" | "salvando" | "sim" | "erro">(jaSalva ? "sim" : "nao");
  // 0 = caneta riscando o card · 1 = quadro enchendo · 2 = escrevendo
  const [fase, setFase] = useState<0 | 1 | 2>(0);
  const encher = useCallback(() => setFase((f) => (f < 1 ? 1 : f)), []);
  const fimMoldura = useCallback(() => setFase(2), []);
  const reduz = useRef(false);
  const placa = useRef<HTMLDivElement>(null);
  useEffect(() => { reduz.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches; if (reduz.current) setFase(2); }, []);

  useEffect(() => {
    if (!sync || totalFala <= 0) return;
    let raf = 0;
    const f = () => {
      const s = sync();
      const agora = performance.now();
      for (let j = 0; j < fl.length; j++) { // a escrita de cada linha começa um instante ANTES de o Mentor chegar nela
        if (t0L.current[j] !== undefined) continue;
        if (s.fim || s.c >= fl[j]!.ini - LEAD_CHARS) t0L.current[j] = agora; else break;
      }
      setPos(s.fim ? totalFala + 1 : s.c);
      if (!s.fim) raf = requestAnimationFrame(f);
    };
    raf = requestAnimationFrame(f);
    return () => cancelAnimationFrame(raf);
  }, [sync, totalFala, rodada, fl]);

  useEffect(() => {
    if (!vivo || fase < 2 || baseVivo === null) return;
    let raf = 0;
    const f = () => { setPos(Math.max(0, VIVO_UPS * (vivo.agora() - baseVivo))); raf = requestAnimationFrame(f); };
    raf = requestAnimationFrame(f);
    return () => cancelAnimationFrame(raf);
  }, [vivo, fase, baseVivo]);
  // a escrita só começa depois que a caneta termina o quadro; linhas que chegam depois entram quando chegam
  useEffect(() => { if (fase === 2 && vivo && baseVivo === null) setBaseVivo(vivo.agora()); }, [fase, vivo, baseVivo]);

  useEffect(() => {
    if (sincronizado || vivo || fase < 2) return;
    if (reduz.current) { setPos(total); return; }
    setPos(0);
    const t0 = performance.now();
    let raf = 0;
    const f = (now: number) => {
      const p = ((now - t0) / 1000) * UPS;
      setPos(Math.min(total, p));
      if (p < total) raf = requestAnimationFrame(f);
    };
    raf = requestAnimationFrame(f);
    return () => cancelAnimationFrame(raf);
  }, [total, rodada, sincronizado, vivo, fase]);

  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);

  const fim = vivo ? false : sincronizado ? pos > totalFala : pos >= total;
  // acompanha a escrita: rola o quadro para a linha atual
  

  const ativo = sincronizado ? linhas.findIndex((_, j) => letras(j) < crono[j]!.length) : linhas.findIndex((_, j) => pos - inicios[j]! < dur(j));
  // acompanha a escrita só quando muda a linha ativa (rolar a cada quadro trava)
  useEffect(() => { const el = placa.current; if (el && !fim) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" }); }, [ativo, linhas.length, fim]);
  const desenho = lousa.desenho;
  return (
    <aside className={`lz ${reduz.current ? "lz-pronto" : ""} ${fase === 0 ? "lz-moldura" : ""}`} role="dialog" aria-label={`Quadro do Mentor: ${lousa.titulo || "exemplo"}`} data-testid="mentor-lousa">
      {fase < 2 && !reduz.current && <Moldura onEncher={encher} onFim={fimMoldura} />}
      <div className="lz-topo">
        <span className="lz-kicker">QUADRO</span>
        <span className="lz-titulo">{lousa.titulo || (dados ? "" : "Preparando…")}</span>
        {onSalvar && dados && dados.linhas.length > 0 && (
          <button type="button" className={`lz-salvar is-${salvo}`} disabled={salvo === "salvando" || salvo === "sim"} aria-label="Salvar lousa nas Ferramentas" data-testid="lousa-salvar"
            onClick={() => { setSalvo("salvando"); void onSalvar().then((ok) => setSalvo(ok ? "sim" : "erro")).catch(() => setSalvo("erro")); }}>
            {salvo === "sim" ? <BookmarkCheck size={16} aria-hidden /> : salvo === "salvando" ? <Loader2 size={16} className="lz-gira" aria-hidden /> : <Bookmark size={16} aria-hidden />}
            <span>{salvo === "sim" ? "Salva" : salvo === "erro" ? "Tentar de novo" : "Salvar"}</span>
          </button>
        )}
        <button type="button" className="lz-bt" onClick={() => setRodada((r) => r + 1)} aria-label="Escrever de novo" title="Escrever de novo"><RotateCcw size={18} aria-hidden /></button>
        <button type="button" className="lz-bt" onClick={onClose} aria-label="Fechar quadro"><X size={20} aria-hidden /></button>
      </div>
      <div className="lz-quadro">
        <div className="lz-placa" ref={placa} key={rodada} onClick={() => setPos(total)}>
          <ol className="lz-sr">{linhas.map((l, i) => <li key={i}>{[l.texto, l.dir].filter(Boolean).join(" — ")}</li>)}</ol>
          <div aria-hidden>
            {!dados && <p className="lz-l" data-t="texto"><Marcador c="#1d3a8a" /></p>}
            {linhas.map((l, j) => {
              if (sincronizado ? t0L.current[j] === undefined : pos < inicios[j]!) return null;
              const len = crono[j]!.length;
              const v = letras(j);
              const feito = v >= len;
              const c = cor(l.cor, l.tipo === "conta" || l.tipo === "nota" ? "preto" : "azul");
              const pen = ativo === j && <Marcador c={c} />;
              const st = { ["--n" as string]: l.nivel, ["--c" as string]: c } as React.CSSProperties;
              if (l.tipo === "espaco") return <div key={j} className="lz-l" data-t="espaco" />;
              if (l.tipo === "par") {
                const nE = [...l.texto].length;
                return (
                  <div key={j} className="lz-l" data-t="par" style={st}>
                    <div className="lz-par">
                      <span><Escrito s={l.texto} v={v} l={l} cor0={c} feito={feito} /></span>
                      <i style={{ visibility: v > nE ? "visible" : "hidden" }} />
                      <span><Escrito s={l.dir ?? ""} v={Math.max(0, v - nE - 1)} l={l} cor0={c} feito={feito} lado="dir" />{pen}</span>
                    </div>
                  </div>
                );
              }
              const nLab = [...l.texto].length;
              if (l.tipo === "figuras" || l.tipo === "desenho") {
                const rotulo = <Escrito s={l.texto} v={Math.min(v, nLab)} l={l} cor0={c} feito={v >= nLab} />;
                let fig: React.ReactNode = null;
                if (l.tipo === "figuras") {
                  const todas = (l.figuras ?? []).flatMap((g, gi) => Array.from({ length: g.n }, (_, k) => ({ e: g.e, gi, k })));
                  const vis = Math.max(0, Math.min(todas.length, Math.floor((v - nLab) / 4)));
                  fig = (
                    <div className="lz-fig">
                      {(l.figuras ?? []).map((g, gi) => (
                        <div key={gi} className="lz-fig-g">{todas.slice(0, vis).filter((x) => x.gi === gi).map((x) => <span key={x.k} className="lz-fig-e">{x.e}</span>)}</div>
                      ))}
                    </div>
                  );
                } else if (v >= nLab) {
                  fig = (
                    <svg className="lz-svg lz-mini" viewBox={`0 0 ${LOUSA_W} 140`} role="img" aria-label={l.texto || "Desenho"}>
                      {(l.rabisco ?? []).map((it, i) => <Traco key={i} it={it} d={i * 0.3} />)}
                    </svg>
                  );
                }
                return (
                  <div key={j} className="lz-l" data-t="rotulo" style={st}>
                    <div>{rotulo}{!feito && pen}</div>
                    {fig}
                  </div>
                );
              }
              const txt = <Escrito s={l.texto} v={v} l={l} cor0={c} feito={feito} />;
              return (
                <p key={j} className="lz-l" data-t={l.tipo} style={st}>
                  <span className={l.caixa && feito ? "lz-cx" : "lz-w"}>
                    {txt}
                    {feito && l.sublinhar && <Sublinha tipo={l.sublinhar} />}
                  </span>
                  {feito && l.marca && <Marca m={l.marca} />}
                  {pen}
                </p>
              );
            })}
            {desenho.length > 0 && (fim || (sincronizado ? pos > totalFala * 0.75 : pos > total * 0.9) || reduz.current) && (
              <svg className="lz-svg" viewBox={`0 0 ${LOUSA_W} ${LOUSA_H}`} role="img" aria-label="Desenho do exemplo" key={`d${rodada}`}>
                {desenho.map((it, i) => <Traco key={i} it={it} d={i * 0.4} />)}
              </svg>
            )}
          </div>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="lz-logo" src="/images/aprovum-logo-escura.png" alt="" aria-hidden />
        <div className="lz-bandeja" aria-hidden />
      </div>
    </aside>
  );
}
