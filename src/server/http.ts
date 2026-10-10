import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser, type SessionUser } from "./auth";
import { UserFacingError } from "./services/trails";
import { AIError } from "@/ai/provider";
import { logEvent } from "./observability";

/** Bloqueia requisições de outras origens (proteção CSRF para rotas POST). */
export function sameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).host === req.headers.get("host");
  } catch {
    return false;
  }
}

export async function withUser(
  req: NextRequest,
  handler: (user: SessionUser) => Promise<unknown>,
): Promise<NextResponse> {
  if (req.method !== "GET" && !sameOrigin(req)) {
    return NextResponse.json({ error: "Origem não permitida." }, { status: 403 });
  }
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sessão expirada. Entre novamente." }, { status: 401 });
  try {
    const data = await handler(user);
    return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    if (err instanceof UserFacingError) {
      const status = err.code === "rate_limited" ? 429 : err.code === "not_found" ? 404 : 400;
      return NextResponse.json({ error: err.message, code: err.code }, { status });
    }
    if (err instanceof AIError && err.kind === "not_configured") {
      return NextResponse.json({ error: "Geração por IA indisponível: provedor não configurado." }, { status: 503 });
    }
    await logEvent("http.unhandled_error", { path: req.nextUrl.pathname, error: (err as Error).message });
    return NextResponse.json({ error: "Erro interno. Tente novamente." }, { status: 500 });
  }
}

export function publicJob(job: { id: string; kind: string; stage: string; status: string; progress: number; errorMessage: string | null; attempts: number; maxAttempts: number; trailId: string; lessonId: string | null }) {
  return {
    id: job.id,
    kind: job.kind,
    stage: job.stage,
    status: job.status,
    progress: job.progress,
    error: job.errorMessage,
    attempts: job.attempts,
    maxAttempts: job.maxAttempts,
    trailId: job.trailId,
    lessonId: job.lessonId,
  };
}
