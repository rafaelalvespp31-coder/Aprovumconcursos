import { notFound } from "next/navigation";
import { requireUser } from "@/server/auth";
import { getPreparationTree } from "@/server/services/edital-view";
import { MeuConcurso } from "@/components/aprovum-ai/meu-concurso";
import { updateInfoAction } from "./actions";

export const metadata = { title: "Meu Concurso" };
export const dynamic = "force-dynamic";

export default async function MeuConcursoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/meu-concurso/${id}`);
  const tree = await getPreparationTree(user.id, id).catch(() => null);
  if (!tree) notFound();
  return <MeuConcurso tree={tree} save={updateInfoAction.bind(null, id)} />;
}
