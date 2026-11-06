import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/server/auth";
import { reanalyzeIfStale } from "@/server/services/edital";
import { getPreparationTree } from "@/server/services/edital-view";
import { MeuConcurso } from "@/components/aprovum-ai/meu-concurso";
import { updateInfoAction } from "./actions";

export const metadata = { title: "Meu Concurso" };
export const dynamic = "force-dynamic";

export default async function MeuConcursoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/meu-concurso/${id}`);
  if (await reanalyzeIfStale(user.id, id).catch(() => false)) redirect(`/aprovum-ai/${id}`);
  const tree = await getPreparationTree(user.id, id).catch(() => null);
  if (!tree) notFound();
  return <MeuConcurso tree={tree} save={updateInfoAction.bind(null, id)} />;
}
