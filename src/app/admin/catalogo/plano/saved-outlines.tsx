import Link from "next/link";
import type { CSSProperties } from "react";
import { disciplineLabel, disciplineSlugs } from "@/ai/pedagogy";
import { parseOutline } from "@/domain/catalog/topic-group";
import { disciplineColor } from "@/domain/catalog/discipline-colors";

export interface SavedOutline {
  id: string;
  title: string;
  disciplineMode: string;
  sourceText: string;
  /** Subtópicos do plano já publicados e os que faltam (sem isso, só a contagem do plano). */
  totals?: { subtopics: number; publicado: number; rascunho: number; faltam: number };
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

/** Cor sólida da matéria (uma diferente para cada), para distinguir as pastas e os cards. */
const colorOf = (mode: string) => disciplineColor(mode);

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/**
 * Planos salvos, cada um dentro da sua matéria (uma pasta colorida por matéria, que abre e fecha),
 * com quantos subtópicos já estão publicados e quantos faltam — no plano e na matéria.
 */
export function SavedOutlines({ outlines, base = "/admin/catalogo/plano" }: { outlines: readonly SavedOutline[]; base?: string }) {
  const groups = groupOutlines(outlines);
  return (
    <section aria-labelledby="planos">
      <h2 id="planos" className="t-h2">
        Planos salvos <span className="t-small font-normal text-tinta-fraca">({outlines.length} em {plural(groups.length, "matéria", "matérias")})</span>
      </h2>
      <div className="mt-3 flex flex-col gap-3">
        {groups.map((g) => {
          const color = colorOf(g.mode);
          const sum = g.items.reduce((a, o) => (o.totals ? { publicado: a.publicado + o.totals.publicado, faltam: a.faltam + o.totals.faltam } : a), { publicado: 0, faltam: 0 });
          const hasTotals = g.items.some((o) => o.totals);
          return (
            <details key={g.mode} open className="plano-materia group" style={{ "--cor": color } as CSSProperties} data-testid="planos-materia" data-materia={g.mode}>
              <summary className="plano-materia-topo">
                <span className="flex min-w-0 items-center gap-2.5">
                  <span aria-hidden className="plano-seta">▸</span>
                  <span className="plano-ponto" aria-hidden />
                  <span className="truncate font-bold">{g.label}</span>
                  <span className="t-small font-normal opacity-85">· {plural(g.items.length, "plano", "planos")}</span>
                </span>
                {hasTotals && (
                  <span className="flex shrink-0 flex-wrap items-center gap-1.5" data-testid="materia-contagem">
                    <span className="plano-pill plano-pill-ok">{plural(sum.publicado, "publicado", "publicados")}</span>
                    <span className="plano-pill plano-pill-falta">{sum.faltam} {sum.faltam === 1 ? "falta" : "faltam"}</span>
                  </span>
                )}
              </summary>
              <ul className="grid gap-3 px-4 pb-4 sm:grid-cols-2">
                {g.items.map((o) => {
                  const tree = parseOutline(o.sourceText);
                  const subs = o.totals?.subtopics ?? tree.groups.reduce((n, x) => n + x.subtopics.length, 0);
                  const t = o.totals;
                  const pct = t && t.subtopics ? Math.round((t.publicado / t.subtopics) * 100) : 0;
                  return (
                    <li key={o.id}>
                      <Link href={`${base}/${o.id}`} className="plano-card" data-testid="plano-salvo">
                        <span className="flex items-start justify-between gap-3">
                          <span className="min-w-0">
                            <span className="block font-semibold">{o.title}</span>
                            <span className="mt-0.5 block t-small opacity-85">
                              {plural(tree.groups.length, "tópico", "tópicos")} · {plural(subs, "subtópico", "subtópicos")}
                            </span>
                          </span>
                          {t && (
                            <span className="plano-contagem" data-testid="plano-contagem" aria-label={`${t.publicado} publicados e ${t.faltam} faltando de ${t.subtopics}`}>
                              <span className="plano-pill plano-pill-ok">{t.publicado} publicado{t.publicado === 1 ? "" : "s"}</span>
                              <span className="plano-pill plano-pill-falta">{t.faltam} {t.faltam === 1 ? "falta" : "faltam"}</span>
                            </span>
                          )}
                        </span>
                        {t && (
                          <span className="mt-3 block">
                            <span className="plano-barra" aria-hidden>
                              <span style={{ width: `${pct}%` }} />
                            </span>
                            <span className="mt-1 block t-tiny opacity-85">
                              {pct}% publicado{t.rascunho ? ` · ${plural(t.rascunho, "em rascunho", "em rascunho")}` : ""}
                            </span>
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </details>
          );
        })}
      </div>
    </section>
  );
}
