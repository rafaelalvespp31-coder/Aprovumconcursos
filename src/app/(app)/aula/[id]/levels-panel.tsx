"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { Icon } from "@/components/icons";
import { Button, Notice, Tag } from "@/components/ui";
import { useStudyApi } from "@/components/study-api";
import { LEVELS, levelStatus, requiredCorrect, type LevelKey } from "@/domain/progress/levels";
import type { QuizResult, RecoveryResult } from "./actions";
import type { ReaderQuestion } from "./reader";

const MIN_PCT = 90;

/**
 * Avaliação da unidade em três níveis: fácil → médio → difícil.
 * Cada nível exige ≥ 90%. Quem não atinge faz exercícios de recuperação que substituem
 * só as questões erradas — o nível não é reiniciado.
 */
export function LevelsPanel({
  lessonId,
  trailId,
  questions,
  interleavedIds,
  initialLevelsPassed,
  readingDone,
  nextId,
  renderQuestion,
}: {
  lessonId: string;
  trailId: string;
  questions: ReaderQuestion[];
  interleavedIds: ReadonlySet<string>;
  initialLevelsPassed: number;
  readingDone: boolean;
  nextId: string | null;
  renderQuestion: (q: ReaderQuestion, number: number, label?: string) => ReactNode;
}) {
  const [levelsPassed, setLevelsPassed] = useState(initialLevelsPassed);
  const byLevel = (key: LevelKey) => questions.filter((q) => (q.level ?? levelOf(q.difficulty)) === key);

  return (
    <div className="mt-4 flex flex-col gap-6">
      <p className="t-small text-tinta-suave">
        Três níveis, nesta ordem: fácil, médio e difícil. Cada um exige pelo menos {MIN_PCT}% de acerto para liberar o seguinte. Errou? Os exercícios de
        recuperação refazem só os pontos errados.
      </p>
      <ol className="flex flex-wrap gap-2" aria-label="Situação dos níveis">
        {LEVELS.map((l) => {
          const st = levelStatus(levelsPassed, l.n);
          return (
            <li key={l.key}>
              <a href={`#nivel-${l.key}`} className="inline-flex items-center gap-1.5 rounded-full border border-linha-forte px-3 py-1 t-tiny font-semibold" data-status={st}>
                <Icon name={st === "aprovado" ? "check" : st === "bloqueado" ? "cadeado" : "raio"} className={`size-3.5 ${st === "aprovado" ? "text-dominado" : st === "liberado" ? "text-destaque" : "text-tinta-fraca"}`} />
                {l.n}. {l.label} — {st === "aprovado" ? "aprovado" : st === "liberado" ? "liberado" : "bloqueado"}
              </a>
            </li>
          );
        })}
      </ol>

      {LEVELS.map((l) => (
        <LevelBlock
          key={l.key}
          lessonId={lessonId}
          level={l}
          status={levelStatus(levelsPassed, l.n)}
          questions={byLevel(l.key)}
          interleavedIds={interleavedIds}
          readingDone={readingDone}
          renderQuestion={renderQuestion}
          onPassed={(n) => setLevelsPassed((p) => Math.max(p, n))}
        />
      ))}

      {levelsPassed >= 3 && (
        <Notice tone="sucesso" title="Três níveis concluídos">
          <p>Você aprovou os níveis fácil, médio e difícil desta unidade.</p>
          <div className="mt-2 flex flex-wrap gap-4">
            {nextId && (
              <Link href={`/aula/${nextId}`} className="inline-flex items-center gap-1.5 font-semibold text-destaque">
                Próxima unidade <Icon name="setaDireita" className="size-4" />
              </Link>
            )}
            <Link href={`/trilhas/${trailId}#pdf`} className="inline-flex items-center gap-1.5 font-semibold text-destaque">
              PDF do conteúdo <Icon name="setaDireita" className="size-4" />
            </Link>
          </div>
        </Notice>
      )}
    </div>
  );
}

function levelOf(d: number): LevelKey {
  return d <= 2 ? "facil" : d === 3 ? "medio" : "dificil";
}

