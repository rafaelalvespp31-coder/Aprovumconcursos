"use client";

import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, BarChart3, BookOpen, ClipboardList, Filter, Lightbulb, Minus, Target, TrendingUp, Trophy } from "lucide-react";
import { aggregateIncidence, cutoffSeries, insightText, niceScale, projectNext, type IncEdition } from "@/domain/strategic/painel";
import type { Comparison } from "@/domain/strategic/analysis";
import type { CutoffView } from "@/server/services/strategic";
import "./raiox-painel.css";

const fmt = (n: number, d = 1) => n.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: d });
const PALETA = ["#e50920", "#f4f5f8", "#8d919b", "#a30516", "#c9ccd3", "#5a5d66", "#ff5a64", "#3b3e46"];

/** Largura real do gráfico: o SVG é desenhado em pixels reais, então textos e pontos não encolhem no celular. */
function useLargura(max = 640): [React.RefObject<HTMLElement | null>, number] {
  const ref = useRef<HTMLElement | null>(null);
  const [w, setW] = useState(max);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const set = () => setW(Math.max(280, Math.min(max, Math.round(el.clientWidth))));
    set();
    const ro = new ResizeObserver(set); ro.observe(el);
    return () => ro.disconnect();
  }, [max]);
  return [ref, w];
}

type Tip = { x: number; y: number; title: string; lines: string[] } | null;
function Tooltip({ tip, w, h }: { tip: Tip; w: number; h: number }) {
  if (!tip) return null;
  const left = (tip.x / w) * 100;
  return (
    <div className="rxp-tip" role="status" style={{ left: `${Math.min(Math.max(left, 14), 86)}%`, top: `${(tip.y / h) * 100}%` }}>
      <b>{tip.title}</b>{tip.lines.map((l) => <span key={l}>{l}</span>)}
    </div>
  );
}

export function Moldura({ id, label, icon, title, sub, filtro, children }: { id: string; label: string; icon: ReactNode; title: string; sub: string; filtro?: ReactNode; children: ReactNode }) {
  return (
    <section className="rxp-card" aria-label={label} data-testid={id}>
      <div className="rxp-in">
        <header className="rxp-head">
          <span className="rxp-ico" aria-hidden>{icon}</span>
          <div><h3>{title}</h3><p>{sub}</p></div>
          {filtro}
        </header>
        {children}
      </div>
    </section>
  );
}

function Select({ icon, label, value, onChange, children }: { icon: ReactNode; label: string; value: string; onChange: (v: string) => void; children: ReactNode }) {
  return <label className="rxp-sel">{icon}<span className="sr-only">{label}</span><select value={value} onChange={(e) => onChange(e.target.value)} aria-label={label}>{children}</select></label>;
}

