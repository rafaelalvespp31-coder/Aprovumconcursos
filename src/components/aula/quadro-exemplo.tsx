"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import "@/components/mentor/mentor-lousa.css";
import { IconeLousa, iconeDaLousa } from "@/components/aula/icone-lousa";
import { alturaMini, Traco } from "@/components/mentor/mentor-lousa";
import { roteiroDeExemplo } from "@/domain/mentor/catalogo-lousa";
import { comandoDitado, fimDitado, linhaDitado, novoDitado } from "@/domain/mentor/ditado";

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
  const tituloQ = (roteiro ?? [])[0]?.replace(/^t[ií]tulo\s*:\s*/i, "") ?? "";
  const estreito = !!roteiro && roteiro.every((c) => /^(t[ií]tulo|armada|divis[aã]o|regra de tr[eê]s)\s*:/i.test(c));
  const linha = useMemo(() => {
    const ro = roteiro ?? roteiroDeExemplo(itens);
    if (!ro) return null;
    const e = novoDitado(largo && !estreito);
    ro.forEach((c, i) => comandoDitado(e, c, i * 0.35));
    fimDitado(e);
    return e.itens.length >= 6 ? linhaDitado(e) : null;
  }, [itens, roteiro, largo, estreito]);
  if (!linha) return <>{children}</>;
  const its = linha.rabisco ?? [];
  // enquadra no desenho: conta curta não fica perdida num quadro largo
  let mx = 0;
  for (const it of its as Array<Record<string, unknown>>) {
    const n = (k: string) => (typeof it[k] === "number" ? (it[k] as number) : 0);
    const larguraTxt = typeof it.s === "string" ? it.s.length * (n("tam") || 20) * 0.62 : 0;
    mx = Math.max(mx, n("x") + larguraTxt + (n("w") || 0), n("x1"), n("x2"), n("cx") + n("r"));
  }
  const w = estreito ? (linha.larg ?? 460) : Math.min(linha.larg ?? 1000, Math.max(380, Math.round(mx + 40)));
  return (
    <div className={estreito ? "qe qe-estreito" : "qe"} ref={ref} style={{ ["--tema" as string]: iconeDaLousa(tituloQ).cor }}>
      <div className="qe-moldura">
        <div className="qe-placa" >
          <IconeLousa titulo={tituloQ} />
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
