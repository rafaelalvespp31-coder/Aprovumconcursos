import { NextResponse } from "next/server";
import { getSessionUserFast, isAdmin } from "@/server/auth";
import { createAdminClient } from "@/server/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store" };
/** Mesmo limiar da lista do Desafio tático: batida a cada 3 s, online = última batida há menos de 12 s. */
const JANELA_MS = 12_000;

/** Alunos com a plataforma aberta agora (só admin). Contas de administrador não entram na conta. */
export async function GET() {
  const user = await getSessionUserFast();
  if (!user || !(await isAdmin())) return NextResponse.json({ error: "Acesso restrito." }, { status: 403, headers: noStore });
  const db = createAdminClient();
  const desde = new Date(Date.now() - JANELA_MS).toISOString();
  const [pres, adm] = await Promise.all([
    db.from("tatico_presence").select("user_id").gte("seen_at", desde).limit(5000),
    db.from("admin_roles").select("user_id").eq("role", "admin"),
  ]);
  if (pres.error) return NextResponse.json({ error: "Falha ao carregar." }, { status: 500, headers: noStore });
  const admins = new Set((adm.data ?? []).map((a) => a.user_id as string));
  const ids = (pres.data ?? []).map((p) => p.user_id as string).filter((id) => !admins.has(id));
  const nomes = ids.length ? await db.from("profiles").select("id, display_name").in("id", ids.slice(0, 200)) : { data: [] as Array<{ id: string; display_name: string | null }> };
  const nome = new Map((nomes.data ?? []).map((n) => [n.id as string, (n.display_name as string | null) || "Aluno"]));
  return NextResponse.json(
    { total: ids.length, alunos: ids.slice(0, 200).map((id) => nome.get(id) ?? "Aluno").sort((a, b) => a.localeCompare(b, "pt-BR")), at: new Date().toISOString() },
    { headers: noStore },
  );
}
