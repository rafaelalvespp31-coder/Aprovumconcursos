"use client";

import { useId } from "react";
import type { Strip, StripPanel } from "@/domain/content/visual";
import { INK, Person } from "./characters";

/** Quadro: 240 × 200. Chão em y = 188. */
const W = 240;
const H = 200;
const GROUND = 188;
const SLOT = { esq: 58, centro: 120, dir: 182 } as const;

function Scene({ kind, dots }: { kind: StripPanel["cenario"]; dots: string }) {
  const ln = { stroke: INK, strokeWidth: 2, fill: "none", strokeLinecap: "round" as const };
  switch (kind) {
    case "local_crime":
      return (
        <g>
          <rect width={W} height={H} fill="#C9D3DD" />
          <rect width={W} height={H} fill={`url(#${dots})`} opacity={0.5} />
          <path d="M0 120 h40 v-60 h46 v60 h30 v-82 h52 v82 h62" fill="#9AA7B5" stroke={INK} strokeWidth={2} />
          <rect x={0} y={150} width={W} height={50} fill="#6E7782" />
          <path d="M0 150 h240" {...ln} />
          {/* fita de isolamento */}
          <g transform="rotate(-8 120 140)">
            <rect x={-10} y={132} width={260} height={11} fill="#F4D03F" stroke={INK} strokeWidth={1.6} />
            <path d="M0 132 l10 11 M30 132 l10 11 M60 132 l10 11 M90 132 l10 11 M120 132 l10 11 M150 132 l10 11 M180 132 l10 11 M210 132 l10 11" stroke={INK} strokeWidth={4} />
          </g>
          {/* marcador de vestígio */}
          <path d="M206 188 l7 -14 l7 14 z" fill="#F4D03F" stroke={INK} strokeWidth={1.6} />
          <text x={213} y={186} fontSize={7} fontWeight={800} textAnchor="middle" fill={INK}>1</text>
        </g>
      );
    case "cela":
      return (
        <g>
          <rect width={W} height={H} fill="#B8C2B0" />
          <rect width={W} height={H} fill={`url(#${dots})`} opacity={0.45} />
          <rect x={0} y={150} width={W} height={50} fill="#8C9483" />
          <path d="M0 150 h240" {...ln} />
          <rect x={150} y={118} width={78} height={14} rx={2} fill="#7B6A58" stroke={INK} strokeWidth={2} />
          <rect x={22} y={40} width={34} height={22} rx={2} fill="#E9EDF0" stroke={INK} strokeWidth={2} />
          <path d="M33 40 v22 M45 40 v22" stroke={INK} strokeWidth={2} />
          {/* grades em primeiro plano, nas bordas */}
          <path d="M6 0 v200 M16 0 v200 M224 0 v200 M234 0 v200" stroke="#4A4F55" strokeWidth={4} />
          <path d="M0 26 h22 M218 26 h22" stroke="#4A4F55" strokeWidth={4} />
        </g>
      );
    case "delegacia":
      return (
        <g>
          <rect width={W} height={H} fill="#D7DEE6" />
          <rect width={W} height={H} fill={`url(#${dots})`} opacity={0.4} />
          <rect x={162} y={84} width={64} height={16} rx={2} fill="#2F3A4A" stroke={INK} strokeWidth={1.6} />
          <text x={194} y={95.5} fontSize={8} fontWeight={800} textAnchor="middle" fill="#FFFFFF" letterSpacing={0.6}>DELEGACIA</text>
          <rect x={0} y={154} width={W} height={46} fill="#B8A07E" />
          <path d="M0 154 h240" {...ln} />
          <rect x={160} y={128} width={70} height={30} fill="#8B6B47" stroke={INK} strokeWidth={2} />
          <rect x={170} y={120} width={20} height={9} fill="#FFFFFF" stroke={INK} strokeWidth={1.4} />
        </g>
      );
    case "forum":
      return (
        <g>
          <rect width={W} height={H} fill="#E3DCCF" />
          <rect width={W} height={H} fill={`url(#${dots})`} opacity={0.4} />
          <path d="M20 46 l100 -30 l100 30 z" fill="#CFC6B6" stroke={INK} strokeWidth={2} />
          {[34, 74, 166, 206].map((x) => (
            <rect key={x} x={x - 7} y={50} width={14} height={104} fill="#EEE8DD" stroke={INK} strokeWidth={2} />
          ))}
          <rect x={0} y={154} width={W} height={46} fill="#A8998A" />
          <path d="M0 154 h240" {...ln} />
        </g>
      );
    case "casa":
      return (
        <g>
          <rect width={W} height={H} fill="#F0D9C4" />
          <rect width={W} height={H} fill={`url(#${dots})`} opacity={0.35} />
          <rect x={160} y={36} width={52} height={40} fill="#BFE0F2" stroke={INK} strokeWidth={2} />
          <path d="M186 36 v40 M160 56 h52" stroke={INK} strokeWidth={2} />
          <rect x={0} y={154} width={W} height={46} fill="#B07D52" />
          <path d="M0 154 h240" {...ln} />
        </g>
      );
    case "bar":
      return (
        <g>
          <rect width={W} height={H} fill="#5B3A29" />
          <rect width={W} height={H} fill={`url(#${dots})`} opacity={0.25} />
          <rect x={14} y={30} width={60} height={10} fill="#8B5E3C" stroke={INK} strokeWidth={1.6} />
          {[22, 34, 46, 58].map((x) => (
            <rect key={x} x={x} y={16} width={6} height={14} rx={1.5} fill={x % 24 ? "#7FB069" : "#E07A5F"} stroke={INK} strokeWidth={1.2} />
          ))}
          <rect x={0} y={150} width={W} height={50} fill="#3E271C" />
          <path d="M0 150 h240" {...ln} />
        </g>
      );
    case "hospital":
      return (
        <g>
          <rect width={W} height={H} fill="#DDEFF0" />
          <rect width={W} height={H} fill={`url(#${dots})`} opacity={0.35} />
          <path d="M196 26 h10 v-10 h8 v10 h10 v8 h-10 v10 h-8 v-10 h-10z" fill="#C81E1E" stroke={INK} strokeWidth={1.4} />
          <rect x={0} y={154} width={W} height={46} fill="#B9D3D6" />
          <path d="M0 154 h240" {...ln} />
        </g>
      );
    default:
      return (
        <g>
          <rect width={W} height={H} fill="#CFE3F2" />
          <rect width={W} height={H} fill={`url(#${dots})`} opacity={0.4} />
          <path d="M0 110 h30 v-50 h40 v50 h20 v-70 h50 v70 h30 v-40 h70 v40" fill="#A9BCCB" stroke={INK} strokeWidth={2} />
          <rect x={0} y={150} width={W} height={50} fill="#7D8790" />
          <path d="M0 150 h240" {...ln} />
        </g>
      );
  }
}

