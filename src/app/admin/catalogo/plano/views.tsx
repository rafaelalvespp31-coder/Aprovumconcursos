import Link from "next/link";
import { listOutlinesWithTotals } from "@/server/services/outlines";
import { createOutlineAction } from "../actions";
import { OutlineForm } from "./outline-form";
import { SavedOutlines } from "./saved-outlines";

/** Plano de tópicos (lista + novo plano). Mesma tela para o administrador (`base` = /admin/catalogo) e o sócio liberado (/business/catalogo). */
export async function PlanListView({ base, admin }: { base: string; admin: boolean }) {
  const outlines = await listOutlinesWithTotals();
  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link href={admin ? "/admin/catalogo" : "/business"} className="t-small text-destaque underline underline-offset-2">{admin ? "Catálogo" : "APROVUM BUSINESS"}</Link>
        <h1 className="mt-1 t-h1">Plano de tópicos</h1>
        <p className="mt-1 max-w-3xl t-small text-tinta-suave">
          Cole o sumário do edital e o sistema separa tudo: cada <strong>tópico</strong> (4. Ilicitude) vira uma pasta, cada <strong>subtópico</strong> (4.1) vira uma aula e cada{" "}
          <strong>item</strong> (4.1.1) vira um módulo da aula. Depois é só copiar o comando pronto de cada subtópico, colar na IA e catalogar: a aula entra no tópico sozinha.
        </p>
      </div>

      {outlines.some((o) => (o.totals.duplicados ?? 0) > 0) && (
        <section role="alert" className="dup-center" data-testid="aviso-duplicados-lista">
          <div className="dup-head">
            <span className="dup-siren" aria-hidden>⚠</span>
            <div className="min-w-0">
              <h2>HÁ AULAS DUPLICADAS NOS PLANOS</h2>
              <p>Abra o plano marcado para ver exatamente quais aulas, subtópicos e tópicos estão repetidos.</p>
            </div>
            <span className="dup-total">{outlines.reduce((a, o) => a + (o.totals.duplicados ?? 0), 0)}</span>
          </div>
          <div className="dup-blk">
            <ul>
              {outlines.filter((o) => (o.totals.duplicados ?? 0) > 0).map((o) => (
                <li key={o.id}>
                  <p className="dup-tt"><Link href={`${base}/plano/${o.id}#duplicados`}>{o.title}</Link><small>{o.totals.duplicados} subtópico{o.totals.duplicados === 1 ? "" : "s"} com aula duplicada</small></p>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {outlines.length > 0 && <SavedOutlines outlines={outlines} base={`${base}/plano`} />}

      <section aria-labelledby="novo-plano" className="rounded-lg border border-linha p-5">
        <h2 id="novo-plano" className="t-h2">Novo plano</h2>
        <div className="mt-3">
          <OutlineForm submit={createOutlineAction} submitLabel="Salvar plano e ver os comandos" />
        </div>
      </section>
    </div>
  );
}
