import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/server/auth";
import { createUserClient } from "@/server/supabase";
import { renderPostitPdf } from "@/server/pdf/postit";
import type { PostitPdfSnapshot } from "@/server/pdf/postit-types";
import { logEvent } from "@/server/observability";

export const runtime = "nodejs";

/** Baixa uma versão do "Meu PDF de Revisão". A leitura usa a sessão do aluno: a RLS garante que é dele. */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "PDF não encontrado." }, { status: 404 });
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sessão expirada. Entre novamente." }, { status: 401 });
  const db = await createUserClient();
  const { data } = await db.from("postit_pdfs").select("id, pdf_version, snapshot").eq("id", id).eq("user_id", user.id).maybeSingle();
  if (!data) return NextResponse.json({ error: "PDF não encontrado." }, { status: 404 });
  try {
    const snapshot = data.snapshot as PostitPdfSnapshot;
    const bytes = await renderPostitPdf(snapshot, { pdfVersion: data.pdf_version as number });
    const slug = snapshot.lesson.title.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "aula";
    return new NextResponse(Buffer.from(bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="aprovum-revisao-${slug}-v${data.pdf_version}.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) {
    await logEvent("postit_pdf.render_failed", { id, error: (e as Error).message });
    return NextResponse.json({ error: "Não foi possível gerar o arquivo agora." }, { status: 500 });
  }
}
