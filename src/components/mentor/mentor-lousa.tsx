"use client";

import { IconeLousa, iconeDaLousa } from "@/components/aula/icone-lousa";
import { createContext, memo, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Bookmark, BookmarkCheck, Loader2, RotateCcw, X } from "lucide-react";
import { LOUSA_H, LOUSA_W, type ItemDesenho, type LinhaLousa, type Lousa } from "@/domain/mentor/lousa";
import { GLIFOS } from "./lousa-glifos";
import "./mentor-lousa.css";

const COR: Record<string, string> = { azul: "#1d3a8a", preto: "#1a1a1f", vermelho: "#c62828", verde: "#1b7a43", grafite: "#1a1a1f", laranja: "#d9620b", roxo: "#6b2fa3", rosa: "#c2185b", branco: "#ffffff" };
const UPS = 20;
const SYNC_UPS = 22; // velocidade da caneta no quadro sincronizado (rápida, mas ainda legível)
const VIVO_UPS = 20; // quadro ao vivo: caneta rápida, as linhas entram assim que chegam
const LEAD_CHARS = 34; // começa a escrever a linha ~1,5 s antes de o Mentor falá-la // unidades de tempo por segundo (cada letra custa ~1 unidade)
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
const textoDe = (l: LinhaLousa) => (l.tipo === "par" ? `${l.texto}\u2003${l.dir ?? ""}` : l.tipo === "espaco" ? "" : l.tipo === "figuras" ? l.texto + "\u200b".repeat(totalFiguras(l) * 4) : l.tipo === "desenho" ? l.texto + "\u200b".repeat(Math.min(90, (l.rabisco?.length ?? 0) * 6)) : l.texto);
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

/* ===== Escrita à mão: cada letra é desenhada traço a traço, na ordem em que uma pessoa a faria ===== */
const KG = 1.4; // altura do glifo, em em
const PenaCtx = createContext<{ el: React.RefObject<HTMLSpanElement | null>; placa: React.RefObject<HTMLDivElement | null> } | null>(null);

/** Duração (ms) de uma letra: as compridas (m, w, ç…) levam mais que as curtas (i, l, .). */
const duracaoGlifo = (tot: number) => Math.round(Math.min(300, 95 + tot / 11));
/** Variação humana, fixa por letra: nenhuma letra sai igual à outra (inclinação, altura e tamanho). */
function humano(h: number) {
  const r = (k: number) => { const x = Math.sin(h * 12.9898 + k * 78.233) * 43758.5453; return x - Math.floor(x); };
  return { rot: (r(1) - 0.5) * 5, dy: (r(2) - 0.5) * 0.06, esc: 0.96 + r(3) * 0.08 };
}
const suave = (u: number) => u * u * (3 - 2 * u); // a mão acelera e desacelera em cada traço

/** A caneta (uma só) anda sobre o traço da letra, no mesmo ritmo da tinta, e depois descansa. */
function seguirPena(pen: HTMLElement | null, placa: HTMLElement | null, svg: SVGSVGElement | null, adv: number, tot: number, durMs: number): (() => void) | undefined {
  if (!pen || !placa || !svg) return undefined;
  const paths = [...svg.querySelectorAll("path")];
  const lens = paths.map((q) => q.getTotalLength()); const soma = lens.reduce((a, b) => a + b, 0) || 1;
  const r = svg.getBoundingClientRect(); const pr = placa.getBoundingClientRect();
  const ox = r.left - pr.left + placa.scrollLeft; const oy = r.top - pr.top + placa.scrollTop;
  const sx = r.width / adv; const sy = r.height / 1000;
  const t0 = performance.now(); let raf = 0;
  pen.style.opacity = "1";
  const passo = (now: number) => {
    const p = Math.min(1, (now - t0) / durMs);
    let ini = 0; let i = 0;
    while (i < lens.length - 1 && p > (ini + lens[i]!) / soma) { ini += lens[i]!; i++; }
    const u = Math.min(1, Math.max(0, (p * soma - ini) / (lens[i]! || 1)));
    const pt = paths[i]!.getPointAtLength(suave(u) * lens[i]!);
    const x = ox + pt.x * sx; const y = oy + (pt.y + 800) * sy;
    pen.style.transform = `translate(${(x - 4).toFixed(1)}px, ${(y - 23).toFixed(1)}px) rotate(${(-6 + Math.sin(now / 41) * 3 + (pt.y + 300) / 120).toFixed(1)}deg)`;
    if (p < 1) raf = requestAnimationFrame(passo);
  };
  raf = requestAnimationFrame(passo);
  const rest = window.setTimeout(() => { pen.style.opacity = "0"; }, durMs + 900);
  void tot;
  return () => { cancelAnimationFrame(raf); clearTimeout(rest); };
}

