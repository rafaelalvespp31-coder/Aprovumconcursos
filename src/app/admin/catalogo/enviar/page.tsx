import Link from "next/link";
import { requireAdmin } from "@/server/services/catalog";
import { importLessonUploadAction, previewLessonUploadAction } from "../actions";
import { LessonUploadForm } from "./upload-form";

export const metadata = { title: "Catalogar aula" };

export default async function UploadLessonPage() {
  await requireAdmin();
  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/admin/catalogo" className="t-small text-destaque underline underline-offset-2">Catálogo</Link>
        <h1 className="mt-1 t-h1">Catalogar aula (colar texto)</h1>
        <p className="mt-1 max-w-3xl t-small text-tinta-suave">
          Cole a aula no formato do painel e ela é montada como as demais do catálogo: dados do tema, texto-base (lei seca ou sumário), módulos com suas seções e
          as questões de fixação por nível. Ela entra na matéria indicada em “Matéria:” e fica como rascunho até você publicar.
        </p>
      </div>
      <LessonUploadForm actions={{ preview: previewLessonUploadAction, save: importLessonUploadAction }} />
    </div>
  );
}
