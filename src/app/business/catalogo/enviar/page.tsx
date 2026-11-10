import { requireCatalogEditor } from "@/server/services/catalog";
import { UploadLessonView } from "@/app/admin/catalogo/enviar/view";

export const metadata = { title: "Catalogar aula" };

export default async function PartnerUploadLessonPage({ searchParams }: { searchParams: Promise<{ modelo?: string; plano?: string; sub?: string }> }) {
  const { admin } = await requireCatalogEditor();
  return <UploadLessonView searchParams={searchParams} base="/business/catalogo" admin={admin} />;
}