const Glifo = memo(function Glifo({ ch, nova, h }: { ch: string; nova: boolean; h: number }) {
  const g = GLIFOS[ch];
  const [anima] = useState(nova); // decidido na montagem: a letra continua a se desenhar mesmo depois de entrar a próxima
  const ctx = useContext(PenaCtx);
  const ref = useRef<SVGSVGElement>(null);
  const tot = g ? g[1].reduce((a, t) => a + t[0], 0) || 1 : 1;
  const dur = duracaoGlifo(tot);
  useEffect(() => {
    if (!anima || !g || !ctx || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    return seguirPena(ctx.el.current, ctx.placa.current, ref.current, g[0], tot, dur);
  }, [anima, g, ctx, tot, dur]);
  if (!g) return <span className={nova ? "lz-nova" : undefined}>{ch}</span>;
  const [adv, tr] = g;
  const cum = tr.reduce<number[]>((a, t) => [...a, a[a.length - 1]! + t[0]], [0]);
  const hm = humano(h);
  return (
    <span className="lz-g" style={{ width: `${((adv / 1000) * KG).toFixed(3)}em`, transform: `translateY(${hm.dy.toFixed(3)}em) rotate(${hm.rot.toFixed(2)}deg) scale(${hm.esc.toFixed(3)})` }}>
      <svg ref={ref} viewBox={`0 -800 ${adv} 1000`} aria-hidden>
        {tr.map(([, d], i) => {
          const ini = cum[i]! / tot; const fim = cum[i + 1]! / tot;
          return anima
            ? <path key={i} d={d} pathLength={1} className="lz-gl" style={{ animationDelay: `${Math.round(ini * dur)}ms`, animationDuration: `${Math.max(24, Math.round((fim - ini) * dur))}ms` }} />
            : <path key={i} d={d} />;
        })}
      </svg>
    </span>
  );
});
const Palavra = memo(function Palavra({ p, nova }: { p: string; nova: boolean }) {
  const cs = [...p];
  return <span className="lz-pal">{cs.map((c, i) => <Glifo key={i} ch={c} nova={nova && i === cs.length - 1} h={cs.length * 7 + i * 13 + c.charCodeAt(0)} />)}</span>;
});
/** Um trecho de texto escrito à mão; `nova` marca que a última letra acabou de ser escrita (e ainda está sendo desenhada). */
const Texto = memo(function Texto({ s, nova }: { s: string; nova: boolean }) {
  const partes = s.split(/( +)/);
  let ult = -1; for (let i = partes.length - 1; i >= 0; i--) if (partes[i] !== "") { ult = i; break; }
  return <>{partes.map((p, i) => (p === "" ? null : /^ +$/.test(p) ? " " : <Palavra key={i} p={p} nova={nova && i === ult} />))}</>;
});

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
    const st = cores[i] ? { color: cores[i] } : undefined;
    const miolo = <Texto s={ch.slice(i, j).join("")} nova={ultimo} />;
    out.push(circ[i] ? <span key={i} className="lz-ci" style={st}>{miolo}</span> : <span key={i} style={st}>{miolo}</span>);
    i = j;
  }
  void cor0;
  return <>{out}</>;
}

