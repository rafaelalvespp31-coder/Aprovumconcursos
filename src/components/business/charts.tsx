"use client";

import { useId, useMemo, useState } from "react";

export interface ChartPoint {
  label: string;
  value: number;
}
export interface ChartSeries {
  name: string;
  color: string;
  points: ChartPoint[];
}

const W = 640;
const H = 220;
const PAD = { top: 16, right: 16, bottom: 30, left: 70 };

const fmt = (n: number) => n.toLocaleString("pt-BR");
/** Eixo curto: 1,2 mil / 3,4 mi (valores monetários chegam em centavos e são divididos antes). */
export const compact = (n: number) =>
  new Intl.NumberFormat("pt-BR", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);
const showLabel = (i: number, n: number, step: number) =>
  i === n - 1 || (i % step === 0 && n - 1 - i >= step * 0.6);
const anchor = (i: number, n: number) =>
  n > 1 && i === n - 1 ? "end" : i === 0 && n > 1 ? "start" : "middle";

function niceMax(v: number): number {
  if (v <= 4) return 4;
  const p = 10 ** Math.floor(Math.log10(v));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
}

/**
 * Gráfico de linhas (uma ou mais séries) com dica ao passar o mouse ou tocar. Responsivo
 * (viewBox) e com tabela escondida para leitores de tela.
 */
