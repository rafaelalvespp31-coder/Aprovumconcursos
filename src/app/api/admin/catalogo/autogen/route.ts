import type { NextRequest } from "next/server";
import { withUser } from "@/server/http";
import { advanceAutogen, autogenStatus, redoPart, startAutogen } from "@/server/services/catalog-autogen";

// Cada chamada gera UMA parte da aula (uma chamada de IA).
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { action?: string; outlineId?: string; ref?: string; id?: string; step?: number };
  return withUser(req, async (user) => {
    if (body.action === "start" && body.outlineId && body.ref) return startAutogen(user, body.outlineId, body.ref);
    if (body.action === "advance" && body.id) return advanceAutogen(user, body.id);
    if (body.action === "status" && body.id) return autogenStatus(user, body.id);
    if (body.action === "redo" && body.id && typeof body.step === "number") return redoPart(user, body.id, body.step);
    return { error: "Requisição inválida." };
  });
}
