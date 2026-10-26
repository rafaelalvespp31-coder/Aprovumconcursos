import { requireBankStaff } from "@/server/services/bank";
import { importBankUploadAction, previewBankUploadAction } from "../actions";
import { DNotice } from "../ui";
import { BankUploadForm } from "./upload-form";

export const metadata = { title: "Enviar questões — Banco" };

export default async function BankImportPage() {
  const staff = await requireBankStaff();
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-[Space_Grotesk] text-[26px] font-bold">Enviar questões (PDF ou bloco de notas)</h1>
        <p className="max-w-3xl text-[14px] text-white/60">
          Cada questão vai para a matéria e o assunto informados no arquivo (subassuntos com “&gt;” são criados dentro da matéria). Banca, ano e concurso viram a
          prova de origem, sem link. Enunciados já cadastrados são ignorados.
        </p>
        <p className="mt-2 text-[14px]">
          <a href="/modelos/modelo-questoes.txt" download className="font-semibold text-[#ff6b6b] underline underline-offset-2">Baixar o modelo de questões (.txt)</a>
        </p>
      </div>
      {staff.roles.autor ? <BankUploadForm actions={{ preview: previewBankUploadAction, save: importBankUploadAction }} /> : <DNotice tone="erro">Somente autores cadastram questões.</DNotice>}
    </div>
  );
}
