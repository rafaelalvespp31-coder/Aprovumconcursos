import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/server/auth";
import { createAdminClient } from "@/server/supabase";
import { escolherQuadro, type SecaoAula } from "@/domain/mentor/catalogo-lousa";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "no-store" };
const KINDS = ["esquema", "quadro_comparativo", "comparacao", "exemplos", "aplicacao"];

/** GET ?lessonId&pedido&largo → quadro pronto montado das seções catalogadas da aula (tabelas, comparações e casos), sem IA. */
export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ quadro: null }, { status: 401, headers: noStore });
  const id = z.string().uuid().safeParse(req.nextUrl.searchParams.get("lessonId"));
  if (!id.success) return NextResponse.json({ quadro: null }, { headers: noStore });
  const pedido = (req.nextUrl.searchParams.get("pedido") ?? "").slice(0, 500);
  const largo = req.nextUrl.searchParams.get("largo") === "1";
  try {
    const { data } = await createAdminClient().from("lesson_sections").select("kind, title, body_markdown").eq("lesson_id", id.data).eq("user_id", user.id).in("kind", KINDS).order("sort_order");
    return NextResponse.json({ quadro: escolherQuadro((data ?? []) as SecaoAula[], pedido, largo) }, { headers: noStore });
  } catch {
    return NextResponse.json({ quadro: null }, { headers: noStore });
  }
}
