import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/server/auth";
import { createUserClient } from "@/server/supabase";
import { getTrailPlan } from "@/server/queries";
import { catalogModulesByTitle } from "@/server/services/catalog";
import { buildMindMap } from "@/domain/content/mind-map";
import { renderMindMapPdf } from "@/server/pdf/mind-map";
import { normalizeText } from "@/domain/catalog/match";
import { disciplineLabel } from "@/ai/pedagogy";
import { ensureDisciplines } from "@/server/services/disciplines";
import { logEvent } from "@/server/observability";

export const runtime = "nodejs";

/**
 * Mapa mental da aula (PDF). Mesma liberação do PDF do conteúdo: todas as unidades aprovadas
 * nos três níveis. A leitura usa a sessão do aluno: a RLS garante que a aula é dele.
 */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Aula não encontrada." }, { status: 404 });
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sessão expirada. Entre novamente." }, { status: 401 });
  const db = await createUserClient();
  const { data: lesson } = await db.from("lessons").select("id, title, trail_id, catalog_topic_id, study_trails(discipline_mode, scope_summary)").eq("id", id).maybeSingle();
  if (!lesson) return NextResponse.json({ error: "Aula não encontrada." }, { status: 404 });

  const plan = await getTrailPlan(lesson.trail_id as string);
  const units = plan.flatMap((m) => m.lessons);
  if (!units.length || units.some((u) => u.levelsPassed < 3))
    return NextResponse.json({ error: "O mapa mental é liberado depois que você concluir todos os módulos e níveis desta aula." }, { status: 403 });

  try {
    await ensureDisciplines();
    const [{ data: sections }, modules] = await Promise.all([
      db.from("lesson_sections").select("kind, title, body_markdown").eq("lesson_id", id).order("sort_order"),
      lesson.catalog_topic_id ? catalogModulesByTitle(lesson.catalog_topic_id as string).catch(() => ({}) as Record<string, string>) : Promise.resolve({} as Record<string, string>),
    ]);
    const trail = lesson.study_trails as unknown as { discipline_mode: string | null; scope_summary: { subject?: string } | null } | null;
    const subject = trail?.scope_summary?.subject ?? (trail?.discipline_mode ? (disciplineLabel(trail.discipline_mode) ?? null) : null);
    const map = buildMindMap({
      title: lesson.title as string,
      subject,
      sections: (sections ?? []).map((s) => ({ kind: s.kind as string, title: s.title as string, body: (s.body_markdown as string) ?? "", module: modules[normalizeText(s.title as string)] ?? null })),
    });
    const bytes = await renderMindMapPdf(map);
    const slug = map.title.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "aula";
    return new NextResponse(Buffer.from(bytes), {
      headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="aprovum-mapa-mental-${slug}.pdf"`, "Cache-Control": "private, no-store" },
    });
  } catch (e) {
    await logEvent("mind_map.render_failed", { id, error: (e as Error).message });
    return NextResponse.json({ error: "Não foi possível gerar o mapa mental agora." }, { status: 500 });
  }
}
