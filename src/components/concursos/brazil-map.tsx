"use client";

import brazil from "@svg-maps/brazil";
import { useCallback, useEffect, useRef, useState } from "react";
import { Minus, Plus, Maximize2 } from "lucide-react";
import { UF_NAME } from "@/domain/concursos";

type View = { k: number; x: number; y: number };
const HOME: View = { k: 1, x: 0, y: 0 };
const [VW, VH] = (brazil.viewBox as string).split(" ").slice(2).map(Number) as [number, number];

/**
 * Mapa SVG interativo do Brasil (27 UFs, geometrias individuais). Clique/toque seleciona o estado
 * (brilho vermelho + zoom suave); arrastar move o mapa quando ampliado; + / − / “Mapa completo” controlam o zoom.
 */
export default function BrazilMap({ selected, counts, onSelect }: { selected: string | null; counts: Record<string, number>; onSelect: (uf: string | null) => void }) {
  const [view, setView] = useState<View>(HOME);
  const [hover, setHover] = useState<string | null>(null);
  const gRef = useRef<SVGGElement>(null);
  const drag = useRef<{ x: number; y: number; vx: number; vy: number; moved: boolean } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Estado escolhido: aproxima do centro dele.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!selected) return setView(HOME);
    const el = gRef.current?.querySelector<SVGPathElement>(`[data-uf="${selected}"]`);
    if (!el) return;
    const b = el.getBBox();
    const k = Math.max(1.6, Math.min(4.2, 0.55 * Math.min(VW / b.width, VH / b.height)));
    setView({ k, x: VW / 2 - (b.x + b.width / 2) * k, y: VH / 2 - (b.y + b.height / 2) * k });
  }, [selected]);

  const zoom = (f: number) =>
    setView((v) => {
      const k = Math.max(1, Math.min(5, v.k * f));
      if (k === 1) return HOME;
      const r = k / v.k;
      return { k, x: VW / 2 - (VW / 2 - v.x) * r, y: VH / 2 - (VH / 2 - v.y) * r };
    });

  const onDown = (e: React.PointerEvent) => {
    drag.current = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y, moved: false };
  };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || view.k === 1) return;
    const rect = svgRef.current!.getBoundingClientRect();
    const dx = ((e.clientX - d.x) / rect.width) * VW;
    const dy = ((e.clientY - d.y) / rect.height) * VH;
    if (Math.abs(dx) + Math.abs(dy) > 4) d.moved = true;
    if (d.moved) setView((v) => ({ ...v, x: d.vx + dx, y: d.vy + dy }));
  };
  const onUp = () => {
    window.setTimeout(() => (drag.current = null), 0);
  };
  const pick = useCallback(
    (uf: string) => {
      if (drag.current?.moved) return;
      onSelect(selected === uf ? null : uf);
    },
    [onSelect, selected],
  );

  return (
    <div className="cn-mapa" data-testid="mapa-brasil">
      <svg
        ref={svgRef}
        viewBox={brazil.viewBox as string}
        role="group"
        aria-label="Mapa do Brasil: escolha um estado"
        className={view.k > 1 ? "is-zoom" : ""}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      >
        <defs>
          <filter id="cn-brilho" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="0" stdDeviation="5" floodColor="#ff1a1a" floodOpacity="0.95" />
          </filter>
        </defs>
        <g ref={gRef} className="cn-g" style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.k})`, transformOrigin: "0 0" }}>
          {(brazil.locations as Array<{ id: string; name: string; path: string }>).map((l) => {
            const uf = l.id.toUpperCase();
            const n = counts[uf] ?? 0;
            const on = selected === uf;
            return (
              <path
                key={l.id}
                d={l.path}
                data-uf={uf}
                data-testid={`uf-${uf}`}
                role="button"
                tabIndex={0}
                aria-label={`${l.name}${n ? `: ${n} ${n === 1 ? "concurso" : "concursos"}` : ""}`}
                aria-pressed={on}
                className={`cn-uf ${n ? "tem" : ""} ${on ? "on" : ""} ${hover === uf ? "hover" : ""}`}
                filter={on ? "url(#cn-brilho)" : undefined}
                onClick={() => pick(uf)}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), pick(uf))}
                onPointerEnter={() => setHover(uf)}
                onPointerLeave={() => setHover(null)}
              />
            );
          })}
        </g>
      </svg>
      <div className="cn-mapa-ctl" role="group" aria-label="Zoom do mapa">
        <button type="button" onClick={() => zoom(1.4)} aria-label="Aproximar"><Plus className="size-4" aria-hidden /></button>
        <button type="button" onClick={() => zoom(1 / 1.4)} aria-label="Afastar"><Minus className="size-4" aria-hidden /></button>
        <button type="button" onClick={() => (onSelect(null), setView(HOME))} aria-label="Mapa completo" data-testid="mapa-completo"><Maximize2 className="size-4" aria-hidden /></button>
      </div>
      <p className="cn-mapa-dica" aria-live="polite">{hover ? UF_NAME[hover] : selected ? UF_NAME[selected] : "Toque em um estado"}</p>
    </div>
  );
}
