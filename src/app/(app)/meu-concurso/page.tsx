import Link from "next/link";
import { requireUser } from "@/server/auth";
import { listPreparations } from "@/server/services/edital";
import "@/components/aprovum-ai/aprovum-ai.css";

export const metadata = { title: "Meu Concurso" };
export const dynamic = "force-dynamic";

export default async function MeuConcursoList() {
  const user = await requireUser("/meu-concurso");
  const preps = (await listPreparations(user.id).catch(() => [])).filter((p) => p.status === "concluido");
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
            <Link key={p.id} className="ai-item" href={`/meu-concurso/${p.id}`}>
              <div>
                <b>{p.title}</b>
                <small>{p.stats.disciplines ?? 0} disciplinas · {p.stats.topics ?? 0} tópicos · {p.stats.lessons ?? 0} aulas</small>
              </div>
              <span className="ai-pill" data-ok={1}>{p.stats.coveragePct ?? 0}%</span>
            </Link>
          ))
        )}
        <Link className="ai-go" href="/aprovum-ai" style={{ textAlign: "center", lineHeight: "48px", display: "block" }}>ENVIAR NOVO EDITAL</Link>
      </section>
    </div>
  );
}
