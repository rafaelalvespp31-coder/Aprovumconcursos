import { NextResponse, type NextRequest } from "next/server";
import { chaveValida, rodarAgenda } from "@/server/services/avisos-agenda";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * Agendador dos avisos automáticos no celular. Chamado de hora em hora pelo pg_cron do Supabase (e uma vez por dia pelo cron da Vercel).
 * Cada dia o sistema sorteia quais avisos saem e em que horas; aqui só se envia o que já está na hora. Exige a chave interna.
 */
export async function GET(req: NextRequest) {
  if (!(await chaveValida(req.headers.get("authorization")))) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  try {
    return NextResponse.json(await rodarAgenda(), { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return NextResponse.json({ error: String((e as Error).message).slice(0, 160) }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