export function LineChart({
  series,
  title,
  format = fmt,
  axisFormat = compact,
  labelEvery,
}: {
  series: ChartSeries[];
  title: string;
  format?: (n: number) => string;
  axisFormat?: (n: number) => string;
  labelEvery?: number;
}) {
  const id = useId();
  const [hover, setHover] = useState<number | null>(null);
  const n = series[0]?.points.length ?? 0;
  const max = useMemo(
    () =>
      niceMax(
        Math.max(1, ...series.flatMap((s) => s.points.map((p) => p.value))),
      ),
    [series],
  );
  if (!n) return <p className="bz-vazio">Sem dados no período.</p>;
  const x = (i: number) =>
    PAD.left +
    (n === 1
      ? (W - PAD.left - PAD.right) / 2
      : (i * (W - PAD.left - PAD.right)) / (n - 1));
  const y = (v: number) => PAD.top + (H - PAD.top - PAD.bottom) * (1 - v / max);
  const step = labelEvery ?? Math.max(1, Math.ceil(n / 7));
  const pick = (clientX: number, el: SVGSVGElement) => {
    const r = el.getBoundingClientRect();
    const px = ((clientX - r.left) / r.width) * W;
    const i = Math.round(
      ((px - PAD.left) / (W - PAD.left - PAD.right)) * (n - 1),
    );
    setHover(Math.min(n - 1, Math.max(0, i)));
  };
  return (
    <figure className="bz-grafico">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-labelledby={`${id}-t`}
        className="w-full touch-pan-y"
        onPointerMove={(e) => pick(e.clientX, e.currentTarget)}
        onPointerDown={(e) => pick(e.clientX, e.currentTarget)}
        onPointerLeave={() => setHover(null)}
      >
        <title id={`${id}-t`}>{title}</title>
        {[0, 0.25, 0.5, 0.75, 1].map((f) => (
          <g key={f}>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={y(max * f)}
              y2={y(max * f)}
              stroke="rgba(255,255,255,0.07)"
            />
            <text
              x={PAD.left - 6}
              y={y(max * f) + 4}
              textAnchor="end"
              className="bz-eixo"
            >
              {axisFormat(Math.round(max * f))}
            </text>
          </g>
        ))}
        {series[0]!.points.map((p, i) =>
          showLabel(i, n, step) ? (
            <text
              key={i}
              x={x(i)}
              y={H - 8}
              textAnchor={anchor(i, n)}
              className="bz-eixo"
            >
              {p.label}
            </text>
          ) : null,
        )}
        {series.map((s) => {
          const d = s.points
            .map(
              (p, i) =>
                `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`,
            )
            .join(" ");
          return (
            <g key={s.name}>
              <path
                d={`${d} L${x(n - 1)},${y(0)} L${x(0)},${y(0)} Z`}
                fill={s.color}
                opacity={series.length > 1 ? 0.06 : 0.14}
              />
              <path
                d={d}
                fill="none"
                stroke={s.color}
                strokeWidth={2.5}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            </g>
          );
        })}
        {hover !== null && (
          <g>
            <line
              x1={x(hover)}
              x2={x(hover)}
              y1={PAD.top}
              y2={H - PAD.bottom}
              stroke="rgba(255,255,255,0.25)"
              strokeDasharray="3 3"
            />
            {series.map((s) => (
              <circle
                key={s.name}
                cx={x(hover)}
                cy={y(s.points[hover]!.value)}
                r={4.5}
                fill={s.color}
                stroke="#0B0B0D"
                strokeWidth={2}
              />
            ))}
          </g>
        )}
      </svg>
      {hover !== null && (
        <div
          className="bz-dica"
          role="status"
          style={{ left: `${(x(hover) / W) * 100}%` }}
        >
          <b>{series[0]!.points[hover]!.label}</b>
          {series.map((s) => (
            <span key={s.name}>
              <i style={{ background: s.color }} /> {s.name}:{" "}
              {format(s.points[hover]!.value)}
            </span>
          ))}
        </div>
      )}
      {series.length > 1 && (
        <figcaption className="bz-legenda">
          {series.map((s) => (
            <span key={s.name}>
              <i style={{ background: s.color }} /> {s.name}
            </span>
          ))}
        </figcaption>
      )}
      <div className="sr-only">
        <table>
          <caption>{title}</caption>
          <tbody>
            {series[0]!.points.map((p, i) => (
              <tr key={i}>
                <th scope="row">{p.label}</th>
                {series.map((s) => (
                  <td key={s.name}>{format(s.points[i]!.value)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}

/** Gráfico de barras com dica ao passar o mouse ou tocar. */
export function BarChart({
  points,
  title,
  color = "#E50914",
  format = fmt,
  axisFormat = compact,
}: {
  points: ChartPoint[];
  title: string;
  color?: string;
  format?: (n: number) => string;
  axisFormat?: (n: number) => string;
}) {
  const id = useId();
  const [hover, setHover] = useState<number | null>(null);
  const n = points.length;
  const max = niceMax(Math.max(1, ...points.map((p) => p.value)));
  if (!n) return <p className="bz-vazio">Sem dados no período.</p>;
  const bw = (W - PAD.left - PAD.right) / n;
  const y = (v: number) => PAD.top + (H - PAD.top - PAD.bottom) * (1 - v / max);
  const step = Math.max(1, Math.ceil(n / 8));
  return (
    <figure className="bz-grafico">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-labelledby={`${id}-t`}
        className="w-full"
        onPointerLeave={() => setHover(null)}
      >
        <title id={`${id}-t`}>{title}</title>
        {[0, 0.5, 1].map((f) => (
          <g key={f}>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={y(max * f)}
              y2={y(max * f)}
              stroke="rgba(255,255,255,0.07)"
            />
            <text
              x={PAD.left - 6}
              y={y(max * f) + 4}
              textAnchor="end"
              className="bz-eixo"
            >
              {axisFormat(Math.round(max * f))}
            </text>
          </g>
        ))}
        {points.map((p, i) => (
          <g
            key={i}
            onPointerEnter={() => setHover(i)}
            onPointerDown={() => setHover(i)}
          >
            <rect
              x={PAD.left + i * bw}
              y={PAD.top}
              width={bw}
              height={H - PAD.top - PAD.bottom}
              fill="transparent"
            />
            <rect
              x={PAD.left + i * bw + bw * 0.15}
              y={y(p.value)}
              width={bw * 0.7}
              height={Math.max(0, y(0) - y(p.value))}
              rx={Math.min(6, bw * 0.2)}
              fill={color}
              opacity={hover === null || hover === i ? 1 : 0.45}
            />
            {showLabel(i, n, step) && (
              <text
                x={PAD.left + i * bw + bw / 2}
                y={H - 8}
                textAnchor="middle"
                className="bz-eixo"
              >
                {p.label}
              </text>
            )}
          </g>
        ))}
      </svg>
      {hover !== null && (
        <div
          className="bz-dica"
          role="status"
          style={{ left: `${((PAD.left + (hover + 0.5) * bw) / W) * 100}%` }}
        >
          <b>{points[hover]!.label}</b>
          <span>{format(points[hover]!.value)}</span>
        </div>
      )}
      <div className="sr-only">
        <table>
          <caption>{title}</caption>
          <tbody>
            {points.map((p, i) => (
              <tr key={i}>
                <th scope="row">{p.label}</th>
                <td>{format(p.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}
