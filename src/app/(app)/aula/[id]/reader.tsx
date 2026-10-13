"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Markdown } from "@/components/markdown";
import { ExampleCards, parseExamples } from "@/components/examples";
import { Flashcards } from "@/components/flashcards";
import { TrueFalseCards, parseTrueFalse } from "@/components/true-false-cards";
import { Icon, type IconName } from "@/components/icons";
import { Button, Notice, Tag, inputClass } from "@/components/ui";
import { SaveIndicator, type SaveState } from "@/components/interactive";
import { QuestionCard, type QuestionData } from "@/components/question-card";
import { SECTION_LABELS, type LessonSectionKind } from "@/ai/pedagogy";
import type { Annotation } from "../../study-actions";
import type { QuizResult } from "./actions";
import { useStored } from "@/components/use-stored";
import { useStudyApi } from "@/components/study-api";
import { LEVELS, levelStatus, type LevelKey } from "@/domain/progress/levels";
import { SingleLevel } from "./levels-panel";

export interface ReaderSection {
  id: string;
  kind: string;
  title: string;
  body_markdown: string;
  node_keys: string[];
  verification_status: string;
}

export interface ReaderClarification {
  id: string;
  section_id: string | null;
  question: string;
  answer_markdown: string;
  verification_pending: boolean;
}

export interface ReaderProps {
  lesson: { id: string; title: string; objective: string; trailId: string; trailTitle: string; estimatedMinutes: number; stateLabel: string | null };
  sections: ReaderSection[];
  nodes: Array<{ key: string; marker: string | null; title: string; taught: boolean }>;
  questions: Array<ReaderQuestion>;
  /** Níveis aprovados nesta unidade (0–3): fácil → médio → difícil. */
  levelsPassed: number;
  markedQuestionIds: string[];
  annotations: Annotation[];
  clarifications: ReaderClarification[];
  readingDone: boolean;
  context: "fixacao" | "revisao";
  prevId: string | null;
  nextId: string | null;
  /** Próximo tema/assunto da mesma matéria (aula seguinte ou próximo estudo da pasta). */
  nextHref: string | null;
  nextLabel: string | null;
  notices: React.ReactNode;
  /** Pré-visualização de design: não dispara efeitos no servidor. */
}

export type ReaderQuestion = QuestionData & { nodeKey: string | null; level?: LevelKey; recovery_of?: string | null };

const sectionDomId = (id: string) => `secao-${id}`;

type Step =
  | { type: "secao"; section: ReaderSection; n: number }
  | { type: "nivel"; level: LevelKey }
  | { type: "revisao" }
  | { type: "fim" };

const LEVEL_TITLE: Record<LevelKey, string> = { facil: "Questões · Fácil", medio: "Questões · Médio", dificil: "Questões · Difícil" };

/**
 * Aula passo a passo: um tema (bloco) por tela, cada um seguido da sua pergunta rápida;
 * depois as questões separadas por dificuldade (fácil → médio → difícil) e, no fim,
 * o botão para o próximo tema ou assunto da mesma matéria.
 */
