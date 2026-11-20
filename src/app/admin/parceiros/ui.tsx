export const brl = (c: number) => `R$ ${(c / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

export function Flash({ ok, erro }: { ok?: string; erro?: string }) {
  if (erro) return <p role="alert" className="mt-3 rounded-md border border-red-300 bg-red-50 p-3 t-small text-red-800">{erro}</p>;
  if (ok) return <p role="status" className="mt-3 rounded-md border border-green-300 bg-green-50 p-3 t-small text-green-800">{ok}</p>;
  return null;
}

const PILL: Record<string, string> = {
  ativo: "bg-green-50 text-green-800 ring-green-200", inativo: "bg-nevoa text-tinta-fraca ring-linha",
  aprovado: "bg-green-50 text-green-800 ring-green-200", iniciado: "bg-amber-50 text-amber-800 ring-amber-200",
  recusado: "bg-red-50 text-red-800 ring-red-200", cancelado: "bg-nevoa text-tinta-fraca ring-linha", reembolsado: "bg-nevoa text-tinta-suave ring-linha",
};
/** Selo de situação (ativo, pago, recusado…). */
export function Pill({ kind, children }: { kind: string; children: React.ReactNode }) {
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 t-tiny font-bold ring-1 ring-inset ${PILL[kind] ?? PILL.cancelado}`}>{children}</span>;
}

/** Cartão de indicador: número grande, rótulo pequeno; `accent` marca o dado principal com a barra vermelha da marca. */
export function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`relative overflow-hidden rounded-xl border border-linha bg-superficie p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)] ${accent ? "before:absolute before:inset-x-0 before:top-0 before:h-[3px] before:bg-[#E10600]" : ""}`}>
      <dt className="t-tiny font-semibold uppercase tracking-wide text-tinta-fraca">{label}</dt>
      <dd className="mt-1.5 text-2xl font-extrabold tabular-nums tracking-tight">{value}</dd>
    </div>
  );
}

/** Cabeçalho de página do admin. */
export function PageHead({ title, sub, children }: { title: string; sub?: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="t-tiny font-bold uppercase tracking-[0.16em] text-destaque">Vendas e crescimento</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight">{title}</h1>
        {sub ? <p className="mt-1.5 max-w-2xl t-small text-tinta-suave">{sub}</p> : null}
      </div>
      {children}
    </div>
  );
}
