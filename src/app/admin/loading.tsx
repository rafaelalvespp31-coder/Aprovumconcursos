/** Aparece na hora ao trocar de tela no admin, enquanto o servidor monta a página. */
export default function AdminLoading() {
  return (
    <div role="status" aria-label="Carregando" className="animate-pulse" data-testid="admin-carregando">
      <div className="h-3 w-32 rounded bg-linha" />
      <div className="mt-3 h-8 w-72 max-w-full rounded bg-linha" />
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[0, 1, 2, 3].map((i) => <div key={i} className="h-20 rounded-xl border border-linha bg-superficie" />)}
      </div>
      <div className="mt-6 h-64 rounded-xl border border-linha bg-superficie" />
      <span className="sr-only">Carregando…</span>
    </div>
  );
}
