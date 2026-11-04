import { requireUser } from "@/server/auth";
import { AreaAlunoView } from "@/components/area-aluno/area-aluno-view";

export const metadata = { title: "Área do Aluno" };

export default async function AreaDoAlunoPage() {
  await requireUser("/area-do-aluno");
  return <AreaAlunoView />;
}
