import "server-only";
import { pdfToText } from "./pdf-text";
import { UserFacingError } from "./services/trails";

/** Arquivo enviado no painel: .txt (UTF-8 ou Latin-1) ou PDF com texto selecionável. */
export const MAX_UPLOAD_BYTES = 4_000_000;

/** Lê o arquivo enviado (.txt ou .pdf com texto) e devolve o texto. */
export async function uploadedText(file: File): Promise<{ text: string; pdf: boolean; name: string; size: number }> {
  if (!file || typeof file.arrayBuffer !== "function" || file.size === 0) throw new UserFacingError("Escolha um arquivo .txt ou .pdf.", "invalid_input");
  if (file.size > MAX_UPLOAD_BYTES) throw new UserFacingError("Arquivo grande demais (máximo 4 MB).", "invalid_input");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const name = file.name.toLowerCase();
  const isPdf = name.endsWith(".pdf") || file.type === "application/pdf" || (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46);
  if (isPdf) {
    let text = "";
    try {
      text = await pdfToText(bytes);
    } catch {
      throw new UserFacingError("Não consegui ler esse PDF. Exporte de novo (com texto selecionável) ou envie o .txt.", "invalid_input");
    }
    if (text.replace(/\s/g, "").length < 20) throw new UserFacingError("Esse PDF não tem texto selecionável (parece escaneado). Envie o .txt ou um PDF exportado do editor.", "invalid_input");
    return { text, pdf: true, name: file.name, size: file.size };
  }
  if (!/\.(txt|text|md)$/.test(name) && !file.type.startsWith("text/")) throw new UserFacingError("Formato não aceito: envie .txt (bloco de notas) ou .pdf.", "invalid_input");
  // Bloco de notas antigo pode salvar em Latin-1: se não for UTF-8 válido, tenta windows-1252.
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes).replace(/^\uFEFF/, "");
  } catch {
    text = new TextDecoder("windows-1252").decode(bytes);
  }
  return { text, pdf: false, name: file.name, size: file.size };
}
