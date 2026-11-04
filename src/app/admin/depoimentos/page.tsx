import { requireAdmin } from "@/server/services/catalog";
import { listTestimonialsAdmin, loadStories } from "@/server/services/testimonials";
import { createTestimonialAction, deleteTestimonialAction, prepareUploadAction, saveStoriesConfigAction, toggleTestimonialAction, updateTestimonialAction } from "./actions";
import { StoriesEditor, TestimonialForm, TestimonialList } from "./forms";

export const metadata = { title: "Depoimentos" };
export const dynamic = "force-dynamic";

/** Página “Depoimentos e Histórias” do aluno: vídeos, idealizadores, indicadores e citação. */
export default async function AdminTestimonialsPage() {
  await requireAdmin();
  const [rows, stories] = await Promise.all([listTestimonialsAdmin(), loadStories()]);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="t-h1">Depoimentos e Histórias</h1>
        <p className="mt-1 max-w-3xl t-small text-tinta-suave">
          Cadastre vídeos (arquivo até 50 MB ou link YouTube/Vimeo), miniatura, legendas, categoria e o selo APROVADO (só para aprovação comprovada). Nada é exibido sem cadastro: sem dados, a página mostra o estado vazio.
        </p>
      </div>
      <section>
        <h2 className="t-h2 mb-2">Novo depoimento</h2>
        <TestimonialForm prepare={prepareUploadAction} save={createTestimonialAction} />
      </section>
      <section className="space-y-3">
        <h2 className="t-h2">Depoimentos ({rows.length})</h2>
        <TestimonialList rows={rows} prepare={prepareUploadAction} save={updateTestimonialAction} toggle={toggleTestimonialAction} remove={deleteTestimonialAction} />
      </section>
      <section className="space-y-3">
        <h2 className="t-h2">Idealizadores, indicadores e citação</h2>
        <StoriesEditor founders={stories.founders} stats={stories.stats} quote={stories.quote} saveConfig={saveStoriesConfigAction} />
      </section>
    </div>
  );
}
