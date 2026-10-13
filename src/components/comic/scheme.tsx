import type { Scheme, StepState } from "@/domain/content/visual";

/** Esquema visual da resposta: fluxo, linha do tempo ou comparação. Anima ao aparecer. */

const TONE: Record<StepState, { dot: string; ring: string; text: string; icon: string; label: string }> = {
  ok: { dot: "bg-acerto text-white", ring: "border-acerto/50 bg-acerto-fundo", text: "text-acerto", icon: "✓", label: "certo" },
  erro: { dot: "bg-[#C81E1E] text-white", ring: "border-[#C81E1E]/50 bg-erro-fundo", text: "text-[#C81E1E]", icon: "✕", label: "errado" },
  alerta: { dot: "bg-[#D97706] text-white", ring: "border-[#D97706]/60 bg-[#FEF3C7]", text: "text-[#9A4A05]", icon: "!", label: "atenção" },
  neutro: { dot: "bg-tinta text-white", ring: "border-linha-forte bg-superficie", text: "text-tinta", icon: "", label: "" },
};

const delay = (i: number) => ({ animationDelay: `${120 + i * 160}ms` });

export function SchemeDiagram({ scheme }: { scheme: Scheme }) {
  return (
    <figure className="m-0 mt-4 rounded-[14px] border border-linha bg-papel p-4" data-testid="esquema">
      {scheme.titulo && <figcaption className="mb-3 text-[14px] font-bold">{scheme.titulo}</figcaption>}
      {scheme.tipo === "fluxo" && <Flow scheme={scheme} />}
      {scheme.tipo === "linha_tempo" && <Timeline scheme={scheme} />}
      {scheme.tipo === "comparacao" && <Compare scheme={scheme} />}
    </figure>
  );
}

function Flow({ scheme }: { scheme: Extract<Scheme, { tipo: "fluxo" }> }) {
  const all = [...scheme.passos, ...(scheme.conclusao ? [scheme.conclusao] : [])];
  return (
    <ol className="relative m-0 flex list-none flex-col gap-3 p-0">
      <span className="scheme-line absolute bottom-4 left-[15px] top-4 w-[3px] origin-top rounded-full bg-linha-forte" aria-hidden />
      {all.map((s, i) => {
        const t = TONE[s.estado];
        const last = scheme.conclusao && i === all.length - 1;
        return (
          <li key={i} className="scheme-item relative flex items-start gap-3" style={delay(i)}>
            <span className={`relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full border-2 border-[#1A1A1A] text-[13px] font-black ${t.dot}`} aria-hidden>
              {t.icon || i + 1}
            </span>
            <div className={`min-w-0 flex-1 rounded-[10px] border-2 px-3 py-2 ${last ? "border-[#1A1A1A] bg-white shadow-[3px_3px_0_#1A1A1A]" : t.ring}`}>
              <p className={`m-0 text-[14.5px] font-semibold leading-snug ${s.estado === "neutro" ? "" : t.text}`}>
                {t.label && <span className="sr-only">{t.label}: </span>}
                {s.rotulo}
              </p>
              {s.detalhe && <p className="m-0 mt-0.5 text-[13px] leading-snug text-tinta-suave">{s.detalhe}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function Timeline({ scheme }: { scheme: Extract<Scheme, { tipo: "linha_tempo" }> }) {
  const max = Math.max(...scheme.marcos.map((m) => m.em)) || 1;
  return (
    <div>
      {/* Régua (computador e celular): marcos posicionados pela proporção do prazo */}
      <div className="relative mx-3 mb-2 mt-1 h-3">
        <span className="scheme-bar absolute inset-x-0 top-1/2 h-[4px] -translate-y-1/2 origin-left rounded-full bg-[#1A1A1A]" aria-hidden />
        {scheme.marcos.map((m, i) => (
          <span
            key={i}
            className={`scheme-item absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[#1A1A1A] ${TONE[m.estado].dot}`}
            style={{ left: `${(m.em / max) * 100}%`, ...delay(i) }}
            aria-hidden
          />
        ))}
      </div>
      <ol className="m-0 mt-3 flex list-none flex-col gap-2 p-0">
        {scheme.marcos.map((m, i) => {
          const t = TONE[m.estado];
          return (
            <li key={i} className={`scheme-item flex items-center gap-3 rounded-[10px] border-2 px-3 py-2 ${t.ring}`} style={delay(i)}>
              <span className="min-w-[4.5rem] text-[18px] font-black tabular-nums leading-none">
                {m.em}
                <span className="ml-1 text-[11px] font-semibold text-tinta-suave">{scheme.unidade}</span>
              </span>
              <span className={`text-[14px] font-semibold leading-snug ${m.estado === "neutro" ? "" : t.text}`}>{m.rotulo}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function Compare({ scheme }: { scheme: Extract<Scheme, { tipo: "comparacao" }> }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {scheme.lados.map((l, i) => {
        const t = TONE[l.estado];
        return (
          <div key={i} className={`scheme-item flex flex-col rounded-[12px] border-2 border-[#1A1A1A] bg-white p-3 shadow-[3px_3px_0_#1A1A1A]`} style={delay(i)}>
            <p className="m-0 text-[14.5px] font-bold leading-snug">{l.titulo}</p>
            {l.itens.length > 0 && (
              <ul className="m-0 mt-2 flex list-none flex-col gap-1 p-0 text-[13px] leading-snug text-tinta-suave">
                {l.itens.map((it) => (
                  <li key={it} className="flex gap-1.5"><span aria-hidden>•</span>{it}</li>
                ))}
              </ul>
            )}
            <p className={`m-0 mt-auto flex items-center gap-2 rounded-[8px] border-2 px-2.5 py-1.5 pt-1.5 text-[14px] font-bold ${t.ring} ${t.text} mt-3`}>
              {t.icon && <span className={`flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] ${t.dot}`} aria-hidden>{t.icon}</span>}
              {t.label && <span className="sr-only">{t.label}: </span>}
              {l.resultado}
            </p>
          </div>
        );
      })}
    </div>
  );
}
