import { aiEnabled } from "@/ai";
import { catalogAvailableTitles } from "@/server/services/catalog";
import { listFolders } from "@/server/queries";
import { NewTrailForm } from "./form";

export const metadata = { title: "Novo estudo" };

export default async function NewTrailPage({ searchParams }: { searchParams: Promise<{ conteudo?: string }> }) {
  const sp = await searchParams;
  const initial = (sp.conteudo ?? "").slice(0, 2000);
  const aiOn = aiEnabled();
  // No modo só catálogo, o aluno vê o que já está disponível.
  const [available, folders] = await Promise.all([
    aiOn ? Promise.resolve([] as string[]) : catalogAvailableTitles().catch(() => [] as string[]),
    listFolders(),
  ]);
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="t-h1">Novo estudo</h1>
      <p className="mt-1 text-tinta-suave">
        Cada conteúdo é um estudo independente, com aula, três níveis de avaliação e PDF próprios. O edital nunca é obrigatório.
      </p>
      <div className="mt-8">
        <NewTrailForm initialContent={initial} aiOn={aiOn} available={available} folders={folders.map((f) => ({ id: f.id, name: f.name }))} />
      </div>
    </div>
  );
}