/** Quebra o texto em linhas de até `max` caracteres. */
function wrap(text: string, max: number): string[] {
  const out: string[] = [];
  let line = "";
  for (const w of text.split(/\s+/)) {
    if ((line + " " + w).trim().length > max && line) {
      out.push(line);
      line = w;
    } else line = (line + " " + w).trim();
  }
  if (line) out.push(line);
  return out;
}

function Caption({ text }: { text: string }) {
  const lines = wrap(text, 44);
  const h = 8 + lines.length * 10;
  return (
    <g>
      <rect x={4} y={4} width={W - 8} height={h} fill="#FFE45C" stroke={INK} strokeWidth={2} />
      <text x={10} y={14.5} fontSize={8.6} fontWeight={700} fill={INK}>
        {lines.map((l, i) => (
          <tspan key={i} x={10} dy={i ? 10 : 0}>{l}</tspan>
        ))}
      </text>
    </g>
  );
}

function Bubble({ text, speakerX, top }: { text: string; speakerX: number; top: number }) {
  const lines = wrap(text, 26);
  const w = Math.min(150, Math.max(...lines.map((l) => l.length)) * 5.1 + 16);
  const h = lines.length * 11 + 10;
  const x = Math.max(6, Math.min(W - w - 6, speakerX - w / 2));
  const tailX = Math.max(x + 12, Math.min(x + w - 12, speakerX));
  const headTop = GROUND - 112;
  return (
    <g className="comic-pop">
      <path
        d={`M${tailX - 6} ${top + h - 1} L${speakerX + (speakerX > tailX ? 4 : -4)} ${Math.max(top + h + 6, headTop - 2)} L${tailX + 6} ${top + h - 1}`}
        fill="#FFFFFF"
        stroke={INK}
        strokeWidth={2}
        strokeLinejoin="round"
      />
      <rect x={x} y={top} width={w} height={h} rx={10} fill="#FFFFFF" stroke={INK} strokeWidth={2} />
      <path d={`M${tailX - 5} ${top + h - 1} h10`} stroke="#FFFFFF" strokeWidth={3} />
      <text x={x + w / 2} y={top + 13} fontSize={9.2} fontWeight={700} textAnchor="middle" fill={INK}>
        {lines.map((l, i) => (
          <tspan key={i} x={x + w / 2} dy={i ? 11 : 0}>{l}</tspan>
        ))}
      </text>
    </g>
  );
}

