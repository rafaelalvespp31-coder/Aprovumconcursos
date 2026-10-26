"use client";

import { BankUploadForm } from "@/app/banco/importar/upload-form";
import { parseBankUpload, summarizeBankUpload } from "@/domain/bank/upload";

const SUBJECTS = [
  { slug: "direito-penal", name: "Direito Penal" },
  { slug: "lingua-portuguesa", name: "Língua Portuguesa" },
];
const BOARDS = [
  { slug: "fgv", name: "FGV" },
  { slug: "cebraspe", name: "CEBRASPE" },
];

/** Upload de questões na galeria: mesmo leitor do servidor, com matérias de exemplo; nada é gravado. */
export function DemoBankUpload() {
  return (
    <BankUploadForm
      actions={{
        preview: async (form) => {
          const f = form.get("file") as File;
          if (f.name.toLowerCase().endsWith(".pdf")) return { ok: false, error: "Na galeria a prévia lê só .txt (o PDF é lido no servidor)." };
          const parsed = parseBankUpload(await f.text());
          return { ok: true, data: summarizeBankUpload(parsed, { subjects: SUBJECTS, boards: BOARDS, duplicate: [] }) };
        },
        save: async () => ({ ok: true, data: { created: 2, skipped: 0, codes: ["APV-000101", "APV-000102"] } }),
      }}
    />
  );
}