export function LessonReader(props: ReaderProps) {
  const api = useStudyApi();
  const { lesson, sections, nodes, questions, context } = props;
  const [annotations, setAnnotations] = useState(props.annotations);
  const [readingDone, setReadingDone] = useState(props.readingDone);
  const [levelsPassed, setLevelsPassed] = useState(props.levelsPassed);
  const [activeQuestion, setActiveQuestion] = useState<string | null>(null);
  const [completing, startCompleting] = useTransition();
  const tocRef = useRef<HTMLDialogElement>(null);
  const notesRef = useRef<HTMLDialogElement>(null);
  const topRef = useRef<HTMLDivElement>(null);

  // Registra a abertura da aula (máquina de estados no servidor).
  useEffect(() => {
    void api.startLesson(lesson.id);
  }, [lesson.id, api]);

  const steps = useMemo<Step[]>(() => {
    const list: Step[] = sections.map((s, i) => ({ type: "secao", section: s, n: i + 1 }));
    if (context === "revisao") list.push({ type: "revisao" });
    else for (const l of LEVELS) list.push({ type: "nivel", level: l.key });
    list.push({ type: "fim" });
    return list;
  }, [sections, context]);

  const [storedStep, setStoredStep] = useStored<number>(`na:passo:${lesson.id}`, 0);
  const step = Math.min(Math.max(storedStep, 0), steps.length - 1);
  const current = steps[step]!;

  // Blocos percorridos: contam quando o aluno passa adiante (ou chega ao último).
  const [seenList, setSeenList] = useStored<string[]>(`na:secoes-vistas:${lesson.id}`, []);
  const seen = useMemo(() => new Set(seenList), [seenList]);
  const seenCount = readingDone ? sections.length : sections.filter((s) => seen.has(s.id)).length;

  // Pergunta rápida logo após o bloco que ensina o item (nível fácil).
  const { interleaved } = useMemo(() => {
    const placed = new Set<string>();
    const inter = new Map<string, ReaderQuestion[]>();
    const quick = questions.filter((q) => !q.recovery_of && (q.level ?? "facil") === "facil");
    for (const s of sections) {
      const q = quick.find((q) => !placed.has(q.id) && q.nodeKey && s.node_keys.includes(q.nodeKey));
      if (q && s.kind !== "texto_legal" && s.kind !== "objetivo") {
        placed.add(q.id);
        inter.set(s.id, [q]);
      }
    }
    return { interleaved: inter };
  }, [sections, questions]);
  const interleavedIds = useMemo(() => new Set([...interleaved.values()].flat().map((q) => q.id)), [interleaved]);
  const numberOf = useMemo(() => new Map(questions.map((q, i) => [q.id, i + 1])), [questions]);

  const annotationsBySection = useMemo(() => {
    const m = new Map<string, Annotation[]>();
    for (const a of annotations) {
      const k = a.section_id ?? "geral";
      m.set(k, [...(m.get(k) ?? []), a]);
    }
    return m;
  }, [annotations]);

  const markSeen = useCallback(
    (id: string) => {
      if (!seen.has(id)) setSeenList([...seen, id]);
    },
    [seen, setSeenList],
  );

  const go = useCallback(
    (to: number) => {
      const target = Math.min(Math.max(to, 0), steps.length - 1);
      setStoredStep(target);
      tocRef.current?.close();
      requestAnimationFrame(() => topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    },
    [steps.length, setStoredStep],
  );

  const goToSection = useCallback((sectionId: string) => go(steps.findIndex((s) => s.type === "secao" && s.section.id === sectionId)), [go, steps]);

  const next = () => {
    if (current.type === "secao") {
      markSeen(current.section.id);
      const lastSection = current.n === sections.length;
      const unseenAfter = sections.filter((s) => !seen.has(s.id) && s.id !== current.section.id).length;
      const willHaveAll = readingDone || unseenAfter === 0;
      // Saindo do último bloco: registra a leitura concluída e segue para as questões.
      if (lastSection && !readingDone && willHaveAll) {
        startCompleting(async () => {
          await api.completeReading(lesson.id);
          setReadingDone(true);
          go(step + 1);
        });
        return;
      }
    }
    go(step + 1);
  };

  const counts = {
    duvida: annotations.filter((a) => a.kind === "duvida" && !a.resolved).length,
  };

  const stepLabel = (s: Step): string =>
    s.type === "secao" ? s.section.title || SECTION_LABELS[s.section.kind as LessonSectionKind] : s.type === "nivel" ? LEVEL_TITLE[s.level] : s.type === "revisao" ? "Questões de revisão" : "Concluir e avançar";

  const stepState = (s: Step): "feito" | "atual" | "bloqueado" | "livre" => {
    if (s === current) return "atual";
    if (s.type === "secao") return readingDone || seen.has(s.section.id) ? "feito" : "livre";
    if (s.type === "nivel") {
      const n = LEVELS.find((l) => l.key === s.level)!.n;
      const st = levelStatus(levelsPassed, n);
      return st === "aprovado" ? "feito" : st === "bloqueado" ? "bloqueado" : "livre";
    }
    return "livre";
  };

  const toc = (
    <ol className="flex flex-col gap-0.5">
      {steps.map((s, i) => {
        const st = stepState(s);
        const anns = s.type === "secao" ? annotationsBySection.get(s.section.id) ?? [] : [];
        const firstOfGroup = i === sections.length;
        return (
          <li key={i} className={firstOfGroup ? "mt-2 border-t border-linha pt-2" : ""}>
            <button
              type="button"
              onClick={() => go(i)}
              aria-current={st === "atual" ? "step" : undefined}
              className="flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left t-small text-tinta-suave hover:bg-nevoa aria-[current=step]:bg-nevoa aria-[current=step]:font-semibold aria-[current=step]:text-destaque"
            >
              <span className="w-6 shrink-0 tabular-nums text-tinta-fraca">{s.type === "secao" ? s.n : s.type === "fim" ? "→" : "?"}</span>
              <span className="flex-1">{stepLabel(s)}</span>
              {st === "feito" && <Icon name="check" className="mt-0.5 size-3.5 text-acerto" label="Concluído" />}
              {st === "bloqueado" && <Icon name="cadeado" className="mt-0.5 size-3.5 text-tinta-fraca" label="Bloqueado" />}
              {anns.some((a) => a.kind === "revisar") && <Icon name="bookmark" className="mt-0.5 size-3.5 text-destaque" label="Marcado para revisar" />}
            </button>
          </li>
        );
      })}
    </ol>
  );

  const renderQuestion = (q: ReaderQuestion, n: number, label?: string) => (
    <div key={q.id} onFocusCapture={() => setActiveQuestion(q.id)} onClickCapture={() => setActiveQuestion(q.id)}>
      {label && <p className="mb-2 t-tiny font-semibold text-destaque">{label}</p>}
      <QuestionCard q={q} number={n} context={context} active={activeQuestion === q.id} initialMarked={props.markedQuestionIds.includes(q.id)} />
    </div>
  );

  const pct = Math.round(((step + 1) / steps.length) * 100);
  const isLast = step === steps.length - 1;

  return (
    <div>
      <div ref={topRef} className="scroll-mt-4" />

      <div className="md:grid md:grid-cols-[230px_minmax(0,1fr)] md:gap-10 lg:grid-cols-[250px_minmax(0,1fr)]">
        <aside className="hidden md:block">
          <div className="sticky top-6 flex max-h-[calc(100dvh-3rem)] flex-col gap-4 overflow-y-auto pb-6">
            <Link href={`/trilhas/${lesson.trailId}`} className="inline-flex items-center gap-1 t-small font-semibold text-destaque">
              <Icon name="chevronLeft" className="size-4" /> {lesson.trailTitle}
            </Link>
            <nav aria-label="Etapas da aula">
              <p className="mb-1 px-2 t-tiny font-semibold text-tinta-fraca">
                Temas · <span className="tabular-nums" data-testid="secoes-vistas">{seenCount} de {sections.length}</span>
              </p>
              {toc}
            </nav>
            <button type="button" onClick={() => notesRef.current?.showModal()} className="mx-2 inline-flex items-center gap-2 t-small font-semibold text-tinta-suave hover:text-destaque">
              <Icon name="nota" className="size-4" /> Minhas anotações ({annotations.length})
            </button>
          </div>
        </aside>

        <article id="corpo-aula" className="min-w-0 pb-28">
          {/* Cabeçalho fixo: onde estou e quanto falta */}
          <div className="sticky top-0 z-20 -mx-4 border-b border-linha bg-papel/95 px-4 pb-2 pt-2 backdrop-blur md:mx-0 md:px-0">
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => tocRef.current?.showModal()} className="inline-flex min-h-10 items-center gap-1.5 rounded-md border border-linha-forte bg-superficie px-3 t-small font-semibold md:hidden">
                <Icon name="indice" className="size-4" /> Etapas
              </button>
              <p className="min-w-0 flex-1 truncate t-small font-semibold">
                <span className="text-tinta-fraca">{current.type === "secao" ? `Tema ${current.n} de ${sections.length}` : current.type === "fim" ? "Fim da aula" : "Avaliação"} · </span>
                {stepLabel(current)}
              </p>
              <button type="button" onClick={() => notesRef.current?.showModal()} className="inline-flex min-h-10 items-center rounded-md px-2 text-tinta-suave md:hidden" aria-label="Anotações">
                <Icon name="nota" className="size-5" />
              </button>
            </div>
            <div className="mt-2 flex h-1.5 gap-[3px]" role="progressbar" aria-label="Progresso na aula" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
              {steps.map((s, i) => {
                const st = stepState(s);
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => go(i)}
                    aria-label={`Ir para: ${stepLabel(s)}`}
                    className={`h-full flex-1 rounded-full transition-colors ${
                      st === "atual" ? "bg-azul" : st === "feito" ? "bg-acerto" : s.type === "nivel" ? "bg-linha-forte" : "bg-linha"
                    }`}
                  />
                );
              })}
            </div>
          </div>

          <div key={step} className="entrar mt-5">
            {step === 0 && (
              <header className="mb-5">
                <Link href={`/trilhas/${lesson.trailId}`} className="t-small text-destaque underline underline-offset-2 md:hidden">{lesson.trailTitle}</Link>
                <h1 className="mt-1 t-h1">{lesson.title}</h1>
                <p className="mt-1 max-w-[68ch] text-tinta-suave">{lesson.objective}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2 t-tiny text-tinta-fraca">
                  {lesson.stateLabel && <Tag tone="azul">{lesson.stateLabel}</Tag>}
                  <span>{sections.length} temas · 3 níveis de questões · ~{lesson.estimatedMinutes} min</span>
                  {counts.duvida > 0 && <Tag tone="ambar">{counts.duvida} dúvida(s) aberta(s)</Tag>}
                </div>
                <div className="mt-4 flex flex-col gap-3">{props.notices}</div>
                <details className="mt-4 rounded-md border border-linha bg-superficie px-4 py-3 t-small">
                  <summary className="cursor-pointer font-semibold">Itens do seu conteúdo nesta aula ({nodes.length})</summary>
                  <ul className="mt-2 flex flex-col gap-1">
                    {nodes.map((n) => (
                      <li key={n.key} className="flex items-start justify-between gap-3">
                        <span className={/\brevogad[oa]s?\b/i.test(n.title) ? "item-revogado" : undefined}>{n.marker && <span className="mr-1 font-semibold text-destaque">{n.marker}</span>}{n.title}</span>
                        <Tag tone={n.taught ? "azul" : "ambar"}>{n.taught ? "Ensinado" : "Pendente"}</Tag>
                      </li>
                    ))}
                  </ul>
                </details>
              </header>
            )}

            {current.type === "secao" && (
              <>
                <SectionBlock
                  section={current.section}
                  lessonId={lesson.id}
                  nodes={nodes}
                  annotations={annotationsBySection.get(current.section.id) ?? []}
                  clarifications={props.clarifications.filter((c) => c.section_id === current.section.id)}
                  onAnnotation={(a, removed) => setAnnotations((list) => (removed ? list.filter((x) => x.id !== a.id) : [a, ...list.filter((x) => x.id !== a.id)]))}
                />
                {(interleaved.get(current.section.id) ?? []).map((q) => (
                  <div key={q.id} className="mt-6" onFocusCapture={() => setActiveQuestion(q.id)} onClickCapture={() => setActiveQuestion(q.id)}>
                    <p className="mb-2 inline-flex items-center gap-1.5 t-small font-semibold text-destaque">
                      <Icon name="raio" className="size-4" /> Questão sobre este tema
                    </p>
                    <QuestionCard q={q} number={numberOf.get(q.id)!} context={context} compact active={activeQuestion === q.id} initialMarked={props.markedQuestionIds.includes(q.id)} />
                  </div>
                ))}
                {current.n === sections.length && !readingDone && sections.some((s) => !seen.has(s.id) && s.id !== current.section.id) && (
                  <div className="mt-6">
                    <Notice tone="alerta" title="Faltam temas">
                      Passe por todos os temas antes das questões. Toque em “Etapas” para ver os que faltam.
                    </Notice>
                  </div>
                )}
              </>
            )}

            {current.type === "nivel" && (
              <section aria-label={LEVEL_TITLE[current.level]}>
                <p className="mb-3 t-small text-tinta-suave">
                  Três níveis, nesta ordem: fácil, médio e difícil. Cada um exige pelo menos 90% de acerto para liberar o seguinte. Errou? A recuperação refaz só os pontos errados.
                </p>
                <SingleLevel
                  lessonId={lesson.id}
                  levelKey={current.level}
                  questions={questions}
                  interleavedIds={interleavedIds}
                  levelsPassed={levelsPassed}
                  readingDone={readingDone}
                  renderQuestion={renderQuestion}
                  onPassed={(n) => setLevelsPassed((p) => Math.max(p, n))}
                />
              </section>
            )}

            {current.type === "revisao" && (
              <section aria-label="Questões de revisão">
                <div className="flex flex-col gap-4">{questions.filter((q) => !interleavedIds.has(q.id)).map((q) => renderQuestion(q, numberOf.get(q.id)!))}</div>
                <UnitResult lessonId={lesson.id} context={context} readingDone={readingDone} nextId={props.nextId} total={questions.length} />
              </section>
            )}

            {current.type === "fim" && (
              <section className="flex flex-col gap-4" aria-label="Concluir e avançar">
                {levelsPassed >= 3 || context === "revisao" ? (
                  <Notice tone="sucesso" title="Tema concluído">Você passou por todos os temas e aprovou os três níveis desta aula.</Notice>
                ) : (
                  <Notice tone="info" title="Ainda falta aprovar os níveis">
                    {LEVELS.filter((l) => levelStatus(levelsPassed, l.n) !== "aprovado").map((l) => l.label).join(", ")} ainda não aprovado(s). Você pode avançar e voltar depois.
                  </Notice>
                )}
                {props.nextHref ? (
                  <Link
                    href={props.nextHref}
                    className="flex items-center justify-between gap-3 rounded-lg bg-azul px-5 py-4 text-white transition-transform active:scale-[0.98]"
                  >
                    <span>
                      <span className="block t-tiny font-semibold uppercase tracking-wide text-white/80">Próximo tema</span>
                      <span className="block text-lg font-bold">{props.nextLabel}</span>
                    </span>
                    <Icon name="setaDireita" className="size-6 shrink-0" />
                  </Link>
                ) : (
                  <p className="t-small text-tinta-suave">Este é o último tema desta matéria. Para continuar, crie um estudo novo ou coloque outros temas nesta pasta.</p>
                )}
                <div className="flex flex-wrap gap-4 t-small">
                  <Link href={`/trilhas/${lesson.trailId}#pdf`} className="font-semibold text-destaque">PDF do conteúdo</Link>
                  <Link href="/trilhas" className="font-semibold text-destaque">Minhas pastas e estudos</Link>
                </div>
              </section>
            )}
          </div>
        </article>
      </div>

      {/* Navegação fixa: anterior / próximo */}
      <nav aria-label="Navegação da aula" className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] z-30 px-4 md:bottom-6">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 md:pl-[260px]">
          <button
            type="button"
            onClick={() => go(step - 1)}
            disabled={step === 0}
            className="inline-flex min-h-12 items-center gap-1.5 rounded-full border border-linha-forte bg-superficie px-4 font-semibold shadow-sm transition-transform active:scale-95 disabled:opacity-40"
          >
            <Icon name="setaEsquerda" className="size-4" /> Anterior
          </button>
          {!isLast ? (
            <button
              type="button"
              onClick={next}
              disabled={completing}
              className="inline-flex min-h-12 items-center gap-1.5 rounded-full bg-azul px-5 font-semibold text-white shadow-md transition-transform active:scale-95 disabled:opacity-60"
            >
              {completing ? "Salvando…" : current.type === "secao" && current.n === sections.length ? "Ir para as questões" : steps[step + 1]?.type === "fim" ? "Concluir" : "Próximo"}
              <Icon name="setaDireita" className="size-4" />
            </button>
          ) : props.nextHref ? (
            <Link href={props.nextHref} className="inline-flex min-h-12 items-center gap-1.5 rounded-full bg-azul px-5 font-semibold text-white shadow-md transition-transform active:scale-95">
              Próximo tema <Icon name="setaDireita" className="size-4" />
            </Link>
          ) : (
            <span />
          )}
        </div>
      </nav>

      <dialog ref={tocRef} className="m-0 mt-auto w-full max-w-none rounded-t-lg border border-linha bg-superficie p-4 backdrop:bg-black/40 md:hidden" aria-label="Etapas da aula">
        <div className="mb-2 flex items-center justify-between">
          <p className="t-h3">Etapas da aula</p>
          <button type="button" onClick={() => tocRef.current?.close()} className="rounded-md p-2 hover:bg-nevoa" aria-label="Fechar">
            <Icon name="x" />
          </button>
        </div>
        <div className="max-h-[65dvh] overflow-y-auto">{toc}</div>
      </dialog>

      <AnnotationsDialog
        refEl={notesRef}
        annotations={annotations}
        onGo={(id) => {
          notesRef.current?.close();
          if (id) goToSection(id);
        }}
        onChange={(a, removed) => setAnnotations((list) => (removed ? list.filter((x) => x.id !== a.id) : list.map((x) => (x.id === a.id ? a : x))))}
      />
    </div>
  );
}


