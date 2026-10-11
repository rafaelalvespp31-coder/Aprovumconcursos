"use client";

import Link from "next/link";
import { useRef, useState, type CSSProperties, type KeyboardEvent, type MouseEvent, type ReactNode } from "react";

/**
 * Card "Leveza Pastel" (porte fiel do design original): inclinação 3D, brilho que segue
 * o cursor e ondulação no clique. Diferenças em relação ao original, todas de acessibilidade:
 *  - com `href` vira um link de verdade; com `onActivate`, um botão acessível por teclado;
 *  - sem nenhum dos dois, é só um contêiner (sem cursor de clique);
 *  - a inclinação é desligada para quem pediu menos movimento.
 */
export function PastelCard({
  children,
  className = "",
  href,
  onActivate,
  label,
  delay = 0,
  noTilt = false,
  style = {},
  glowColor = "225,6,0",
  testId,
}: {
  children: ReactNode;
  className?: string;
  href?: string;
  onActivate?: () => void;
  /** Nome acessível quando o card inteiro é clicável. */
  label?: string;
  delay?: number;
  noTilt?: boolean;
  style?: CSSProperties;
  glowColor?: string;
  testId?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [glow, setGlow] = useState({ x: 50, y: 50 });
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [hover, setHover] = useState(false);
  const [ripples, setRipples] = useState<Array<{ x: number; y: number; id: number }>>([]);
  const reduced = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const interactive = !!href || !!onActivate;

  const onMove = (e: MouseEvent) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    setGlow({ x: (x / r.width) * 100, y: (y / r.height) * 100 });
    if (!noTilt && !reduced) setTilt({ x: (r.height / 2 - y) / 18, y: (x - r.width / 2) / 18 });
  };
  const onClick = (e: MouseEvent) => {
    const r = ref.current?.getBoundingClientRect();
    if (r) {
      const id = Date.now() + Math.random();
      setRipples((list) => [...list, { x: e.clientX - r.left, y: e.clientY - r.top, id }]);
      setTimeout(() => setRipples((list) => list.filter((p) => p.id !== id)), 800);
    }
    onActivate?.();
  };
  const onKey = (e: KeyboardEvent) => {
    if (!onActivate) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onActivate();
    }
  };

  const body = (
    <div
      ref={ref}
      data-testid={testId}
      onMouseMove={onMove}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => {
        setHover(false);
        setTilt({ x: 0, y: 0 });
      }}
      onClick={interactive ? onClick : undefined}
      onKeyDown={onActivate ? onKey : undefined}
      role={onActivate && !href ? "button" : undefined}
      tabIndex={onActivate && !href ? 0 : undefined}
      aria-label={onActivate && !href ? label : undefined}
      className={`group relative rounded-[32px] bg-[#0E0E0E]/90 backdrop-blur-[22px] border border-[#222222] shadow-[0_8px_32px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.05)] overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:-translate-y-[4px] will-change-transform ${interactive ? "cursor-pointer" : ""} ${className}`}
      style={{
        transform: hover && !noTilt && !reduced ? `perspective(1200px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) translateY(-4px)` : undefined,
        boxShadow: hover ? `0 20px 60px rgba(${glowColor},0.16), 0 4px 16px rgba(${glowColor},0.10), inset 0 1px 0 rgba(255,255,255,0.05)` : undefined,
        animation: "enter 0.6s cubic-bezier(0.34,1.56,0.64,1) both",
        animationDelay: `${delay}ms`,
        ...style,
      }}
    >
      <div className="pointer-events-none absolute inset-0 rounded-[32px] border border-white/[0.06]" />
      <div className="pointer-events-none absolute inset-[1px] rounded-[31px] border border-white/[0.04]" />
      <div
        className="pointer-events-none absolute -inset-px rounded-[32px] opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{ background: `radial-gradient(500px circle at ${glow.x}% ${glow.y}%, rgba(${glowColor},0.12), transparent 45%)` }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-700 group-hover:opacity-100"
        style={{ background: `radial-gradient(800px circle at ${glow.x}% ${glow.y}%, rgba(255,255,255,0.05), transparent 35%)` }}
      />
      {ripples.map((p) => (
        <span
          key={p.id}
          className="pointer-events-none absolute h-2 w-2 animate-[ripple_0.7s_ease-out] rounded-full bg-[#FF1E1E]/20"
          style={{ left: p.x, top: p.y, transform: "translate(-50%,-50%)" }}
        />
      ))}
      <div className="relative z-10">{children}</div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} aria-label={label} className="block rounded-[32px] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#FF1E1E]">
        {body}
      </Link>
    );
  }
  return body;
}

/** Converte "#RRGGBB" em "r,g,b" para os brilhos do card. */
export function rgbOf(hex: string): string {
  return hex.replace("#", "").match(/.{2}/g)?.map((h) => parseInt(h, 16)).join(",") ?? "225,6,0";
}
