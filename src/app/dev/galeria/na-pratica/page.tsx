import { PracticeCard } from "@/components/practice-card";
import { ComicStrip } from "@/components/comic/strip";
import { SchemeDiagram } from "@/components/comic/scheme";
import { extractPractice } from "@/domain/content/practice";
import catalogo from "./catalogo.json";

/** Prévia dos cards "Na prática" do catálogo (tirinha + carimbo + esquema). ?folha=1 mostra todos lado a lado para revisão. */
export default async function Page({ searchParams }: { searchParams: Promise<{ folha?: string }> }) {
  const sp = await searchParams;
  const all = Object.entries(catalogo as Record<string, Record<string, string>>).flatMap(([slug, m]) =>
    Object.entries(m).map(([ord, md]) => ({ key: `${slug}-${ord}`, label: `${slug} · seção ${ord}`, c: extractPractice(md).cases[0]! })),
  );
  if (sp.folha) {
    return (
      <div className="grid gap-6 lg:grid-cols-2">
        {all.map(({ key, label, c }) => (
          <div key={key} className="rounded-lg border border-linha bg-superficie p-3" data-testid="folha-item">
            <p className="mb-2 text-[12px] font-semibold text-tinta-suave">{label}</p>
            {c.strip && <ComicStrip strip={c.strip} stamp={c.stamp} />}
            {c.scheme && <SchemeDiagram scheme={c.scheme} />}
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-[820px]">
      <h1 className="t-h1">Na prática — exemplos visuais</h1>
      {all.slice(0, 6).map(({ key, c }) => (
        <PracticeCard key={key} cases={[c]} />
      ))}
    </div>
  );
}
