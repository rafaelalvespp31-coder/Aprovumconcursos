import { NextResponse, type NextRequest } from "next/server";
import { sameOrigin } from "@/server/http";
import { getSessionUser } from "@/server/auth";
import { resolverAulaPorVoz } from "@/server/services/mentor-navegacao";
import { UserFacingError } from "@/server/services/trails";
import { logEvent } from "@/server/observability";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store" };

/** Mentor por voz: { consulta } → a aula que o aluno pediu (abre a que ele já tem ou inicia a do catálogo). */
export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "Origem não permitida." }, { status: 403 });
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sessão expirada. Entre novamente." }, { status: 401, headers: noStore });
  let body: { consulta?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400, headers: noStore });
  }
  if (typeof body.consulta !== "string") return NextResponse.json({ error: "Pedido inválido." }, { status: 400, headers: noStore });
  try {
    return NextResponse.json(await resolverAulaPorVoz(user.id, body.consulta), { headers: noStore });
  } catch (e) {
    if (e instanceof UserFacingError) return NextResponse.json({ ok: false, motivo: "limite", mensagem: e.message }, { status: e.code === "rate_limited" ? 429 : 200, headers: noStore });
    await logEvent("mentor.navegar.rota_erro", { error: (e as Error).message.slice(0, 200) });
    return NextResponse.json({ error: "Não foi possível abrir a aula agora." }, { status: 500, headers: noStore });
  }
}
