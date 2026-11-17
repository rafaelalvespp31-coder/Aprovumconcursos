import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/server/auth";
import { lousaSchema } from "@/domain/mentor/lousa";
import { abrirSalva, listarSalvas, salvarLousa } from "@/server/services/mentor-lousa";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "no-store" };

/** GET → lista das lousas que o aluno já viu; GET ?id=… → uma lousa salva (para rever na hora). */
export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sessão expirada." }, { status: 401, headers: noStore });
  const id = req.nextUrl.searchParams.get("id");
  try {
    if (id) {
      const lousa = await abrirSalva(user.id, id);
      return lousa ? NextResponse.json({ lousa }, { headers: noStore }) : NextResponse.json({ error: "Explicação não encontrada." }, { status: 404, headers: noStore });
    }
    return NextResponse.json({ salvas: await listarSalvas(user.id) }, { headers: noStore });
  } catch {
    return NextResponse.json({ salvas: [] }, { headers: noStore });
  }
}

/** POST { lousa } → salva a lousa aberta nas Ferramentas do aluno. */
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sessão expirada." }, { status: 401, headers: noStore });
  const body = (await req.json().catch(() => null)) as { lousa?: unknown } | null;
  const ok = lousaSchema.safeParse(body?.lousa);
  if (!ok.success || !ok.data.mostrar) return NextResponse.json({ error: "Lousa inválida." }, { status: 400, headers: noStore });
  const salvou = await salvarLousa(user.id, ok.data).catch(() => false);
  return salvou ? NextResponse.json({ ok: true }, { headers: noStore }) : NextResponse.json({ error: "Não foi possível salvar." }, { status: 422, headers: noStore });
}
