import "@/components/meus-editais/meus-editais.css";

/** Esqueleto de "Meus Editais" enquanto os dados reais chegam. */
export default function Loading() {
  return (
    <div className="me-root" role="status" aria-label="Carregando seus editais">
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr .8fr", gap: 16, alignItems: "center", minHeight: 220 }}>
        <div style={{ display: "grid", gap: 12 }}>
          <div className="me-sk" style={{ width: 150, height: 32, borderRadius: 999 }} />
          <div className="me-sk" style={{ width: "95%", height: 36 }} />
          <div className="me-sk" style={{ width: "70%", height: 36 }} />
          <div className="me-sk" style={{ width: "85%", height: 16 }} />
          <div className="me-sk" style={{ width: 190, height: 46, borderRadius: 999 }} />
        </div>
        <div className="me-sk" style={{ aspectRatio: "1", borderRadius: "50%", maxWidth: 260, justifySelf: "center", width: "100%" }} />
      </div>
      <div className="me-sk" style={{ height: 84, borderRadius: 14 }} />
      {[0, 1, 2].map((i) => (
        <div key={i} className="me-sk" style={{ height: 170, borderRadius: 16, opacity: 1 - i * 0.2 }} />
      ))}
      <span className="sr-only">Carregando…</span>
    </div>
  );
}
