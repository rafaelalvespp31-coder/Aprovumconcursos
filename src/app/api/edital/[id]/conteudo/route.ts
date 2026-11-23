import { NextResponse } from "next/server";
import { getSessionUser } from "@/server/auth";
import { listarConteudo } from "@/server/services/edital";
import { fail } from "@/server/edital-http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Matérias e tópicos já separados do edital do aluno (só do dono). */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sessão expirada. Entre novamente." }, { status: 401 });
  const { id } = await ctx.params;
  try {
    return NextResponse.json(await listarConteudo(user.id, id), { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return fail(e, "edital.conteudo.error");
  }
}
