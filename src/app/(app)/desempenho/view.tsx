import Link from "next/link";
import { ButtonLink, Card, EmptyState, SectionTitle } from "@/components/ui";
import { MiniBars } from "@/components/progress";
import { Icon } from "@/components/icons";
import type { Bucket, PerformanceSummary } from "@/domain/progress/performance";

export interface PerformanceData {
  summary: PerformanceSummary;
  daily: Array<{ day: string; correct: number; wrong: number }>;
  truncated: boolean;
}

const pct = (v: number | null) => (v === null ? "—" : `${Math.round(v * 100)}%`);
const WEEKDAY = ["d", "s", "t", "q", "q", "s", "s"];

function Stat({ value, label, detail }: { value: string; label: string; detail?: string }) {
  return (
    <div className="rounded-lg border border-linha bg-superficie p-4">
      <p className="text-[1.75rem] font-bold leading-none tabular-nums">{value}</p>
      <p className="mt-2 t-small font-semibold">{label}</p>
      {detail && <p className="mt-0.5 t-tiny text-tinta-fraca">{detail}</p>}
    </div>
  );
}

/** Barras horizontais de acerto atual: uma cor, valor em texto de tinta, n sempre visível. */
function AccuracyList({ buckets, hrefOf, empty }: { buckets: Bucket[]; hrefOf?: (b: Bucket) => string; empty: string }) {
  if (buckets.length === 0) return <p className="t-small text-tinta-suave">{empty}</p>;
  return (
    <ul className="flex flex-col gap-3">
      {buckets.map((b) => {
        const v = b.currentAccuracy ?? 0;
        const title = `${b.label}: ${b.currentCorrect} de ${b.questions} questão(ões) certas na última tentativa; ${b.attempts} tentativa(s) no total`;
        const row = (
          <>
            <div className="flex items-baseline justify-between gap-3 t-small">
              <span className="min-w-0 truncate font-semibold">{b.label}</span>
              <span className="shrink-0 tabular-nums">
                <span className="font-semibold">{pct(b.currentAccuracy)}</span>
                <span className="text-tinta-fraca"> · {b.currentCorrect}/{b.questions}</span>
              </span>
            </div>
            <div className="mt-1.5 h-2 w-full rounded-sm bg-linha" aria-hidden>
              <div className="h-full rounded-sm bg-praticado" style={{ width: `${Math.max(v * 100, v > 0 ? 2 : 0)}%` }} />
            </div>
          </>
        );
        return (
          <li key={b.key} title={title}>
            {hrefOf ? (
              <Link href={hrefOf(b)} className="block rounded-md p-1 -m-1 hover:bg-nevoa" aria-label={`${title}. Abrir questões`}>
                {row}
              </Link>
            ) : (
              <div aria-label={title}>{row}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function PerformanceView({ data }: { data: PerformanceData }) {
  const { summary: s, daily } = data;
  if (s.attempts === 0) {
    return (
      <div>
        <h1 className="sr-only">Desempenho</h1>
        <div className="mt-6">
          <EmptyState title="Ainda não há respostas para analisar" action={<ButtonLink href="/questoes">Resolver questões</ButtonLink>}>
            Seus indicadores aparecem aqui a partir das questões que você responder nas aulas ou no modo de questões.
          </EmptyState>
        </div>
      </div>
    );
  }
  const totalDaily = daily.reduce((n, d) => n + d.correct + d.wrong, 0);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="sr-only">Desempenho</h1>
        <p className="mt-1 max-w-2xl text-tinta-suave">
          Calculado só a partir das suas respostas. &quot;Acerto atual&quot; considera a última tentativa de cada questão, ou seja, o que você sabe hoje.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat value={pct(s.currentAccuracy)} label="Acerto atual" detail={`em ${s.questions} questão(ões)`} />
        <Stat value={String(s.questions)} label="Questões respondidas" />
        <Stat value={String(s.attempts)} label="Tentativas" detail={`${pct(s.activityAccuracy)} de acerto em todas`} />
        <Stat value={String(s.recurringErrors.filter((e) => !e.lastCorrect).length)} label="Erros a corrigir" detail="errada na última tentativa" />
      </div>
      {data.truncated && <p className="t-tiny text-tinta-fraca">Considerando suas 5.000 tentativas mais recentes.</p>}

      <Card>
        <SectionTitle title="Últimos 30 dias" />
        <p className="mb-3 t-small text-tinta-suave">{totalDaily} resposta(s) no período.</p>
        <MiniBars
          label={`Respostas por dia nos últimos 30 dias: ${totalDaily} no total`}
          data={daily.map((d) => ({
            key: d.day,
            label: WEEKDAY[new Date(`${d.day}T12:00:00`).getDay()]!,
            hint: new Date(`${d.day}T12:00:00`).toLocaleDateString("pt-BR"),
            value: d.correct,
            secondary: d.wrong,
          }))}
        />
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <SectionTitle title="Por matéria" />
          <p className="mb-4 t-tiny text-tinta-fraca">As que mais precisam de atenção aparecem primeiro. Toque para praticar.</p>
          <AccuracyList buckets={s.bySubject} hrefOf={(b) => `/questoes?materia=${b.key}`} empty="Sem dados." />
        </Card>
        <Card>
          <SectionTitle title="Assuntos com mais dificuldade" />
          <p className="mb-4 t-tiny text-tinta-fraca">Itens do conteúdo com pelo menos 2 questões respondidas.</p>
          <AccuracyList
            buckets={s.byTopic.slice(0, 6)}
            hrefOf={(b) => `/questoes?assunto=${encodeURIComponent(b.label)}`}
            empty="Responda mais questões para ver os assuntos."
          />
        </Card>
        <Card>
          <SectionTitle title="Por dificuldade" />
          <div className="mt-3">
            <AccuracyList buckets={s.byDifficulty} hrefOf={(b) => `/questoes?dificuldade=${b.key}`} empty="Sem dados." />
          </div>
        </Card>
        <Card>
          <SectionTitle title="Por estilo de banca" />
          <div className="mt-3">
            <AccuracyList buckets={s.byBoard} empty="Sem dados." />
          </div>
        </Card>
      </div>

      <Card>
        <SectionTitle title="Erros recorrentes" action={<Link href="/questoes?situacao=erradas" className="t-small font-semibold text-azul underline underline-offset-2">Refazer as erradas</Link>} />
        {s.recurringErrors.length === 0 ? (
          <p className="t-small text-tinta-suave">Nenhum erro recorrente.</p>
        ) : (
          <ul className="mt-2 divide-y divide-linha">
            {s.recurringErrors.map((e) => (
              <li key={e.questionId} className="flex flex-wrap items-start justify-between gap-2 py-3">
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 t-small">{e.statement}</p>
                  <Link href={`/aula/${e.lessonId}`} className="t-tiny text-azul underline-offset-2 hover:underline">{e.lessonTitle}</Link>
                </div>
                <span className={`shrink-0 t-tiny font-semibold ${e.lastCorrect ? "text-dominado" : "text-erro"}`}>
                  {e.lastCorrect ? `Corrigida após ${e.wrongCount} erro(s)` : `Errada${e.wrongCount > 1 ? ` ${e.wrongCount} vezes` : ""}`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <SectionTitle title="Sua confiança nas respostas" />
        {s.calibration.declared === 0 ? (
          <p className="t-small text-tinta-suave">Ao responder, você pode dizer o quanto está seguro. Isso ajuda a achar acertos frágeis.</p>
        ) : (
          <>
            <dl className="mt-2 grid gap-4 sm:grid-cols-2">
              <div className="flex gap-3">
                <Icon name="alerta" className="mt-0.5 size-5 shrink-0 text-erro" />
                <div>
                  <dt className="t-small font-semibold">{s.calibration.confidentErrors} erro(s) com certeza</dt>
                  <dd className="t-small text-tinta-suave">Você tinha certeza e errou: sinal de conceito aprendido de forma equivocada.</dd>
                </div>
              </div>
              <div className="flex gap-3">
                <Icon name="duvida" className="mt-0.5 size-5 shrink-0 text-alerta" />
                <div>
                  <dt className="t-small font-semibold">{s.calibration.luckyGuesses} acerto(s) no chute</dt>
                  <dd className="t-small text-tinta-suave">Você acertou, mas disse que chutou: vale revisar.</dd>
                </div>
              </div>
            </dl>
            <p className="mt-3 t-tiny text-tinta-fraca">A confiança declarada não altera seu domínio: ele depende só dos acertos.</p>
          </>
        )}
      </Card>
    </div>
  );
}
