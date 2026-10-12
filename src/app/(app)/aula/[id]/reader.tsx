"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Markdown } from "@/components/markdown";
import { Icon, type IconName } from "@/components/icons";
import { Button, Notice, Tag, inputClass } from "@/components/ui";
import { ReadingProgress, SaveIndicator, type SaveState } from "@/components/interactive";
import { QuestionCard, type QuestionData } from "@/components/question-card";
import { SECTION_LABELS, type LessonSectionKind } from "@/ai/pedagogy";
import type { Annotation } from "../../study-actions";
import type { QuizResult } from "./actions";
import { useStored } from "@/components/use-stored";
import { useStudyApi } from "@/components/study-api";
import type { LevelKey } from "@/domain/progress/levels";
import { LevelsPanel } from "./levels-panel";

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
  notices: React.ReactNode;
  /** Pré-visualização de design: não dispara efeitos no servidor. */
}

export type ReaderQuestion = QuestionData & { nodeKey: string | null; level?: LevelKey; recovery_of?: string | null };

const sectionDomId = (id: string) => `secao-${id}`;

export function LessonReader(props: ReaderProps) {
  const api = useStudyApi();
  const { lesson, sections, nodes, questions, context } = props;
  const [annotations, setAnnotations] = useState(props.annotations);
  const [readingDone, setReadingDone] = useState(props.readingDone);
  const [activeSection, setActiveSection] = useState<string | null>(sections[0]?.id ?? null);
  const [activeQuestion, setActiveQuestion] = useState<string | null>(null);
  const tocRef = useRef<HTMLDialogElement>(null);
  const notesRef = useRef<HTMLDialogElement>(null);

  // Registra a abertura da aula (máquina de estados no servidor).
  useEffect(() => {
    void api.startLesson(lesson.id);
  }, [lesson.id, api]);

  // Seção visível atual (para o índice).
  useEffect(() => {
    const els = sections.map((s) => document.getElementById(sectionDomId(s.id))).filter((e): e is HTMLElement => !!e);
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setActiveSection(visible.target.id.replace("secao-", ""));
      },
      { rootMargin: "-20% 0px -65% 0px" },
    );
    els.forEach((e) => obs.observe(e));
    return () => obs.disconnect();
  }, [sections]);

  // Seções percorridas: conta quando o FIM da seção passa pela tela. Pular pelo índice
  // não conta — a leitura só pode ser concluída depois de passar por todas as formas de ensino.
  const [seenList, setSeenList] = useStored<string[]>(`na:secoes-vistas:${lesson.id}`, []);
  const seen = useMemo(() => new Set(seenList), [seenList]);
  useEffect(() => {
    if (readingDone) return;
    const els = [...document.querySelectorAll<HTMLElement>("[data-fim-secao]")];
    const obs = new IntersectionObserver((entries) => {
      const hit = entries.filter((e) => e.isIntersecting).map((e) => (e.target as HTMLElement).dataset.fimSecao!);
      const fresh = hit.filter((id) => !seen.has(id));
      if (fresh.length) setSeenList([...seen, ...fresh]);
    });
    els.forEach((e) => obs.observe(e));
    return () => obs.disconnect();
  }, [sections, readingDone, seen, setSeenList]);
  const seenCount = readingDone ? sections.length : sections.filter((s) => seen.has(s.id)).length;
  const unseen = readingDone ? [] : sections.filter((s) => !seen.has(s.id));

  // Distribui questões: a primeira questão de cada item aparece logo após a seção que o ensina.
  const { interleaved, remaining } = useMemo(() => {
    const placed = new Set<string>();
    const inter = new Map<string, ReaderQuestion[]>();
    // Perguntas rápidas: só questões oficiais do nível fácil (o 1º nível liberado).
    const quick = questions.filter((q) => !q.recovery_of && (q.level ?? "facil") === "facil");
    for (const s of sections) {
      const q = quick.find((q) => !placed.has(q.id) && q.nodeKey && s.node_keys.includes(q.nodeKey));
      if (q && s.kind !== "texto_legal" && s.kind !== "objetivo") {
        placed.add(q.id);
        inter.set(s.id, [q]);
      }
    }
    return { interleaved: inter, remaining: questions.filter((q) => !placed.has(q.id)) };
  }, [sections, questions]);
  const numberOf = useMemo(() => new Map(questions.map((q, i) => [q.id, i + 1])), [questions]);

  const annotationsBySection = useMemo(() => {
    const m = new Map<string, Annotation[]>();
    for (const a of annotations) {
      const k = a.section_id ?? "geral";
      m.set(k, [...(m.get(k) ?? []), a]);
    }
    return m;
  }, [annotations]);

  const goTo = useCallback((id: string) => {
    document.getElementById(sectionDomId(id))?.scrollIntoView({ behavior: "smooth", block: "start" });
    tocRef.current?.close();
  }, []);

  const counts = {
    nota: annotations.filter((a) => a.kind === "nota").length,
    revisar: annotations.filter((a) => a.kind === "revisar").length,
    duvida: annotations.filter((a) => a.kind === "duvida" && !a.resolved).length,
  };

  const toc = (
    <ol className="flex flex-col gap-0.5">
      {sections.map((s) => {
        const anns = annotationsBySection.get(s.id) ?? [];
        return (
          <li key={s.id}>
            <button
              type="button"
              onClick={() => goTo(s.id)}
              aria-current={activeSection === s.id ? "location" : undefined}
              className="flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left t-small text-tinta-suave hover:bg-nevoa aria-[current=location]:bg-nevoa aria-[current=location]:font-semibold aria-[current=location]:text-destaque"
            >
              <span className="flex-1">{s.title || SECTION_LABELS[s.kind as LessonSectionKind]}</span>
              {(readingDone || seen.has(s.id)) && <Icon name="check" className="mt-0.5 size-3.5 text-dominado" label="Seção percorrida" />}
              {anns.some((a) => a.kind === "revisar") && <Icon name="bookmark" className="mt-0.5 size-3.5 text-destaque" label="Marcado para revisar" />}
              {anns.some((a) => a.kind === "duvida" && !a.resolved) && <Icon name="duvida" className="mt-0.5 size-3.5 text-alerta" label="Dúvida aberta" />}
              {anns.some((a) => a.kind === "nota") && <Icon name="nota" className="mt-0.5 size-3.5 text-tinta-fraca" label="Tem anotação" />}
            </button>
          </li>
        );
      })}
      <li>
        <button type="button" onClick={() => document.getElementById("questoes")?.scrollIntoView({ behavior: "smooth" })} className="w-full rounded-md px-2 py-1.5 text-left t-small font-semibold text-destaque hover:bg-nevoa">
          Questões da aula ({questions.length})
        </button>
      </li>
    </ol>
  );

  return (
    <div>
      <ReadingProgress targetId="corpo-aula" />

      {/* Barra compacta (celular) */}
      <div className="sticky top-1 z-20 -mx-4 mb-4 flex items-center gap-2 border-b border-linha bg-papel/95 px-4 py-2 backdrop-blur md:hidden">
        <button type="button" onClick={() => tocRef.current?.showModal()} className="inline-flex min-h-10 items-center gap-1.5 rounded-md border border-linha-forte bg-superficie px-3 t-small font-semibold">
          <Icon name="indice" className="size-4" /> Índice
        </button>
        <button type="button" onClick={() => notesRef.current?.showModal()} className="inline-flex min-h-10 items-center gap-1.5 rounded-md border border-linha-forte bg-superficie px-3 t-small font-semibold">
          <Icon name="nota" className="size-4" /> Anotações {annotations.length > 0 && <span className="tabular-nums">({annotations.length})</span>}
        </button>
      </div>

      <div className="md:grid md:grid-cols-[220px_minmax(0,1fr)] md:gap-10 lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="hidden md:block">
          <div className="sticky top-6 flex max-h-[calc(100dvh-3rem)] flex-col gap-4 overflow-y-auto pb-6">
            <Link href={`/trilhas/${lesson.trailId}`} className="inline-flex items-center gap-1 t-small font-semibold text-destaque">
              <Icon name="chevronLeft" className="size-4" /> {lesson.trailTitle}
            </Link>
            <nav aria-label="Índice da aula">
              <p className="mb-1 px-2 t-tiny font-semibold text-tinta-fraca">
                Nesta aula · <span className="tabular-nums" data-testid="secoes-vistas">{seenCount} de {sections.length}</span> seções
              </p>
              {toc}
            </nav>
            <button type="button" onClick={() => notesRef.current?.showModal()} className="mx-2 inline-flex items-center gap-2 t-small font-semibold text-tinta-suave hover:text-destaque">
              <Icon name="nota" className="size-4" /> Minhas anotações ({annotations.length})
            </button>
          </div>
        </aside>

        <article id="corpo-aula" className="min-w-0">
          <header>
            <Link href={`/trilhas/${lesson.trailId}`} className="t-small text-destaque underline underline-offset-2 md:hidden">{lesson.trailTitle}</Link>
            <h1 className="mt-1 t-h1">{lesson.title}</h1>
            <p className="mt-1 max-w-[68ch] text-tinta-suave">{lesson.objective}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2 t-tiny text-tinta-fraca">
              {lesson.stateLabel && <Tag tone="azul">{lesson.stateLabel}</Tag>}
              <span>~{lesson.estimatedMinutes} min de leitura e prática (estimativa)</span>
              {counts.duvida > 0 && <Tag tone="ambar">{counts.duvida} dúvida(s) aberta(s)</Tag>}
            </div>
          </header>

          <div className="mt-5 flex flex-col gap-3">{props.notices}</div>

          <details className="mt-5 rounded-md border border-linha bg-superficie px-4 py-3 t-small">
            <summary className="cursor-pointer font-semibold">Itens do seu conteúdo nesta aula ({nodes.length})</summary>
            <ul className="mt-2 flex flex-col gap-1">
              {nodes.map((n) => (
                <li key={n.key} className="flex items-start justify-between gap-3">
                  <span>{n.marker && <span className="mr-1 font-semibold text-destaque">{n.marker}</span>}{n.title}</span>
                  <Tag tone={n.taught ? "azul" : "ambar"}>{n.taught ? "Ensinado" : "Pendente"}</Tag>
                </li>
              ))}
            </ul>
          </details>

          <div className="mt-6 flex flex-col gap-2">
            {sections.map((s) => (
              <div key={s.id}>
                <SectionBlock
                  section={s}
                  lessonId={lesson.id}
                  nodes={nodes}
                  annotations={annotationsBySection.get(s.id) ?? []}
                  clarifications={props.clarifications.filter((c) => c.section_id === s.id)}
                  onAnnotation={(a, removed) =>
                    setAnnotations((list) => (removed ? list.filter((x) => x.id !== a.id) : [a, ...list.filter((x) => x.id !== a.id)]))
                  }
                />
                <span data-fim-secao={s.id} aria-hidden className="block h-px" />
                {(interleaved.get(s.id) ?? []).map((q) => (
                  <div key={q.id} className="my-6" onFocusCapture={() => setActiveQuestion(q.id)} onClickCapture={() => setActiveQuestion(q.id)}>
                    <p className="mb-2 inline-flex items-center gap-1.5 t-small font-semibold text-destaque">
                      <Icon name="raio" className="size-4" /> Pergunta rápida sobre esta seção
                    </p>
                    <QuestionCard q={q} number={numberOf.get(q.id)!} context={context} compact active={activeQuestion === q.id} initialMarked={props.markedQuestionIds.includes(q.id)} />
                  </div>
                ))}
              </div>
            ))}
          </div>

          <ReadingDone
            lessonId={lesson.id}
            done={readingDone}
            onDone={() => setReadingDone(true)}
            seenCount={seenCount}
            total={sections.length}
            nextUnseen={unseen[0] ? { id: unseen[0].id, title: unseen[0].title || SECTION_LABELS[unseen[0].kind as LessonSectionKind] } : null}
            onGo={goTo}
          />

          <section id="questoes" className="mt-10 scroll-mt-6" aria-labelledby="questoes-titulo">
            <h2 id="questoes-titulo" className="t-h2">{context === "revisao" ? "Revisão da aula" : "Avaliação por níveis"}</h2>
            {context === "revisao" ? (
              <>
                <p className="mt-1 t-small text-tinta-suave">
                  {remaining.length} questão(ões) aqui{interleaved.size ? ` e ${questions.length - remaining.length} ao longo da aula` : ""}. Seu resultado considera todas.
                </p>
                <div className="mt-4 flex flex-col gap-4">
                  {remaining.map((q) => (
                    <div key={q.id} onFocusCapture={() => setActiveQuestion(q.id)} onClickCapture={() => setActiveQuestion(q.id)}>
                      <QuestionCard q={q} number={numberOf.get(q.id)!} context={context} active={activeQuestion === q.id} initialMarked={props.markedQuestionIds.includes(q.id)} />
                    </div>
                  ))}
                </div>
                <UnitResult lessonId={lesson.id} context={context} readingDone={readingDone} nextId={props.nextId} total={questions.length} />
              </>
            ) : (
              <LevelsPanel
                lessonId={lesson.id}
                trailId={lesson.trailId}
                questions={questions}
                interleavedIds={new Set([...interleaved.values()].flat().map((q) => q.id))}
                initialLevelsPassed={props.levelsPassed}
                readingDone={readingDone}
                nextId={props.nextId}
                renderQuestion={(q, n, label) => (
                  <div key={q.id} onFocusCapture={() => setActiveQuestion(q.id)} onClickCapture={() => setActiveQuestion(q.id)}>
                    {label && <p className="mb-2 t-tiny font-semibold text-destaque">{label}</p>}
                    <QuestionCard q={q} number={n} context={context} active={activeQuestion === q.id} initialMarked={props.markedQuestionIds.includes(q.id)} />
                  </div>
                )}
              />
            )}
          </section>

          <nav aria-label="Aulas" className="mt-12 flex flex-wrap justify-between gap-3 border-t border-linha pt-5">
            {props.prevId ? (
              <Link href={`/aula/${props.prevId}`} className="inline-flex min-h-11 items-center gap-1.5 font-semibold text-destaque">
                <Icon name="setaEsquerda" className="size-4" /> Aula anterior
              </Link>
            ) : <span />}
            {props.nextId && (
              <Link href={`/aula/${props.nextId}`} className="inline-flex min-h-11 items-center gap-1.5 font-semibold text-destaque">
                Próxima aula <Icon name="setaDireita" className="size-4" />
              </Link>
            )}
          </nav>
        </article>
      </div>

      <dialog ref={tocRef} className="m-0 mt-auto w-full max-w-none rounded-t-lg border border-linha bg-superficie p-4 backdrop:bg-black/40 md:hidden" aria-label="Índice da aula">
        <div className="mb-2 flex items-center justify-between">
          <p className="t-h3">Nesta aula</p>
          <button type="button" onClick={() => tocRef.current?.close()} className="rounded-md p-2 hover:bg-nevoa" aria-label="Fechar índice">
            <Icon name="x" />
          </button>
        </div>
        <div className="max-h-[60dvh] overflow-y-auto">{toc}</div>
      </dialog>

      <AnnotationsDialog
        refEl={notesRef}
        annotations={annotations}
        onGo={(id) => {
          notesRef.current?.close();
          if (id) goTo(id);
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
  const body = <Markdown>{s.body_markdown}</Markdown>;
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
          Fonte: trecho do conteúdo que você informou{src.length ? ` (${src.map((n) => n.marker ?? n.title).join(", ")})` : ""}. Confira a redação vigente na fonte oficial.
        </p>
      </div>
    );
  } else if (kind === "exemplos" || kind === "aplicacao") {
    content = (
      <details className="group my-2 rounded-md border border-linha bg-superficie">
        <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 font-sans font-semibold">
          <Icon name="chevronRight" className="size-4 transition-transform group-open:rotate-90" />
          {kind === "exemplos" ? "Ver exemplos" : "Ver aplicação prática"}
        </summary>
        <div className="border-t border-linha px-4 pt-3">{body}</div>
      </details>
    );
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

function ReadingDone({
  lessonId,
  done,
  onDone,
  seenCount,
  total,
  nextUnseen,
  onGo,
}: {
  lessonId: string;
  done: boolean;
  onDone: () => void;
  seenCount: number;
  total: number;
  nextUnseen: { id: string; title: string } | null;
  onGo: (id: string) => void;
}) {
  const api = useStudyApi();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  if (done) {
    return (
      <div className="mt-8">
        <Notice tone="sucesso" title="Leitura concluída">Agora resolva todas as questões de fixação para liberar o próximo tema.</Notice>
      </div>
    );
  }
  const complete = seenCount >= total;
  return (
    <div className="mt-8 flex flex-col gap-2 rounded-lg border border-linha bg-superficie p-4">
      <p className="font-semibold">Chegou ao fim da leitura?</p>
      <p className="t-small text-tinta-suave">
        O tema só avança depois de passar por todas as formas de ensino. Ler não conta como domínio: isso vem das questões e da revisão.
      </p>
      <div className="flex items-center gap-3">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-nevoa" role="progressbar" aria-label="Seções percorridas" aria-valuemin={0} aria-valuemax={total} aria-valuenow={seenCount}>
          <div className="h-full rounded-full bg-azul transition-[width] duration-500" style={{ width: `${total ? (seenCount / total) * 100 : 0}%` }} />
        </div>
        <span className="t-small tabular-nums text-tinta-suave">{seenCount} de {total} seções</span>
      </div>
      {!complete && nextUnseen && (
        <button type="button" onClick={() => onGo(nextUnseen.id)} className="self-start t-small font-semibold text-destaque underline underline-offset-2">
          Falta percorrer: {nextUnseen.title}
        </button>
      )}
      <Button
        className="self-start"
        disabled={pending || !complete}
        onClick={() =>
          start(async () => {
            const r = await api.completeReading(lessonId);
            setMsg(r.explanation);
            onDone();
          })
        }
      >
        {pending ? "Registrando…" : "Concluí a leitura"}
      </Button>
      {msg && <p className="t-small text-tinta-suave" role="status">{msg}</p>}
    </div>
  );
}

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
