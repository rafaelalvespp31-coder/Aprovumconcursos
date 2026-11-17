import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/server/auth";
import { createAdminClient } from "@/server/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "no-store" };
const ms = z.number().int().min(0).max(300_000).nullable();
const schema = z.object({ modo: z.enum(["texto", "ditado"]), largo: z.boolean(), ms_texto: ms, ms_traco: ms, ms_fim: ms });

/** POST → guarda quanto tempo o quadro levou (pedido → 1ª fala → 1º traço). Só números, nada do conteúdo. */
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401, headers: noStore });
  const ok = schema.safeParse(await req.json().catch(() => null));
  if (!ok.success) return NextResponse.json({ ok: false }, { status: 400, headers: noStore });
  const { error } = await createAdminClient().from("mentor_lousa_tempos").insert({ user_id: user.id, ...ok.data });
  return NextResponse.json({ ok: !error }, { headers: noStore });
}
