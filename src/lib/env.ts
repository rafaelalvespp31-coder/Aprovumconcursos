/**
 * Variáveis de ambiente. As públicas (NEXT_PUBLIC_*) vão para o navegador;
 * as de servidor só podem ser lidas em módulos `server-only`.
 */
export function publicEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return {
    supabaseUrl: url ?? "",
    supabaseAnonKey: anonKey ?? "",
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
    configured: Boolean(url && anonKey),
  };
}

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}
