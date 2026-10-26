"use client";

import { LessonUploadForm } from "@/app/admin/catalogo/enviar/upload-form";
import { prepareLessonUpload, summarizeLessonUpload } from "@/domain/catalog/upload-preview";

/** Catalogação por texto na galeria: mesmo leitor do servidor, rodando no navegador; nada é gravado. */
export function DemoLessonUpload() {
  return (
    <LessonUploadForm
      parts={{ part1: "Comando de exemplo · parte 1 (a aula).", part2: "Comando de exemplo · parte 2 (as questões)." }}
      actions={{
        preview: async (text) => ({ ok: true, preview: summarizeLessonUpload(prepareLessonUpload(text)) }),
        save: async () => ({ ok: false, error: "Galeria de exemplo: nada é gravado." }),
      }}
    />
  );
}
