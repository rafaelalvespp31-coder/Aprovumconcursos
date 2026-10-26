import Link from "next/link";
import { requireAdmin } from "@/server/services/catalog";
import { importLessonUploadAction, previewLessonUploadAction } from "../actions";
import { LessonUploadForm } from "./upload-form";

export const metadata = { title: "Enviar aula" };

export default async function UploadLessonPage() {
  await requireAdmin();
  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/admin/catalogo" className="t-small text-destaque underline underline-offset-2">Catálogo</Link>
        <h1 className="mt-1 t-h1">Enviar aula (PDF ou bloco de notas)</h1>
        <p className="mt-1 max-w-3xl t-small text-tinta-suave">
          A aula é montada exatamente como você escreveu, no mesmo formato das aulas do catálogo: dados do tema, texto-base (lei seca ou sumário),
          módulos com suas seções e as questões de fixação por nível. Ela entra na matéria indicada em “Matéria:”. Nada é gerado por IA.
        </p>
        <p className="mt-2 t-small">
          <a href="/modelos/modelo-aula.txt" download className="font-semibold text-destaque underline underline-offset-2">Baixar o modelo de aula (.txt)</a>
        </p>
      </div>
      <LessonUploadForm actions={{ preview: previewLessonUploadAction, save: importLessonUploadAction }} />
    </div>
  );
}
