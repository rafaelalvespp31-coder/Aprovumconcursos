import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/server/auth";
import { reanalyzeIfStale } from "@/server/services/edital";
import { getPreparationTree } from "@/server/services/edital-view";
import { getRaioX } from "@/server/services/strategic";
import { MeuConcurso, type PrepTab } from "@/components/aprovum-ai/meu-concurso";
import { RaioXView } from "@/components/aprovum-ai/raiox-view";
import { chooseExamAction, updateInfoAction } from "./actions";

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
    <MeuConcurso tree={tree} save={updateInfoAction.bind(null, id)} tab={tab}>
      {tab === "raiox" && (
        <>
          {rx?.raiox ? <RaioXView data={rx.raiox} /> : (
            <section className="ai-rx" aria-label="Raio-X">
              <h3>RAIO-X DO EDITAL</h3>
              <p className="ai-sub">O diagnóstico estratégico deste concurso ainda não foi catalogado pela equipe APROVUM. Sua preparação continua completa: estude pelas aulas do edital.</p>
            </section>
          )}
          {rx && rx.choices.length > 0 && (
            <form action={chooseExamAction.bind(null, id)} className="ai-rx" aria-label="Escolher concurso do Raio-X">
              <label className="ai-rx-sel">O Raio-X não é o do seu concurso? Escolha outro catalogado
                <select name="exam" defaultValue={rx.chosenId ?? ""}>
                  <option value="">Automático (pelo nome do concurso)</option>
                  {rx.choices.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </label>
              <button className="ai-ghost" style={{ minHeight: 40 }}>Aplicar</button>
            </form>
          )}
        </>
      )}
    </MeuConcurso>
  );
}
