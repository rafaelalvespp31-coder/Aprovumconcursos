"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { parseCalculo, type TermoFracao, type VisualCalculo } from "@/domain/content/calc-visual";
import type { Figura, LinhaCaderno } from "@/domain/content/calc-tipos";
import type { Cell, Worked } from "@/domain/content/hand-math";
import "./calculo-visual.css";

/**
 * Cálculo no caderno, passo a passo: a folha é escrita aos poucos (cada número entra no passo em que o professor o
 * escreveria), os números usados no passo ficam destacados e a explicação acompanha cada etapa. Os números vêm do bloco
 * da aula; quem calcula é o app (nada é inventado). Controles: etapa anterior, próxima etapa, ver resolução completa e
 * refazer a explicação (toca de novo, uma etapa por vez).
 */
export function CalculoVisual({ linguagem, corpo }: { linguagem: string; corpo: string }) {
  const calc = useMemo(() => parseCalculo(linguagem, corpo), [linguagem, corpo]);
  const [n, setN] = useState(1);
  const [tocando, setTocando] = useState(false);
  const relogio = useRef<ReturnType<typeof setInterval> | null>(null);
  const total = calc?.passos.length ?? 1;

  const parar = useCallback(() => { if (relogio.current) clearInterval(relogio.current); relogio.current = null; setTocando(false); }, []);
  useEffect(() => parar, [parar]);
  const mover = (v: number) => { parar(); setN(Math.min(total, Math.max(1, v))); };
  const refazer = () => {
    parar();
    setN(1);
    if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    setTocando(true);
    relogio.current = setInterval(() => {
      setN((v) => {
        if (v >= total) { if (relogio.current) clearInterval(relogio.current); relogio.current = null; setTocando(false); return v; }
        return v + 1;
      });
    }, 1900);
  };

  if (!calc) return <pre><code>{corpo}</code></pre>;
  const atual = n - 1;
  const fim = n >= total;
  return (
    <figure className="cv" data-tipo={calc.tipo} data-testid="calculo-visual">
      <figcaption className="cv-cab">
        <span className="cv-selo">Passo a passo</span>
        <b className="cv-titulo">{calc.titulo}</b>
      </figcaption>
      <div className="cv-folha">
        <Visual v={calc.visual} atual={atual} n={n} fim={fim} />
      </div>
      <div className="cv-fala" aria-live="polite">
        <span className="cv-n" aria-hidden>{n}</span>
        <p key={n}>{calc.passos[atual]}</p>
      </div>
      {n > 1 && (
        <details className="cv-todas">
          <summary>Ver todas as etapas até aqui</summary>
          <ol>{calc.passos.slice(0, n).map((p, i) => <li key={i} data-atual={i === atual ? "" : undefined}>{p}</li>)}</ol>
        </details>
      )}
      {fim && <p className="cv-resultado"><span>Resultado</span>{calc.resultado}</p>}
      <div className="cv-ctrl">
        <button type="button" className="cv-bt" disabled={n <= 1} onClick={() => mover(n - 1)}>← Etapa anterior</button>
        <span className="cv-pos" aria-hidden>{n} de {total}</span>
        <button type="button" className="cv-bt cv-prox" disabled={fim} onClick={() => mover(n + 1)}>Próxima etapa →</button>
        <button type="button" className="cv-bt cv-tudo" disabled={fim} onClick={() => mover(total)}>Ver resolução completa</button>
        <button type="button" className="cv-bt cv-refaz" onClick={refazer} aria-pressed={tocando}>↻ Refazer explicação</button>
      </div>
    </figure>
  );
}

function Visual({ v, atual, n, fim }: { v: VisualCalculo; atual: number; n: number; fim: boolean }) {
  switch (v.k) {
    case "armada": return <Armada w={v.w} atual={atual} />;
    case "linhas": return <Linhas linhas={v.linhas} fig={v.fig} atual={atual} />;
    case "fracao": return <Fracoes termos={v.termos} resultado={v.resultado} fim={fim} />;
    case "regra3": return <Regra3 v={v} fim={fim} />;
    case "potencia": return <Potencia base={v.base} exp={v.exp} produtos={v.produtos} visiveis={Math.max(0, n - 1)} fim={fim} />;
    case "percentual": return <Percentual pct={v.pct} total={v.total} parte={v.parte} fim={fim} />;
  }
}

