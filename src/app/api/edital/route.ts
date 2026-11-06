import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/server/auth";
import { createPreparation, listPreparations } from "@/server/services/edital";
import { fail } from "@/server/edital-http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "no-store" };

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sessão expirada." }, { status: 401, headers: noStore });
  try {
    return NextResponse.json({ items: await listPreparations(user.id) }, { headers: noStore });
  } catch (e) {
    return fail(e, "edital.list.error");
  }
}

/** Cria a preparação e devolve o endereço assinado de envio do PDF (o arquivo não passa pelo servidor). */
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sessão expirada. Entre novamente." }, { status: 401, headers: noStore });
  try {
    const body = await req.json();
    return NextResponse.json(await createPreparation(user.id, body), { headers: noStore });
  } catch (e) {
    return fail(e, "edital.create.error");
  }
}
