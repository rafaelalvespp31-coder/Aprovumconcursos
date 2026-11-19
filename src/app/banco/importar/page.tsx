import { requireBankStaff } from "@/server/services/bank";
import Link from "next/link";
import { importBankUploadAction, previewBankUploadAction, smartAnalyzeAction, smartHistoryAction, saveBoardAction, smartImportAction } from "../actions";
import { DNotice } from "../ui";
import { BankUploadForm } from "./upload-form";
import { SmartImporter } from "./smart-import";

export const metadata = { title: "Cadastrar questões — Banco" };

export default async function BankImportPage({ searchParams }: { searchParams: Promise<{ modo?: string }> }) {
  const staff = await requireBankStaff();
  const modo = (await searchParams).modo === "modelo" ? "modelo" : "inteligente";
  const tab = (active: boolean) => `rounded-md px-3 py-2 text-[14px] font-semibold ${active ? "bg-white text-black" : "text-white/70 hover:bg-white/[0.08]"}`;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-1" role="tablist" aria-label="Forma de cadastro">
        <Link href="/banco/importar" className={tab(modo === "inteligente")} aria-current={modo === "inteligente" ? "page" : undefined}>Importar questões (inteligente)</Link>
        <Link href="/banco/importar?modo=modelo" className={tab(modo === "modelo")} aria-current={modo === "modelo" ? "page" : undefined}>Colar no modelo APROVUM</Link>
      </div>
      {modo === "inteligente" ? (
        staff.roles.autor ? <SmartImporter actions={{ analyze: smartAnalyzeAction, save: smartImportAction, history: smartHistoryAction, saveBoard: saveBoardAction }} /> : <DNotice tone="erro">Somente autores cadastram questões.</DNotice>
      ) : (
      <>
      <div>
        <h1 className="font-[Space_Grotesk] text-[26px] font-bold">Cadastrar questões (colar texto)</h1>
        <p className="max-w-3xl text-[14px] text-white/60">
          Cada questão vai para a matéria e o assunto informados no texto (subassuntos com “&gt;” são criados dentro da matéria). Banca, ano e concurso viram a
          prova de origem, sem link. Enunciados já cadastrados são ignorados. Ao cadastrar, as questões já vão para o site.
        </p>
      </div>
      {staff.roles.autor ? <BankUploadForm actions={{ preview: previewBankUploadAction, save: importBankUploadAction }} /> : <DNotice tone="erro">Somente autores cadastram questões.</DNotice>}
      </>
      )}
    </div>
  );
}
