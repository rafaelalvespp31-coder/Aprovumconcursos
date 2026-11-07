import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/server/auth";
import { getComparison, getEvaluation, getSubmission } from "@/server/services/redacao";
import { Relatorio } from "@/components/redacao/relatorio";
import { Acompanhar, Falhou } from "@/components/redacao/acompanhar";

export const metadata = { title: "Relatório de redação" };
export const dynamic = "force-dynamic";

export default async function RelatorioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/redacao/${id}`);
  const sub = await getSubmission(user.id, id);
  if (!sub) notFound();
  if (["rascunho"].includes(sub.status)) redirect(`/redacao/escrever?id=${sub.id}`);
  const ev = await getEvaluation(user.id, id);
  if (!ev) redirect(`/redacao/escrever?id=${sub.id}`);
  if (ev.status === "processando") return <Acompanhar etapa={ev.stage} />;
  if (ev.status === "falhou") return <Falhou id={sub.id} mensagem={ev.error} />;
  const cmp = await getComparison(user.id, id).catch(() => null);
  return <Relatorio sub={sub} ev={ev} cmp={cmp} />;
}
