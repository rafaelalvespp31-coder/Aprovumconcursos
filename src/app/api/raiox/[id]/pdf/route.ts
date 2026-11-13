import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/server/auth";
import { getRaioX } from "@/server/services/strategic";
import { renderRaioXPdf, type SyllabusDiscipline } from "@/server/pdf/raiox";
import { getPreparationTree } from "@/server/services/edital-view";
import { createAdminClient } from "@/server/supabase";
import { logEvent } from "@/server/observability";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Baixa o PDF do Raio-X do edital do aluno (só dele: getRaioX confere o dono da preparação). */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Raio-X não encontrado." }, { status: 404 });
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sessão expirada. Entre novamente." }, { status: 401 });
  try {
    const rx = await getRaioX(user.id, id);
    if (!rx.raiox) return NextResponse.json({ error: "O Raio-X deste concurso ainda não foi publicado." }, { status: 404 });
    const prof = await createAdminClient().from("profiles").select("display_name").eq("id", user.id).maybeSingle();
    // Conteúdo programático completo do edital do aluno (se a preparação existir; o PDF não depende disso).
    const syllabus: SyllabusDiscipline[] | undefined = await getPreparationTree(user.id, id)
      .then((t) => t.disciplines.map((x) => ({ name: x.name.trim(), topics: x.topics.map((tp) => ({ code: tp.code, depth: tp.depth, title: tp.title, hasLesson: tp.lessons.length > 0 })) })))
      .catch(() => undefined);
    const bytes = await renderRaioXPdf(rx.raiox, { student: (prof.data?.display_name as string | null) ?? null, syllabus });
    const slug = rx.raiox.exam.name.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "concurso";
    return new NextResponse(Buffer.from(bytes), {
      headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="aprovum-raio-x-${slug}.pdf"`, "Cache-Control": "private, no-store" },
    });
  } catch (e) {
    await logEvent("raiox_pdf.render_failed", { id, error: (e as Error).message });
    return NextResponse.json({ error: "Não foi possível gerar o PDF agora." }, { status: 500 });
  }
}
