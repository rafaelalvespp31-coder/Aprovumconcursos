import { NextResponse, type NextRequest } from "next/server";
import { sameOrigin } from "@/server/http";
import { getSessionUser } from "@/server/auth";
import { endVoice, getVoiceStatus, startVoice } from "@/server/services/mentor-voice";
import { UserFacingError } from "@/server/services/trails";
import { logEvent } from "@/server/observability";
import { sanitizeStudyContext } from "@/domain/mentor/study-context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const lessonIdOf = (s: unknown): string | null => {
  const v = s && typeof s === "object" ? (s as { lessonId?: unknown }).lessonId : null;
  return typeof v === "string" && /^[0-9a-f-]{36}$/i.test(v) ? v : null;
};

const noStore = { "Cache-Control": "no-store" };

/** Situação do Mentor por voz para este aluno (plano e segundos que restam hoje). */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sessão expirada. Entre novamente." }, { status: 401, headers: noStore });
  try {
    return NextResponse.json({ status: await getVoiceStatus(user.id) }, { headers: noStore });
  } catch (e) {
    await logEvent("mentor.voz.status.error", { error: (e as Error).message.slice(0, 300) });
    return NextResponse.json({ error: "Não foi possível carregar o Mentor por voz." }, { status: 500, headers: noStore });
  }
}

/** { action: "start" } libera uma conversa (token efêmero); { action: "end", seconds } a encerra. */
export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "Origem não permitida." }, { status: 403 });
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sessão expirada. Entre novamente." }, { status: 401, headers: noStore });
  let body: { action?: unknown; study?: unknown; seconds?: unknown; transcript?: { student?: unknown; mentor?: unknown } };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400, headers: noStore });
  }
  try {
    if (body.action === "start") return NextResponse.json({ session: await startVoice(user.id, sanitizeStudyContext(body.study), lessonIdOf(body.study)) }, { headers: noStore });
    if (body.action === "end") return NextResponse.json(await endVoice(user.id, body.seconds, body.transcript && typeof body.transcript === "object" ? body.transcript : undefined), { headers: noStore });
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400, headers: noStore });
  } catch (e) {
    if (e instanceof UserFacingError) return NextResponse.json({ error: e.message, code: e.code }, { status: e.code === "rate_limited" ? 429 : e.code === "plan_limit" ? 403 : 400, headers: noStore });
    await logEvent("mentor.voz.error", { error: (e as Error).message.slice(0, 300) });
    return NextResponse.json({ error: "Não foi possível iniciar o Mentor por voz agora. Tente novamente." }, { status: 500, headers: noStore });
  }
}
