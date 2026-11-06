import "server-only";

/**
 * Símbolo do órgão (brasão/logo) tirado do próprio edital: a imagem do cabeçalho da 1ª página.
 * Sem IA e sem busca externa — usa só o PDF que o aluno enviou.
 * Devolve um data URL PNG pequeno (até ~160px) ou null quando não há imagem confiável.
 */
export async function extractOrgLogo(pdfBytes: Uint8Array): Promise<string | null> {
  try {
    const { getDocumentProxy, extractImages } = await import("unpdf");
    const pdf = await getDocumentProxy(pdfBytes);
    const sharp = (await import("sharp")).default;
    for (let pageNo = 1; pageNo <= Math.min(2, pdf.numPages); pageNo++) {
      const page = await pdf.getPage(pageNo);
      const [, , , pageH] = page.view as number[];
      const imgs = await extractImages(pdf, pageNo, { format: "rgba" }).catch(() => []);
      const pick = pickHeaderImage(imgs, pageH ?? 842);
      for (const img of pick) {
        const raw = sharp(Buffer.from(img.data), { raw: { width: img.width, height: img.height, channels: 4 } });
        const st = await raw.clone().stats();
        // Imagem quase uniforme (fundo, faixa, marca-d'água clara): não é símbolo.
        const spread = st.channels.slice(0, 3).reduce((n, c) => n + c.stdev, 0) / 3;
        if (spread < 8) continue;
        const png = await raw
          .trim({ threshold: 12 })
          .resize(160, 160, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 }, withoutEnlargement: true })
          .png({ compressionLevel: 9, palette: true, quality: 90 })
          .toBuffer()
          .catch(() => null);
        if (!png || png.length > 60_000) continue;
        return `data:image/png;base64,${png.toString("base64")}`;
      }
    }
    return null;
  } catch {
    return null;
  }
}

interface Img { width: number; height: number; data: Uint8Array; bounds: { x: number; y: number; width: number; height: number } }

/** Candidatas: no topo da página, de tamanho de brasão (nem ícone minúsculo, nem página inteira). Mais alta primeiro. */
export function pickHeaderImage<T extends Img>(imgs: T[], pageH: number): T[] {
  return imgs
    .filter((i) => {
      const b = i.bounds;
      if (!b || i.width < 24 || i.height < 24) return false;
      const w = Math.abs(b.width), h = Math.abs(b.height);
      if (w < 18 || h < 18 || w > 320 || h > 220) return false;
      const ratio = w / h;
      if (ratio < 0.35 || ratio > 3.2) return false;
      const top = b.y + h;
      return top >= pageH * 0.62; // terço superior da página
    })
    .sort((a, b) => {
      const ar = Math.abs(a.bounds.width / a.bounds.height), br = Math.abs(b.bounds.width / b.bounds.height);
      // Prefere formato de brasão (próximo de quadrado), depois o que está mais no alto.
      const sq = Math.abs(Math.log(ar)) - Math.abs(Math.log(br));
      if (Math.abs(sq) > 0.4) return sq;
      return b.bounds.y + b.bounds.height - (a.bounds.y + a.bounds.height);
    })
    .slice(0, 3);
}
