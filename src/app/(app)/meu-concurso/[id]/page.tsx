import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/server/auth";
import { reanalyzeIfStale } from "@/server/services/edital";
import { getPreparationTree } from "@/server/services/edital-view";
import { getRaioX } from "@/server/services/strategic";
import { MeuConcurso, type PrepTab } from "@/components/aprovum-ai/meu-concurso";
import { RaioXView } from "@/components/aprovum-ai/raiox-view";
import { startStudyAction, updateInfoAction } from "./actions";

export const metadata = { title: "Meu Concurso" };
export const dynamic = "force-dynamic";

const TABS = new Set<PrepTab>(["visao", "aulas", "raiox", "questoes", "desempenho"]);

export default async function MeuConcursoPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ aba?: string }> }) {
  const { id } = await params;
  const { aba } = await searchParams;
  const tab: PrepTab = TABS.has(aba as PrepTab) ? (aba as PrepTab) : "visao";
  const user = await requireUser(`/meu-concurso/${id}`);
  if (await reanalyzeIfStale(user.id, id).catch(() => false)) redirect(`/aprovum-ai/${id}`);
  const tree = await getPreparationTree(user.id, id).catch(() => null);
  if (!tree) notFound();
  const rx = tab === "raiox" ? await getRaioX(user.id, id).catch(() => null) : null;
  return (
    <MeuConcurso tree={tree} save={updateInfoAction.bind(null, id)} start={startStudyAction.bind(null, id)} tab={tab}>
      {tab === "raiox" && (
        <>
          {rx?.raiox ? <RaioXView data={rx.raiox} /> : (
            <section className="ai-rx" aria-label="Raio-X">
              <h3>RAIO-X DO EDITAL</h3>
              {rx?.status === "sem_nome" ? (
                <p className="ai-sub">Não identificamos o nome do concurso neste edital. Informe o nome e o ano na aba Visão geral para o Raio-X ser preparado.</p>
              ) : (
                <p className="ai-sub">O diagnóstico estratégico{rx?.examName ? <> de <b>{rx.examName}</b></> : " deste concurso"} já foi enviado para a equipe APROVUM e está sendo preparado. Ele aparece aqui automaticamente assim que for publicado. Enquanto isso, sua preparação continua completa: estude pelas aulas do edital.</p>
              )}
            </section>
          )}
        </>
      )}
    </MeuConcurso>
  );
}
