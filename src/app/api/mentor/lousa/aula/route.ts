import { after, NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/server/auth";
import { createAdminClient } from "@/server/supabase";
import { escolherQuadro, type QuadroGuardado, type SecaoAula } from "@/domain/mentor/catalogo-lousa";
import { gerarParaTopico } from "@/server/services/lousas-topico";

const tentados = new Set<string>(); // gera no máximo uma vez por instância (evita repetir a chamada de IA quando falha)

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "no-store" };

/** GET ?lessonId&pedido&largo → quadro pronto montado das seções catalogadas da aula (tabelas, comparações e casos), sem IA. */
export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ quadro: null }, { status: 401, headers: noStore });
  const id = z.string().uuid().safeParse(req.nextUrl.searchParams.get("lessonId"));
  if (!id.success) return NextResponse.json({ quadro: null }, { headers: noStore });
  const pedido = (req.nextUrl.searchParams.get("pedido") ?? "").slice(0, 500);
  const largo = req.nextUrl.searchParams.get("largo") === "1";
  try {
    const db = createAdminClient();
    const [{ data }, { data: aula }] = await Promise.all([
      db.from("lesson_sections").select("kind, title, body_markdown").eq("lesson_id", id.data).eq("user_id", user.id).order("sort_order"),
      db.from("lessons").select("catalog_topic_id").eq("id", id.data).eq("user_id", user.id).maybeSingle(),
    ]);
    const topicId = (aula?.catalog_topic_id as string | null) ?? null;
    let guardados: QuadroGuardado[] = [];
    if (topicId) {
      const { data: g } = await db.from("mentor_lousas_topico").select("tipo, titulo, gatilhos, roteiro").eq("catalog_topic_id", topicId).order("ordem");
      guardados = (g ?? []) as QuadroGuardado[];
      if (!guardados.length && !tentados.has(topicId)) { tentados.add(topicId); after(() => gerarParaTopico(topicId).catch(() => undefined)); } // o próximo aluno já abre na hora
    }
    return NextResponse.json({ quadro: escolherQuadro((data ?? []) as SecaoAula[], pedido, largo, guardados) }, { headers: noStore });
  } catch {
    return NextResponse.json({ quadro: null }, { headers: noStore });
  }
}
