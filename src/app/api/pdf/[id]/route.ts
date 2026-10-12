import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/server/auth";
import { createUserClient } from "@/server/supabase";
import { renderStudyPdf } from "@/server/pdf/render";
import type { PdfSnapshot } from "@/server/pdf/types";
import { logEvent } from "@/server/observability";

export const runtime = "nodejs";

/** Baixa um PDF já gerado. A leitura usa a sessão do aluno: a RLS garante que é dele. */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "PDF não encontrado." }, { status: 404 });
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sessão expirada. Entre novamente." }, { status: 401 });
  const db = await createUserClient();
  const { data } = await db.from("study_pdfs").select("id, pdf_version, snapshot, content_hash").eq("id", id).maybeSingle();
  if (!data) return NextResponse.json({ error: "PDF não encontrado." }, { status: 404 });
  try {
    const snapshot = data.snapshot as PdfSnapshot;
    const bytes = await renderStudyPdf(snapshot, { pdfVersion: data.pdf_version as number, contentHash: data.content_hash as string });
    const slug = snapshot.content.title.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "conteudo";
    return new NextResponse(Buffer.from(bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="aprovum-${slug}-v${data.pdf_version}.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) {
    await logEvent("study_pdf.render_failed", { id, error: (e as Error).message });
    return NextResponse.json({ error: "Não foi possível gerar o arquivo agora." }, { status: 500 });
  }
}
