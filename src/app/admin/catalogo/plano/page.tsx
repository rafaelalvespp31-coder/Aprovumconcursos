import { requireAdmin } from "@/server/services/catalog";
import { PlanListView } from "./views";

export const metadata = { title: "Plano de tópicos" };

export default async function PlanListPage() {
  await requireAdmin();
  return <PlanListView base="/admin/catalogo" admin />;
}
