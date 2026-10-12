import { requireAdmin } from "@/server/services/catalog";
import { TopicForm } from "../topic-form";

export const metadata = { title: "Novo tema" };

export default async function NewTopicPage() {
  await requireAdmin();
  return (
    <div className="max-w-3xl">
      <h1 className="t-h1">Novo tema do catálogo</h1>
      <p className="mt-1 text-tinta-suave">
        Cadastre um tema (ex.: “Prisão em flagrante”) ou um dispositivo de lei (ex.: Código Penal, art. 121). Depois você gera o rascunho com IA, revisa e publica.
      </p>
      <div className="mt-6"><TopicForm /></div>
    </div>
  );
}