/** O que está escrito na célula no passo `at`. */
function estado(c: Cell, at: number): { t: string; visivel: boolean; novo: boolean } {
  if (c.alt) {
    const ativo = [...c.alt].reverse().find((s) => at >= s.p && (s.pe === undefined || at < s.pe));
    return { t: ativo?.t ?? "", visivel: !!ativo, novo: ativo?.p === at };
  }
  const aparece = c.p === undefined || at >= c.p;
  const some = c.pe !== undefined && at >= c.pe;
  return { t: c.t, visivel: aparece && !some, novo: c.p === at };
}

function Armada({ w, atual }: { w: Worked; atual: number }) {
  const cols = Math.max(...w.rows.map((r) => r.cells.length));
  const fat = !!w.primes;
  const largura = fat ? Math.max(2.4, Math.max(...w.rows.flatMap((r) => r.cells.map((c) => c.t.length))) * 1.1 + 1) : 1.9;
  const focos = new Set((w.focos?.[atual] ?? []).map(([r, c]) => `${r}:${c}`));
  return (
    <div className="cv-armada" role="img" aria-label={`Conta armada: ${w.title}`}>
      <div className="cv-grade">
        {w.rows.map((r, ri) => {
          const alguma = r.cells.some((c) => estado(c, atual).visivel && c.t !== "" || (c.alt && estado(c, atual).visivel));
          return (
            <div key={ri} className="cv-linha" data-regua={r.rule && alguma ? "" : undefined} data-chave={w.side && ri === 0 ? "" : undefined} style={{ gridTemplateColumns: `repeat(${cols}, ${largura}rem)` }}>
              {Array.from({ length: cols }, (_, ci) => {
                const c = r.cells[ci] ?? { t: "" };
                const e = estado(c, atual);
                const anot = c.pa === undefined || atual >= c.pa;
                const pre = c.pre && atual >= (c.pp ?? c.pa ?? 0);
                const tom = c.tone === "alert" && !anot ? undefined : c.tone;
                return (
                  <span key={ci} className="cv-cel" data-tom={tom} data-novo={e.novo ? "" : undefined} data-foco={focos.has(`${ri}:${ci}`) && e.visivel ? "" : undefined} data-oculto={e.visivel ? undefined : ""} data-riscado={c.strike && anot ? "" : undefined}>
                    {c.top && anot && <i className="cv-top">{c.top}</i>}
                    {pre && <i className="cv-pre">{c.pre}</i>}
                    {e.t}
                  </span>
                );
              })}
            </div>
          );
        })}
      </div>
      {w.side && (
        <div className="cv-lado">
          <span className="cv-divisor">{w.side.divisor}</span>
          <span className="cv-quociente">
            {(w.quotientCells ?? [...w.side.quotient].map((t) => ({ t, p: 0 }))).map((q, i) => <b key={i} data-oculto={atual >= q.p ? undefined : ""} data-novo={atual === q.p ? "" : undefined}>{q.t}</b>)}
          </span>
        </div>
      )}
      {w.primes && (
        <div className="cv-primos">
          {w.primes.map((p, i) => <span key={i} data-oculto={atual >= i + 1 ? undefined : ""} data-novo={atual === i + 1 ? "" : undefined}>{p}</span>)}
        </div>
      )}
    </div>
  );
}

function Linhas({ linhas, fig, atual }: { linhas: LinhaCaderno[]; fig?: Figura; atual: number }) {
  const vistas = linhas.filter((l) => atual >= l.p);
  return (
    <div className="cv-linhas">
      {fig && <Forma fig={fig} />}
      {vistas.map((l, i) => (
        <p key={i} className="cv-ln" data-novo={l.p === atual ? "" : undefined}>
          {l.partes.map((x, k) => <span key={k} className="cv-pt" data-cel={x.cel ? "" : undefined} data-dest={x.dest ? "" : undefined} data-dim={x.dim ? "" : undefined}>{x.t}</span>)}
        </p>
      ))}
    </div>
  );
}

