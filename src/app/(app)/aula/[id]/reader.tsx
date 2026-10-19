"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Markdown } from "@/components/markdown";
import { ExampleCards, parseExamples } from "@/components/examples";
import { Flashcards } from "@/components/flashcards";
import { PracticeCard } from "@/components/practice-card";
import { PRACTICE_KINDS, extractPractice, type PracticeCase } from "@/domain/content/practice";
import { TrueFalseCards, parseTrueFalse } from "@/components/true-false-cards";
import { Icon, type IconName } from "@/components/icons";
import { Button, Notice, Tag, inputClass } from "@/components/ui";
import { SaveIndicator, type SaveState } from "@/components/interactive";
import { QuestionCard, type AnswerOutcome, type QuestionData, type SavedAnswer } from "@/components/question-card";
import { SECTION_LABELS, type LessonSectionKind } from "@/ai/pedagogy";
import type { Annotation } from "../../study-actions";
import type { QuizResult } from "./actions";
import { useStored } from "@/components/use-stored";
import { useStudyApi } from "@/components/study-api";
import { LEVELS, levelStatus, type LevelKey } from "@/domain/progress/levels";
import { SingleLevel } from "./levels-panel";
import { BOARD_CARDS, assignSectionsToCards, buildLessonBoard } from "@/domain/content/board";
import { LessonBoardView, LessonTreePortal, type BoardOutlineItem } from "@/components/aula/lesson-board";

export interface ReaderSection {
  id: string;
  kind: string;
  title: string;
  body_markdown: string;
  node_keys: string[];
  verification_status: string;
  /** Exemplos "Na prática" da versão atual do catálogo (têm prioridade sobre os copiados na criação do estudo). */
  practice?: PracticeCase[];
  /** Módulo (tema) a que a seção pertence, quando definido pela equipe no catálogo. */
  module?: string | null;
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
  /** Respostas já gravadas por questão (a tela reabre com elas marcadas). */
  answers?: Record<string, SavedAnswer>;
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
  /** Posição da aula no estudo (para "Aula 03" e "3 de 12 aulas"). */
  position?: { index: number; total: number } | null;
  /** Módulo da aula (plano do estudo). */
  moduleTitle?: string | null;
  /** Aulas do estudo, em ordem, com o módulo de cada uma (árvore da barra lateral). */
  outline?: BoardOutlineItem[];
}

export type ReaderQuestion = QuestionData & { nodeKey: string | null; level?: LevelKey; recovery_of?: string | null };

const sectionDomId = (id: string) => `secao-${id}`;

const LEVEL_TITLE: Record<LevelKey, string> = { facil: "Questões · Fácil", medio: "Questões · Médio", dificil: "Questões · Difícil" };

/**
 * Aula numa tela só: a visão em nove cards. Cada card abre, por cima da tela, o conteúdo
 * completo que pertence a ele (temas com anotações, esclarecimentos e a questão de cada
 * tema). O card 8 reúne as questões por nível (fácil → médio → difícil) com recuperação.
 * Concluir todos os cards de conteúdo registra a leitura (libera o cálculo dos níveis).
 */
