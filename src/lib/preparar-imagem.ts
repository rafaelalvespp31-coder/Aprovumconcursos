"use client";

const MAX_LADO = 1600;

/** Reduz a foto/print (lado maior 1600 px, JPEG) para caber no envio e abrir rápido para a Equipe. */
export async function prepararImagem(file: File): Promise<Blob> {
  if (file.size <= 600 * 1024 && /^image\/(jpeg|png|webp)$/.test(file.type)) return file;
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, MAX_LADO / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(bmp.width * k));
  c.height = Math.max(1, Math.round(bmp.height * k));
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("sem canvas");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(bmp, 0, 0, c.width, c.height);
  bmp.close?.();
  const blob = await new Promise<Blob | null>((r) => c.toBlob(r, "image/jpeg", 0.82));
  if (!blob) throw new Error("falha ao converter");
  return blob;
}
