import { EmptyState } from "@/components/ui";
import { getStudiesHome } from "@/server/studies-home";
import { StartPicker } from "./start-picker";

export const metadata = { title: "Novo estudo" };

/** Novo estudo: escolha de matéria e tema do catálogo ("Escolha seu novo estudo"). */
export default async function NewTrailPage() {
  const home = await getStudiesHome().catch(() => null);
  const themes = home?.themes ?? [];
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
