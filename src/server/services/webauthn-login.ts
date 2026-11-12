import "server-only";
import type { NextRequest } from "next/server";
import { createAdminClient, createUserClient, SESSION_ONLY_COOKIE } from "../supabase";
import { cookies } from "next/headers";
import { getPartnerStatus } from "./partner";

export async function webauthnRateLimited(req: NextRequest): Promise<boolean> {
  const ip = (req.headers.get("x-forwarded-for")?.split(",")[0] ?? req.headers.get("x-real-ip") ?? "local").trim();
  try {
    const { data, error } = await createAdminClient().rpc("check_rate_limit", { p_key: `webauthn:${ip}`, p_window_seconds: 600, p_max: 30 });
    if (error) throw new Error(error.message);
    return data === false;
  } catch {
    return process.env.VERCEL_ENV === "production";
  }
}

/** Abre a sessão do aluno depois que a biometria foi conferida no servidor. Devolve para onde ir. */
export async function startSessionFor(userId: string, next: string | null): Promise<string | null> {
  const admin = createAdminClient();
  const { data: u } = await admin.auth.admin.getUserById(userId);
  const email = u.user?.email;
  if (!email) return null;
  const { data: link, error } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  const hash = link?.properties?.hashed_token;
  if (error || !hash) return null;
  (await cookies()).delete(SESSION_ONLY_COOKIE);
  const supabase = await createUserClient();
  const { error: vErr } = await supabase.auth.verifyOtp({ type: "email", token_hash: hash });
  if (vErr) return null;
  // Sessão única por conta, como no login por senha.
  await supabase.auth.signOut({ scope: "others" }).catch(() => undefined);
  const safe = next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : null;
  if (safe) return safe;
  return (await getPartnerStatus(userId)).isPartner ? "/business" : "/painel";
}
