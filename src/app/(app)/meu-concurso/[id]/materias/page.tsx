import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/server/auth";
import { reanalyzeIfStale } from "@/server/services/edital";
import { getPreparationTree } from "@/server/services/edital-view";
import { MateriasView } from "@/components/aprovum-ai/materias-view";

export const metadata = { title: "Matérias do edital" };
export const dynamic = "force-dynamic";

/** Todas as matérias do edital escolhido, com tópicos e subtópicos organizados por cor e progresso real. */
export default async function MateriasPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/meu-concurso/${id}/materias`);
  if (await reanalyzeIfStale(user.id, id).catch(() => false)) redirect(`/aprovum-ai/${id}`);
  const tree = await getPreparationTree(user.id, id).catch(() => null);
  if (!tree) notFound();
  if (tree.prep.status !== "concluido") redirect(`/aprovum-ai/${id}`);
  return <MateriasView tree={tree} />;
}