/* ───────────── 1 · Histórico de notas de corte ───────────── */
function Cortes({ cutoffs, modalities, detalhes }: { cutoffs: CutoffView[]; modalities: Array<[string, string]>; detalhes: ReactNode }) {
  const [mod, setMod] = useState("todas");
  const [tip, setTip] = useState<Tip>(null);
  const gid = useId().replace(/:/g, "");
  const s = useMemo(() => cutoffSeries(cutoffs, mod), [cutoffs, mod]);
  const proj = useMemo(() => (s ? projectNext(s.points, s.unit === "%" ? 100 : undefined) : null), [s]);
  const [ref1, W] = useLargura();
  const H = W < 480 ? 240 : 300, pl = W < 480 ? 40 : 54, pr = 26, pt = 40, pb = 38;
  const u = s?.unit === "%" ? "%" : " pts";

  const body = (() => {
    if (!cutoffs.length) return <p className="rxp-vazio">Seu histórico de notas de corte aparecerá aqui após a primeira nota catalogada para este concurso.</p>;
    if (!s) return <p className="rxp-vazio">Nenhuma nota de corte para esta modalidade.</p>;
    const pts = s.points;
    const last = pts[pts.length - 1]!, prev = pts.length > 1 ? pts[pts.length - 2]! : null;
    const delta = prev ? last.value - prev.value : null;
    const all = [...pts.map((p) => p.value), ...(proj ? [proj.value] : [])];
    const sc = niceScale(Math.min(...all) - 2, Math.max(...all) + 2);
    const n = pts.length + (proj ? 1 : 0);
    const X = (i: number) => (n === 1 ? (pl + W - pr) / 2 : pl + (i * (W - pl - pr)) / (n - 1));
    const Y = (v: number) => pt + (1 - (v - sc.min) / (sc.max - sc.min)) * (H - pt - pb);
    const line = pts.map((p, i) => `${i ? "L" : "M"}${X(i).toFixed(1)} ${Y(p.value).toFixed(1)}`).join(" ");
    const area = `${line} L${X(pts.length - 1).toFixed(1)} ${H - pb} L${X(0).toFixed(1)} ${H - pb} Z`;
    const lx = X(pts.length - 1), ly = Y(last.value);
    const conf = proj ? { baixa: "Baixa", media: "Média", alta: "Alta" }[proj.confidence] : "";
    return (
      <div className="rxp-g1">
        <div className="rxp-hero">
          <Trophy aria-hidden className="rxp-trofeu" />
          <small>Última nota de corte</small>
          <b data-testid="rxp-media">{fmt(last.value)}<i>{u.trim()}</i></b>
          {delta !== null && prev ? (
            <span className="rxp-delta" data-d={delta > 0 ? "up" : delta < 0 ? "down" : "eq"}>
              {delta > 0 ? <ArrowUp aria-hidden /> : delta < 0 ? <ArrowDown aria-hidden /> : <Minus aria-hidden />}{delta > 0 ? "+" : ""}{fmt(delta)}{s.unit === "%" ? " p.p." : " pts"}
            </span>
          ) : <span className="rxp-delta" data-d="eq">1 edição</span>}
          <em>{prev ? `vs. edição ${prev.year}` : `edição ${last.year}`}</em>
        </div>

        <figure className="rxp-chart" ref={ref1 as React.RefObject<HTMLElement & HTMLDivElement>} aria-label={`Evolução das notas de corte, ${pts.length} edições`}>
          <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Gráfico de linha das notas de corte" onPointerLeave={() => setTip(null)}>
            <defs>
              <linearGradient id={`a${gid}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#e50920" stopOpacity=".5" /><stop offset="1" stopColor="#e50920" stopOpacity="0" /></linearGradient>
              <filter id={`g${gid}`} x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="3" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            </defs>
            {sc.ticks.map((t) => <g key={t}><line x1={pl} x2={W - pr} y1={Y(t)} y2={Y(t)} className="rxp-grid" /><text x={pl - 10} y={Y(t) + 4} textAnchor="end" className="rxp-eixo">{fmt(t, 0)}{s.unit === "%" ? "%" : ""}</text></g>)}
            {pts.map((p, i) => <text key={p.id} x={X(i)} y={H - 12} textAnchor="middle" className="rxp-eixo">{p.year}</text>)}
            {proj && <text x={X(pts.length)} y={H - 12} textAnchor="middle" className="rxp-eixo rxp-proj-l">{proj.year}*</text>}
            {pts.length > 1 && <path d={area} fill={`url(#a${gid})`} className="rxp-area" />}
            {pts.length > 1 && <path d={line} className="rxp-linha" pathLength={1} filter={`url(#g${gid})`} />}
            {proj && <path d={`M${lx} ${ly} L${X(pts.length)} ${Y(proj.value)}`} className="rxp-linha-proj" />}
            {proj && <circle cx={X(pts.length)} cy={Y(proj.value)} r="6" className="rxp-pt-proj" tabIndex={0} aria-label={`Projeção ${proj.year}: ${fmt(proj.value)}${u}`}
              onPointerEnter={() => setTip({ x: X(pts.length), y: Y(proj.value), title: `Projeção ${proj.year}`, lines: [`${fmt(proj.value)}${u} (estimativa)`, "Tendência linear"] })} onFocus={() => setTip({ x: X(pts.length), y: Y(proj.value), title: `Projeção ${proj.year}`, lines: [`${fmt(proj.value)}${u} (estimativa)`] })} onBlur={() => setTip(null)} />}
            {pts.map((p, i) => {
              const isLast = i === pts.length - 1;
              const show = () => setTip({ x: X(i), y: Y(p.value), title: `Edição ${p.year}`, lines: [`${fmt(p.score)}${p.maxScore ? ` / ${fmt(p.maxScore)}` : ""}${s.unit === "%" ? ` (${fmt(p.value)}%)` : " pts"}`] });
              return <g key={p.id}>
                <circle cx={X(i)} cy={Y(p.value)} r={isLast ? 8 : 5.5} className={isLast ? "rxp-pt rxp-pt-last" : "rxp-pt"} />
                <circle cx={X(i)} cy={Y(p.value)} r="16" fill="transparent" tabIndex={0} aria-label={`Edição ${p.year}: ${fmt(p.value)}${u}`} onPointerEnter={show} onFocus={show} onBlur={() => setTip(null)} onClick={show} style={{ cursor: "pointer" }} />
              </g>;
            })}
            <g className="rxp-badge" transform={`translate(${Math.min(Math.max(lx, 44), W - 44)} ${ly - 30})`}><rect x="-34" y="-15" width="68" height="26" rx="8" /><path d="M-6 11 L0 18 L6 11 Z" /><text textAnchor="middle" y="3">{fmt(last.value)}{s.unit === "%" ? "%" : ""}</text></g>
          </svg>
          <Tooltip tip={tip} w={W} h={H} />
          <figcaption>{`${s.kind ? "" : ""}Série: ${KIND_SHORT[s.kind] ?? s.kind}${s.position ? ` · ${s.position}` : ""}`}{pts.length < 2 ? ". A evolução aparece com duas ou mais edições." : ""}</figcaption>
        </figure>

        <aside className="rxp-sub rxp-proj" aria-label="Projeção APROVUM">
          <div className="rxp-sub-h"><Target aria-hidden /><b>Projeção<br />APROVUM</b></div>
          {proj ? (
            <>
              <strong data-testid="rxp-proj">{fmt(proj.value)}<i>{u.trim()}{s.unit === "%" ? "" : ""}</i></strong>
              <p>estimativa para a próxima edição ({proj.year})</p>
              <small>Confiança: <em data-c={proj.confidence}>{conf}</em> · tendência linear de {pts.length} edições</small>
            </>
          ) : <p className="rxp-vazio-s">Não existem dados suficientes para gerar uma projeção confiável (mínimo de 3 edições).</p>}
          <svg className="rxp-mini" viewBox="0 0 120 56" aria-hidden>
            {pts.slice(-6).map((p, i, a) => { const hs = 8 + ((p.value - Math.min(...a.map((x) => x.value))) / ((Math.max(...a.map((x) => x.value)) - Math.min(...a.map((x) => x.value))) || 1)) * 40; return <rect key={p.id} x={i * 20 + 2} y={56 - hs} width="14" height={hs} rx="2" style={{ animationDelay: `${i * 80}ms` }} />; })}
          </svg>
        </aside>
      </div>
    );
  })();

  return (
    <Moldura id="rxp-cortes" label="Histórico de notas de corte" icon={<Target />} title="HISTÓRICO DE NOTAS DE CORTE" sub="Acompanhe a evolução das notas de corte do concurso."
      filtro={modalities.length > 1 ? <Select icon={<Filter aria-hidden />} label="Modalidade" value={mod} onChange={setMod}><option value="todas">Todas as modalidades</option>{modalities.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select> : undefined}>
      {body}
      {cutoffs.length > 0 && <details className="rxp-det"><summary>Ver todas as notas, tipos e fontes</summary>{detalhes}</details>}
    </Moldura>
  );
}
const KIND_SHORT: Record<string, string> = { minima_aprovacao: "Nota mínima para aprovação", corte_primeira_fase: "Corte da 1ª fase", ultimo_classificado: "Último classificado", ultimo_convocado: "Último convocado", ultimo_dentro_vagas: "Último dentro das vagas" };

/* ───────────── 2 · Incidência das matérias ───────────── */
function Incidencia({ eds }: { eds: IncEdition[] }) {
  const [ed, setEd] = useState<string>("todas");
  const [hot, setHot] = useState<number | null>(null);
  const agg = useMemo(() => aggregateIncidence(eds, ed === "todas" ? "todas" : Number(ed)), [eds, ed]);
  const ins = insightText(agg.rows);
  const R = 78, C = 2 * Math.PI * R;
  const offs = agg.rows.map((_, i) => agg.rows.slice(0, i).reduce((n, r) => n + (r.questions / agg.total) * C, 0));
  return (
    <Moldura id="rxp-incidencia" label="Incidência das matérias" icon={<BookOpen />} title="INCIDÊNCIA DAS MATÉRIAS" sub="Veja quais matérias mais caem nas provas e onde focar."
      filtro={eds.length ? <Select icon={<Filter aria-hidden />} label="Prova" value={ed} onChange={setEd}><option value="todas">Todas as provas</option>{eds.map((e) => <option key={e.year} value={e.year}>{e.year}{e.board ? ` · ${e.board}` : ""}</option>)}</Select> : undefined}>
      {!agg.rows.length ? <p className="rxp-vazio">A incidência por matéria aparecerá aqui após a primeira prova catalogada para este concurso.</p> : (
        <div className="rxp-g2">
          <div className="rxp-donut">
            <svg viewBox="0 0 200 200" role="img" aria-label={`Distribuição de ${agg.total} questões por matéria`}>
              <circle cx="100" cy="100" r="98" className="rxp-d-aro" />
              {agg.rows.map((r, i) => {
                const len = (r.questions / agg.total) * C; const off = offs[i]!;
                return <circle key={r.name} cx="100" cy="100" r={R} className="rxp-seg" data-hot={hot === i ? 1 : undefined} stroke={PALETA[i % PALETA.length]} strokeDasharray={`${Math.max(len - 1.5, 0.5)} ${C}`} strokeDashoffset={-off} transform="rotate(-90 100 100)" style={{ animationDelay: `${i * 90}ms` }}
                  onPointerEnter={() => setHot(i)} onPointerLeave={() => setHot(null)} onClick={() => setHot(hot === i ? null : i)}><title>{`${r.name}: ${r.questions} questões (${fmt(r.pct)}%)`}</title></circle>;
              })}
              <circle cx="100" cy="100" r="54" className="rxp-d-miolo" />
            </svg>
            <div className="rxp-d-txt"><small>Total de Questões</small><b data-testid="rxp-total">{agg.total}</b><ClipboardList aria-hidden /></div>
          </div>
          <ul className="rxp-lista">
            {agg.rows.map((r, i) => (
              <li key={r.name} data-hot={hot === i ? 1 : undefined} onPointerEnter={() => setHot(i)} onPointerLeave={() => setHot(null)}>
                <i className="rxp-dot" style={{ background: PALETA[i % PALETA.length] }} aria-hidden />
                <div><b>{r.name}</b><small>{r.questions} {r.questions === 1 ? "questão" : "questões"}</small></div>
                <span className="rxp-trilha" role="progressbar" aria-label={`${r.name}: ${fmt(r.pct)}%`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(r.pct)}><i style={{ width: `${Math.max(r.pct, 1.5)}%`, background: PALETA[i % PALETA.length], animationDelay: `${i * 90}ms` }} /></span>
                <strong>{fmt(r.pct)}%</strong>
              </li>
            ))}
          </ul>
          <aside className="rxp-sub rxp-insight" aria-label="Insight APROVUM">
            <div className="rxp-sub-h"><Lightbulb aria-hidden /><b>Insight APROVUM</b></div>
            <div className="rxp-alvo">
              <svg viewBox="0 0 80 80" aria-hidden><circle cx="40" cy="40" r="36" fill="#f4f5f8" /><circle cx="40" cy="40" r="28" fill="#e50920" /><circle cx="40" cy="40" r="19" fill="#f4f5f8" /><circle cx="40" cy="40" r="11" fill="#e50920" /><circle cx="40" cy="40" r="4" fill="#f4f5f8" /><path d="M40 40 L70 10" stroke="#8d919b" strokeWidth="3" strokeLinecap="round" /><path d="M64 8 L72 8 L72 16 Z" fill="#a30516" /></svg>
              {ins ? <p>Priorize <b>{ins.name}</b>: esta disciplina representa <b>{fmt(ins.pct)}%</b> das questões analisadas{ed === "todas" ? "" : ` na prova de ${ed}`}.</p> : <p>Sem dados suficientes para recomendar.</p>}
            </div>
          </aside>
        </div>
      )}
    </Moldura>
  );
}

/* ───────────── 3 · Comparativo das duas últimas provas ───────────── */
function Comparativo({ cmp, detalhes }: { cmp: Comparison | null; detalhes: ReactNode }) {
  const [show, setShow] = useState({ prev: true, cur: true });
  const [tip, setTip] = useState<Tip>(null);
  const [ref3, W] = useLargura();
  const H = W < 480 ? 300 : 330, pl = W < 480 ? 36 : 50, pr = 10, pt = 34, pb = W < 480 ? 74 : 64;
  const body = (() => {
    if (!cmp) return <p className="rxp-vazio">São necessárias duas provas catalogadas para realizar a comparação.</p>;
    const subs = cmp.subjects;
    const max = Math.max(1, ...subs.flatMap((s) => [s.previous ?? 0, s.recent ?? 0]));
    const sc = niceScale(0, max);
    const Y = (v: number) => pt + (1 - v / sc.max) * (H - pt - pb);
    const gw = (W - pl - pr) / subs.length, bw = Math.min(46, gw / 2.6);
    const py = `${cmp.previous.year}${cmp.previous.board ? ` · ${cmp.previous.board}` : ""}`, ry = `${cmp.recent.year}${cmp.recent.board ? ` · ${cmp.recent.board}` : ""}`;
    const estreito = W < 480;
    return (
      <div className="rxp-g3">
        <figure className="rxp-chart rxp-chart3" ref={ref3 as React.RefObject<HTMLElement & HTMLDivElement>}>
          <div className="rxp-leg" role="group" aria-label="Legenda">
            <button type="button" aria-pressed={show.prev} onClick={() => setShow((v) => ({ ...v, prev: !v.prev }))}><i className="g" />Prova anterior ({py})</button>
            <button type="button" aria-pressed={show.cur} onClick={() => setShow((v) => ({ ...v, cur: !v.cur }))}><i className="r" />Prova atual ({ry})</button>
          </div>
          {estreito ? (
            <ul className="rxp-hb" aria-label="Questões por disciplina nas duas últimas provas">
              {subs.map((s, i) => (
                <li key={s.name} data-d={s.delta === null ? "na" : s.delta > 0 ? "up" : s.delta < 0 ? "down" : "eq"}>
                  <div className="rxp-hb-t"><b>{s.name}</b>{s.delta !== null && <em>{s.delta > 0 ? "+" : ""}{s.delta}</em>}</div>
                  {([["prev", s.previous, show.prev, py], ["cur", s.recent, show.cur, ry]] as const).map(([k, v, on, lbl]) => on && (
                    <div key={k} className="rxp-hb-r" title={`${lbl}: ${v ?? "sem questões"}`}>
                      <span className="rxp-hb-l">{k === "prev" ? cmp.previous.year : cmp.recent.year}</span>
                      <span className="rxp-hb-b" data-k={k}><i style={{ width: `${v ? Math.max((v / sc.max) * 100, 3) : 0}%`, animationDelay: `${i * 80}ms` }} /></span>
                      <strong>{v ?? "—"}</strong>
                    </div>
                  ))}
                </li>
              ))}
            </ul>
          ) : (
          <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Gráfico de barras agrupadas: questões por disciplina nas duas últimas provas" onPointerLeave={() => setTip(null)}>
            <defs>
              <linearGradient id="rxp-gr" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ff4d5a" /><stop offset="1" stopColor="#b30012" /></linearGradient>
              <linearGradient id="rxp-gg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#b9bcc4" /><stop offset="1" stopColor="#5d6068" /></linearGradient>
            </defs>
            {sc.ticks.map((t) => <g key={t}><line x1={pl} x2={W - pr} y1={Y(t)} y2={Y(t)} className="rxp-grid" /><text x={pl - 8} y={Y(t) + 4} textAnchor="end" className="rxp-eixo">{fmt(t, 0)}</text></g>)}
            <text x={4} y={14} className="rxp-eixo">questões</text>
            {subs.map((s, i) => {
              const cx = pl + gw * i + gw / 2;
              const bars: Array<[string, number | null, boolean, number]> = [["prev", s.previous, show.prev, cx - bw - 2], ["cur", s.recent, show.cur, cx + 2]];
              return <g key={s.name}>
                {bars.map(([k, v, on, x]) => on && v !== null && (
                  <g key={k}>
                    <rect x={x} y={Y(v)} width={bw} height={Math.max(H - pb - Y(v), 1)} rx="4" fill={k === "cur" ? "url(#rxp-gr)" : "url(#rxp-gg)"} className="rxp-bar" tabIndex={0}
                      style={{ animationDelay: `${i * 90}ms` }} aria-label={`${s.name}, ${k === "cur" ? ry : py}: ${v} questões`}
                      onPointerEnter={() => setTip({ x: x + bw / 2, y: Y(v), title: s.name, lines: [`${k === "cur" ? ry : py}: ${v} questões`, s.delta !== null ? `Variação: ${s.delta > 0 ? "+" : ""}${s.delta}` : "Sem comparação"] })}
                      onFocus={() => setTip({ x: x + bw / 2, y: Y(v), title: s.name, lines: [`${k === "cur" ? ry : py}: ${v} questões`] })} onBlur={() => setTip(null)} onClick={() => setTip({ x: x + bw / 2, y: Y(v), title: s.name, lines: [`${k === "cur" ? ry : py}: ${v} questões`] })} />
                    <text x={x + bw / 2} y={Y(v) - 7} textAnchor="middle" className="rxp-val">{v}</text>
                  </g>
                ))}
                <foreignObject x={cx - gw / 2 + 4} y={H - pb + 8} width={gw - 8} height={pb - 8}><div className="rxp-cat" title={s.name}>{s.name}</div></foreignObject>
              </g>;
            })}
          </svg>
          )}
          {!estreito && <Tooltip tip={tip} w={W} h={H} />}
        </figure>

        <div className="rxp-lado">
          <aside className="rxp-sub rxp-resumo" aria-label="Resumo da evolução">
            <div className="rxp-sub-h"><TrendingUp aria-hidden /><b>Resumo da Evolução</b></div>
            <ul>
              {subs.map((s) => (
                <li key={s.name} data-d={s.delta === null ? "na" : s.delta > 0 ? "up" : s.delta < 0 ? "down" : "eq"}>
                  <span>{s.name}</span>
                  <b>{s.delta === null ? (s.previous === null ? "nova" : "sem questões") : <>{s.delta > 0 ? <ArrowUp aria-hidden /> : s.delta < 0 ? <ArrowDown aria-hidden /> : <Minus aria-hidden />}{s.delta > 0 ? "+" : ""}{s.delta}</>}</b>
                </li>
              ))}
            </ul>
            <small>Variação em número de questões entre {cmp.previous.year} e {cmp.recent.year}.</small>
          </aside>
          <div className="rxp-assina" aria-label="Assinatura APROVUM">
            {/* eslint-disable-next-line @next/next/no-img-element -- caveira oficial da marca */}
            <img src="/icons/caveira-bicolor.png" alt="" width={120} height={120} decoding="async" loading="lazy" />
            <p>EVOLUÇÃO CONSTANTE.<br /><b>APROVUM SEMPRE.</b></p>
          </div>
        </div>
      </div>
    );
  })();
  return (
    <Moldura id="rxp-comparativo" label="Comparativo das duas últimas provas" icon={<BarChart3 />} title="COMPARATIVO DAS DUAS ÚLTIMAS PROVAS" sub="Veja a evolução por matéria e identifique os pontos de atenção.">
      {body}
      {cmp && <details className="rxp-det"><summary>Ver comparação por assunto</summary>{detalhes}</details>}
    </Moldura>
  );
}

export function RaioXPainel({ cutoffs, modalities, incidence, comparison, detalhesCortes, detalhesComparativo, extra }: {
  cutoffs: CutoffView[]; modalities: Array<[string, string]>; incidence: IncEdition[]; comparison: Comparison | null; detalhesCortes: ReactNode; detalhesComparativo: ReactNode; extra?: ReactNode;
}) {
  return (
    <div className="rxp" data-testid="raiox-painel">
      <Cortes cutoffs={cutoffs} modalities={modalities} detalhes={detalhesCortes} />
      <Incidencia eds={incidence} />
      <Comparativo cmp={comparison} detalhes={detalhesComparativo} />
      {extra}
    </div>
  );
}
