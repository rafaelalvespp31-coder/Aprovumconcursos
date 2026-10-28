import Link from "next/link";
import { disciplineLabel, disciplineSlugs } from "@/ai/pedagogy";
import { parseOutline } from "@/domain/catalog/topic-group";

export interface SavedOutline {
  id: string;
  title: string;
  disciplineMode: string;
  sourceText: string;
}

/** Agrupa os planos pela matéria (na ordem das matérias; os de matéria desconhecida no fim), por título. */
export function groupOutlines<T extends { disciplineMode: string; title: string }>(outlines: readonly T[]): Array<{ mode: string; label: string; items: T[] }> {
  const order = disciplineSlugs();
  const by = new Map<string, T[]>();
  for (const o of outlines) {
    const mode = order.includes(o.disciplineMode) ? o.disciplineMode : "outra";
    by.set(mode, [...(by.get(mode) ?? []), o]);
  }
  return [...by.entries()]
    .sort(([a], [b]) => order.indexOf(a) - order.indexOf(b))
    .map(([mode, items]) => ({
      mode,
      label: mode === "outra" ? "Sem matéria definida" : (disciplineLabel(mode) ?? mode),
      items: [...items].sort((x, y) => x.title.localeCompare(y.title, "pt-BR", { numeric: true })),
    }));
}

/**
 * Planos salvos, cada um dentro da sua matéria (uma pasta por matéria, que abre e fecha), para
 * a página não virar uma lista solta e misturada.
 */
export function SavedOutlines({ outlines, base = "/admin/catalogo/plano" }: { outlines: readonly SavedOutline[]; base?: string }) {
  const groups = groupOutlines(outlines);
  return (
    <section aria-labelledby="planos">
      <h2 id="planos" className="t-h2">
        Planos salvos <span className="t-small font-normal text-tinta-fraca">({outlines.length} em {groups.length} {groups.length === 1 ? "matéria" : "matérias"})</span>
      </h2>
      <div className="mt-3 flex flex-col gap-3">
        {groups.map((g) => (
          <details key={g.mode} open className="group rounded-lg border border-linha bg-superficie" data-testid="planos-materia" data-materia={g.mode}>
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-lg px-4 py-3 hover:bg-nevoa [&::-webkit-details-marker]:hidden">
              <span className="flex items-center gap-2">
                <span aria-hidden className="inline-block text-tinta-fraca transition-transform group-open:rotate-90">
                  ▸
                </span>
                <span className="font-bold">{g.label}</span>
              </span>
              <span className="t-small text-tinta-fraca">
                {g.items.length} {g.items.length === 1 ? "plano" : "planos"}
              </span>
            </summary>
            <ul className="grid gap-3 px-4 pb-4 sm:grid-cols-2">
              {g.items.map((o) => {
                const tree = parseOutline(o.sourceText);
                const subs = tree.groups.reduce((n, x) => n + x.subtopics.length, 0);
                return (
                  <li key={o.id}>
                    <Link href={`${base}/${o.id}`} className="block h-full rounded-lg border border-linha p-4 hover:border-destaque" data-testid="plano-salvo">
                      <p className="font-semibold">{o.title}</p>
                      <p className="mt-1 t-small text-tinta-suave">
                        {tree.groups.length} tópico(s) · {subs} subtópico(s)
                      </p>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </details>
        ))}
      </div>
    </section>
  );
}
