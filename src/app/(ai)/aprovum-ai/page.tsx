import { requireUser } from "@/server/auth";
import { getShellSummary } from "@/server/queries";
import { listPreparations } from "@/server/services/edital";
import { UploadPage } from "@/components/aprovum-ai/upload-page";

export const metadata = { title: "APROVUM AI" };
export const dynamic = "force-dynamic";

export default async function AprovumAiPage() {
  const user = await requireUser("/aprovum-ai");
  const [summary, preps] = await Promise.all([getShellSummary(user.email ?? null).catch(() => null), listPreparations(user.id).catch(() => [])]);
  return <UploadPage name={summary?.name ?? null} dueReviews={summary?.counts.dueReviews ?? 0} hasPreps={preps.some((p) => p.status === "concluido")} />;
}
