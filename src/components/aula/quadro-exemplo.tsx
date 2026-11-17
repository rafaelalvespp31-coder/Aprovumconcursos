"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import "@/components/mentor/mentor-lousa.css";
import { alturaMini, Traco } from "@/components/mentor/mentor-lousa";
import { roteiroDeExemplo } from "@/domain/mentor/catalogo-lousa";
import { comandoDitado, linhaDitado, novoDitado } from "@/domain/mentor/ditado";

/** Exemplo da aula desenhado numa lousa, como um professor faria: nasce a lápis quando entra na tela. */
export function QuadroExemplo({ itens, roteiro, children }: { itens: string[]; roteiro?: string[]; children?: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visto, setVisto] = useState(false);
  const [largo, setLargo] = useState(true);
  useEffect(() => {
    setLargo(window.innerWidth >= 760);
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") { setVisto(true); return; }
    const io = new IntersectionObserver(([e]) => { if (e?.isIntersecting) { setVisto(true); io.disconnect(); } }, { threshold: 0.25 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const linha = useMemo(() => {
    const ro = roteiro ?? roteiroDeExemplo(itens);
    if (!ro) return null;
    const e = novoDitado(largo);
    ro.forEach((c, i) => comandoDitado(e, c, i * 0.35));
    return e.itens.length >= 6 ? linhaDitado(e) : null;
  }, [itens, roteiro, largo]);
  if (!linha) return <>{children}</>;
  const w = linha.larg ?? 1000, its = linha.rabisco ?? [];
  return (
    <div className="qe" ref={ref}>
      <div className="qe-moldura">
        <div className="qe-placa">
          {visto && (
            <svg className="qe-svg" viewBox={`0 0 ${w} ${alturaMini(its, true)}`} role="img" aria-label={`Exemplo desenhado: ${itens.join("; ")}`}>
              {its.map((it, i) => <Traco key={i} it={it} d={it.d ?? 0} />)}
            </svg>
          )}
        </div>
      </div>
      {children && <details className="qe-texto"><summary>Ver o exemplo em texto</summary>{children}</details>}
    </div>
  );
}
