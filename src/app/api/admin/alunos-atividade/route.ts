import { NextResponse } from "next/server";
import { getSessionUser, isAdmin } from "@/server/auth";
import { listStudentActivity } from "@/server/services/student-activity";

export const dynamic = "force-dynamic";

/** Novos cadastros e pagamentos de plano (só admin; conferido no servidor). Usado para avisar sem recarregar a página. */
export async function GET() {
  const user = await getSessionUser();
  if (!user || !(await isAdmin())) return NextResponse.json({ error: "Acesso restrito." }, { status: 403, headers: { "Cache-Control": "no-store" } });
  try {
    return NextResponse.json({ items: await listStudentActivity() }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Falha ao carregar." }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
