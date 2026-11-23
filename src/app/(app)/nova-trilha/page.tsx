import Link from "next/link";
import { EmptyState } from "@/components/ui";
import { customDisciplines, disciplineLabel } from "@/ai/pedagogy";
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
export default async function NewTrailPage({ searchParams }: { searchParams: Promise<{ modo?: string; materia?: string }> }) {
  const sp = await searchParams;
  const home = await getStudiesHome().catch(() => null);
  const todos = home?.themes ?? [];
  // Vindo dos quadrados da Central: só os temas da matéria escolhida (a matéria é a do catálogo; um slug desconhecido não filtra nada).
  const rotuloMateria = sp.materia ? disciplineLabel(sp.materia) : undefined;
  const themes = rotuloMateria ? todos.filter((t) => t.discipline === rotuloMateria) : todos;
  if (sp.modo !== "lista" && !rotuloMateria) return <MapStart themes={themes} name={home?.name ?? null} disciplines={customDisciplines().map((d) => ({ slug: d.slug, label: d.label }))} />;
  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="sr-only">Novo estudo{rotuloMateria ? ` — ${rotuloMateria}` : ""}</h1>
      {rotuloMateria && (
        <p className="mb-3 text-sm text-slate-300">
          Matéria: <strong>{rotuloMateria}</strong> · <Link href="/nova-trilha?modo=lista" className="underline">ver todas</Link>
        </p>
      )}
      {themes.length ? (
        <StartPicker themes={themes} />
      ) : (
        <EmptyState title="Novas aulas estão sendo cadastradas">Volte em breve para escolher o seu próximo estudo.</EmptyState>
      )}
    </div>
  );
}
