/**
 * Nome no card do avatar: nomes extensos viram a inicial do primeiro nome + último sobrenome
 * ("William Abreu Pereira" → "W. Pereira"). Nomes curtos ficam como estão. Puro.
 */
export function shortName(full: string, max = 16): string {
  const name = full.trim().replace(/\s+/g, " ");
  if (name.length <= max) return name;
  const parts = name.split(" ");
  if (parts.length < 2) return name.slice(0, max);
  const first = parts[0]!;
  const last = parts[parts.length - 1]!;
  return `${first[0]!.toUpperCase()}. ${last}`;
}
