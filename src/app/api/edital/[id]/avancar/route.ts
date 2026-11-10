import { NextResponse } from "next/server";
import { sameOrigin } from "@/server/http";
import { getSessionUser } from "@/server/auth";
import { advancePreparation, listEvents } from "@/server/services/edital";
import { fail } from "@/server/edital-http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Executa a próxima etapa real do processamento e devolve o estado e os eventos novos. */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "Origem não permitida." }, { status: 403 });
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sessão expirada. Entre novamente." }, { status: 401 });
  const { id } = await ctx.params;
  try {
    const after = Number(new URL(req.url).searchParams.get("depois") ?? 0) || 0;
    const prep = await advancePreparation(user.id, id);
    return NextResponse.json({ prep, events: await listEvents(user.id, id, after) }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return fail(e, "edital.advance.error");
  }
}
