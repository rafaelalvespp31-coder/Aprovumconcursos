/** WhatsApp do aluno: guarda só dígitos com DDI (Brasil 55 por padrão). Puro. */
export function normalizeWhatsapp(input: string): string | null {
  let d = input.replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.length === 10 || d.length === 11) d = `55${d}`;
  if (d.length < 12 || d.length > 15) return null;
  if (d.startsWith("55") && d.length !== 12 && d.length !== 13) return null;
  return d;
}

/** +55 (31) 99999-9999 para exibir. */
export function formatWhatsapp(d: string | null | undefined): string {
  if (!d) return "";
  if (d.startsWith("55") && (d.length === 12 || d.length === 13)) {
    const n = d.slice(4);
    return `+55 (${d.slice(2, 4)}) ${n.slice(0, n.length - 4)}-${n.slice(-4)}`;
  }
  return `+${d}`;
}
