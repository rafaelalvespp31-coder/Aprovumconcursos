import { NextResponse, type NextRequest } from "next/server";
import { sameOrigin } from "@/server/http";
import { getSessionUserFast } from "@/server/auth";
import { taticoDesafiosDe } from "@/server/services/tatico";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store" };

/**
 * Convites do Desafio Tático para o aluno logado (consulta a cada poucos segundos, em qualquer tela).
 * Rota leve: não passa pelo proxy nem por Server Action, e identifica o aluno sem ir ao servidor de autenticação.
 */
export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.json(null, { status: 403, headers: noStore });
  const user = await getSessionUserFast();
  if (!user) return NextResponse.json(null, { status: 401, headers: noStore });
  try {
    return NextResponse.json(await taticoDesafiosDe(user.id), { headers: noStore });
  } catch {
    return NextResponse.json(null, { status: 503, headers: noStore });
  }
}