// ---------------------------------------------------------------------------
// Seção com forma adequada ao tipo de conteúdo + ações
// ---------------------------------------------------------------------------

function SectionBlock({
  section: s,
  lessonId,
  nodes,
  annotations,
  clarifications,
  onAnnotation,
}: {
  section: ReaderSection;
  lessonId: string;
  nodes: ReaderProps["nodes"];
  annotations: Annotation[];
  clarifications: ReaderClarification[];
  onAnnotation: (a: Annotation, removed?: boolean) => void;
}) {
  const kind = s.kind as LessonSectionKind;
  const label = s.title || SECTION_LABELS[kind] || "Seção";
  const unverified = s.verification_status === "pendente";
  const body = <Markdown legal={kind === "texto_legal"}>{s.body_markdown}</Markdown>;
  let content: React.ReactNode;

  if (kind === "texto_legal") {
    const src = nodes.filter((n) => s.node_keys.includes(n.key));
    content = (
      <div className="my-2 rounded-md border border-linha-forte bg-superficie p-4">
        <p className="m-0 inline-flex items-center gap-1.5 font-sans t-tiny font-semibold text-tinta-suave">
          <Icon name="lei" className="size-4" /> Texto legal
        </p>
        <div className="mt-2">{body}</div>
        <p className="m-0 border-t border-linha pt-2 font-sans t-tiny text-tinta-fraca">
          Fonte: texto legal{src.length ? ` (${src.map((n) => n.marker ?? n.title).join(", ")})` : ""}. Confira a redação vigente na fonte oficial.
        </p>
      </div>
    );
  } else if (kind === "exemplos" || (kind === "aplicacao" && parseExamples(s.body_markdown).some((c) => c.answer))) {
    // Exemplos sempre como casos interativos: situação → pensar → conferir o enquadramento.
    content = <ExampleCards markdown={s.body_markdown} kind={kind} />;
  } else if (kind === "aplicacao") {
    content = (
      <div className="my-2 rounded-md border-2 border-linha-forte bg-superficie px-4 py-3">
        <p className="m-0 inline-flex items-center gap-1.5 font-sans t-small font-semibold text-destaque">
          <Icon name="alvo" className="size-4" /> Aplicação prática
        </p>
        <div className="mt-1">{body}</div>
      </div>
    );
  } else if (kind === "flashcards") {
    content = <Flashcards markdown={s.body_markdown} />;
  } else if (kind === "pegadinhas" && parseTrueFalse(s.body_markdown).length) {
    // Pegadinhas no formato "afirmação → CERTO/ERRADO" viram itens para julgar.
    content = <TrueFalseCards markdown={s.body_markdown} />;
  } else if (kind === "excecoes" || kind === "pegadinhas") {
    content = (
      <aside className="my-2 rounded-md border-l-4 border-alerta bg-alerta-fundo px-4 py-3" aria-label={label}>
        <p className="m-0 inline-flex items-center gap-1.5 font-sans t-small font-semibold">
          <Icon name="alerta" className="size-4 text-alerta" /> {kind === "pegadinhas" ? "Atenção na prova" : "Exceção"}
        </p>
        <div className="mt-1">{body}</div>
      </aside>
    );
  } else if (kind === "resumo" || kind === "checklist") {
    content = <div className="my-2 rounded-md bg-nevoa px-4 py-3">{body}</div>;
  } else {
    content = body;
  }

  return (
    <section id={sectionDomId(s.id)} className="scroll-mt-16 border-b border-linha/70 pb-4 pt-2" aria-labelledby={`h-${s.id}`}>
      <div className="flex flex-wrap items-center gap-2">
        <h2 id={`h-${s.id}`} className="font-sans text-[1.2rem] font-[650] tracking-[-0.01em]">{label}</h2>
        {unverified && <Tag tone="ambar">Não verificado</Tag>}
      </div>
      <div className="leitura mt-2">{content}</div>
      <SectionActions section={s} lessonId={lessonId} annotations={annotations} clarifications={clarifications} onAnnotation={onAnnotation} />
    </section>
  );
}

