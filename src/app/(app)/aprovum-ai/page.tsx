import Link from "next/link";
import { requireUser } from "@/server/auth";
import { listPreparations } from "@/server/services/edital";
import { UploadCard } from "@/components/aprovum-ai/upload-card";
import "@/components/aprovum-ai/aprovum-ai.css";

export const metadata = { title: "APROVUM AI" };
export const dynamic = "force-dynamic";

const LABEL: Record<string, string> = { concluido: "PRONTA", conferencia: "CONFERIR", erro: "INTERROMPIDA" };

export default async function AprovumAiPage() {
  const user = await requireUser("/aprovum-ai");
  const preps = await listPreparations(user.id).catch(() => []);
  return (
    <div className="ai-root mx-auto w-full max-w-3xl" data-testid="ai-home">
      <section className="ai-hero">
        <p className="ai-kicker"><i />APROVUM AI · INTELLIGENCE SYSTEM</p>
        <h1 className="ai-title">Transforme seu edital em uma preparação completa.</h1>
        <p className="ai-sub">A APROVUM organiza automaticamente as aulas do nosso catálogo de acordo com o concurso que você deseja conquistar.</p>
        <p className="ai-tag">SEU CONCURSO. SUA PREPARAÇÃO. NOSSA INTELIGÊNCIA.</p>
      </section>
      <UploadCard />
      {preps.length > 0 && (
        <section className="ai-list" aria-label="Suas preparações">
          <h2>SUAS PREPARAÇÕES</h2>
          {preps.map((p) => (
            <Link key={p.id} className="ai-item" href={p.status === "concluido" ? `/meu-concurso/${p.id}` : `/aprovum-ai/${p.id}`}>
              <div>
                <b>{p.title}</b>
                <small>{[p.roleName, p.board, p.year].filter(Boolean).join(" · ") || p.fileName}</small>
              </div>
              <span className="ai-pill" data-ok={p.status === "concluido" ? 1 : undefined} data-bad={p.status === "erro" ? 1 : undefined}>{LABEL[p.status] ?? "PROCESSANDO"}</span>
            </Link>
          ))}
        </section>
      )}
    </div>
  );
}