function Burst({ text, x, y }: { text: string; x: number; y: number }) {
  const pts = Array.from({ length: 16 }, (_, i) => {
    const r = i % 2 ? 13 : 24;
    const a = (i / 16) * Math.PI * 2;
    return `${x + Math.cos(a) * r * 1.3},${y + Math.sin(a) * r}`;
  }).join(" ");
  return (
    <g className="comic-pop">
      <polygon points={pts} fill="#FFE45C" stroke={INK} strokeWidth={2} strokeLinejoin="round" />
      <text x={x} y={y + 4} fontSize={11} fontWeight={900} textAnchor="middle" fill="#C81E1E">{text}</text>
    </g>
  );
}

export function ComicPanel({ panel, n }: { panel: StripPanel; n: number }) {
  const uid = useId().replace(/:/g, "");
  const dots = `dots-${uid}`;
  const people = panel.personagens.map((c) => {
    const x = SLOT[c.lado];
    // Por padrão, cada um olha para o centro do quadro.
    const faceLeft = c.olha ? c.olha === "esq" : x > W / 2;
    return { c, x, faceLeft };
  });
  const capH = panel.legenda ? 8 + wrap(panel.legenda, 44).length * 10 + 6 : 4;
  const speaker = panel.fala ? people[panel.fala.quem] : undefined;
  const label = [panel.legenda, panel.fala && speaker ? `Fala: “${panel.fala.texto}”` : null].filter(Boolean).join(" ");

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label={`Quadro ${n}. ${label}`}>
      <defs>
        <pattern id={dots} width={6} height={6} patternUnits="userSpaceOnUse">
          <circle cx={3} cy={3} r={0.9} fill="#FFFFFF" />
        </pattern>
      </defs>
      <Scene kind={panel.cenario} dots={dots} />
      <g transform={`translate(0 ${GROUND})`}>
        {people.map((p, i) => (
          <Person key={i} c={p.c} x={p.x} faceLeft={p.faceLeft} />
        ))}
      </g>
      {panel.efeito && <Burst text={panel.efeito} x={120} y={GROUND - 120} />}
      {panel.legenda && <Caption text={panel.legenda} />}
      {panel.fala && speaker && <Bubble text={panel.fala.texto} speakerX={speaker.x + (speaker.faceLeft ? -4 : 4)} top={capH + 2} />}
      <rect x={1} y={1} width={W - 2} height={H - 2} fill="none" stroke={INK} strokeWidth={3} />
    </svg>
  );
}

/** Tirinha de 1 a 3 quadros. No celular, rola de lado; no computador, os quadros ficam lado a lado. */
export function ComicStrip({ strip, stamp }: { strip: Strip; stamp?: { text: string; tone: "erro" | "ok" | "alerta" } | null }) {
  return (
    <div className={`relative ${strip.length === 1 ? "mx-auto max-w-[440px]" : ""}`} data-testid="tirinha">
      <div className="-mx-1 flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none] sm:grid sm:overflow-visible" style={{ gridTemplateColumns: `repeat(${strip.length}, minmax(0, 1fr))` }}>
        {strip.map((p, i) => (
          <figure key={i} className={`comic-in m-0 ${strip.length === 1 ? "w-full" : "w-[82%]"} shrink-0 snap-center overflow-hidden rounded-[6px] bg-white shadow-[3px_3px_0_#1A1A1A] sm:w-auto`} style={{ animationDelay: `${i * 140}ms` }}>
            <ComicPanel panel={p} n={i + 1} />
          </figure>
        ))}
      </div>
      {strip.length > 1 && <p className="mt-1 text-center text-[12px] text-tinta-fraca sm:hidden">Arraste para ver os {strip.length} quadros</p>}
      {stamp && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span
            className={`comic-stamp rounded-[6px] border-[3px] px-3 py-1 text-center text-[15px] font-black uppercase leading-tight tracking-wide sm:text-[18px] ${
              stamp.tone === "ok" ? "border-acerto bg-white/85 text-acerto" : stamp.tone === "alerta" ? "border-[#D97706] bg-white/85 text-[#9A4A05]" : "border-[#C81E1E] bg-white/85 text-[#C81E1E]"
            }`}
            role="status"
          >
            {stamp.text}
          </span>
        </div>
      )}
    </div>
  );
}
