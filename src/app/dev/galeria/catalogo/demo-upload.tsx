"use client";

import { LessonUploadForm } from "@/app/admin/catalogo/enviar/upload-form";
import { prepareLessonUpload, summarizeLessonUpload } from "@/domain/catalog/upload-preview";

/** Envio de aula na galeria: lê o .txt no navegador com o mesmo leitor do servidor; nada é gravado. */
export function DemoLessonUpload() {
  return (
    <LessonUploadForm
      actions={{
        preview: async (form) => {
          const f = form.get("file") as File;
          if (f.name.toLowerCase().endsWith(".pdf")) return { ok: false, error: "Na galeria a prévia lê só .txt (o PDF é lido no servidor)." };
          return { ok: true, preview: summarizeLessonUpload(prepareLessonUpload(await f.text())) };
        },
        save: async () => ({ ok: false, error: "Galeria de exemplo: nada é gravado." }),
      }}
    />
  );
}
