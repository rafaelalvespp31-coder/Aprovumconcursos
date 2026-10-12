import { requireBankStaff } from "@/server/services/bank";
import { DNotice } from "../../ui";
import { formLookups } from "../form-lookups";
import { QuestionForm } from "../question-form";
import { emptyQuestion } from "../form-state";

export const metadata = { title: "Nova questão — Banco" };

export default async function NewBankQuestionPage({ searchParams }: { searchParams: Promise<{ materia?: string }> }) {
  const staff = await requireBankStaff();
  const sp = await searchParams;
  const lookups = await formLookups();
  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-[Space_Grotesk] text-[26px] font-bold">Nova questão</h1>
      {!staff.roles.autor ? (
        <DNotice tone="erro">Somente autores cadastram questões.</DNotice>
      ) : (
        <QuestionForm id={null} initial={emptyQuestion(lookups.subjects.some((s) => s.id === sp.materia) ? sp.materia : "")} lookups={lookups} />
      )}
    </div>
  );
}
