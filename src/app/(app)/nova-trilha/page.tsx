import { aiEnabled } from "@/ai";
import { catalogPicker } from "@/server/services/catalog";
import type { CatalogPickerGroup } from "@/domain/catalog/picker";
import { listFolders } from "@/server/queries";
import { getStudiesHome } from "@/server/studies-home";
import { StudyPicker } from "@/components/estudos/study-picker";
import { NewTrailForm } from "./form";

export const metadata = { title: "Novo estudo" };

export default async function NewTrailPage({ searchParams }: { searchParams: Promise<{ conteudo?: string; materia?: string }> }) {
  const sp = await searchParams;
  const initial = (sp.conteudo ?? "").slice(0, 2000);
  const aiOn = aiEnabled();
  // Aulas prontas do catálogo, separadas por matéria (o seletor substitui o campo de texto).
  const [catalog, folders, home] = await Promise.all([catalogPicker().catch(() => [] as CatalogPickerGroup[]), listFolders(), getStudiesHome().catch(() => null)]);
  const picker = !!home && home.themes.length > 0;
  return (
    <>
      {/* "Escolha seu novo estudo": matérias e temas do catálogo com o andamento do aluno. */}
      {picker && (
        <div className="mx-auto mb-10 max-w-5xl">
          <StudyPicker themes={home.themes} />
        </div>
      )}
      <div id="formulario" className="mx-auto max-w-2xl scroll-mt-24">
        <h1 className="t-h1">{picker ? "Montar meu estudo" : "Novo estudo"}</h1>
        <p className="mt-1 text-tinta-suave">
          Cada conteúdo é um estudo independente, com aula, três níveis de avaliação e PDF próprios. O edital nunca é obrigatório.
        </p>
        <div className="mt-8">
          <NewTrailForm initialContent={initial} initialSubject={sp.materia?.slice(0, 80)} aiOn={aiOn} catalog={catalog} folders={folders.map((f) => ({ id: f.id, name: f.name }))} />
        </div>
      </div>
    </>
  );
}
