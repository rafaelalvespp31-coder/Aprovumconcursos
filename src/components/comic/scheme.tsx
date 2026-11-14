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
      {scheme.tipo === "calculo" && <Calc scheme={scheme} />}
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
  const max = Math.max(...scheme.marcos.map((m) => m.em), ...(scheme.faixas ?? []).map((f) => f.ate)) || 1;
  const pct = (n: number) => `${Math.min(100, (n / max) * 100)}%`;
  const label = (m: (typeof scheme.marcos)[number]) => m.data ?? (scheme.unidade ? `${m.em}` : "");
  return (
    <div>
      {/* Régua: marcos posicionados pela proporção do tempo */}
      <div className="relative mx-3 mb-2 mt-5 h-3">
        <span className="scheme-bar absolute inset-x-0 top-1/2 h-[4px] -translate-y-1/2 origin-left rounded-full bg-[#1A1A1A]" aria-hidden />
        {scheme.marcos.map((m, i) => (
          <span key={i} className="scheme-item absolute top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ left: pct(m.em), ...delay(i) }} aria-hidden>
            <span className={`block size-3.5 rounded-full border-2 border-[#1A1A1A] ${TONE[m.estado].dot}`} />
            {label(m) && <span className="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10.5px] font-black tabular-nums">{label(m)}</span>}
          </span>
        ))}
      </div>
      {scheme.faixas && scheme.faixas.length > 0 && (
        <div className="relative mx-3 mt-3 flex flex-col gap-1.5" data-testid="faixas">
          {scheme.faixas.map((f, i) => {
            const t = TONE[f.estado];
            const de = Math.min(f.de, f.ate);
            const ate = Math.max(f.de, f.ate);
            return (
              <div key={i} className="relative h-7">
                <span className={`scheme-item absolute top-0 flex h-7 items-center overflow-hidden whitespace-nowrap rounded-[8px] border-2 px-2 text-[11.5px] font-bold ${t.ring} ${t.text}`} style={{ left: pct(de), width: `max(${((ate - de) / max) * 100}%, 3.5rem)`, ...delay(i) }}>
                  {f.rotulo}
                </span>
              </div>
            );
          })}
        </div>
      )}
      <ol className="m-0 mt-3 flex list-none flex-col gap-2 p-0">
        {scheme.marcos.map((m, i) => {
          const t = TONE[m.estado];
          const head = m.data ?? (scheme.unidade ? String(m.em) : null);
          return (
            <li key={i} className={`scheme-item flex items-center gap-3 rounded-[10px] border-2 px-3 py-2 ${t.ring}`} style={delay(i)}>
              {head && (
                <span className="min-w-[4.5rem] text-[16px] font-black tabular-nums leading-none">
                  {head}
                  {!m.data && scheme.unidade && <span className="ml-1 text-[11px] font-semibold text-tinta-suave">{scheme.unidade}</span>}
                </span>
              )}
              <span className={`text-[14px] font-semibold leading-snug ${m.estado === "neutro" ? "" : t.text}`}>{m.rotulo}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/** Cálculo passo a passo: cada conta em destaque, o resultado de cada passo, o total e (opcional) a barra das partes. */
function Calc({ scheme }: { scheme: Extract<Scheme, { tipo: "calculo" }> }) {
  const sum = (scheme.barra ?? []).reduce((a, b) => a + b.valor, 0) || 1;
  return (
    <div className="flex flex-col gap-2.5">
      <ol className="m-0 flex list-none flex-col gap-2.5 p-0">
        {scheme.passos.map((p, i) => {
          const t = TONE[p.estado];
          return (
            <li key={i} className={`scheme-item rounded-[10px] border-2 px-3 py-2 ${t.ring}`} style={delay(i)}>
              <p className="m-0 flex items-center gap-2 text-[12.5px] font-bold uppercase tracking-wide text-tinta-suave">
                <span className={`flex size-5 shrink-0 items-center justify-center rounded-full border-2 border-[#1A1A1A] text-[11px] font-black ${t.dot}`} aria-hidden>{i + 1}</span>
                {p.rotulo}
              </p>
              <p className="m-0 mt-1 flex flex-wrap items-baseline gap-x-2 font-mono text-[17px] font-bold leading-snug">
                <span>{p.conta}</span>
                {p.resultado && <span className="text-[#B3261E]">= {p.resultado}</span>}
              </p>
            </li>
          );
        })}
      </ol>
      {scheme.barra && (
        <div data-testid="barra-calculo">
          <div className="flex h-8 w-full overflow-hidden rounded-[8px] border-2 border-[#1A1A1A]">
            {scheme.barra.map((b, i) => (
              <span key={i} className={`scheme-item flex items-center justify-center overflow-hidden text-[11px] font-black ${TONE[b.estado].dot}`} style={{ width: `${(b.valor / sum) * 100}%`, ...delay(i) }} title={`${b.rotulo}: ${b.valor}`}>{b.valor}</span>
            ))}
          </div>
          <ul className="m-0 mt-1.5 flex list-none flex-wrap gap-x-3 gap-y-1 p-0 text-[12px] font-semibold text-tinta-suave">
            {scheme.barra.map((b, i) => (
              <li key={i} className="flex items-center gap-1.5"><span className={`size-2.5 rounded-full border border-[#1A1A1A] ${TONE[b.estado].dot}`} aria-hidden />{b.rotulo}</li>
            ))}
          </ul>
        </div>
      )}
      {scheme.total && (
        <p className="scheme-item m-0 flex items-center justify-between gap-3 rounded-[10px] border-2 border-[#1A1A1A] bg-[#0D0E11] px-3 py-2.5 text-white shadow-[3px_3px_0_#B3261E]" style={delay(scheme.passos.length)}>
          <span className="text-[13px] font-bold uppercase tracking-wide">{scheme.total.rotulo}</span>
          <span className="font-mono text-[18px] font-black text-[#ff8a80]">{scheme.total.valor}</span>
        </p>
      )}
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
