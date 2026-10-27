import Link from "next/link";
import { DISCIPLINE_LABELS, type DisciplineMode } from "@/ai/pedagogy";
import { requireAdmin } from "@/server/services/catalog";
import { listOutlines } from "@/server/services/outlines";
import { parseOutline } from "@/domain/catalog/topic-group";
import { createOutlineAction } from "../actions";
import { OutlineForm } from "./outline-form";

export const metadata = { title: "Plano de tópicos" };

export default async function PlanListPage() {
  await requireAdmin();
  const outlines = await listOutlines();
  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link href="/admin/catalogo" className="t-small text-destaque underline underline-offset-2">Catálogo</Link>
        <h1 className="mt-1 t-h1">Plano de tópicos</h1>
        <p className="mt-1 max-w-3xl t-small text-tinta-suave">
          Cole o sumário do edital e o sistema separa tudo: cada <strong>tópico</strong> (4. Ilicitude) vira uma pasta, cada <strong>subtópico</strong> (4.1) vira uma aula e cada{" "}
          <strong>item</strong> (4.1.1) vira um módulo da aula. Depois é só copiar o comando pronto de cada subtópico, colar no ChatGPT e catalogar: a aula entra no tópico sozinha.
        </p>
      </div>

      {outlines.length > 0 && (
        <section aria-labelledby="planos">
          <h2 id="planos" className="t-h2">Planos salvos</h2>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {outlines.map((o) => {
              const tree = parseOutline(o.sourceText);
              const subs = tree.groups.reduce((n, g) => n + g.subtopics.length, 0);
              return (
                <li key={o.id}>
                  <Link href={`/admin/catalogo/plano/${o.id}`} className="block rounded-lg border border-linha p-4 hover:border-destaque" data-testid="plano-salvo">
                    <p className="font-semibold">{o.title}</p>
                    <p className="mt-1 t-small text-tinta-suave">
                      {DISCIPLINE_LABELS[o.disciplineMode as DisciplineMode] ?? o.disciplineMode} · {tree.groups.length} tópico(s) · {subs} subtópico(s)
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section aria-labelledby="novo-plano" className="rounded-lg border border-linha p-5">
        <h2 id="novo-plano" className="t-h2">Novo plano</h2>
        <div className="mt-3">
          <OutlineForm submit={createOutlineAction} submitLabel="Salvar plano e ver os comandos" />
        </div>
      </section>
    </div>
  );
}
