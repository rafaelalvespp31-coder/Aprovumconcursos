import { requireAdmin } from "@/server/services/catalog";
import { listContestsAdmin } from "@/server/services/gamification";
import { saveContestAction } from "./actions";
import { ContestForm } from "./contest-form";

export const metadata = { title: "Próximos concursos" };
export const dynamic = "force-dynamic";

/** Catálogo de concursos mostrado na Home dos alunos ("Próximos concursos"). */
export default async function ContestsAdminPage() {
  await requireAdmin();
  const rows = await listContestsAdmin();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="t-h1">Próximos concursos</h1>
        <p className="mt-1 max-w-3xl t-small text-tinta-suave">
          Cadastre só informações com fonte. Vagas, remuneração e data ficam em branco até serem confirmadas. A contagem regressiva aparece apenas quando a data da prova está marcada como confirmada; sem confirmação, o aluno vê o aviso “informação não confirmada”.
        </p>
      </div>
      <section>
        <h2 className="t-h2 mb-2">Novo concurso</h2>
        <ContestForm contest={null} action={saveContestAction} />
      </section>
      <section className="space-y-3">
        <h2 className="t-h2">Cadastrados ({rows.length})</h2>
        {rows.length === 0 && <p className="t-small text-tinta-suave">Nenhum concurso cadastrado. A Home mostra “nenhum concurso cadastrado” até aqui ter algum.</p>}
        {rows.map((c) => <ContestForm key={c.id} contest={c} action={saveContestAction} />)}
      </section>
    </div>
  );
}
