/** Rótulos de presença e de data/hora no estilo do WhatsApp (fuso de Brasília). Funções puras: `now` entra por parâmetro. */
const TZ = "America/Sao_Paulo";
const DIA_MS = 86_400_000;

const chaveDia = (ms: number) => new Date(ms).toLocaleDateString("sv-SE", { timeZone: TZ });

export function hora(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });
}

const dataBR = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { timeZone: TZ, day: "2-digit", month: "2-digit", year: "numeric" });

/** "Hoje", "Ontem" ou dd/mm/aaaa. */
export function rotuloDia(iso: string, now = Date.now()): string {
  const k = chaveDia(new Date(iso).getTime());
  if (k === chaveDia(now)) return "Hoje";
  if (k === chaveDia(now - DIA_MS)) return "Ontem";
  return dataBR(iso);
}

/** Hora (hoje), "Ontem" ou dd/mm/aaaa: a data curta da lista de conversas. */
export function dataLista(iso: string, now = Date.now()): string {
  const d = rotuloDia(iso, now);
  return d === "Hoje" ? hora(iso) : d;
}

/** "online" | "visto por último hoje às 14:32" | "visto por último ontem às 09:10" | "visto por último em 12/11/2026 às 08:00" | "offline". */
export function rotuloPresenca(p: { online: boolean; vistoEm: string | null } | null | undefined, now = Date.now()): string {
  if (p?.online) return "online";
  if (!p?.vistoEm) return "offline";
  const d = rotuloDia(p.vistoEm, now);
  return `visto por último ${d === "Hoje" ? "hoje" : d === "Ontem" ? "ontem" : `em ${d}`} às ${hora(p.vistoEm)}`;
}
