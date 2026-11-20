import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { sameOrigin } from "@/server/http";
import { getSessionUser } from "@/server/auth";
import { createAdminClient } from "@/server/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const posSchema = z.object({
  page: z.string().regex(/^[a-z0-9-]{1,40}$/),
  seen: z.array(z.string().max(64)).max(400),
  scroll: z.number().int().min(0).max(500_000),
});

/**
 * Grava onde o aluno parou. É uma rota comum (e não uma ação de servidor) de propósito: as ações do Next.js
 * entram numa fila única — uma gravação lenta atrasaria a navegação e as respostas das questões — e a rota
 * também funciona com `keepalive` ao fechar a aba.
 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(req)) return NextResponse.json({ ok: false }, { status: 403 });
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ ok: false }, { status: 400 });
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });
  let body: unknown;
  try {
    body = JSON.parse(await req.text());
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const parsed = posSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });
  const { error } = await createAdminClient()
    .from("learning_progress")
    .update({ reading_pos: { ...parsed.data, at: Date.now() } })
    .eq("user_id", user.id)
    .eq("lesson_id", id);
  return NextResponse.json({ ok: !error }, { headers: { "Cache-Control": "no-store" } });
}