export function LessonReader(props: ReaderProps) {
  const api = useStudyApi();
  const { lesson, sections, nodes, questions, context } = props;
  const [annotations, setAnnotations] = useState(props.annotations);
  const [readingDone, setReadingDone] = useState(props.readingDone);
  const [levelsPassed, setLevelsPassed] = useState(props.levelsPassed);
  const [activeQuestion, setActiveQuestion] = useState<string | null>(null);
  // Respostas dadas nesta visita (o card fechado desmonta as questões; a resposta fica aqui).
  const [sessionAnswers, setSessionAnswers] = useState<Record<string, SavedAnswer>>({});
  const savedFor = (id: string) => sessionAnswers[id] ?? props.answers?.[id];
  const remember = (o: AnswerOutcome) => setSessionAnswers((m) => ({ ...m, [o.questionId]: { choice: o.choice, feedback: o.feedback } }));
  const [completing, startCompleting] = useTransition();
  const notesRef = useRef<HTMLDialogElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  // Registra a abertura da aula (máquina de estados no servidor).
  useEffect(() => {
    void api.startLesson(lesson.id);
  }, [lesson.id, api]);

  const board = useMemo(() => buildLessonBoard({ title: lesson.title, sections, nodes }), [lesson.title, sections, nodes]);
  const byCard = useMemo(() => assignSectionsToCards(sections), [sections]);
  const cardOfSection = useMemo(() => {
    const m = new Map<string, number>();
    for (const [n, list] of byCard) for (const s of list) m.set(s.id, n);
    return m;
  }, [byCard]);
  /** Cards com conteúdo próprio (abrem os temas), na ordem dos números. */
  const contentCards = useMemo(() => BOARD_CARDS.filter((c) => c.n !== 8 && byCard.get(c.n)!.length > 0).map((c) => c.n), [byCard]);

  // Temas lidos: contam quando o aluno conclui o card que os contém.
  const [seenList, setSeenList] = useStored<string[]>(`na:secoes-vistas:${lesson.id}`, []);
  const seen = useMemo(() => new Set(seenList), [seenList]);
  const isSeen = (id: string) => readingDone || seen.has(id);
  const seenCount = sections.filter((s) => isSeen(s.id)).length;
  const cardDone = (n: number) => byCard.get(n)!.every((s) => isSeen(s.id));

  // Questão rápida de cada tema (nível fácil), logo depois do tema que ensina o item.
  const interleaved = useMemo(() => {
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
    return inter;
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

  // Aviso da trava (questão sem resposta no card aberto).
  const [blocked, setBlocked] = useState<string | null>(null);
  useEffect(() => {
    if (!blocked) return;
    const t = setTimeout(() => setBlocked(null), 4000);
    return () => clearTimeout(t);
  }, [blocked]);

  // Card aberto (diálogo por cima da visão da aula).
  const [openCard, setOpenCard] = useState<number | null>(null);
  const firstOpenLevel = LEVELS.find((l) => levelStatus(levelsPassed, l.n) !== "aprovado")?.key ?? "dificil";
  const [levelTab, setLevelTab] = useState<LevelKey>(firstOpenLevel);
  const scrollBodyTop = () => requestAnimationFrame(() => bodyRef.current?.scrollTo({ top: 0, behavior: "smooth" }));
  const openCardN = useCallback(
    (n: number, sectionId?: string) => {
      setBlocked(null);
      setOpenCard(n);
      if (!dialogRef.current?.open) dialogRef.current?.showModal();
      requestAnimationFrame(() => {
        if (sectionId) document.getElementById(sectionDomId(sectionId))?.scrollIntoView({ block: "start" });
        else bodyRef.current?.scrollTo({ top: 0 });
      });
    },
    [],
  );
  const closeCard = () => dialogRef.current?.close();

  // Trava: com questão sem resposta no card aberto, não avança e leva até ela.
  const pendingInDialog = () =>
    [...(bodyRef.current?.querySelectorAll<HTMLElement>('article[data-questao][data-respondida="0"]') ?? [])].filter((el) => !el.closest("details:not([open])"));
  const guard = (): boolean => {
    const pending = pendingInDialog();
    const first = pending[0];
    if (!first) return true;
    setBlocked(pending.length === 1 ? `Responda a ${first.getAttribute("aria-label")?.toLowerCase() ?? "questão"} para avançar.` : `Faltam ${pending.length} questões neste card. Responda para avançar.`);
    first.scrollIntoView({ behavior: "smooth", block: "center" });
    first.classList.remove("questao-pendente");
    void first.offsetWidth;
    first.classList.add("questao-pendente");
    first.focus({ preventScroll: true });
    return false;
  };

  const nextContentCard = (from: number) => contentCards.find((n) => n > from) ?? null;
  const prevCardOf = (n: number) => (n === 8 ? contentCards.at(-1) ?? null : [...contentCards].reverse().find((c) => c < n) ?? null);

  /** Conclui o card aberto: marca os temas como lidos e segue para o próximo card. */
  const concludeCard = (n: number) => {
    if (!guard()) return;
    setBlocked(null);
    const ids = byCard.get(n)!.map((s) => s.id);
    const nextSeen = new Set([...seen, ...ids]);
    setSeenList([...nextSeen]);
    const goNext = () => openCardN(nextContentCard(n) ?? 8);
    if (!readingDone && sections.every((s) => nextSeen.has(s.id))) {
      startCompleting(async () => {
        await api.completeReading(lesson.id);
        setReadingDone(true);
        goNext();
      });
      return;
    }
    goNext();
  };

  const levelIndex = LEVELS.findIndex((l) => l.key === levelTab);
  const nextLevel = () => {
    if (!guard()) return;
    setBlocked(null);
    const nxt = LEVELS[levelIndex + 1];
    if (nxt) {
      setLevelTab(nxt.key);
      scrollBodyTop();
    } else closeCard();
  };

  const renderQuestion = (q: ReaderQuestion, n: number, label?: string) => (
    <div key={q.id} onFocusCapture={() => setActiveQuestion(q.id)} onClickCapture={() => setActiveQuestion(q.id)}>
      {label && <p className="mb-2 t-tiny font-semibold text-destaque">{label}</p>}
      <QuestionCard q={q} number={n} context={context} active={activeQuestion === q.id} initialMarked={props.markedQuestionIds.includes(q.id)} saved={savedFor(q.id)} onAnswered={remember} />
    </div>
  );

  // Prévia do card 8: uma questão rápida por vez (motor real de questões).
  const quizPool = useMemo(() => questions.filter((q) => !q.recovery_of && (q.level ?? "facil") === "facil"), [questions]);
  const [quizIdx, setQuizIdx] = useState<number | null>(null);
  const quizStart = useMemo(() => Math.max(0, quizPool.findIndex((q) => !props.answers?.[q.id])), [quizPool, props.answers]);
  const quizAt = (quizIdx ?? quizStart) % Math.max(1, quizPool.length);

  const sectionsBody = (n: number) =>
    byCard.get(n)!.map((s) => (
      <div key={s.id}>
        <SectionBlock
          section={s}
          lessonId={lesson.id}
          nodes={nodes}
          annotations={annotationsBySection.get(s.id) ?? []}
          clarifications={props.clarifications.filter((c) => c.section_id === s.id)}
          onAnnotation={(a, removed) => setAnnotations((list) => (removed ? list.filter((x) => x.id !== a.id) : [a, ...list.filter((x) => x.id !== a.id)]))}
        />
        {(interleaved.get(s.id) ?? []).map((q) => (
          <div key={q.id} className="mt-5" onFocusCapture={() => setActiveQuestion(q.id)} onClickCapture={() => setActiveQuestion(q.id)}>
            <p className="mb-2 inline-flex items-center gap-1.5 t-small font-semibold text-destaque">
              <Icon name="raio" className="size-4" /> Questão sobre este tema
            </p>
            <QuestionCard q={q} number={numberOf.get(q.id)!} context={context} compact active={activeQuestion === q.id} initialMarked={props.markedQuestionIds.includes(q.id)} saved={savedFor(q.id)} onAnswered={remember} />
          </div>
        ))}
      </div>
    ));

  const finished = levelsPassed >= 3;
  const conclusion = (
    <section className="flex flex-col gap-3" aria-label="Concluir e avançar" data-testid="conclusao-aula">
      {finished || context === "revisao" ? (
        <Notice tone="sucesso" title="Tema concluído">Você passou por todos os temas e aprovou os três níveis desta aula.</Notice>
      ) : (
        <Notice tone="info" title="Ainda falta aprovar os níveis">
          {LEVELS.filter((l) => levelStatus(levelsPassed, l.n) !== "aprovado").map((l) => l.label).join(", ")} ainda não aprovado(s). Você pode avançar e voltar depois.
        </Notice>
      )}
      {props.nextHref ? (
        <Link href={props.nextHref} className="flex items-center justify-between gap-3 rounded-lg bg-[#E50914] px-5 py-4 text-white transition-transform active:scale-[0.98]">
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
  );

  const questionsBody =
    context === "revisao" ? (
      <section aria-label="Questões de revisão">
        <div className="flex flex-col gap-4">{questions.filter((q) => !interleavedIds.has(q.id)).map((q) => renderQuestion(q, numberOf.get(q.id)!))}</div>
        <UnitResult lessonId={lesson.id} context={context} readingDone={readingDone} nextId={props.nextId} total={questions.length} />
      </section>
    ) : (
      <>
        {byCard.get(8)!.length > 0 && <div className="mb-6">{sectionsBody(8)}</div>}
        <p className="mb-3 t-small text-tinta-suave">
          Três níveis, nesta ordem: fácil, médio e difícil. Cada um exige pelo menos 90% de acerto para liberar o seguinte. Errou? A recuperação refaz só os pontos errados.
        </p>
        <div className="al-niveis" role="tablist" aria-label="Níveis de questões">
          {LEVELS.map((l) => {
            const st = levelStatus(levelsPassed, l.n);
            return (
              <button key={l.key} type="button" role="tab" aria-selected={levelTab === l.key} onClick={() => setLevelTab(l.key)} data-status={st}>
                {st === "aprovado" ? <Icon name="check" className="size-3.5" /> : st === "bloqueado" ? <Icon name="cadeado" className="size-3.5" /> : null}
                {l.label}
              </button>
            );
          })}
        </div>
        <section aria-label={LEVEL_TITLE[levelTab]} className="mt-4">
          <SingleLevel
            key={levelTab}
            lessonId={lesson.id}
            levelKey={levelTab}
            questions={questions}
            interleavedIds={interleavedIds}
            levelsPassed={levelsPassed}
            readingDone={readingDone}
            renderQuestion={renderQuestion}
            onPassed={(n) => setLevelsPassed((p) => Math.max(p, n))}
            onAdvance={() => {
              const nxt = LEVELS[levelIndex + 1];
              if (nxt) {
                setLevelTab(nxt.key);
                scrollBodyTop();
              }
            }}
            isAnswered={(id) => !!savedFor(id)}
          />
        </section>
        {levelTab === "dificil" && <div className="mt-6">{conclusion}</div>}
      </>
    );

  const cardMeta = Object.fromEntries(
    BOARD_CARDS.map((c) => [c.n, { count: byCard.get(c.n)!.length, done: c.n === 8 ? finished : byCard.get(c.n)!.length > 0 && cardDone(c.n) }]),
  ) as Record<number, { count: number; done: boolean }>;
  const nextToStudy = contentCards.find((n) => !cardDone(n)) ?? 8;
  const readingFrac = sections.length ? seenCount / sections.length : 0;
  const open = openCard ? BOARD_CARDS.find((c) => c.n === openCard)! : null;
  const prevOfOpen = openCard ? prevCardOf(openCard) : null;

  // O aviso fica dentro do card aberto (o diálogo modal cobre o resto da tela).
  const blockedToast = blocked ? (
        <p role="alert" className="pointer-events-none fixed inset-x-4 bottom-24 z-[60] mx-auto flex max-w-md items-center justify-center gap-2 rounded-2xl bg-tinta px-4 py-3 text-center t-small font-semibold text-white shadow-[0_16px_40px_rgba(0,0,0,0.3)] md:bottom-28" data-testid="trava-proximo">
          <Icon name="cadeado" className="size-4 shrink-0" /> {blocked}
        </p>
  ) : null;

  return (
    <div>
      {!openCard && blockedToast}

      {props.outline && <LessonTreePortal trailId={lesson.trailId} trailTitle={lesson.trailTitle} outline={props.outline} currentId={lesson.id} />}

      <LessonBoardView
        board={board}
        lesson={lesson}
        position={props.position ?? null}
        moduleTitle={props.moduleTitle ?? null}
        progressPct={Math.round(((readingDone ? 1 : readingFrac) + levelsPassed) / 4 * 100)}
        reading={{ seen: seenCount, total: sections.length }}
        levelsPassed={levelsPassed}
        prevId={props.prevId}
        nextId={props.nextId}
        cards={cardMeta}
        startLabel={seenCount === 0 ? "Começar a aula" : finished ? "Rever a aula" : "Continuar a aula"}
        onStart={() => openCardN(nextToStudy)}
        onOpen={(n) => openCardN(n)}
        notesCount={annotations.length}
        onNotes={() => notesRef.current?.showModal()}
        notices={props.notices}
        quiz={
          quizPool.length
            ? {
                node: renderQuestion(quizPool[quizAt]!, numberOf.get(quizPool[quizAt]!.id)!),
                label: `Questão ${quizAt + 1} de ${quizPool.length} · nível fácil`,
                onNext: quizPool.length > 1 ? () => setQuizIdx((quizAt + 1) % quizPool.length) : null,
              }
            : null
        }
        after={
          <>
            {finished && conclusion}
            <details className="rounded-[12px] border border-[#E6E8EC] bg-white px-4 py-3 t-small">
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
          </>
        }
      />

      {/* Card aberto: conteúdo completo do card */}
      <dialog ref={dialogRef} className="al-dialogo" aria-labelledby="al-dialogo-titulo" onClose={() => setOpenCard(null)}>
        {open && (
          <div className="al-dialogo-caixa">
            <header className="al-dialogo-topo">
              <span className="al-num" aria-hidden>{open.n}</span>
              <div className="min-w-0 flex-1">
                <p className="al-dialogo-sobre">
                  {open.n === 8 ? (context === "revisao" ? "Revisão" : "Avaliação por níveis") : `Card ${open.n} · ${byCard.get(open.n)!.length} ${byCard.get(open.n)!.length === 1 ? "tema" : "temas"}`}
                </p>
                <h2 id="al-dialogo-titulo" className="al-dialogo-titulo">{open.title}</h2>
              </div>
              <button type="button" onClick={closeCard} className="al-dialogo-fechar" aria-label="Fechar e voltar aos cards">
                <Icon name="x" className="size-5" />
              </button>
            </header>
            <div ref={bodyRef} className="al-dialogo-corpo" key={open.n}>
              {open.n === 8 ? questionsBody : <div className="flex flex-col gap-6">{sectionsBody(open.n)}</div>}
            </div>
            {blockedToast}
            <nav className="al-dialogo-base" aria-label="Navegação entre cards">
              <button type="button" className="al-btn al-btn-contorno" disabled={!prevOfOpen} onClick={() => prevOfOpen && openCardN(prevOfOpen)}>
                <Icon name="setaEsquerda" className="size-4" /> <span className="hidden sm:inline">Card anterior</span><span className="sm:hidden">Anterior</span>
              </button>
              {open.n === 8 ? (
                context === "revisao" ? (
                  <button type="button" className="al-btn al-btn-vermelho" onClick={closeCard}>Voltar aos cards</button>
                ) : (
                  <button type="button" className="al-btn al-btn-vermelho" onClick={nextLevel}>
                    {LEVELS[levelIndex + 1] ? `Próximo nível: ${LEVELS[levelIndex + 1]!.label}` : "Concluir e voltar aos cards"} <Icon name="setaDireita" className="size-4" />
                  </button>
                )
              ) : (
                <button type="button" className="al-btn al-btn-vermelho" disabled={completing} onClick={() => concludeCard(open.n)}>
                  {completing ? (
                    "Salvando…"
                  ) : (
                    <>
                      <span className="sr-only sm:not-sr-only">{nextContentCard(open.n) ? "Concluir e ir ao próximo card" : "Concluir e ir para as questões"}</span>
                      <span aria-hidden className="sm:hidden">{nextContentCard(open.n) ? "Concluir card" : "Ir para as questões"}</span>
                    </>
                  )} <Icon name="setaDireita" className="size-4" />
                </button>
              )}
            </nav>
          </div>
        )}
      </dialog>

      <AnnotationsDialog
        refEl={notesRef}
        annotations={annotations}
        onGo={(id) => {
          notesRef.current?.close();
          if (id) openCardN(cardOfSection.get(id) ?? 1, id);
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
  // Blocos ":::exemplo" saem do texto e viram o card "Na prática" no fim do tema.
  const { body: md, cases: ownCases } = extractPractice(s.body_markdown);
  const body = <Markdown legal={kind === "texto_legal"}>{md}</Markdown>;
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
  } else if (kind === "exemplos" || (kind === "aplicacao" && parseExamples(md).some((c) => c.answer))) {
    // Exemplos sempre como casos interativos: situação → pensar → conferir o enquadramento.
    content = <ExampleCards markdown={md} kind={kind} />;
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
    content = <Flashcards markdown={md} />;
  } else if (kind === "pegadinhas" && parseTrueFalse(md).length) {
    // Pegadinhas no formato "afirmação → CERTO/ERRADO" viram itens para julgar.
    content = <TrueFalseCards markdown={md} />;
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
  const asCases = kind === "aplicacao" && parseExamples(md).some((c) => c.answer);
  const practice = PRACTICE_KINDS.has(kind) && !asCases ? (s.practice?.length ? s.practice : ownCases) : [];

  return (
    <section id={sectionDomId(s.id)} className="scroll-mt-16 border-b border-linha/70 pb-4 pt-2" aria-labelledby={`h-${s.id}`}>
      <div className="flex flex-wrap items-center gap-2">
        <h2 id={`h-${s.id}`} className="font-sans text-[1.2rem] font-[650] tracking-[-0.01em]">{label}</h2>
        {unverified && <Tag tone="ambar">Não verificado</Tag>}
      </div>
      <div className="leitura mt-2">{content}</div>
      {practice.length > 0 && (
        <PracticeCard cases={practice} onReread={() => document.getElementById(sectionDomId(s.id))?.scrollIntoView({ behavior: "smooth", block: "start" })} />
      )}
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
