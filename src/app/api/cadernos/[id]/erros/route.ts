import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/server/auth";
import { renderErrorNotebookPdf } from "@/server/pdf/render";
import { buildErrorNotebook } from "@/server/services/error-notebook";
import { UserFacingError } from "@/server/services/trails";
import { logEvent } from "@/server/observability";

export const runtime = "nodejs";

/**
 * Caderno de erros em PDF, gerado na hora a partir das respostas gravadas do aluno naquele
 * caderno. Só o dono do caderno consegue baixar (sessão + RLS do caderno).
 */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Caderno não encontrado." }, { status: 404 });
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sessão expirada. Entre novamente." }, { status: 401 });
  try {
    const snapshot = await buildErrorNotebook(user.id, id);
    const bytes = await renderErrorNotebookPdf(snapshot);
    const slug = snapshot.notebook.title.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "caderno";
    const day = snapshot.generatedAt.slice(0, 10);
    return new NextResponse(Buffer.from(bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="aprovum-caderno-de-erros-${slug}-${day}.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) {
    if (e instanceof UserFacingError) return NextResponse.json({ error: e.message }, { status: e.message.includes("não encontrado") ? 404 : 429 });
    await logEvent("error_pdf.render_failed", { id, error: (e as Error).message });
    return NextResponse.json({ error: "Não foi possível gerar o caderno de erros agora." }, { status: 500 });
  }
}
