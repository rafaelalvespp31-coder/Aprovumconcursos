import { NextResponse } from "next/server";
import { sameOrigin } from "@/server/http";
import { getSessionUser } from "@/server/auth";
import { listEvents, submitManualContent } from "@/server/services/edital";
import { fail } from "@/server/edital-http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Conferência manual: o aluno cola o conteúdo programático quando a leitura automática não bastou. */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "Origem não permitida." }, { status: 403 });
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sessão expirada. Entre novamente." }, { status: 401 });
  const { id } = await ctx.params;
  try {
    const body = (await req.json()) as { text?: unknown };
    const prep = await submitManualContent(user.id, id, body.text);
    return NextResponse.json({ prep, events: await listEvents(user.id, id, 0) }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return fail(e, "edital.manual.error");
  }
}
