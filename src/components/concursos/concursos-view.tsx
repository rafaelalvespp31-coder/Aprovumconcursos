import { CalendarDays, ExternalLink, Users, Wallet } from "lucide-react";
import { CONTEST_STATUS, daysUntil } from "@/domain/gamification/home";
import type { Contest } from "@/server/services/gamification";

const dateBR = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });

/** Página Concursos: todos os concursos cadastrados pela equipe, por data de prova. */
export function ConcursosView({ contests, today }: { contests: Contest[]; today: string }) {
  if (!contests.length) {
    return (
      <p className="rounded-2xl border border-dashed border-[#D4D4D4] p-8 text-center text-[#6B7280]" data-testid="concursos-vazio">
        Nenhum concurso cadastrado no momento. Assim que a equipe publicar, ele aparece aqui.
      </p>
    );
  }
  return (
    <ul className="conc-grade" data-testid="concursos-lista">
      {contests.map((c) => {
        const days = daysUntil(c.examDate, c.examDateConfirmed, today);
        return (
          <li key={c.id} className="conc-card" data-testid="concurso">
            <div className="conc-topo">
              {c.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.imageUrl} alt="" loading="lazy" />
              ) : null}
              <span className="conc-status">{CONTEST_STATUS[c.status] ?? c.status}</span>
            </div>
            <div className="conc-corpo">
              <h2 className="conc-nome">{c.name}</h2>
              <p className="conc-inst">{c.institution}{c.roleName ? ` · ${c.roleName}` : ""}</p>
              <dl className="conc-dados">
                {c.vacancies != null && <div><dt><Users className="size-4" aria-hidden /> Vagas</dt><dd>{c.vacancies.toLocaleString("pt-BR")}</dd></div>}
                {c.salary && <div><dt><Wallet className="size-4" aria-hidden /> Remuneração</dt><dd>{c.salary}</dd></div>}
                <div>
                  <dt><CalendarDays className="size-4" aria-hidden /> Prova</dt>
                  <dd>{c.examDate ? `${dateBR(c.examDate)}${c.examDateConfirmed ? "" : " (a confirmar)"}` : "Data a definir"}</dd>
                </div>
              </dl>
              {days != null && <p className="conc-dias"><b>{days}</b> {days === 1 ? "dia" : "dias"} para a prova</p>}
              <p className="conc-fonte">
                {c.infoConfirmed ? "Informações confirmadas" : "Informações não confirmadas"} · Fonte:{" "}
                {c.sourceUrl ? (
                  <a href={c.sourceUrl} target="_blank" rel="noopener noreferrer">{c.sourceName} <ExternalLink className="inline size-3" aria-hidden /></a>
                ) : (
                  c.sourceName
                )}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
