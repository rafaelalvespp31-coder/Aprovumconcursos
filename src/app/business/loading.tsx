export default function Loading() {
  return (
    <div className="bz" aria-busy="true">
      <main className="bz-conteudo">
        <p className="bz-sobre">APROVUM BUSINESS — PARTNER DASHBOARD</p>
        <div className="bz-grade mt-6">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="bz-card bz-kpi bz-esqueleto" />
          ))}
        </div>
        <span className="sr-only">Carregando indicadores…</span>
      </main>
    </div>
  );
}
