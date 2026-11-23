import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createUserClient } from "@/server/supabase";

/** Confirmação de e-mail e link de redefinição de senha (PKCE ou token_hash). */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const nextParam = url.searchParams.get("next") ?? "/painel";
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/painel";
  const supabase = await createUserClient();

  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;

  let ok = false;
  if (code) {
    ok = !(await supabase.auth.exchangeCodeForSession(code)).error;
  } else if (tokenHash && type) {
    ok = !(await supabase.auth.verifyOtp({ token_hash: tokenHash, type })).error;
  }

  // Sessão única por conta: o acesso pelo link também encerra a sessão dos outros aparelhos.
  if (ok) await supabase.auth.signOut({ scope: "others" }).catch(() => undefined);

  const to = url.clone();
  to.search = "";
  if (ok) {
    to.pathname = next;
  } else {
    to.pathname = "/entrar";
    to.searchParams.set("erro", "link");
  }
  return NextResponse.redirect(to);
}