type Panel = null | "esclarecer" | "nota" | "duvida";

function SectionActions({
  section,
  lessonId,
  annotations,
  clarifications,
  onAnnotation,
}: {
  section: ReaderSection;
  lessonId: string;
  annotations: Annotation[];
  clarifications: ReaderClarification[];
  onAnnotation: (a: Annotation, removed?: boolean) => void;
}) {
  const api = useStudyApi();
  const [panel, setPanel] = useState<Panel>(null);
  const [text, setText] = useState("");
  const [save, setSave] = useState<SaveState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState(clarifications);
  const [pending, start] = useTransition();
  const review = annotations.find((a) => a.kind === "revisar");
  const notes = annotations.filter((a) => a.kind === "nota");
  const doubts = annotations.filter((a) => a.kind === "duvida");
  const base = { lessonId, sectionId: section.id, sectionTitle: section.title.slice(0, 160) };

  const open = (p: Panel) => {
    setPanel(panel === p ? null : p);
    setText("");
    setError(null);
    setSave("idle");
  };

  const toggleReview = () =>
    start(async () => {
      setSave("saving");
      if (review) {
        const r = await api.deleteAnnotation(review.id);
        if (!r.ok) return (setSave("error"), setError(r.error));
        onAnnotation(review, true);
      } else {
        const r = await api.createAnnotation({ ...base, kind: "revisar", body: "" });
        if (!r.ok) return (setSave("error"), setError(r.error));
        onAnnotation(r.data);
      }
      setSave("saved");
    });

  const saveAnnotation = (kind: "nota" | "duvida") =>
    start(async () => {
      setSave("saving");
      const r = await api.createAnnotation({ ...base, kind, body: text });
      if (!r.ok) return (setSave("error"), setError(r.error));
      onAnnotation(r.data);
      setSave("saved");
      setText("");
      setPanel(null);
    });

  const ask = () =>
    start(async () => {
      setError(null);
      const r = await api.askClarification({ lessonId, sectionId: section.id, question: text });
      if (!r.ok) return setError(r.error);
      setAnswers((a) => [...a, { id: r.data.id, section_id: section.id, question: r.data.question, answer_markdown: r.data.answerMarkdown, verification_pending: r.data.verificationPending }]);
      setText("");
    });

  const btn = (p: Panel | "revisar", icon: IconName, labelText: string, pressed: boolean, onClick: () => void) => (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={pressed}
      aria-expanded={p !== "revisar" ? panel === p : undefined}
      className="inline-flex min-h-10 items-center gap-1.5 rounded-md px-2.5 t-small font-semibold text-tinta-suave hover:bg-nevoa hover:text-tinta aria-pressed:bg-nevoa aria-pressed:text-destaque"
    >
      <Icon name={icon} className="size-4" /> {labelText}
    </button>
  );

  return (
    <div className="mt-3">
      <div className="flex flex-wrap items-center gap-1" role="toolbar" aria-label={`Ações da seção ${section.title}`}>
        {btn("esclarecer", "lampada", "Esclarecer", panel === "esclarecer", () => open("esclarecer"))}
        {btn("revisar", "bookmark", review ? "Marcado para revisar" : "Revisar depois", !!review, toggleReview)}
        {btn("nota", "nota", notes.length ? `Notas (${notes.length})` : "Anotar", panel === "nota", () => open("nota"))}
        {btn("duvida", "duvida", doubts.length ? `Dúvidas (${doubts.length})` : "Tenho dúvida", panel === "duvida", () => open("duvida"))}
        <span className="ml-1"><SaveIndicator state={save} /></span>
      </div>

      {answers.length > 0 && (
        <div className="mt-3 flex flex-col gap-3">
          {answers.map((c) => (
            <div key={c.id} className="rounded-md border border-azul/25 bg-nevoa/60 px-4 py-3">
              <p className="t-small font-semibold">
                <Icon name="lampada" className="mr-1 inline size-4 text-destaque" />
                {c.question}
              </p>
              <div className="leitura mt-1 !text-[1rem]"><Markdown>{c.answer_markdown}</Markdown></div>
              <p className="t-tiny text-tinta-fraca">
                Explicação gerada por IA a partir desta aula.{c.verification_pending ? " Contém ponto que depende de conferência na fonte oficial." : ""}
              </p>
            </div>
          ))}
        </div>
      )}

      {panel && (
        <div className="mt-3 rounded-md border border-linha bg-superficie p-3">
          {panel === "nota" && notes.length > 0 && (
            <ul className="mb-3 flex flex-col gap-2 t-small">
              {notes.map((n) => <li key={n.id} className="whitespace-pre-line rounded bg-papel px-3 py-2">{n.body}</li>)}
            </ul>
          )}
          {panel === "duvida" && doubts.length > 0 && (
            <ul className="mb-3 flex flex-col gap-2 t-small">
              {doubts.map((d) => (
                <li key={d.id} className="flex items-start justify-between gap-2 rounded bg-papel px-3 py-2">
                  <span className={d.resolved ? "text-tinta-fraca line-through" : ""}>{d.body || "Dúvida sem descrição"}</span>
                  <button
                    type="button"
                    className="shrink-0 t-tiny font-semibold text-destaque"
                    onClick={() =>
                      start(async () => {
                        const r = await api.updateAnnotation(d.id, { resolved: !d.resolved });
                        if (r.ok) onAnnotation(r.data);
                        else setError(r.error);
                      })
                    }
                  >
                    {d.resolved ? "Reabrir" : "Resolvida"}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <label htmlFor={`txt-${section.id}-${panel}`} className="t-small font-semibold">
            {panel === "esclarecer" ? "O que não ficou claro?" : panel === "nota" ? "Sua anotação" : "Descreva a dúvida (opcional)"}
          </label>
          <textarea
            id={`txt-${section.id}-${panel}`}
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            maxLength={panel === "esclarecer" ? 500 : 4000}
            className={`${inputClass} mt-1.5 py-2`}
            placeholder={panel === "esclarecer" ? "Ex.: qual a diferença entre anulação e revogação?" : ""}
          />
          {error && <div className="mt-2"><Notice tone="erro">{error}</Notice></div>}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {panel === "esclarecer" ? (
              <Button onClick={ask} disabled={pending || text.trim().length < 3}>{pending ? "Pensando…" : "Pedir explicação"}</Button>
            ) : (
              <Button onClick={() => saveAnnotation(panel)} disabled={pending || (panel === "nota" && !text.trim())}>
                {pending ? "Salvando…" : panel === "nota" ? "Salvar anotação" : "Registrar dúvida"}
              </Button>
            )}
            <Button variant="discreto" onClick={() => setPanel(null)}>Fechar</Button>
            {panel === "esclarecer" && <span className="t-tiny text-tinta-fraca">A resposta aparece aqui, sem sair da aula.</span>}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Conclusão da leitura e resultado da unidade
// ---------------------------------------------------------------------------

function UnitResult({ lessonId, context, readingDone, nextId, total }: { lessonId: string; context: "fixacao" | "revisao"; readingDone: boolean; nextId: string | null; total: number }) {
  const hasQuestions = total > 0;
  const api = useStudyApi();
  const [result, setResult] = useState<QuizResult | null>(null);
  const [pending, start] = useTransition();
  if (!hasQuestions) return <div className="mt-4"><Notice tone="alerta">Esta aula ainda não tem questões.</Notice></div>;
  return (
    <div className="mt-6 flex flex-col gap-3 rounded-lg border border-linha bg-superficie p-4">
      <p className="font-semibold">Resultado da unidade</p>
      {!readingDone && context === "fixacao" ? (
        <p className="t-small text-tinta-suave">Conclua a leitura para calcular o resultado. Você já pode responder às questões.</p>
      ) : (
        <p className="t-small text-tinta-suave">
          {context === "fixacao"
            ? `Para liberar o próximo tema: responda as ${total} questões, com pelo menos 75% de acerto e todas as essenciais corretas. Vale sua última resposta em cada questão.`
            : "O cálculo usa sua última resposta em cada questão desta aula."}
        </p>
      )}
      {!result?.ok && (
        <Button
          variant="secundario"
          className="self-start"
          disabled={pending || (!readingDone && context === "fixacao")}
          onClick={() => start(async () => setResult(await api.evaluateQuiz(lessonId, context)))}
        >
          {pending ? "Calculando…" : "Calcular resultado"}
        </Button>
      )}
      {result && !result.ok && <Notice tone="erro">{result.error}</Notice>}
      {result?.ok && (
        <Notice tone={result.unlocksNext ? "sucesso" : "alerta"} title={`${Math.round((result.accuracy ?? 0) * 100)}% de acerto`}>
          <p>{result.explanation}</p>
          {!!result.recommendations?.length && <ul className="mt-2 list-disc pl-5">{result.recommendations.map((r) => <li key={r}>{r}</li>)}</ul>}
          {result.nextReviewAt && <p className="mt-2 t-tiny">Próxima revisão sugerida: {new Date(result.nextReviewAt).toLocaleDateString("pt-BR")}.</p>}
        </Notice>
      )}
      {result?.ok && result.unlocksNext && nextId && (
        <Link href={`/aula/${nextId}`} className="inline-flex min-h-11 items-center gap-1.5 self-start font-semibold text-destaque">
          Ir para a próxima aula <Icon name="setaDireita" className="size-4" />
        </Link>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Painel de anotações
// ---------------------------------------------------------------------------

function AnnotationsDialog({
  refEl,
  annotations,
  onGo,
  onChange,
}: {
  refEl: React.RefObject<HTMLDialogElement | null>;
  annotations: Annotation[];
  onGo: (sectionId: string | null) => void;
  onChange: (a: Annotation, removed?: boolean) => void;
}) {
  const api = useStudyApi();
  const [filter, setFilter] = useState<"todas" | "nota" | "revisar" | "duvida">("todas");
  const [confirming, setConfirming] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const list = annotations.filter((a) => filter === "todas" || a.kind === filter);
  const KIND: Record<Annotation["kind"], { label: string; icon: IconName }> = {
    nota: { label: "Nota", icon: "nota" },
    revisar: { label: "Revisar", icon: "bookmark" },
    duvida: { label: "Dúvida", icon: "duvida" },
  };
  return (
    <dialog ref={refEl} className="m-0 ml-auto h-dvh max-h-none w-[min(100vw,420px)] border-l border-linha bg-superficie p-0 backdrop:bg-black/30" aria-label="Minhas anotações">
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-linha px-4 py-3">
          <p className="t-h3">Minhas anotações</p>
          <button type="button" onClick={() => refEl.current?.close()} className="rounded-md p-2 hover:bg-nevoa" aria-label="Fechar anotações">
            <Icon name="x" />
          </button>
        </div>
        <div className="flex gap-1 border-b border-linha px-3 py-2" role="tablist">
          {(["todas", "nota", "revisar", "duvida"] as const).map((f) => (
            <button
              key={f}
              role="tab"
              aria-selected={filter === f}
              onClick={() => setFilter(f)}
              className="rounded-full px-3 py-1 t-small font-semibold text-tinta-suave aria-selected:bg-nevoa aria-selected:text-destaque"
            >
              {f === "todas" ? "Todas" : KIND[f].label}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {list.length === 0 ? (
            <p className="t-small text-tinta-suave">Nada aqui ainda. Use os botões abaixo de cada seção para anotar, marcar para revisar ou registrar uma dúvida.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {list.map((a) => (
                <li key={a.id} className="rounded-md border border-linha p-3">
                  <div className="flex items-center gap-2 t-tiny text-tinta-fraca">
                    <Icon name={KIND[a.kind].icon} className="size-4" />
                    <span className="font-semibold text-tinta">{KIND[a.kind].label}</span>
                    {a.kind === "duvida" && a.resolved && <Tag tone="verde">Resolvida</Tag>}
                    <span className="ml-auto">{new Date(a.updated_at).toLocaleDateString("pt-BR")}</span>
                  </div>
                  {a.body && <p className="mt-2 whitespace-pre-line t-small">{a.body}</p>}
                  <div className="mt-2 flex flex-wrap items-center gap-3 t-small">
                    <button type="button" className="font-semibold text-destaque" onClick={() => onGo(a.section_id)}>
                      {a.section_title ? `Ir para “${a.section_title}”` : "Ir para a aula"}
                    </button>
                    {confirming === a.id ? (
                      <>
                        <span className="text-tinta-suave">Excluir?</span>
                        <button
                          type="button"
                          disabled={pending}
                          className="font-semibold text-erro"
                          onClick={() =>
                            start(async () => {
                              const r = await api.deleteAnnotation(a.id);
                              if (r.ok) onChange(a, true);
                              setConfirming(null);
                            })
                          }
                        >
                          Sim, excluir
                        </button>
                        <button type="button" className="text-tinta-suave" onClick={() => setConfirming(null)}>Cancelar</button>
                      </>
                    ) : (
                      <button type="button" className="text-tinta-suave hover:text-erro" onClick={() => setConfirming(a.id)}>Excluir</button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </dialog>
  );
}