/** Figuras da geometria, com as medidas escritas nos lados. */
function Forma({ fig }: { fig: Figura }) {
  const r = fig.rot;
  const T = (x: number, y: number, t: string, a: "middle" | "start" | "end" = "middle") => <text x={x} y={y} textAnchor={a} className="cv-fig-t">{t}</text>;
  let corpo: React.ReactNode = null;
  switch (fig.tipo) {
    case "retangulo": corpo = <><rect x="30" y="20" width="140" height="70" />{T(100, 112, r.b ?? "b")}{T(24, 60, r.h ?? "h", "end")}</>; break;
    case "quadrado": corpo = <><rect x="60" y="15" width="80" height="80" />{T(100, 112, r.l ?? "l")}{T(54, 60, r.l ?? "l", "end")}</>; break;
    case "triangulo": corpo = <><polygon points="30,95 170,95 120,15" /><line x1="120" y1="15" x2="120" y2="95" className="cv-fig-aux" />{T(100, 112, r.b ?? "b")}{T(126, 60, r.h ?? "h", "start")}</>; break;
    case "circulo": corpo = <><circle cx="100" cy="55" r="42" /><line x1="100" y1="55" x2="142" y2="55" className="cv-fig-aux" />{T(121, 48, r.r ?? "r")}</>; break;
    case "trapezio": corpo = <><polygon points="20,95 180,95 140,20 60,20" /><line x1="140" y1="20" x2="140" y2="95" className="cv-fig-aux" />{T(100, 112, r.B ?? "B")}{T(100, 13, r.b ?? "b")}{T(146, 62, r.h ?? "h", "start")}</>; break;
    case "paralelogramo": corpo = <><polygon points="20,95 130,95 180,20 70,20" /><line x1="70" y1="20" x2="70" y2="95" className="cv-fig-aux" />{T(75, 112, r.b ?? "b")}{T(64, 62, r.h ?? "h", "end")}</>; break;
    case "losango": corpo = <><polygon points="100,10 170,55 100,100 30,55" /><line x1="30" y1="55" x2="170" y2="55" className="cv-fig-aux" /><line x1="100" y1="10" x2="100" y2="100" className="cv-fig-aux" />{T(100, 49, r.D ?? "D")}{T(106, 80, r.d ?? "d", "start")}</>; break;
    case "pitagoras": corpo = <><polygon points="30,95 170,95 30,20" /><polyline points="30,83 42,83 42,95" className="cv-fig-aux" />{T(100, 112, r.b ?? "b")}{T(24, 60, r.a ?? "a", "end")}{T(112, 50, r.c ?? "c", "start")}</>; break;
    case "cubo": corpo = <><rect x="40" y="35" width="80" height="60" /><polygon points="40,35 70,12 150,12 120,35" /><polygon points="120,35 150,12 150,72 120,95" />{T(80, 112, r.a ?? "a")}</>; break;
    case "paralelepipedo": corpo = <><rect x="30" y="40" width="110" height="55" /><polygon points="30,40 60,15 170,15 140,40" /><polygon points="140,40 170,15 170,70 140,95" />{T(85, 112, r.a ?? "a")}{T(176, 52, r.b ?? "b", "start")}{T(24, 70, r.c ?? "c", "end")}</>; break;
    case "cilindro": corpo = <><ellipse cx="100" cy="25" rx="42" ry="12" /><path d="M58 25 V85 A42 12 0 0 0 142 85 V25" /><line x1="100" y1="25" x2="142" y2="25" className="cv-fig-aux" />{T(121, 19, r.r ?? "r")}{T(148, 60, r.h ?? "h", "start")}</>; break;
  }
  return <svg className="cv-fig" viewBox="-34 0 244 124" role="img" aria-label={`Figura: ${fig.tipo}`}>{corpo}</svg>;
}

