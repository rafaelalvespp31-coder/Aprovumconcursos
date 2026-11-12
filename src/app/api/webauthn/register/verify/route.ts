import type { NextRequest } from "next/server";
import { z } from "zod";
import { withUser } from "@/server/http";
import { UserFacingError } from "@/server/services/trails";
import { rpFromRequest, verifyRegistration } from "@/server/services/webauthn";

export const dynamic = "force-dynamic";

const body = z.object({ challengeId: z.string().uuid(), response: z.record(z.string(), z.unknown()), label: z.string().max(60).optional() });

export function POST(req: NextRequest) {
  return withUser(req, async (user) => {
    const parsed = body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) throw new UserFacingError("Pedido inválido.", "invalid");
    try {
      await verifyRegistration(rpFromRequest(req), user, parsed.data.challengeId, parsed.data.response, parsed.data.label ?? "Este aparelho");
    } catch (e) {
      throw new UserFacingError((e as Error).message, "invalid");
    }
    return { ok: true };
  });
}
