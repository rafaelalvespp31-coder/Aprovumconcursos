import { requireAdmin } from "@/server/services/catalog";
import { listTestimonialsAdmin } from "@/server/services/testimonials";
import { createTestimonialAction, deleteTestimonialAction, prepareUploadAction, toggleTestimonialAction } from "./actions";
import { TestimonialForm, TestimonialList } from "./forms";

export const metadata = { title: "Depoimentos" };
export const dynamic = "force-dynamic";

/** Vídeos e fotos de depoimentos de alunos aprovados (página “Depoimentos” do aluno). */
export default async function AdminTestimonialsPage() {
  await requireAdmin();
  const rows = await listTestimonialsAdmin();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="t-h1">Depoimentos</h1>
        <p className="mt-1 max-w-3xl t-small text-tinta-suave">
          Envie o vídeo (MP4, WEBM ou MOV até 50 MB) e/ou a foto do aluno aprovado, ou cole o link de um vídeo do YouTube/Vimeo (melhor para vídeos longos). Eles aparecem na página Depoimentos, abaixo das fotos dos tutores.
        </p>
      </div>
      <section>
        <h2 className="t-h2 mb-2">Novo depoimento</h2>
        <TestimonialForm prepare={prepareUploadAction} create={createTestimonialAction} />
      </section>
      <section className="space-y-3">
        <h2 className="t-h2">Publicados ({rows.length})</h2>
        <TestimonialList rows={rows} toggle={toggleTestimonialAction} remove={deleteTestimonialAction} />
      </section>
    </div>
  );
}
