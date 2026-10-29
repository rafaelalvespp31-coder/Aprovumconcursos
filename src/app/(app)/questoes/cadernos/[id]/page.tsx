import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/server/auth";
import { openNotebook } from "@/server/services/notebooks";
import { NotebookView } from "./view";
import { getPlanUsage } from "@/server/services/plans";

export const metadata = { title: "Caderno de questões" };

export default async function NotebookPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/questoes/cadernos/${id}`);
  const [data, usage] = await Promise.all([openNotebook(user.id, id), getPlanUsage(user.id)]);
  if (!data) notFound();
  return (
    <div className="flex flex-col gap-4">
      <Link href="/questoes" className="self-start text-[13px] font-semibold text-[#C8000C] underline underline-offset-2">
        ← Cadernos de Questões
      </Link>
      {!usage.unlimited && usage.questionsLeft !== null && (
        <p className="rounded-[12px] border border-[#E6E7EB] bg-white px-3 py-2 text-[13px] text-[#08090B]" data-testid="cota-questoes">
          Plano gratuito: {usage.questionsLeft === 1 ? "resta 1 questão" : `restam ${usage.questionsLeft} questões`} hoje.{" "}
          <Link href="/perfil#plano" className="font-semibold text-[#C8000C] underline underline-offset-2">
            Ver planos
          </Link>
        </p>
      )}
      <NotebookView notebook={data.notebook} questions={data.questions} start={data.start} base="" />
    </div>
  );
}
