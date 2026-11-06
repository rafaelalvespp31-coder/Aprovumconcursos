/** Símbolo do órgão: o brasão/logo do edital quando existe; senão, um selo com as iniciais do órgão. */
const SKIP = new Set(["de", "da", "do", "das", "dos", "e", "municipal", "estado", "estadual"]);

export function orgInitials(name: string): string {
  const words = name.normalize("NFD").replace(/[̀-ͯ]/g, "").split(/[^A-Za-z0-9]+/).filter(Boolean);
  const main = words.filter((w) => !SKIP.has(w.toLowerCase()));
  const pick = (main.length ? main : words).slice(0, 3);
  return pick.map((w) => (w === w.toUpperCase() && w.length <= 4 ? w : w[0]!)).join("").toUpperCase().slice(0, 4) || "?";
}

export function OrgEmblem({ logo, name, size = 52 }: { logo: string | null; name: string; size?: number }) {
  return (
    <span className="ai-emblem" style={{ width: size, height: size }} data-logo={logo ? 1 : undefined}>
      {/* eslint-disable-next-line @next/next/no-img-element -- data URL do próprio edital */}
      {logo ? <img src={logo} alt={`Símbolo de ${name}`} /> : <b aria-hidden>{orgInitials(name)}</b>}
    </span>
  );
}
