"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { RotateCcw, X } from "lucide-react";
import { LOUSA_H, LOUSA_W, type ItemDesenho, type LinhaLousa, type Lousa } from "@/domain/mentor/lousa";
import "./mentor-lousa.css";

const COR: Record<string, string> = { azul: "#1d3a8a", preto: "#1a1a1f", vermelho: "#c62828", verde: "#1b7a43", grafite: "#1a1a1f" };
const CPS = 24; // letras por segundo: ritmo de quem escreve no quadro
const PAUSA = 5; // "letras" de pausa entre linhas
const cor = (c?: string, padrao = "azul") => COR[c ?? padrao] ?? COR.azul!;

const tamanho = (l: LinhaLousa) => (l.tipo === "par" ? l.texto.length + (l.dir?.length ?? 0) + 6 : l.tipo === "espaco" ? 0 : l.texto.length);

function Marcador({ c }: { c: string }) {
  return (
    <svg className="lz-marc" viewBox="0 0 24 24" aria-hidden>
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

/** Texto com o trecho "circular" envolto num círculo (só quando já foi todo escrito). */
function ComCirculo({ s, circular, feito }: { s: string; circular?: string; feito: boolean }) {
  const i = circular && feito ? s.indexOf(circular) : -1;
  if (i < 0) return <>{s}</>;
  return <>{s.slice(0, i)}<span className="lz-ci">{circular}</span>{s.slice(i + circular!.length)}</>;
}

function Traco({ it, d }: { it: ItemDesenho; d: number }) {
  const c = cor("cor" in it ? it.cor : undefined, "grafite");
  const st = { ["--d" as string]: `${d}s`, stroke: c } as React.CSSProperties;
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
const PENDENTE: Lousa = { mostrar: true, titulo: "", linhas: [], desenho: [] };

export function MentorLousa({ lousa: dados, onClose }: { lousa: Lousa | null; onClose: () => void }) {
  const lousa = dados ?? PENDENTE;
  const linhas = lousa.linhas;
  const inicios = useMemo(() => { let a = 0; return linhas.map((l) => { const x = a; a += tamanho(l) + PAUSA; return x; }); }, [linhas]);
  const total = linhas.length ? inicios[inicios.length - 1]! + tamanho(linhas[linhas.length - 1]!) + PAUSA : 0;
  const [pos, setPos] = useState(0);
  const [rodada, setRodada] = useState(0);
  const reduz = useRef(false);
  const placa = useRef<HTMLDivElement>(null);
  useEffect(() => { reduz.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches; }, []);

  useEffect(() => {
    if (reduz.current) { setPos(total); return; }
    setPos(0);
    const t0 = performance.now();
    let raf = 0;
    const f = (now: number) => {
      const p = ((now - t0) / 1000) * CPS;
      setPos(Math.min(total, p));
      if (p < total) raf = requestAnimationFrame(f);
    };
    raf = requestAnimationFrame(f);
    return () => cancelAnimationFrame(raf);
  }, [total, rodada]);

  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);

  const fim = pos >= total;
  // acompanha a escrita: rola o quadro para a linha atual
  useEffect(() => { const el = placa.current; if (el && !fim) el.scrollTop = el.scrollHeight; }, [pos, fim]);

  const ativo = linhas.findIndex((l, j) => pos - inicios[j]! < tamanho(l));
  const desenho = lousa.desenho;
  return (
    <aside className={`lz ${reduz.current ? "lz-pronto" : ""}`} role="dialog" aria-label={`Quadro do Mentor: ${lousa.titulo || "exemplo"}`} data-testid="mentor-lousa">
      <div className="lz-topo">
        <span className="lz-kicker">QUADRO</span>
        <span className="lz-titulo">{lousa.titulo || (dados ? "" : "Preparando…")}</span>
        <button type="button" className="lz-bt" onClick={() => setRodada((r) => r + 1)} aria-label="Escrever de novo" title="Escrever de novo"><RotateCcw size={18} aria-hidden /></button>
        <button type="button" className="lz-bt" onClick={onClose} aria-label="Fechar quadro"><X size={20} aria-hidden /></button>
      </div>
      <div className="lz-quadro">
        <div className="lz-placa" ref={placa} key={rodada} onClick={() => setPos(total)}>
          <ol className="lz-sr">{linhas.map((l, i) => <li key={i}>{[l.texto, l.dir].filter(Boolean).join(" — ")}</li>)}</ol>
          <div aria-hidden>
            {!dados && <p className="lz-l" data-t="texto"><Marcador c="#1d3a8a" /></p>}
            {linhas.map((l, j) => {
              if (pos < inicios[j]!) return null;
              const len = tamanho(l);
              const v = Math.max(0, Math.min(len, Math.floor(pos - inicios[j]!)));
              const feito = v >= len;
              const c = cor(l.cor, l.tipo === "conta" || l.tipo === "nota" ? "preto" : "azul");
              const pen = ativo === j && <Marcador c={c} />;
              const st = { ["--n" as string]: l.nivel, ["--c" as string]: c } as React.CSSProperties;
              if (l.tipo === "espaco") return <div key={j} className="lz-l" data-t="espaco" />;
              if (l.tipo === "par") {
                const e = Math.min(v, l.texto.length);
                const d = Math.max(0, v - l.texto.length - 4);
                return (
                  <div key={j} className="lz-l" data-t="par" style={st}>
                    <div className="lz-par">
                      <span>{l.texto.slice(0, e)}</span>
                      {v > l.texto.length ? <i /> : <i style={{ visibility: "hidden" }} />}
                      <span>{feito ? <ComCirculo s={l.dir ?? ""} circular={l.circular} feito /> : (l.dir ?? "").slice(0, d)}{pen}</span>
                    </div>
                  </div>
                );
              }
              const txt = <ComCirculo s={l.texto.slice(0, v)} circular={l.circular} feito={feito} />;
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
            {desenho.length > 0 && (fim || pos > total * 0.9 || reduz.current) && (
              <svg className="lz-svg" viewBox={`0 0 ${LOUSA_W} ${LOUSA_H}`} role="img" aria-label="Desenho do exemplo" key={`d${rodada}`}>
                {desenho.map((it, i) => <Traco key={i} it={it} d={i * 0.9} />)}
              </svg>
            )}
          </div>
        </div>
        <div className="lz-bandeja" aria-hidden />
      </div>
    </aside>
  );
}