function LevelBlock({
  lessonId,
  level,
  status,
  questions,
  interleavedIds,
  readingDone,
  renderQuestion,
  onPassed,
}: {
  lessonId: string;
  level: (typeof LEVELS)[number];
  status: "aprovado" | "liberado" | "bloqueado";
  questions: ReaderQuestion[];
  interleavedIds: ReadonlySet<string>;
  readingDone: boolean;
  renderQuestion: (q: ReaderQuestion, number: number, label?: string) => ReactNode;
  onPassed: (n: number) => void;
}) {
  const api = useStudyApi();
  const router = useRouter();
  const [result, setResult] = useState<QuizResult | null>(null);
  const [recovery, setRecovery] = useState<RecoveryResult | null>(null);
  const [pending, start] = useTransition();
  const [recPending, startRec] = useTransition();
  const official = questions.filter((q) => !q.recovery_of);
  const recoveries = questions.filter((q) => q.recovery_of);
  const numberOf = new Map(official.map((q, i) => [q.id, i + 1]));
  const need = requiredCorrect(official.length, MIN_PCT / 100);
  const passedNow = status === "aprovado" || (result?.ok && (result.levelsPassed ?? 0) >= level.n);
  const shown = official.filter((q) => !interleavedIds.has(q.id));
  const headingId = `nivel-${level.key}-titulo`;

  const header = (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h3 id={headingId} className="t-h3">
        Nível {level.n} · {level.label}
      </h3>
      <Tag tone={passedNow ? "verde" : status === "liberado" ? "azul" : "neutro"}>
        {passedNow ? "Aprovado" : status === "liberado" ? "Liberado" : "Bloqueado"}
      </Tag>
    </div>
  );

  if (status === "bloqueado" && !passedNow) {
    return (
      <section id={`nivel-${level.key}`} aria-labelledby={headingId} className="scroll-mt-6 rounded-lg border border-dashed border-linha-forte p-4" data-testid={`nivel-${level.key}`}>
        {header}
        <p className="mt-2 flex items-center gap-2 t-small text-tinta-suave">
          <Icon name="cadeado" className="size-4" /> Aprove o nível anterior com pelo menos {MIN_PCT}% para liberar {official.length === 0 ? "este nível" : official.length === 1 ? "esta questão" : `estas ${official.length} questões`}.
        </p>
      </section>
    );
  }

  if (status === "aprovado") {
    return (
      <section id={`nivel-${level.key}`} aria-labelledby={headingId} className="scroll-mt-6 rounded-lg border border-linha bg-superficie p-4" data-testid={`nivel-${level.key}`}>
        {header}
        {result?.ok && (
          <div className="mt-3">
            <Notice tone="sucesso" title={`${Math.round((result.accuracy ?? 0) * 100)}% de acerto${result.total ? ` (${result.correct}/${result.total})` : ""}`}>
              <p>{result.explanation}</p>
            </Notice>
          </div>
        )}
        <details className="mt-2 t-small">
          <summary className="cursor-pointer font-semibold text-tinta-suave">Rever as {official.length} questões deste nível</summary>
          <div className="mt-3 flex flex-col gap-4">{official.map((q) => renderQuestion(q, numberOf.get(q.id)!))}</div>
        </details>
      </section>
    );
  }

  return (
    <section id={`nivel-${level.key}`} aria-labelledby={headingId} className="scroll-mt-6 rounded-lg border border-linha-forte bg-superficie p-4" data-testid={`nivel-${level.key}`}>
      {header}
      <p className="mt-1 t-small text-tinta-suave">
        {official.length} {official.length === 1 ? "questão" : "questões"} · aprovação com {need} {need === 1 ? "acerto" : "acertos"} ou mais ({MIN_PCT}%), todas respondidas e as essenciais corretas.
        {official.length > shown.length && (official.length - shown.length === 1 ? " Uma delas aparece ao longo da aula." : ` ${official.length - shown.length} delas aparecem ao longo da aula.`)}
      </p>
      {official.length === 0 ? (
        <div className="mt-3"><Notice tone="alerta">Este nível ainda não tem questões. Gere a aula novamente pela página do estudo.</Notice></div>
      ) : (
        <div className="mt-4 flex flex-col gap-4">{shown.map((q) => renderQuestion(q, numberOf.get(q.id)!))}</div>
      )}

      {recoveries.length > 0 && (
        <div className="mt-6">
          <h4 className="font-semibold">Exercícios de recuperação</h4>
          <p className="mt-1 t-small text-tinta-suave">Cada um substitui uma questão que você errou, no mesmo ponto. Vale a sua resposta mais recente.</p>
          <div className="mt-3 flex flex-col gap-4">
            {recoveries.map((q, i) => renderQuestion(q, official.length + i + 1, `Recuperação da questão ${numberOf.get(q.recovery_of!) ?? "?"}`))}
          </div>
        </div>
      )}

      <div className="mt-5 flex flex-col gap-3 rounded-md bg-nevoa p-4">
        {!readingDone && <p className="t-small text-tinta-suave">Conclua a leitura para calcular o resultado. Você já pode responder às questões.</p>}
        {!passedNow && (
          <Button
            variant="secundario"
            className="self-start"
            disabled={pending || !readingDone || official.length === 0}
            onClick={() =>
              start(async () => {
                const r = await api.evaluateQuiz(lessonId, "fixacao", level.key);
                setResult(r);
                setRecovery(null);
                if (r.ok && (r.levelsPassed ?? 0) >= level.n) {
                  onPassed(r.levelsPassed ?? level.n);
                  router.refresh();
                }
              })
            }
          >
            {pending ? "Calculando…" : `Calcular resultado do nível ${level.label.toLowerCase()}`}
          </Button>
        )}
        {result && !result.ok && <Notice tone="erro">{result.error}</Notice>}
        {result?.ok && (
          <Notice tone={passedNow ? "sucesso" : "alerta"} title={`${Math.round((result.accuracy ?? 0) * 100)}% de acerto${result.total ? ` (${result.correct}/${result.total})` : ""}`}>
            <p>{result.explanation}</p>
            {!passedNow && !!result.recommendations?.length && (
              <ul className="mt-2 list-disc pl-5">{result.recommendations.map((r) => <li key={r}>{r}</li>)}</ul>
            )}
          </Notice>
        )}
        {result?.ok && !passedNow && (
          <div className="flex flex-col gap-2">
            <Button
              className="self-start"
              disabled={recPending}
              onClick={() =>
                startRec(async () => {
                  const r = await api.generateRecovery(lessonId, level.key);
                  setRecovery(r);
                  if (r.ok) router.refresh();
                })
              }
            >
              {recPending ? "Gerando exercícios…" : "Gerar exercícios de recuperação"}
            </Button>
            {recovery && !recovery.ok && <Notice tone="erro">{recovery.error}</Notice>}
            {recovery?.ok && (
              <p className="t-small text-tinta-suave" role="status">
                {recovery.created} exercício(s) criado(s) para {recovery.wrong} questão(ões) errada(s). Eles aparecem acima, em “Exercícios de recuperação”.
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
