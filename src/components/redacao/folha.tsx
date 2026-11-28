"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/** Altura de cada linha da folha digital (px). Texto e numeração usam o mesmo valor para ficarem alinhados. */
export const LINHA_PX = 28;

/**
 * Folha digital: margem com numeração de linhas + pautas. A numeração acompanha as linhas VISUAIS do texto
 * (o que quebra de linha na largura atual); NÃO é a contagem oficial de nenhuma prova.
 */
export function Folha({ children, minLinhas = 20, testId }: { children: ReactNode; minLinhas?: number; testId?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [n, setN] = useState(minLinhas);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const medir = () => setN(Math.max(minLinhas, Math.round(el.getBoundingClientRect().height / LINHA_PX)));
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    return () => ro.disconnect();
  }, [minLinhas]);
  return (
    <div className="flex overflow-hidden rounded-[10px] border border-[#D9DBE0] bg-white" data-testid={testId}>
      <div aria-hidden className="select-none border-r border-[#F0C9CB] bg-[#FFF7F7] px-2 text-right text-[11px] tabular-nums text-[#B9777B]" style={{ lineHeight: `${LINHA_PX}px`, paddingTop: 8, paddingBottom: 8 }}>
        {Array.from({ length: n }, (_, i) => <div key={i}>{i + 1}</div>)}
      </div>
      <div
        className="min-w-0 flex-1 px-3"
        style={{ paddingTop: 8, paddingBottom: 8, backgroundImage: `repeating-linear-gradient(to bottom, transparent 0, transparent ${LINHA_PX - 1}px, #EEF0F3 ${LINHA_PX - 1}px, #EEF0F3 ${LINHA_PX}px)`, backgroundPositionY: 8 }}
      >
        <div ref={ref}>{children}</div>
      </div>
    </div>
  );
}
