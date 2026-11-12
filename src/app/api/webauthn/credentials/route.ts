import type { NextRequest } from "next/server";
import { z } from "zod";
import { withUser } from "@/server/http";
import { UserFacingError } from "@/server/services/trails";
import { listCredentials, removeCredential } from "@/server/services/webauthn";

export const dynamic = "force-dynamic";

export function GET(req: NextRequest) {
  return withUser(req, async (user) => ({ credentials: await listCredentials(user.id) }));
}

export function DELETE(req: NextRequest) {
  return withUser(req, async (user) => {
    const parsed = z.object({ id: z.string().min(1).max(512) }).safeParse(await req.json().catch(() => null));
    if (!parsed.success) throw new UserFacingError("Pedido inválido.", "invalid");
    await removeCredential(user.id, parsed.data.id);
    return { ok: true };
  });
}
