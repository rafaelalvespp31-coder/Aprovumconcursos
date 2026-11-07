import { notFound } from "next/navigation";
import { requireUser } from "@/server/auth";
import { getExercise } from "@/server/services/redacao";
import { Exercicio } from "@/components/redacao/exercicio";

export const metadata = { title: "Exercício de redação" };
export const dynamic = "force-dynamic";

export default async function ExercicioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/redacao/exercicios/${id}`);
  const ex = await getExercise(user.id, id);
  if (!ex) notFound();
  return <Exercicio ex={ex} />;
}
