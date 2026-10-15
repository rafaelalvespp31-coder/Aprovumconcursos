import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Renova a sessão do Supabase a cada requisição e protege as rotas privadas.
 * A autorização definitiva acontece no servidor (requireUser) e no banco (RLS).
 */
const PRIVATE_PREFIXES = ["/questoes", "/painel", "/trilhas", "/nova-trilha", "/aula", "/desempenho", "/perfil", "/admin", "/revisoes", "/banco", "/quiz"];

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        for (const { name, value } of list) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        // Sem "Manter conectado": cookies de sessão sem validade fixa (somem ao fechar o navegador).
        const browserOnly = request.cookies.get("aprovum_sessao")?.value === "navegador";
        for (const { name, value, options } of list) {
          const opts = browserOnly && options && !(options.maxAge !== undefined && options.maxAge <= 0) ? { ...options, maxAge: undefined, expires: undefined } : options;
          response.cookies.set(name, value, opts);
        }
      },
    },
  });

  const { data } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;
  if (!data.user && PRIVATE_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`))) {
    const to = request.nextUrl.clone();
    to.pathname = "/entrar";
    to.search = `?next=${encodeURIComponent(path)}`;
    return NextResponse.redirect(to);
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icons/|sw.js|manifest.webmanifest|offline).*)"],
};
