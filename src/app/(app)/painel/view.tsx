import Link from "next/link";
import { ButtonLink, Card, Notice, SectionTitle, Tag } from "@/components/ui";
import { Icon } from "@/components/icons";
import { GoalRing, MiniBars, TripleProgress } from "@/components/progress";
import { STATE_LABELS, type UnitState } from "@/domain/progress/state-machine";
import type { ModuleProgress } from "@/server/queries";

export interface DashboardData {
  name: string | null;
  notice?: string | null;
  goals: { dailyQuestions: number | null; weeklyLessons: number | null };
  today: { answered: number; correct: number };
  weekLessonsCompleted: number;
  days: Array<{ day: string; correct: number; wrong: number }>;
  accuracy14d: number | null;
  answered14d: number;
  continueLesson: { id: string; state: UnitState; title: string; objective: string; trailTitle: string } | null;
  questions: { total: number; unanswered: number; marked: number };
  reviews: Array<{ unitId: string; title: string; reasons: string[] }>;
  trails: Array<{ id: string; title: string; modules: ModuleProgress[] }>;
  pendingTrails: Array<{ id: string; title: string; status: string }>;
}

const WEEKDAY = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

export function DashboardView(d: DashboardData) {
  const totals = (mods: ModuleProgress[]) =>
    mods.reduce((a, m) => ({ total: a.total + m.total, studied: a.studied + m.studied, practiced: a.practiced + m.practiced, mastered: a.mastered + m.mastered }), {
      total: 0, studied: 0, practiced: 0, mastered: 0,
    });
  const noGoals = !d.goals.dailyQuestions && !d.goals.weeklyLessons;

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="t-h1">{d.name ? `Olá, ${d.name}` : "Seu painel"}</h1>
          <p className="mt-1 text-tinta-suave">
            {d.goals.dailyQuestions
              ? `Meta de hoje: ${d.goals.dailyQuestions} questões${d.goals.weeklyLessons ? ` e ${d.goals.weeklyLessons} aulas na semana` : ""}.`
              : "Aprenda, pratique e revise a partir do seu próprio edital."}
          </p>
        </div>
        <ButtonLink href="/nova-trilha">
          <Icon name="mais" className="size-4" /> Nova trilha
        </ButtonLink>
      </header>

      {d.notice && <Notice tone="sucesso">{d.notice}</Notice>}

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        {d.continueLesson ? (
          <Link href={`/aula/${d.continueLesson.id}`} className="group flex flex-col justify-between gap-4 rounded-lg border border-azul/30 bg-nevoa p-5 transition-colors hover:border-azul">
            <div>
              <p className="t-small text-tinta-suave">Continuar em {d.continueLesson.trailTitle}</p>
              <p className="mt-1 t-h2">{d.continueLesson.title}</p>
              <p className="mt-1 line-clamp-2 t-small text-tinta-suave">{d.continueLesson.objective}</p>
            </div>
            <div className="flex items-center justify-between gap-3">
              <Tag tone="azul">{STATE_LABELS[d.continueLesson.state]}</Tag>
              <span className="inline-flex items-center gap-1.5 font-semibold text-azul">
                Continuar estudando <Icon name="setaDireita" className="size-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </div>
          </Link>
        ) : (
          <Card>
            <p className="t-h3">Nenhuma aula em andamento</p>
            <p className="mt-1 t-small text-tinta-suave">Crie uma trilha a partir do seu edital para começar.</p>
            <ButtonLink href="/nova-trilha" className="mt-4">Criar trilha</ButtonLink>
          </Card>
        )}

        <Card href={noGoals ? "/perfil#metas" : undefined}>
          <div className="flex items-center justify-between">
            <p className="t-h3">Metas</p>
            {!noGoals && <Link href="/perfil#metas" className="t-tiny font-semibold text-azul">Ajustar</Link>}
          </div>
          {noGoals ? (
            <p className="mt-2 t-small text-tinta-suave">Defina uma meta diária de questões e uma meta semanal de aulas para acompanhar seu ritmo aqui.</p>
          ) : (
            <div className="mt-3 grid grid-cols-2 gap-3">
              {d.goals.dailyQuestions ? <GoalRing value={d.today.answered} goal={d.goals.dailyQuestions} label="questões hoje" /> : <span />}
              {d.goals.weeklyLessons ? <GoalRing value={d.weekLessonsCompleted} goal={d.goals.weeklyLessons} label="aulas na semana" /> : <span />}
            </div>
          )}
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card href="/revisoes">
          <div className="flex items-center gap-2">
            <Icon name="revisoes" className="text-azul" />
            <p className="t-h3">Revisões pendentes</p>
          </div>
          <p className="mt-2 t-display !text-[2rem] tabular-nums">{d.reviews.length}</p>
          {d.reviews[0] ? (
            <p className="mt-1 line-clamp-2 t-small text-tinta-suave">Primeira: {d.reviews[0].title}. {d.reviews[0].reasons[0]}</p>
          ) : (
            <p className="mt-1 t-small text-tinta-suave">Nada vencido agora.</p>
          )}
        </Card>

        <Card href={d.questions.unanswered > 0 ? "/questoes?situacao=nao_respondidas" : "/questoes"}>
          <div className="flex items-center gap-2">
            <Icon name="questoes" className="text-azul" />
            <p className="t-h3">Questões a resolver</p>
          </div>
          <p className="mt-2 t-display !text-[2rem] tabular-nums">{d.questions.unanswered}</p>
          <p className="mt-1 t-small text-tinta-suave">
            de {d.questions.total} disponíveis{d.questions.marked ? `, ${d.questions.marked} marcada(s) para depois` : ""}.
          </p>
        </Card>

        <Card href="/questoes?situacao=erradas">
          <div className="flex items-center gap-2">
            <Icon name="grafico" className="text-azul" />
            <p className="t-h3">Últimos 14 dias</p>
          </div>
          {d.answered14d === 0 ? (
            <p className="mt-2 t-small text-tinta-suave">Seu histórico de acertos e erros aparece aqui conforme você responde.</p>
          ) : (
            <>
              <p className="mt-1 t-small text-tinta-suave">
                {d.answered14d} respostas, <strong className="text-tinta">{Math.round((d.accuracy14d ?? 0) * 100)}% de acerto</strong>
              </p>
              <div className="mt-3">
                <MiniBars
                  label={`Acertos e erros por dia nos últimos 14 dias`}
                  data={d.days.map((x) => ({
                    key: x.day,
                    label: WEEKDAY[new Date(`${x.day}T12:00:00`).getDay()]!.slice(0, 1),
                    hint: new Date(`${x.day}T12:00:00`).toLocaleDateString("pt-BR"),
                    value: x.correct,
                    secondary: x.wrong,
                  }))}
                />
              </div>
            </>
          )}
        </Card>
      </div>

      <section>
        <SectionTitle title="Trilhas em andamento" action={<Link href="/trilhas" className="t-small font-semibold text-azul">Todas as trilhas</Link>} />
        {d.trails.length === 0 && d.pendingTrails.length === 0 ? (
          <p className="text-tinta-suave">Nenhuma trilha ainda.</p>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {d.trails.map((t) => {
              const all = totals(t.modules);
              return (
                <section key={t.id} className="rounded-lg border border-linha bg-superficie p-5">
                  <Link href={`/trilhas/${t.id}`} className="t-h3 hover:text-azul">{t.title}</Link>
                  <div className="mt-3"><TripleProgress counts={all} label={`Progresso em ${t.title}`} /></div>
                  {t.modules.length > 1 && (
                    <details className="group mt-4">
                      <summary className="flex cursor-pointer list-none items-center gap-1 t-small font-semibold text-tinta-suave">
                        <Icon name="chevronRight" className="size-4 transition-transform group-open:rotate-90" /> Domínio por matéria
                      </summary>
                      <ul className="mt-3 flex flex-col gap-3">
                        {t.modules.map((m) => (
                          <li key={m.id}>
                            <div className="flex items-baseline justify-between gap-3 t-small">
                              <span className="truncate">{m.title}</span>
                              <span className="shrink-0 tabular-nums text-tinta-fraca">{m.mastered}/{m.total} dominados</span>
                            </div>
                            <div className="mt-1"><TripleProgress compact counts={m} label={m.title} /></div>
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                </section>
              );
            })}
            {d.pendingTrails.map((t) => (
              <Card key={t.id} href={`/trilhas/${t.id}`} className="border-dashed">
                <p className="t-h3">{t.title}</p>
                <p className="mt-1 t-small text-tinta-suave">
                  {t.status === "review" ? "Pronta para você conferir e começar." : t.status === "failed" ? "Construção interrompida — retome de onde parou." : "Em construção."}
                </p>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
