import { NextResponse } from "next/server";
import { getSessionUser, isAdmin } from "@/server/auth";
import { getAdminPendencias } from "@/server/services/admin-pendencias";

export const dynamic = "force-dynamic";

/** Pendências da equipe (só admin; conferido no servidor). Usado pelo sino do painel para atualizar sem recarregar. */
export async function GET() {
  const user = await getSessionUser();
  if (!user || !(await isAdmin())) return NextResponse.json({ error: "Acesso restrito." }, { status: 403, headers: { "Cache-Control": "no-store" } });
  return NextResponse.json(await getAdminPendencias(), { headers: { "Cache-Control": "no-store" } });
}
