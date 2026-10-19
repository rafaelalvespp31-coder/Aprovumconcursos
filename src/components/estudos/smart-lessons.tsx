import Link from "next/link";
import { ArrowRight, Flame } from "lucide-react";
import { pct, type StudiesHome } from "@/domain/studies/home";
import { DisciplineIcon } from "./parts";

/**
 * "Aulas e conteúdos inteligentes": matérias do catálogo revisado, com quantidade de aulas,
 * questões do banco e quanto o aluno já concluiu de cada uma. Leva ao catálogo filtrado.
 */
export function SmartLessonsSection({ data, base = "" }: { data: StudiesHome; base?: string }) {
  const subjects = data.subjects;
  return (
    <section className="ea" aria-labelledby="ea-titulo" data-testid="aulas-inteligentes">
      <div className="ea-topo">
        <Flame className="ea-icone" aria-hidden />
        <div className="min-w-0 flex-1">
          <h2 id="ea-titulo" className="ea-titulo">Aulas e conteúdos inteligentes</h2>
          <p className="ea-sub">Conteúdo direto ao ponto, com fontes verificadas.</p>
        </div>
        <Link href={`${base}/nova-trilha`} className="ea-ver" aria-label="Ver todo o catálogo de aulas">
          <ArrowRight className="size-5" aria-hidden />
        </Link>
      </div>
      {subjects.length === 0 ? (
        <p className="mt-3 text-[13px] text-[#646B75]">O catálogo de aulas ainda está sendo preparado.</p>
      ) : (
        <ul className="ea-lista">
          {subjects.map((s, i) => {
            const p = pct(s.done, s.topics);
            return (
              <li key={s.discipline} className={i >= 6 ? "ea-extra" : undefined}>
                <Link href={`${base}/nova-trilha?materia=${encodeURIComponent(s.discipline)}`} className="ea-card" data-ativo={data.current?.discipline === s.discipline ? "1" : "0"}>
                  <DisciplineIcon discipline={s.discipline} className="ea-card-icone" />
                  <span className="min-w-0 flex-1">
                    <span className="ea-card-nome">{s.discipline}</span>
                    <span className="ea-card-info">
                      {s.topics} {s.topics === 1 ? "conteúdo" : "conteúdos"} • {s.questions} {s.questions === 1 ? "questão" : "questões"}
                    </span>
                    <span className="ea-card-barra">
                      <span className="ea-barra" role="progressbar" aria-label={`Concluído em ${s.discipline}`} aria-valuenow={p} aria-valuemin={0} aria-valuemax={100}>
                        <span style={{ width: `${p}%` }} />
                      </span>
                      <span className="ea-pct">{p}%</span>
                    </span>
                  </span>
                  <span className="ea-card-seta" aria-hidden>
                    <ArrowRight className="size-4" />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
