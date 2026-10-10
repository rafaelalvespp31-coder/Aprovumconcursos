import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { ConfigError, publicEnv } from "@/lib/env";

/**
 * Cliente com a sessão do usuário (cookies). Sujeito à RLS: só lê dados do próprio aluno.
 */
export async function createUserClient(): Promise<SupabaseClient> {
  // Ler cookies primeiro marca a rota como dinâmica (conteúdo por usuário, nunca pré-renderizado).
  const store = await cookies();
  const env = publicEnv();
  if (!env.configured) {
    throw new ConfigError("Supabase não configurado: defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.");
  }
  return createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          for (const { name, value, options } of list) store.set(name, value, options);
        } catch {
          // Chamado a partir de Server Component: a renovação de sessão é feita no proxy.
        }
      },
    },
  });
}

let admin: SupabaseClient | null = null;

/**
 * Cliente privilegiado (ignora RLS). Uso EXCLUSIVO em código de servidor que já
 * verificou o usuário autenticado e sempre filtra por `user_id`.
 * A chave nunca é exposta ao navegador (`server-only` impede importação no cliente).
 */
export function createAdminClient(): SupabaseClient {
  if (admin) return admin;
  const env = publicEnv();
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!env.supabaseUrl || !key) {
    throw new ConfigError("Supabase não configurado: defina SUPABASE_SECRET_KEY (ou SUPABASE_SERVICE_ROLE_KEY) no servidor.");
  }
  admin = createClient(env.supabaseUrl, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return admin;
}
