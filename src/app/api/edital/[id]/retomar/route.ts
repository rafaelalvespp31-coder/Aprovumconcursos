import { NextResponse } from "next/server";
import { getSessionUser } from "@/server/auth";
import { listEvents, resumePreparation } from "@/server/services/edital";
import { fail } from "@/server/edital-http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sessão expirada. Entre novamente." }, { status: 401 });
  const { id } = await ctx.params;
  try {
    const prep = await resumePreparation(user.id, id);
    return NextResponse.json({ prep, events: await listEvents(user.id, id, 0) }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return fail(e, "edital.resume.error");
  }
}
