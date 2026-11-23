import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/server/auth";
import { carregarConteudoProgramatico } from "@/server/services/edital";
import { ConteudoProgramatico } from "@/components/missao/conteudo-programatico";
import { montarPlanoAction, refazerLeituraAction } from "./actions";

export const metadata = { title: "Conteúdo programático" };
export const dynamic = "force-dynamic";

/** Entre a leitura do edital e o plano: o conteúdo programático inteiro, matéria por matéria e tópico por tópico. */
export default async function ConteudoProgramaticoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/conteudo-programatico/${id}`);
  const c = await carregarConteudoProgramatico(user.id, id).catch(() => null);
  if (!c) notFound();
  const lendo = ["recebendo", "lendo", "identificando", "mapeando", "organizando"].includes(c.status);
  if (!lendo && !c.disciplinas.length) redirect(`/meu-concurso/${id}`);
  return <ConteudoProgramatico conteudo={c} lendo={lendo} especialista={!!process.env.GEMINI_API_KEY?.trim()} montar={montarPlanoAction} refazer={refazerLeituraAction} />;
}
