import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/server/supabase";
import { caminhoContavel, diaBrasilia, ehRobo, hashVisitante } from "@/domain/visitas/visitas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const vazio = { status: 204, headers: { "Cache-Control": "no-store" } } as const;

/** Conta um visitante do site (uma vez por dia por pessoa, de forma anônima). */
export async function POST(req: NextRequest) {
  try {
    const ua = req.headers.get("user-agent");
    if (ehRobo(ua)) return new NextResponse(null, vazio);
    const { path } = (await req.json().catch(() => ({}))) as { path?: string };
    if (typeof path !== "string" || !caminhoContavel(path)) return new NextResponse(null, vazio);
    const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0]!.trim() || "0";
    const dia = diaBrasilia();
    const segredo = process.env.CRON_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "aprovum";
    await createAdminClient().rpc("registrar_visita", { p_visitante: hashVisitante(ip, ua ?? "", dia, segredo), p_dia: dia });
  } catch { /* contagem nunca atrapalha o site */ }
  return new NextResponse(null, vazio);
}
