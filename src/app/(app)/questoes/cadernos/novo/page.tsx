import Link from "next/link";
import { requireUser } from "@/server/auth";
import { notebookLookups } from "@/server/services/notebooks";
import { NewNotebookForm } from "./form";

export const metadata = { title: "Novo caderno de questões" };

export default async function NewNotebookPage() {
  await requireUser("/questoes/cadernos/novo");
  const lookups = await notebookLookups();
  return (
    <div className="flex flex-col gap-4">
      <Link href="/questoes" className="self-start text-[13px] font-semibold text-[#C8000C] underline underline-offset-2">
        ← Cadernos de Questões
      </Link>
      <NewNotebookForm lookups={lookups} base="" />
    </div>
  );
}
