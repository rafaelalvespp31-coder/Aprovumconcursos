import { requireCatalogEditor } from "@/server/services/catalog";
import { PlanListView } from "@/app/admin/catalogo/plano/views";

export const metadata = { title: "Plano de tópicos" };

export default async function PartnerPlanListPage() {
  const { admin } = await requireCatalogEditor();
  return <PlanListView base="/business/catalogo" admin={admin} />;
}
