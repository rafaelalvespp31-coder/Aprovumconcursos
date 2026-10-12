import { EmptyState } from "@/components/ui";
import { listQueue, requireAdmin } from "@/server/services/catalog";
import { PromoteButton } from "./promote-button";

export const metadata = { title: "Fila da IA" };

export default async function QueuePage() {
  // A verificação fica também na página: layout e página renderizam em paralelo.
  await requireAdmin();
  const groups = await listQueue();
  return (
    <div>
      <h1 className="t-h1">Fila: pedidos atendidos pela IA</h1>
      <p className="mt-1 max-w-3xl text-tinta-suave">
        Temas que os alunos pediram e que ainda não estão no catálogo, do mais pedido para o menos pedido. Promover cria um rascunho com a aula e as questões geradas, para você revisar e publicar. A identidade de quem pediu não é exibida.
      </p>
      {groups.length === 0 ? (
        <div className="mt-6"><EmptyState title="Nada na fila">Quando um aluno estudar um tema fora do catálogo, ele aparece aqui.</EmptyState></div>
      ) : (
        <ul className="mt-6 divide-y divide-linha rounded-lg border border-linha">
          {groups.map((g) => (
            <li key={g.key} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="font-semibold">{g.request}</p>
                <p className="t-small text-tinta-suave">
                  {g.students} aluno(s) · {g.lessons} aula(s) gerada(s) · exemplo: “{g.sampleTitle}”{g.lastAt ? ` · ${new Date(g.lastAt).toLocaleDateString("pt-BR")}` : ""}
                </p>
              </div>
              <PromoteButton lessonId={g.sampleLessonId} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
