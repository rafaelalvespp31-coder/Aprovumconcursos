import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/server/auth";
import { createAdminClient } from "@/server/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store" };

/**
 * Batida de presença: leve e independente das Server Actions (que formam fila e quebram com versão antiga do app).
 * POST → "estou com a plataforma aberta". POST ?sair=1 → "saí" (some da lista na hora).
 */
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return new NextResponse(null, { status: 204, headers: noStore });
  const db = createAdminClient();
  const sair = req.nextUrl.searchParams.get("sair") === "1";
  const { error } = await db.from("tatico_presence").upsert(
    { user_id: user.id, seen_at: sair ? new Date(Date.now() - 3_600_000).toISOString() : new Date().toISOString() },
    { onConflict: "user_id" },
  );
  return new NextResponse(null, { status: error ? 500 : 204, headers: noStore });
}