/** Altura do mini-quadro: 140 no mínimo, cresce para caber desenhos mais altos (pirâmides, fluxos em coluna). */
export function alturaMini(its: ItemDesenho[], largo = false): number {
  let m = 0;
  for (const it of its) {
    const y = it.t === "linha" ? Math.max(it.y1, it.y2) : it.t === "ret" ? it.y + it.h : it.t === "circ" ? it.cy + it.r : it.t === "curva" ? Math.max(...it.pts.map((q) => q[1])) : it.y;
    m = Math.max(m, y);
  }
  return Math.max(140, Math.min(largo ? 1500 : 260, Math.ceil(m + 14)));
}

/** Quanto tempo a caneta leva para escrever/desenhar cada item (a mesma conta da animação). */
const DT_LETRA = 0.07;
function comprimentoCurva(pts: Array<[number, number]>): number {
  let s = 0;
  for (let i = 1; i < pts.length; i++) s += Math.hypot(pts[i]![0] - pts[i - 1]![0], pts[i]![1] - pts[i - 1]![1]);
  return s;
}
export function duracaoItem(it: ItemDesenho): number {
  if (it.t === "emoji") return 0.35;
  if (it.t === "texto") return Math.min(3.2, Math.max(0.5, it.s.length * DT_LETRA));
  if (it.t === "linha") return Math.min(1.1, Math.max(0.25, Math.hypot(it.x2 - it.x1, it.y2 - it.y1) / 320)) + (it.seta ? 0.2 : 0);
  if (it.t === "ret") return Math.min(1.3, Math.max(0.4, (2 * (it.w + it.h)) / 800));
  if (it.t === "circ") return Math.min(1.2, Math.max(0.5, (2 * Math.PI * it.r) / 450));
  return Math.min(1.6, Math.max(0.35, comprimentoCurva(it.pts as Array<[number, number]>) / 450));
}

/** Uma caneta só: cada item começa quando o anterior termina (com uma pausa curta de mão), em vez de vários traços ao mesmo tempo. */
function useAgenda(itens: ItemDesenho[], atraso: (it: ItemDesenho, i: number) => number): number[] {
  const est = useRef<{ primeiro: ItemDesenho | null; cursor: number; delays: number[] }>({ primeiro: null, cursor: 0, delays: [] });
  const e = est.current;
  if (e.primeiro !== (itens[0] ?? null) || e.delays.length > itens.length) { e.primeiro = itens[0] ?? null; e.cursor = 0; e.delays = []; } // outro quadro: recomeça
  const agora = typeof performance !== "undefined" ? performance.now() : 0;
  for (let i = e.delays.length; i < itens.length; i++) {
    const it = itens[i]!;
    const inicio = Math.max(agora + atraso(it, i) * 1000, e.cursor);
    e.delays.push((inicio - agora) / 1000);
    e.cursor = inicio + duracaoItem(it) * 1000 + 110;
  }
  return e.delays;
}

/** Itens do quadro escritos em sequência, por uma única caneta. */
export function Rabisco({ itens, atraso }: { itens: ItemDesenho[]; atraso: (it: ItemDesenho, i: number) => number }) {
  const ds = useAgenda(itens, atraso);
  return <>{itens.map((it, i) => <Traco key={i} it={it} d={ds[i] ?? 0} />)}</>;
}

