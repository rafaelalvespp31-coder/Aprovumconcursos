import { NextResponse, type NextRequest } from "next/server";
import { sameOrigin } from "@/server/http";
import { getSessionUser, isAdmin } from "@/server/auth";
import { createAdminClient } from "@/server/supabase";
import { enforceRateLimit } from "@/server/services/trails";
import { logEvent } from "@/server/observability";
import { ANEXO_MAX_BYTES, detectImage } from "@/domain/equipe-anexo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** Imagem da Equipe para um aluno (só admin): confere o conteúdo real e guarda na pasta do aluno, no bucket privado. */
export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.json({ ok: false, error: "Origem inválida." }, { status: 403 });
  const user = await getSessionUser();
  if (!user || !(await isAdmin())) return NextResponse.json({ ok: false, error: "Acesso restrito." }, { status: 403 });
  try {
    await enforceRateLimit(user.id, "admin_team_upload", 60, 3600);
    const form = await req.formData();
    const file = form.get("file");
    const alvo = form.get("userId");
    if (typeof alvo !== "string" || !UUID.test(alvo)) return NextResponse.json({ ok: false, error: "Aluno inválido." }, { status: 400 });
    if (!(file instanceof File)) return NextResponse.json({ ok: false, error: "Nenhuma imagem enviada." }, { status: 400 });
    if (file.size === 0 || file.size > ANEXO_MAX_BYTES) return NextResponse.json({ ok: false, error: "A imagem deve ter até 4 MB." }, { status: 413 });
    const bytes = new Uint8Array(await file.arrayBuffer());
    const kind = detectImage(bytes);
    if (!kind) return NextResponse.json({ ok: false, error: "Envie uma imagem JPEG, PNG ou WebP." }, { status: 415 });
    const db = createAdminClient();
    const { data: u } = await db.auth.admin.getUserById(alvo);
    if (!u?.user) return NextResponse.json({ ok: false, error: "Aluno não encontrado." }, { status: 404 });
    const path = `${alvo}/${crypto.randomUUID()}.${kind.ext}`;
    const up = await db.storage.from("equipe-anexos").upload(path, bytes, { contentType: kind.mime, upsert: false });
    if (up.error) throw new Error(up.error.message);
    return NextResponse.json({ ok: true, path });
  } catch (e) {
    const msg = (e as Error).message ?? "";
    if (/limite|muitas|rate/i.test(msg)) return NextResponse.json({ ok: false, error: "Muitos envios seguidos. Tente de novo em alguns minutos." }, { status: 429 });
    await logEvent("equipe.admin_upload_failed", { error: msg });
    return NextResponse.json({ ok: false, error: "Não foi possível enviar a imagem agora." }, { status: 500 });
  }
}
