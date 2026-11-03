import { NextResponse } from "next/server";
import fixture from "../../../../tests/fixtures/mind-map-homicidio-completo.json";
import { buildMindMap } from "@/domain/content/mind-map";
import { renderMindMapPdf } from "@/server/pdf/mind-map";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Galeria: mapa mental de EXEMPLO (aula de homicídio do catálogo). Bloqueado em produção. */
export async function GET() {
  if (process.env.NODE_ENV === "production" && process.env.ENABLE_DESIGN_GALLERY !== "1") return new NextResponse("Not found", { status: 404 });
  const bytes = await renderMindMapPdf(buildMindMap(fixture));
  return new NextResponse(Buffer.from(bytes), { headers: { "Content-Type": "application/pdf", "Content-Disposition": 'attachment; filename="aprovum-mapa-mental-homicidio.pdf"' } });
}
