import { NextResponse } from "next/server";
import { getVapid } from "@/server/services/push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Chave pública do Web Push (pública por natureza): o navegador usa para criar a inscrição. */
export async function GET() {
  try {
    return NextResponse.json({ key: (await getVapid()).publicKey }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Indisponível." }, { status: 503 });
  }
}