/** Pizza dividida em `d` fatias iguais, `n` pintadas (acima de 12 partes vira só a barra). */
function Pizza({ n, d }: { n: number; d: number }) {
  if (d > 12) return null;
  const R = 44, C = 50;
  const ponto = (a: number) => [C + R * Math.sin(a), C - R * Math.cos(a)] as const;
  return (
    <svg viewBox="0 0 100 100" className="cv-pizza" aria-hidden>
      {d === 1 ? <circle cx={C} cy={C} r={R} className={n ? "on" : "off"} /> : Array.from({ length: d }, (_, i) => {
        const [x1, y1] = ponto((2 * Math.PI * i) / d), [x2, y2] = ponto((2 * Math.PI * (i + 1)) / d);
        return <path key={i} d={`M${C} ${C} L${x1.toFixed(2)} ${y1.toFixed(2)} A${R} ${R} 0 0 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`} className={i < n ? "on" : "off"} />;
      })}
    </svg>
  );
}

function BarraFracao({ n, d }: { n: number; d: number }) {
  return (
    <div className="cv-barra" style={{ gridTemplateColumns: `repeat(${Math.min(d, 60)}, 1fr)` }} aria-hidden>
      {Array.from({ length: Math.min(d, 60) }, (_, i) => <span key={i} className={i < n ? "on" : "off"} />)}
    </div>
  );
}

function Fracoes({ termos, resultado, fim }: { termos: TermoFracao[]; resultado: { n: number; d: number } | null; fim: boolean }) {
  const itens = [...termos.map((t) => ({ ...t })), ...(fim && resultado ? [{ ...resultado, rotulo: `${resultado.n}/${resultado.d}`, res: true }] : [])];
  if (!itens.length) return <p className="cv-aviso">Acompanhe os passos abaixo.</p>;
  return (
    <div className="cv-fracoes">
      {itens.map((t, i) => (
        <figure key={i} className="cv-fr" data-res={"res" in t ? "" : undefined}>
          <Pizza n={t.n} d={t.d} />
          <BarraFracao n={t.n} d={t.d} />
          <figcaption className="cv-frac"><b>{t.n}</b><i /><b>{t.d}</b></figcaption>
        </figure>
      ))}
    </div>
  );
}

function Regra3({ v, fim }: { v: Extract<VisualCalculo, { k: "regra3" }>; fim: boolean }) {
  return (
    <div className="cv-r3" role="img" aria-label={`Regra de três ${v.direta ? "direta" : "inversa"}`}>
      <span className="cv-r3-h">{v.rotuloA}</span>
      <span className="cv-r3-h">{v.rotuloB}</span>
      <b>{v.a}</b><b>{v.b}</b>
      <span className="cv-r3-seta" data-sentido={v.direta ? "igual" : "contrario"} aria-hidden>↓</span>
      <span className="cv-r3-seta" data-sentido={v.direta ? "igual" : "contrario"} aria-hidden>{v.direta ? "↓" : "↑"}</span>
      <b>{v.c}</b><b className="cv-x" data-fim={fim ? "" : undefined}>{fim ? v.x : "x"}</b>
    </div>
  );
}

function Potencia({ base, exp, produtos, visiveis, fim }: { base: number; exp: number; produtos: number[]; visiveis: number; fim: boolean }) {
  const vistos = fim ? produtos : produtos.slice(0, visiveis);
  return (
    <div className="cv-pot">
      <p className="cv-pot-exp" aria-hidden><b>{base}</b><sup>{exp}</sup></p>
      {exp > 1 && <p className="cv-pot-linha" aria-hidden>{Array.from({ length: exp }, (_, i) => <span key={i}>{base}{i < exp - 1 ? " ×" : ""}</span>)}</p>}
      {vistos.length > 0 && exp > 1 && (
        <p className="cv-pot-cadeia" aria-hidden>
          {vistos.map((p, i) => <span key={i} data-ultimo={fim && i === produtos.length - 1 ? "" : undefined}>{p.toLocaleString("pt-BR")}</span>)}
        </p>
      )}
    </div>
  );
}

function Percentual({ pct, total, parte, fim }: { pct: number; total: string; parte: string; fim: boolean }) {
  return (
    <div className="cv-pc" role="img" aria-label={`${pct}% de ${total}`}>
      <div className="cv-pc-barra"><span style={{ width: `${pct}%` }} data-fim={fim ? "" : undefined} /></div>
      <div className="cv-pc-leg"><span><b>{pct}%</b> {fim ? parte : "?"}</span><span><b>100%</b> {total}</span></div>
    </div>
  );
}
