"use client";

import { useMemo, useState } from "react";
import { parseCalculo, type TermoFracao, type VisualCalculo } from "@/domain/content/calc-visual";
import type { Cell } from "@/domain/content/hand-math";
import "./calculo-visual.css";

/**
 * Cálculo passo a passo da aula de Matemática: a conta desenhada em tamanho grande e a explicação em passos curtos
 * que o aluno avança, volta ou abre de uma vez. Os números vêm do bloco da aula; quem calcula é o app.
 */
export function CalculoVisual({ linguagem, corpo }: { linguagem: string; corpo: string }) {
  const calc = useMemo(() => parseCalculo(linguagem, corpo), [linguagem, corpo]);
  const [n, setN] = useState(1);
  if (!calc) return <pre><code>{corpo}</code></pre>;
  const total = calc.passos.length;
  const fim = n >= total;
  return (
    <figure className="cv" data-tipo={calc.tipo} data-testid="calculo-visual">
      <figcaption className="cv-cab">
        <span className="cv-selo">Passo a passo</span>
        <b className="cv-titulo">{calc.titulo}</b>
      </figcaption>
      <div className="cv-visual"><Visual v={calc.visual} n={n} fim={fim} /></div>
      <ol className="cv-passos" aria-live="polite">
        {calc.passos.slice(0, n).map((p, i) => (
          <li key={i} data-atual={i === n - 1 ? "" : undefined}>
            <span className="cv-n" aria-hidden>{i + 1}</span>
            <span>{p}</span>
          </li>
        ))}
      </ol>
      {fim && <p className="cv-resultado"><span>Resultado</span>{calc.resultado}</p>}
      <div className="cv-ctrl">
        <button type="button" className="cv-bt" disabled={n <= 1} onClick={() => setN((v) => Math.max(1, v - 1))}>← Anterior</button>
        <span className="cv-pos" aria-hidden>{n} de {total}</span>
        {fim ? (
          <button type="button" className="cv-bt cv-prox" onClick={() => setN(1)}>Rever do início</button>
        ) : (
          <>
            <button type="button" className="cv-bt cv-prox" onClick={() => setN((v) => Math.min(total, v + 1))}>Próximo passo →</button>
            <button type="button" className="cv-bt cv-tudo" onClick={() => setN(total)}>Ver tudo</button>
          </>
        )}
      </div>
    </figure>
  );
}

function Visual({ v, n, fim }: { v: VisualCalculo; n: number; fim: boolean }) {
  switch (v.k) {
    case "armada": return <Armada w={v.w} />;
    case "fracao": return <Fracoes termos={v.termos} resultado={v.resultado} fim={fim} />;
    case "regra3": return <Regra3 v={v} fim={fim} />;
    case "potencia": return <Potencia base={v.base} exp={v.exp} produtos={v.produtos} visiveis={Math.max(0, n - 1)} fim={fim} />;
    case "percentual": return <Percentual pct={v.pct} total={v.total} parte={v.parte} fim={fim} />;
  }
}

function Celulas({ cells, cols }: { cells: Cell[]; cols: number }) {
  return (
    <>
      {Array.from({ length: cols }, (_, i) => {
        const c = cells[i] ?? { t: "" };
        return (
          <span key={i} className="cv-cel" data-tom={c.tone} data-riscado={c.strike ? "" : undefined}>
            {c.top && <i className="cv-top">{c.top}</i>}
            {c.pre && <i className="cv-pre">{c.pre}</i>}
            {c.t}
          </span>
        );
      })}
    </>
  );
}

function Armada({ w }: { w: import("@/domain/content/hand-math").Worked }) {
  const cols = Math.max(...w.rows.map((r) => r.cells.length));
  const fat = !!w.primes;
  const largura = fat ? Math.max(2.4, Math.max(...w.rows.flatMap((r) => r.cells.map((c) => c.t.length))) * 1.1 + 1) : 1.9;
  return (
    <div className="cv-armada" role="img" aria-label={`Conta armada: ${w.title}`}>
      <div className="cv-grade">
        {w.rows.map((r, i) => (
          <div key={i} className="cv-linha" data-regua={r.rule ? "" : undefined} data-chave={w.side && i === 0 ? "" : undefined} style={{ gridTemplateColumns: `repeat(${cols}, ${largura}rem)` }}>
            <Celulas cells={r.cells} cols={cols} />
          </div>
        ))}
      </div>
      {w.side && (
        <div className="cv-lado">
          <span className="cv-divisor">{w.side.divisor}</span>
          <span className="cv-quociente">{w.side.quotient}</span>
        </div>
      )}
      {w.primes && (
        <div className="cv-primos">
          {w.primes.map((p, i) => <span key={i}>{p}</span>)}
        </div>
      )}
    </div>
  );
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
