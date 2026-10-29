/** Endereço oficial do APROVUM: todo link de e-mail e todo acesso de produção vão para ele. */
export const CANONICAL_URL = "https://aprovumconcursos.com.br";
export const CANONICAL_HOST = "aprovumconcursos.com.br";

const fold = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !["de", "da", "do", "das", "dos", "e"].includes(w));

/**
 * O nome digitado na recuperação confere com o nome da conta? Sem diferença de acento ou
 * maiúscula; vale o nome completo ou o primeiro e o último nome. Nome vazio na conta nunca confere.
 */
export function nameMatches(typed: string, stored: string | null | undefined): boolean {
  const a = fold(typed);
  const b = fold(stored ?? "");
  if (!a.length || !b.length) return false;
  if (a.join(" ") === b.join(" ")) return true;
  if (a.length < 2) return a.length === 1 && b.length === 1 && a[0] === b[0];
  return a[0] === b[0] && a[a.length - 1] === b[b.length - 1];
}

/** Para onde redirecionar um acesso de produção que não chegou pelo endereço oficial (null = não redireciona). */
export function canonicalRedirect(host: string | null, vercelEnv: string | undefined): string | null {
  if (vercelEnv !== "production" || !host) return null;
  const h = host.toLowerCase().split(":")[0]!;
  return h === CANONICAL_HOST ? null : CANONICAL_URL;
}
