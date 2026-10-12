import "server-only";
import { decodeHtml, extractArticles, htmlToText, LAW_SOURCES, type LawSource } from "@/domain/bank/law-text";
import { logEvent } from "../observability";

/** Cache por instância (1 h): evita baixar a mesma lei a cada pedido. */
const cache = new Map<string, { at: number; text: string }>();
const TTL = 3600_000;

async function lawText(src: LawSource): Promise<string | null> {
  const hit = cache.get(src.code);
  if (hit && Date.now() - hit.at < TTL) return hit.text;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15_000);
  try {
    const res = await fetch(src.url, { signal: ctrl.signal, headers: { "User-Agent": "APROVUM/1.0 (+banco de questões)", Accept: "text/html" }, cache: "no-store" });
    if (!res.ok) {
      await logEvent("law_text.fetch_failed", { code: src.code, status: res.status });
      return null;
    }
    const text = htmlToText(decodeHtml(new Uint8Array(await res.arrayBuffer()), res.headers.get("content-type")));
    cache.set(src.code, { at: Date.now(), text });
    return text;
  } catch (e) {
    await logEvent("law_text.fetch_failed", { code: src.code, error: (e as Error).message.slice(0, 120) });
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Texto oficial dos artigos pedidos, direto do Planalto. Null se a lei não é conhecida ou a página falhou. */
export async function officialArticles(lawCode: string, articles: readonly string[], maxChars: number) {
  const src = LAW_SOURCES[lawCode];
  if (!src || !articles.length) return null;
  const full = await lawText(src);
  if (!full) return null;
  const ex = extractArticles(full, articles, maxChars);
  if (!ex.found.length || ex.text.length < 40) return null;
  return { source: src, ...ex };
}
