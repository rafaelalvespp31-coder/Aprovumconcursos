import type { NextRequest } from "next/server";
import { withUser } from "@/server/http";
import { requireAdmin } from "@/server/services/catalog";
import { gerarLote } from "@/server/services/lousas-topico";

export const maxDuration = 300;

/** POST { limite? } → gera os quadros dos tópicos que ainda não têm (admin). Chame de novo até "restantes" chegar a 0. */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { limite?: number };
  return withUser(req, async () => {
    await requireAdmin();
    return gerarLote(Math.min(60, Math.max(1, Math.floor(body.limite ?? 20))), 240_000);
  });
}
