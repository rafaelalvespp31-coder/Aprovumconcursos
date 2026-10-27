"use client";

import { OutlineForm } from "@/app/admin/catalogo/plano/outline-form";
import { parseOutline } from "@/domain/catalog/topic-group";

/** Prévia do plano de tópicos: monta a árvore ao vivo, mas não grava nada. */
export function DemoOutline() {
  return (
    <section className="rounded-lg border border-linha p-5">
      <h2 className="t-h2">Plano de tópicos (prévia)</h2>
      <div className="mt-3">
        <OutlineForm
          submitLabel="Salvar plano"
          submit={async (d) => (parseOutline(d.text).groups.length ? { ok: true, message: "Prévia: nada foi gravado." } : { ok: false, error: "Sem tópicos." })}
        />
      </div>
    </section>
  );
}
