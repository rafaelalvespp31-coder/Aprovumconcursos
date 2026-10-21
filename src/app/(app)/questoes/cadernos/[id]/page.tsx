import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/server/auth";
import { openNotebook } from "@/server/services/notebooks";
import { NotebookView } from "./view";

export const metadata = { title: "Caderno de questões" };

export default async function NotebookPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/questoes/cadernos/${id}`);
  const data = await openNotebook(user.id, id);
  if (!data) notFound();
  return (
    <div className="flex flex-col gap-4">
      <Link href="/questoes" className="self-start text-[13px] font-semibold text-[#C8000C] underline underline-offset-2">
        ← Cadernos de Questões
      </Link>
      <NotebookView notebook={data.notebook} questions={data.questions} base="" />
    </div>
  );
}
