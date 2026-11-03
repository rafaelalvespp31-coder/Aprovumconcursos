import { requireAdmin } from "@/server/services/catalog";
import { listApprovedBannersAdmin } from "@/server/services/approved-banners";
import { createBannerAction, deleteBannerAction, updateBannerAction } from "./actions";
import { BannerItem, NewBannerForm } from "./banner-forms";

export const metadata = { title: "Banners de aprovados" };
export const dynamic = "force-dynamic";

/** Fotos/artes dos aprovados que passam no banner animado do painel dos alunos. */
export default async function ApprovedBannersPage() {
  await requireAdmin();
  const rows = await listApprovedBannersAdmin();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="t-h1">Banners de aprovados</h1>
        <p className="mt-1 max-w-3xl t-small text-tinta-suave">
          As imagens enviadas aqui passam no banner animado do painel, a cada 3 segundos, depois das artes fixas da equipe. Desmarque “Mostrar no painel” para tirar uma imagem do ar sem apagar.
        </p>
      </div>
      <section>
        <h2 className="t-h2 mb-2">Novo aprovado</h2>
        <NewBannerForm action={createBannerAction} />
      </section>
      <section className="space-y-3">
        <h2 className="t-h2">Enviados ({rows.length})</h2>
        {rows.length === 0 && <p className="t-small text-tinta-suave">Nenhuma imagem enviada ainda.</p>}
        {rows.map((b) => <BannerItem key={b.id} b={b} update={updateBannerAction} remove={deleteBannerAction} />)}
      </section>
    </div>
  );
}
