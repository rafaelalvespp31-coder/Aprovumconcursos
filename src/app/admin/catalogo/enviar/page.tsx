import Link from "next/link";
import { requireAdmin } from "@/server/services/catalog";
import { DEFAULT_MODEL_SLUG, listModelTopics, modelPrompt } from "@/server/services/catalog-upload";
import { importLessonUploadAction, previewLessonUploadAction, removeBannerAction, saveBannerAction } from "../actions";
import { LessonUploadForm } from "./upload-form";

export const metadata = { title: "Catalogar aula" };

export default async function UploadLessonPage({ searchParams }: { searchParams: Promise<{ modelo?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const slug = typeof sp.modelo === "string" && /^[a-z0-9-]{2,120}$/.test(sp.modelo) ? sp.modelo : DEFAULT_MODEL_SLUG;
  const [mp, options] = await Promise.all([modelPrompt(slug).then((m) => m ?? (slug !== DEFAULT_MODEL_SLUG ? modelPrompt(DEFAULT_MODEL_SLUG) : null)), listModelTopics()]);
  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/admin/catalogo" className="t-small text-destaque underline underline-offset-2">Catálogo</Link>
        <h1 className="mt-1 t-h1">Catalogar aula (colar texto)</h1>
        <p className="mt-1 max-w-3xl t-small text-tinta-suave">
          Cole a aula no formato do painel e ela é montada como as demais do catálogo: dados do tema, texto-base (lei seca ou sumário), módulos com suas seções e
          as questões de fixação por nível. Ela entra na matéria indicada em “Matéria:”.{" "}
          <Link href="/admin/catalogo/banners" className="font-semibold text-destaque underline underline-offset-2">Banners das matérias</Link>
        </p>
      </div>
      <LessonUploadForm
        actions={{ preview: previewLessonUploadAction, save: importLessonUploadAction }}
        bannerActions={{ save: saveBannerAction, remove: removeBannerAction }}
        prompt={mp?.prompt}
        parts={mp?.parts ?? null}
        compact={mp?.compact ?? null}
        model={mp ? { title: mp.title, slug: mp.slug, stats: mp.stats, options, selfCheck: mp.selfCheck } : null}
      />
    </div>
  );
}
