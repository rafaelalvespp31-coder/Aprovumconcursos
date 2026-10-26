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

/** Cadastro de questões por texto na galeria: mesmo leitor do servidor, com matérias de exemplo; nada é gravado. */
export function DemoBankUpload() {
  return (
    <BankUploadForm
      actions={{
        preview: async (text) => ({ ok: true, data: summarizeBankUpload(parseBankUpload(text), { subjects: SUBJECTS, boards: BOARDS, duplicate: [] }) }),
        save: async () => ({ ok: true, data: { created: 2, skipped: 0, published: 2, codes: ["APV-000101", "APV-000102"] } }),
      }}
    />
  );
}
