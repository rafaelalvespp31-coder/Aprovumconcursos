import Link from "next/link";
import { requireUser } from "@/server/auth";
import { listPreparations } from "@/server/services/edital";
import { DeletePrep } from "@/components/aprovum-ai/delete-prep";
import { OrgEmblem } from "@/components/aprovum-ai/org-emblem";
import "@/components/aprovum-ai/aprovum-ai.css";

export const metadata = { title: "Meu Concurso" };
export const dynamic = "force-dynamic";

export default async function MeuConcursoList() {
  const user = await requireUser("/meu-concurso");
  const preps = await listPreparations(user.id).catch(() => []);
  return (
    <div className="ai-root mx-auto w-full max-w-3xl">
      <section className="ai-hero">
        <p className="ai-kicker"><i />MEU CONCURSO</p>
        <h1 className="ai-title">Sua preparação, organizada pelo edital.</h1>
        <p className="ai-sub">Acompanhe disciplinas, tópicos e aulas do seu concurso. O progresso só conta o que você realmente estudou.</p>
      </section>
      <section className="ai-list">
        {preps.length === 0 ? (
          <p className="ai-sub">Você ainda não tem uma preparação pronta.</p>
        ) : (
          preps.map((p) => (
            <div key={p.id} className="ai-item-row">
              <Link className="ai-item" href={p.status === "concluido" ? (p.roleName ? `/meu-concurso/${p.id}` : `/meu-concurso/${p.id}?editar=1`) : `/aprovum-ai/${p.id}`}>
                <OrgEmblem logo={p.orgLogo} name={p.contestName ?? p.title} />
                <div className="ai-item-txt">
                  <b>{p.title}</b>
                  {p.roleName ? (
                    <span className="ai-role"><i>CARGO</i>{p.roleName}</span>
                  ) : p.status === "concluido" ? (
                    <span className="ai-role" data-missing="1"><i>CARGO</i>Toque para informar</span>
                  ) : null}
                  <small>{p.status === "concluido" ? `${p.stats.disciplines ?? 0} disciplinas · ${p.stats.topics ?? 0} tópicos · ${p.stats.lessons ?? 0} aulas` : p.status === "erro" ? "Processamento interrompido" : p.status === "conferencia" ? "Aguardando sua conferência" : "Em processamento"}</small>
                </div>
                <span className="ai-pill" data-ok={p.status === "concluido" ? 1 : undefined} data-bad={p.status === "erro" ? 1 : undefined}>{p.status === "concluido" ? `${p.stats.coveragePct ?? 0}%` : p.status === "erro" ? "ERRO" : "…"}</span>
              </Link>
              <DeletePrep id={p.id} compact />
            </div>
          ))
        )}
        <Link className="ai-go" href="/aprovum-ai" style={{ textAlign: "center", lineHeight: "48px", display: "block" }}>ENVIAR NOVO EDITAL</Link>
      </section>
    </div>
  );
}
