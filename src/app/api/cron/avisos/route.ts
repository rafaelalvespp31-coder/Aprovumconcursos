import { NextResponse, type NextRequest } from "next/server";
import { enviarAvisoDiarioConcursos } from "@/server/services/concursos-aviso";
import { enviarLembreteRevisoes } from "@/server/services/revisoes-aviso";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

/** Cron da Vercel (8h em Brasília): lembrete de revisões e aviso diário de concursos abertos/previstos. Exige CRON_SECRET. */
export async function GET(req: NextRequest) {
  const segredo = process.env.CRON_SECRET;
  if (!segredo || req.headers.get("authorization") !== `Bearer ${segredo}`) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const [revisoes, concursos] = await Promise.all([
    enviarLembreteRevisoes().catch((e) => ({ erro: String((e as Error).message).slice(0, 120) })),
    enviarAvisoDiarioConcursos().catch((e) => ({ erro: String((e as Error).message).slice(0, 120) })),
  ]);
  return NextResponse.json({ revisoes, concursos }, { headers: { "Cache-Control": "no-store" } });
}
