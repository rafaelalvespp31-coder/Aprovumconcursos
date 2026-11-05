"use client";

import { useRef, useState } from "react";

/**
 * Imagem do banner com um corte opcional no topo (em % da altura). Serve para tirar da arte
 * algo que veio "assado" na imagem (um menu, por exemplo) sem refazer o arquivo e sem deixar
 * espaço em branco: a caixa encolhe junto com o corte, qualquer que seja a proporção da imagem.
 */
export function TrimmedImg({ src, trim = 0, className, width, height, testId }: { src: string; trim?: number | null; className?: string; width: number; height: number; testId?: string }) {
  const t = Math.min(40, Math.max(0, trim ?? 0));
  const [ratio, setRatio] = useState(width / height);
  const ref = useRef<HTMLImageElement>(null);
  const measure = (el: HTMLImageElement) => el.naturalWidth > 0 && setRatio(el.naturalWidth / el.naturalHeight);
  return (
    <div className="dp-trim" style={t > 0 ? { aspectRatio: `${ratio} / ${1 - t / 100}`, overflow: "hidden" } : undefined}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={(el) => {
          (ref as { current: HTMLImageElement | null }).current = el;
          if (el?.complete) measure(el);
        }}
        className={className}
        src={src}
        alt=""
        width={width}
        height={height}
        data-testid={testId}
        onLoad={(e) => measure(e.currentTarget)}
        style={t > 0 ? { transform: `translateY(-${t}%)` } : undefined}
      />
    </div>
  );
}
