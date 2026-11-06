import Link from "next/link";
import { requireUser } from "@/server/auth";
import { listPreparations } from "@/server/services/edital";
import { UploadCard } from "@/components/aprovum-ai/upload-card";
import "@/components/aprovum-ai/aprovum-ai.css";

export const metadata = { title: "APROVUM AI" };
export const dynamic = "force-dynamic";

export default async function AprovumAiPage() {
  const user = await requireUser("/aprovum-ai");
  const preps = await listPreparations(user.id).catch(() => []);
  return (
    <div className="ai-root mx-auto w-full max-w-3xl" data-testid="ai-home">
      <UploadCard />
      {preps.some((p) => p.status === "concluido") && (
        <Link href="/meu-concurso" className="ai-ghost" style={{ display: "block", textAlign: "center", lineHeight: "44px", marginTop: 12 }}>Ver minhas preparações</Link>
      )}
    </div>
  );
}