/** Caneta que anda sobre o traço enquanto ele é escrito: segue o caminho (offset-path) com um leve balanço de mão. */
function Pena({ dd, d, dur, c }: { dd: string; d: number; dur: number; c: string }) {
  return (
    <g className="lz-pena2" style={{ ["--d" as string]: `${d}s`, ["--w" as string]: `${dur}s`, offsetPath: `path('${dd}')` } as React.CSSProperties}>
      <g className="lz-pena2-in">
        <path d="M0 0L4 -5L26 -30L31 -25L9 0Z" fill="#2b303b" stroke="#fff" strokeWidth="1" />
        <path d="M0 0L4 -5L9 0Z" fill={c} />
        <path d="M8 -9L27 -27" stroke="#8b93a5" strokeWidth="1.5" strokeLinecap="round" />
      </g>
    </g>
  );
}

export function Traco({ it, d }: { it: ItemDesenho; d: number }) {
  const c = cor("cor" in it ? it.cor : undefined, "grafite");
  const st = { ["--d" as string]: `${d}s`, stroke: c } as React.CSSProperties;
  if (it.t === "emoji") return <text className="lz-em" x={it.x} y={it.y} fontSize={it.tam} style={{ ["--d" as string]: `${d}s` }}>{it.s}</text>;
  if (it.t === "texto") {
    // escrita à mão: cada letra é desenhada traço a traço, no seu momento, com a ponta da caneta andando junto
    const tam = it.tam ?? 19, dur = duracaoItem(it), dt = dur / Math.max(1, it.s.length);
    const k = (tam * KG) / 1000;
    let x = it.x;
    const letras = Array.from(it.s).map((ch, i) => {
      const g = GLIFOS[ch];
      const ax = x; x += (g ? g[0] : ch === " " ? 330 : 520) * k;
      return { ch, i, g, ax };
    });
    return (
      <g className="lz-gs" style={{ stroke: c }}>
        {letras.map(({ ch, i, g, ax }) => {
          if (!g) return ch === " " ? null : <text key={i} className="lz-tx" x={ax} y={it.y} style={{ fill: c, fontSize: tam, ["--d" as string]: `${d + i * dt}s` } as React.CSSProperties}>{ch}</text>;
          const tot = g[1].reduce((a, t) => a + t[0], 0) || 1; let acc = 0;
          const hm = humano(i * 17 + ch.charCodeAt(0));
          return (
            <g key={i} transform={`translate(${ax.toFixed(1)} ${(it.y + hm.dy * tam * 0.6).toFixed(1)}) rotate(${hm.rot.toFixed(2)}) scale(${(k * hm.esc).toFixed(5)})`}>
              {g[1].map(([len, dd], si) => {
                const ini = acc / tot; acc += len; const fim = acc / tot; const gd = Math.max(0.12, dt * 1.6);
                return <path key={si} d={dd} pathLength={1} className="lz-gl" strokeWidth={Math.round(70 / hm.esc)} style={{ animationDelay: `${(d + i * dt + ini * gd * 0.6).toFixed(3)}s`, animationDuration: `${Math.max(0.03, (fim - ini) * gd).toFixed(3)}s` }} />;
              })}
            </g>
          );
        })}
        <Pena dd={`M${it.x} ${it.y - tam * 0.2}L${Math.max(it.x + 10, x).toFixed(1)} ${it.y - tam * 0.2}`} d={d} dur={dur} c={c} />
      </g>
    );
  }
  if (it.t === "linha") {
    const ang = Math.atan2(it.y2 - it.y1, it.x2 - it.x1);
    const h = 10, dl = Math.min(1.1, Math.max(0.25, Math.hypot(it.x2 - it.x1, it.y2 - it.y1) / 320));
    return (
      <g>
        <path className="lz-tr" pathLength={1} d={`M${it.x1} ${it.y1}L${it.x2} ${it.y2}`} style={{ ...st, animationDuration: `${dl}s` }} />
        <Pena dd={`M${it.x1} ${it.y1}L${it.x2} ${it.y2}`} d={d} dur={dl} c={c} />
        {it.seta && <path className="lz-tr" pathLength={1} d={`M${it.x2 - h * Math.cos(ang - 0.5)} ${it.y2 - h * Math.sin(ang - 0.5)}L${it.x2} ${it.y2}L${it.x2 - h * Math.cos(ang + 0.5)} ${it.y2 - h * Math.sin(ang + 0.5)}`} style={{ ...st, ["--d" as string]: `${d + 0.5}s` }} />}
      </g>
    );
  }
  if (it.t === "ret") {
    const r = Math.min(10, it.w / 2, it.h / 2), x = it.x, y = it.y, w = it.w, h = it.h;
    const dd = `M${x + r} ${y}h${w - 2 * r}a${r} ${r} 0 0 1 ${r} ${r}v${h - 2 * r}a${r} ${r} 0 0 1 ${-r} ${r}h${-(w - 2 * r)}a${r} ${r} 0 0 1 ${-r} ${-r}v${-(h - 2 * r)}a${r} ${r} 0 0 1 ${r} ${-r}z`;
    return (
      <g>
        {it.bg && <path className="lz-fundo" d={dd} style={{ ["--d" as string]: `${d}s`, fill: c, ...(it.sol ? { fillOpacity: 1 } : {}) }} />}
        <path className="lz-tr" pathLength={1} d={dd} style={{ ...st, animationDuration: `${Math.min(1.3, Math.max(0.4, (2 * (w + h)) / 800))}s` }} />
        <Pena dd={dd} d={d} dur={Math.min(1.3, Math.max(0.4, (2 * (w + h)) / 800))} c={c} />
      </g>
    );
  }
  if (it.t === "circ") {
    const dc = `M${it.cx - it.r} ${it.cy}a${it.r} ${it.r} 0 1 0 ${2 * it.r} 0a${it.r} ${it.r} 0 1 0 ${-2 * it.r} 0`;
    return <g><path className="lz-tr" pathLength={1} d={dc} style={{ ...st, animationDuration: `${duracaoItem(it)}s` }} /><Pena dd={dc} d={d} dur={duracaoItem(it)} c={c} /></g>;
  }
  const dcv = `M${it.pts.map(([x, y]) => `${x} ${y}`).join("L")}`;
  return <g><path className="lz-tr" pathLength={1} d={dcv} style={{ ...st, animationDuration: `${duracaoItem(it)}s` }} /><Pena dd={dcv} d={d} dur={duracaoItem(it)} c={c} /></g>;
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

const T_VERMELHO = 520; // ms para a caneta riscar o contorno do card
const T_QUADRO = 320; // ms para riscar a moldura do quadro branco
const T_ENCHE = 220; // ms para o quadro "encher" (fundo e título aparecem)

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
    const f = () => { const v = Math.max(0, Math.floor(VIVO_UPS * (vivo.agora() - baseVivo))); setPos((a) => (a === v ? a : v)); raf = requestAnimationFrame(f); }; // só re-renderiza quando o traço avança de fato
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
  // % do exemplo já escrito na lousa (ao vivo: sobe até 99% e fecha em 100% quando o Mentor para de acrescentar linhas)
  const [vivoAcabou, setVivoAcabou] = useState(false);
  const frac = !dados || linhas.length === 0 ? 0 : Math.min(1, pos / Math.max(1, sincronizado ? totalFala : total));
  useEffect(() => {
    if (!vivo) return;
    setVivoAcabou(false);
    if (frac < 1 || linhas.length === 0) return;
    const id = setTimeout(() => setVivoAcabou(true), 2500);
    return () => clearTimeout(id);
  }, [vivo, frac, linhas.length]);
  const maxPct = useRef(0);
  useEffect(() => { maxPct.current = 0; }, [rodada]);
  const pctBruto = fim || reduz.current ? 100 : vivo ? (vivoAcabou ? 100 : Math.min(99, Math.round(frac * 100))) : Math.round(frac * 100);
  const pct = Math.max(maxPct.current, pctBruto);
  maxPct.current = pct;
  const [progOculto, setProgOculto] = useState(false);
  useEffect(() => {
    if (pct < 100) { setProgOculto(false); return; }
    const id = setTimeout(() => setProgOculto(true), 1500);
    return () => clearTimeout(id);
  }, [pct]);
  // acompanha a escrita: rola o quadro para a linha atual
  

  const ativo = sincronizado ? linhas.findIndex((_, j) => letras(j) < crono[j]!.length) : linhas.findIndex((_, j) => pos - inicios[j]! < dur(j));
  // acompanha a escrita só quando muda a linha ativa (rolar a cada quadro trava)
  useEffect(() => { const el = placa.current; if (el && !fim) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" }); }, [ativo, linhas.length, fim]);
  const desenho = lousa.desenho;
  const penEl = useRef<HTMLSpanElement>(null);
  const penCtx = useMemo(() => ({ el: penEl, placa }), []);
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
      {!progOculto && (
        <div className="lz-prog" role="progressbar" aria-label="Montando o exemplo na lousa" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} data-testid="lousa-progresso">
          <span className="lz-prog-t">{pct >= 100 ? "Exemplo completo na lousa" : "Montando o exemplo na lousa"}</span>
          <span className="lz-prog-barra"><i style={{ width: `${pct}%` }} /></span>
          <b className="lz-prog-n">{pct}%</b>
        </div>
      )}
      <div className="lz-quadro">
        <div className="lz-placa" ref={placa} key={rodada} onClick={() => setPos(total)} style={{ ["--tema" as string]: iconeDaLousa(lousa.titulo || "").cor }}>
          <IconeLousa titulo={lousa.titulo || ""} />
          <ol className="lz-sr">{linhas.map((l, i) => <li key={i}>{[l.texto, l.dir].filter(Boolean).join(" — ")}</li>)}</ol>
          <PenaCtx.Provider value={penCtx}>
          <div aria-hidden>
            <span ref={penEl} className="lz-pena-h"><Marcador c={ativo >= 0 ? cor(linhas[ativo]?.cor, "azul") : "#1d3a8a"} /></span>
            {(!dados || linhas.length === 0) && (
              <div className="lz-espera" role="progressbar" aria-label="Preparando o quadro" aria-busy="true">
                <span className="lz-espera-t">Preparando o quadro…</span>
                <span className="lz-espera-barra"><i /></span>
              </div>
            )}
            {!dados && <p className="lz-l" data-t="texto"><Marcador c="#1d3a8a" /></p>}
            {linhas.map((l, j) => {
              if (sincronizado ? t0L.current[j] === undefined : pos < inicios[j]!) return null;
              const len = crono[j]!.length;
              const v = letras(j);
              const feito = v >= len;
              const c = cor(l.cor, l.tipo === "conta" || l.tipo === "nota" ? "preto" : "azul");
              const pen: React.ReactNode = null; // a caneta é uma só e anda sobre o traço (ver PenaCtx)
              const st = { ["--n" as string]: l.nivel, ["--c" as string]: c, ["--rot" as string]: `${(((j * 37) % 9) - 4) * 0.09}deg` } as React.CSSProperties;
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
                    <svg className={`lz-svg lz-mini${l.larg ? " lz-mini-largo" : ""}`} viewBox={`0 0 ${l.larg ?? LOUSA_W} ${alturaMini(l.rabisco ?? [], !!l.larg)}`} role="img" aria-label={l.texto || "Desenho"}>
                      <Rabisco itens={l.rabisco ?? []} atraso={(it, i) => it.d ?? i * Math.min(0.3, 3.2 / Math.max(1, (l.rabisco ?? []).length))} />
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
                <Rabisco itens={desenho} atraso={(_it, i) => i * 0.4} />
              </svg>
            )}
          </div>
          </PenaCtx.Provider>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="lz-logo" src="/images/aprovum-logo-escura.png" alt="" aria-hidden />
        <div className="lz-bandeja" aria-hidden />
      </div>
    </aside>
  );
}
