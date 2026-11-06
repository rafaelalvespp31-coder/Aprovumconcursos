import { EmptyState } from "@/components/ui";
import { customDisciplines } from "@/ai/pedagogy";
import { getStudiesHome } from "@/server/studies-home";
import { StartPicker } from "./start-picker";
import { MapStart } from "./map-start";

export const metadata = { title: "Novo estudo" };
/** O mapa ocupa a tela inteira: sem zoom automático do iPhone ao tocar na busca. */
export const viewport = { width: "device-width", initialScale: 1, maximumScale: 1, viewportFit: "cover" } as const;

/**
 * Novo estudo: Mapa do Conhecimento (Knowledge Operations). A escolha em lista continua em
 * "?modo=lista" (e dentro do próprio mapa, no botão "Lista").
 */
export default async function NewTrailPage({ searchParams }: { searchParams: Promise<{ modo?: string }> }) {
  const sp = await searchParams;
  const home = await getStudiesHome().catch(() => null);
  const themes = home?.themes ?? [];
  if (sp.modo !== "lista") return <MapStart themes={themes} name={home?.name ?? null} disciplines={customDisciplines().map((d) => ({ slug: d.slug, label: d.label }))} />;
  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="sr-only">Novo estudo</h1>
      {themes.length ? (
        <StartPicker themes={themes} />
      ) : (
        <EmptyState title="Novas aulas estão sendo cadastradas">Volte em breve para escolher o seu próximo estudo.</EmptyState>
      )}
    </div>
  );
}
