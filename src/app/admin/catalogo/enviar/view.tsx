import Link from "next/link";
import { DEFAULT_MODEL_SLUG, listModelTopics, modelPrompt } from "@/server/services/catalog-upload";
import { importLessonUploadAction, previewLessonUploadAction, removeBannerAction, saveBannerAction } from "../actions";
import { LessonUploadForm } from "./upload-form";
import { subtopicPrompt } from "@/server/services/outlines";

/** Catalogar aula (colar texto). Mesma tela para o administrador e para o sócio liberado (sem banners das matérias). */
export async function UploadLessonView({ searchParams, base, admin }: { searchParams: Promise<{ modelo?: string; plano?: string; sub?: string }>; base: string; admin: boolean }) {
  const sp = await searchParams;
  const slug = typeof sp.modelo === "string" && /^[a-z0-9-]{2,120}$/.test(sp.modelo) ? sp.modelo : DEFAULT_MODEL_SLUG;
  // Vindo do plano de tópicos: o comando é o do subtópico escolhido (já com Tópico/Subtópico).
  const plan = typeof sp.plano === "string" && typeof sp.sub === "string" ? await subtopicPrompt(sp.plano, sp.sub) : null;
  const [mp, options] = await Promise.all([modelPrompt(slug).then((m) => m ?? (slug !== DEFAULT_MODEL_SLUG ? modelPrompt(DEFAULT_MODEL_SLUG) : null)), listModelTopics()]);
  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href={admin ? "/admin/catalogo" : "/business"} className="t-small text-destaque underline underline-offset-2">{admin ? "Catálogo" : "APROVUM BUSINESS"}</Link>
        <h1 className="mt-1 t-h1">Catalogar aula (colar texto)</h1>
        <p className="mt-1 t-small"><Link href={`${base}/enviar/massa`} className="font-semibold text-destaque underline underline-offset-2" data-testid="ir-massa">Tem várias aulas? Catalogar um tópico inteiro em massa (arquivo .txt)</Link></p>
        <p className="mt-1 max-w-3xl t-small text-tinta-suave">
          Cole a aula no formato do painel e ela é montada como as demais do catálogo: dados do tema, texto-base (lei seca ou sumário), módulos com suas seções e
          as questões de fixação por nível. Ela entra na matéria indicada em “Matéria:”.{admin && (
            <>
              {" "}
              <Link href="/admin/catalogo/banners" className="font-semibold text-destaque underline underline-offset-2">Banners das matérias</Link>
            </>
          )}
        </p>
      </div>
      {plan && (
        <div className="rounded-md border border-azul/25 bg-nevoa px-4 py-3 t-small" data-testid="comando-subtopico">
          <p className="font-semibold">Comando do subtópico {plan.label}</p>
          <p className="mt-1 text-tinta-suave">
            Do plano “{plan.planTitle}”. É um comando só, completo (aula e questões): copie, cole na IA e cole a resposta aqui. A aula cresce conforme o assunto (mais módulos quando for grande) e entra no tópico automaticamente.{" "}
            <Link href={`${base}/enviar`} className="font-semibold text-destaque underline underline-offset-2">Usar o comando-mestre</Link>
          </p>
        </div>
      )}
      <LessonUploadForm
        actions={{ preview: previewLessonUploadAction, save: importLessonUploadAction }}
        bannerActions={admin ? { save: saveBannerAction, remove: removeBannerAction } : undefined}
        prompt={plan ? plan.novo : mp?.prompt}
        initialMode={plan ? "inteiro" : undefined}
        compact={plan ? null : (mp?.compact ?? null)}
        model={!plan && mp ? { title: mp.title, slug: mp.slug, stats: mp.stats, options, selfCheck: mp.selfCheck } : null}
      />
    </div>
  );
}
