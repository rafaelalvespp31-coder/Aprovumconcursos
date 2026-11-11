import type { Priorities, Priority } from "@/domain/edital/scoring";
import { titleKey } from "@/domain/edital/text";
import type { TreeDiscipline } from "@/server/services/edital-view";
import "./aprovum-ai.css";

const LABEL: Record<Priority, string> = { maxima: "PRIORIDADE MÁXIMA", alta: "PRIORIDADE ALTA", moderada: "PRIORIDADE MODERADA", complementar: "PRIORIDADE COMPLEMENTAR" };
const fmt = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 1 });

/** Prioridades de estudo do cargo, calculadas com o que o PRÓPRIO edital informa (questões × peso) e a cobertura do catálogo. */
export function PrioridadesEdital({ scoring, disciplines, role }: { scoring: Priorities | undefined; disciplines: TreeDiscipline[]; role: string | null }) {
  const cov = new Map(
    disciplines.map((d) => {
      const ok = d.topics.filter((t) => t.status === "completa" || t.status === "parcial").length;
      return [titleKey(d.name), { ok, total: d.topics.length }] as const;
    }),
  );
  const rows = scoring ? [...scoring.rows].sort((a, b) => (b.pct ?? -1) - (a.pct ?? -1)) : [];
  return (
    <section className="ai-rx pr-box" aria-label="Prioridades de estudo" data-testid="prioridades-edital">
      <h3>PRIORIDADES DE ESTUDO{role ? ` · ${role.toUpperCase()}` : ""}</h3>
      {!scoring ? (
        <p className="ai-sub">Esta preparação foi analisada antes do cálculo de prioridades. Altere o cargo ou reenvie o edital para calcular.</p>
      ) : (
        <>
          <p className="ai-sub" data-testid="prioridades-nota">{scoring.note}</p>
          <ul className="pr-list">
            {rows.map((r) => {
              const c = cov.get(titleKey(r.name));
              return (
                <li key={r.name} data-p={r.priority ?? "nd"}>
                  <div className="pr-top">
                    <b>{r.name}</b>
                    <span className="pr-tag" data-p={r.priority ?? "nd"}>{r.priority ? LABEL[r.priority] : "SEM DADOS NO EDITAL"}</span>
                  </div>
                  {r.pct !== null && (
                    <div className="pr-bar" aria-hidden><span style={{ width: `${Math.min(100, r.pct)}%` }} /></div>
                  )}
                  <small>
                    {r.questions !== null ? `${r.questions} questões` : "Questões: não disponível"}
                    {r.weight !== null ? ` × peso ${fmt(r.weight)}` : r.questions !== null ? " · peso não informado" : ""}
                    {r.pct !== null ? ` · ${fmt(r.pct)}% da pontuação${scoring.estimated ? " (estimado)" : ""}` : ""}
                    {c ? ` · catálogo: ${c.ok} de ${c.total} assuntos com aula, ${c.total - c.ok} não encontrados` : ""}
                  </small>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}
