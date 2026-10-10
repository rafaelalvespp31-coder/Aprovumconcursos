import type { NextRequest } from "next/server";
import { withUser, publicJob } from "@/server/http";
import { retryJob } from "@/server/services/trails";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return withUser(req, async (user) => publicJob(await retryJob(id, user.id)));
}
