import { NextResponse } from "next/server";
import { getSessionUser, isAdmin } from "@/server/auth";
import { createAdminClient } from "@/server/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store" };
/** Mesma regra do contador "online agora": batida a cada 3 s, online = última batida há menos de 12 s. */
const JANELA_MS = 12_000;

/** Presença de todos os alunos para o chat da Equipe (só admin): online agora e horário real da última atividade. */
export async function GET() {
  const user = await getSessionUser();
  if (!user || !(await isAdmin())) return NextResponse.json({ error: "Acesso restrito." }, { status: 403, headers: noStore });
  const { data, error } = await createAdminClient().from("tatico_presence").select("user_id, seen_at, last_seen_at").limit(5000);
  if (error) return NextResponse.json({ error: "Falha ao carregar." }, { status: 500, headers: noStore });
  const desde = Date.now() - JANELA_MS;
  const alunos: Record<string, { online: boolean; vistoEm: string | null }> = {};
  for (const r of data ?? []) {
    alunos[r.user_id as string] = { online: new Date(r.seen_at as string).getTime() >= desde, vistoEm: (r.last_seen_at as string | null) ?? null };
  }
  return NextResponse.json({ alunos, at: new Date().toISOString() }, { headers: noStore });
}
