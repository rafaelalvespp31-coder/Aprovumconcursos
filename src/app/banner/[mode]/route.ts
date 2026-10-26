import { NextResponse, type NextRequest } from "next/server";
import { readBanner } from "@/server/services/banners";

export const runtime = "nodejs";

/** Imagem do banner da matéria (pública: é a arte do topo das aulas). */
export async function GET(req: NextRequest, ctx: { params: Promise<{ mode: string }> }) {
  const { mode } = await ctx.params;
  const b = await readBanner(mode).catch(() => null);
  if (!b) return new NextResponse("Banner não encontrado.", { status: 404 });
  const versioned = req.nextUrl.searchParams.has("v");
  return new NextResponse(new Uint8Array(b.bytes), {
    headers: {
      "Content-Type": b.mime,
      "Cache-Control": versioned ? "public, max-age=31536000, immutable" : "public, max-age=300, s-maxage=3600",
      "Last-Modified": new Date(b.updatedAt).toUTCString(),
    },
  });
}
