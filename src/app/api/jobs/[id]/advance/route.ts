import type { NextRequest } from "next/server";
import { withUser, publicJob } from "@/server/http";
import { advanceJob } from "@/server/services/trails";

// Uma etapa de IA pode levar dezenas de segundos.
export const maxDuration = 300;

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return withUser(req, async (user) => publicJob(await advanceJob(id, user.id)));
}
