import { notFound } from "next/navigation";
import { requireUser } from "@/server/auth";
import { carregarAnaliseDoConcurso } from "@/server/services/concurso-analise";
import { AnaliseConcurso } from "@/components/missao/analise-concurso";
import { montarPlanoDoConcursoAction } from "./actions";

export const metadata = { title: "Análise do concurso" };
export const dynamic = "force-dynamic";

/** Análise estratégica de um concurso (estrutura da prova, matérias, prioridades, rotina). O id é o do concurso do catálogo. */
export default async function AnaliseConcursoPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ voltar?: string }> }) {
  const [{ id }, { voltar }] = await Promise.all([params, searchParams]);
  await requireUser(`/analise-concurso/${id}`);
  const dados = await carregarAnaliseDoConcurso(id).catch(() => null);
  if (!dados) notFound();
  // Só caminhos do próprio app (evita redirecionar para fora).
  const destino = voltar && /^\/[A-Za-z0-9\-_/]*$/.test(voltar) ? voltar : "/painel";
  return <AnaliseConcurso dados={dados} voltar={destino} montar={montarPlanoDoConcursoAction} />;
}
