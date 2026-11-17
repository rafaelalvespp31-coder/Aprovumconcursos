import { NextResponse, type NextRequest } from "next/server";
import { gerarLote } from "@/server/services/lousas-topico";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Cron da Vercel (de madrugada): gera os quadros que faltam. Exige CRON_SECRET no ambiente. */
export async function GET(req: NextRequest) {
  const segredo = process.env.CRON_SECRET;
  if (!segredo || req.headers.get("authorization") !== `Bearer ${segredo}`) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  return NextResponse.json(await gerarLote(40, 270_000), { headers: { "Cache-Control": "no-store" } });
}
