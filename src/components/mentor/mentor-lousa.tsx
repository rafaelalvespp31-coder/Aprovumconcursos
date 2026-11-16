"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { RotateCcw, X } from "lucide-react";
import { LOUSA_H, LOUSA_W, type ItemDesenho, type Lousa } from "@/domain/mentor/lousa";
import "./mentor-lousa.css";

const COR: Record<string, string> = { grafite: "#2b2b33", vermelho: "#d92d20", azul: "#1d4ed8", verde: "#15803d" };
const CPS = 26; // letras por segundo (ritmo de quem escreve a lápis)
const cor = (c?: string) => COR[c ?? "grafite"] ?? COR.grafite!;

function Lapis() {
  return (
    <svg className="lz-lapis" viewBox="0 0 24 24" aria-hidden>
      <path d="M3 21l1.5-5L16 4.5 19.5 8 8 19.5z" fill="#f2c14e" stroke="#2b2b33" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M16 4.5l2-2 3.5 3.5-2 2z" fill="#e5484d" stroke="#2b2b33" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M3 21l1.5-5 3.5 3.5z" fill="#fbe9c8" stroke="#2b2b33" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M3 21l.7-2.3 1.6 1.6z" fill="#2b2b33" />
    </svg>
  );
}

function Traco({ it, d }: { it: ItemDesenho; d: number }) {
  const st = { ["--d" as string]: `${d}s`, stroke: cor("cor" in it ? it.cor : undefined) } as React.CSSProperties;
  if (it.t === "texto") return <text className="lz-tx" x={it.x} y={it.y} style={{ ["--d" as string]: `${d}s`, fill: cor(it.cor) }}>{it.s}</text>;
  if (it.t === "linha") {
    const ang = Math.atan2(it.y2 - it.y1, it.x2 - it.x1);
    const h = 9;
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
 * Lousa do Mentor: abre quando o aluno pede uma conta, um exemplo ou um desenho. Escreve os passos letra por letra,
 * com um lápis na ponta da linha, e depois traça o desenho. Fica aberta até o aluno fechar.
 */
export function MentorLousa({ lousa, onClose }: { lousa: Lousa; onClose: () => void }) {
  const unidades = useMemo(() => lousa.passos.flatMap((p, i) => [{ k: "t" as const, i, s: p.texto }, ...(p.conta ? [{ k: "c" as const, i, s: p.conta }] : [])]), [lousa]);
  const inicios = useMemo(() => { let a = 0; return unidades.map((u) => { const x = a; a += u.s.length + 4; return x; }); }, [unidades]);
  const total = unidades.length ? inicios[inicios.length - 1]! + unidades[unidades.length - 1]!.s.length + 4 : 0;
  const [pos, setPos] = useState(0);
  const [rodada, setRodada] = useState(0);
  const reduz = useRef(false);
  useEffect(() => { reduz.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches; }, []);

  useEffect(() => {
    if (reduz.current) { setPos(total); return; }
    setPos(0);
    let t0 = performance.now();
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
  const ativo = unidades.findIndex((u, j) => pos - inicios[j]! < u.s.length);
  let n = 0;
  const desenho = lousa.desenho;
  return (
    <aside className={`lz ${reduz.current ? "lz-pronto" : ""}`} role="dialog" aria-label={`Lousa do Mentor: ${lousa.titulo || "exemplo"}`} data-testid="mentor-lousa">
      <div className="lz-topo">
        <span className="lz-kicker">LOUSA</span>
        <span className="lz-titulo">{lousa.titulo}</span>
        <button type="button" className="lz-bt" onClick={() => setRodada((r) => r + 1)} aria-label="Escrever de novo" title="Escrever de novo"><RotateCcw size={18} aria-hidden /></button>
        <button type="button" className="lz-bt" onClick={onClose} aria-label="Fechar lousa"><X size={20} aria-hidden /></button>
      </div>
      <div className="lz-papel" key={rodada} onClick={() => setPos(total)}>
        <ol className="lz-sr">{lousa.passos.map((p, i) => <li key={i}>{p.texto} {p.conta}</li>)}</ol>
        <div aria-hidden>
          {unidades.map((u, j) => {
            const v = Math.max(0, Math.min(u.s.length, Math.floor(pos - inicios[j]!)));
            if (pos < inicios[j]!) return null;
            const num = u.k === "t" ? ++n : n;
            return u.k === "t" ? (
              <p key={j} className="lz-p"><span className="lz-n">{num}.</span>{u.s.slice(0, v)}{ativo === j && <Lapis />}</p>
            ) : (
              <p key={j} className="lz-conta">{u.s.slice(0, v)}{ativo === j && <Lapis />}</p>
            );
          })}
        </div>
        {desenho.length > 0 && (fim || pos > total * 0.3 || reduz.current) && (
          <svg className="lz-svg" viewBox={`0 0 ${LOUSA_W} ${LOUSA_H}`} role="img" aria-label="Desenho do exemplo" key={`d${rodada}`}>
            {desenho.map((it, i) => <Traco key={i} it={it} d={i * 0.55} />)}
          </svg>
        )}
      </div>
    </aside>
  );
}
