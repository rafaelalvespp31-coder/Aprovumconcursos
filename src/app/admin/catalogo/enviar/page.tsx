import { requireAdmin } from "@/server/services/catalog";
import { UploadLessonView } from "./view";

export const metadata = { title: "Catalogar aula" };

export default async function UploadLessonPage({ searchParams }: { searchParams: Promise<{ modelo?: string; plano?: string; sub?: string }> }) {
  await requireAdmin();
  return <UploadLessonView searchParams={searchParams} base="/admin/catalogo" admin />;
}
