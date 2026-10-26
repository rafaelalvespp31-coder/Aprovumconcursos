"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition, type ReactNode } from "react";
import { Markdown } from "@/components/markdown";
import { practiceToMarkdown, type PracticeCase } from "@/domain/content/practice";
import { Icon, type IconName } from "@/components/icons";
import { Button, Notice, Tag, inputClass } from "@/components/ui";
import { SaveIndicator, type SaveState } from "@/components/interactive";
import type { AnswerOutcome, QuestionData, SavedAnswer } from "@/components/question-card";
import type { Annotation } from "../../study-actions";
import type { QuizResult } from "./actions";
import { useStored } from "@/components/use-stored";
import { useStudyApi } from "@/components/study-api";
import { LEVELS, levelStatus, type LevelKey } from "@/domain/progress/levels";
import { SingleLevel } from "./levels-panel";
import { LessonTreePortal, type BoardOutlineItem } from "@/components/aula/lesson-board";
import { ApostilaMarkdown } from "@/components/aula/apostila-markdown";
import { ApostilaQuestion } from "@/components/aula/apostila-question";
import { apostilaPages, groupIntoModules, pageKey, type ApostilaPage } from "@/domain/content/apostila";

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
  /** Dados da capa (como no PDF): matéria, banca e tipo de conteúdo. */
  meta?: { subject: string | null; board: string | null; contentType: string | null; banner?: string | null };
  sections: ReaderSection[];
  nodes: Array<{ key: string; marker: string | null; title: string; taught: boolean }>;
  questions: Array<ReaderQuestion>;
  /** Referências da aula (tabela "Referências e fontes"). */
  references?: Array<{ kind?: string; citation: string; verified: boolean }>;
  /** Pontos que dependem de conferência na fonte oficial (caixa "Pendente de verificação"). */
  unverifiedClaims?: string[];
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
  /** Painel do PDF do conteúdo (gerar, baixar e excluir versões). */
  pdf?: React.ReactNode;
  /** Posição da aula no estudo (para "Aula 03" e "3 de 12 aulas"). */
  position?: { index: number; total: number } | null;
  /** Módulo da aula (plano do estudo). */
  moduleTitle?: string | null;
  /** Aulas do estudo, em ordem, com o módulo de cada uma (árvore da barra lateral). */
  outline?: BoardOutlineItem[];
}

export type ReaderQuestion = QuestionData & { nodeKey: string | null; level?: LevelKey; recovery_of?: string | null };

const sectionDomId = (id: string) => `secao-${id}`;
const LEVEL_TITLE: Record<LevelKey, string> = { facil: "Nível Fácil", medio: "Nível Médio", dificil: "Nível Difícil" };
const REF_KIND: Record<string, string> = { lei: "Lei", doutrina: "Doutrina", jurisprudencia: "Jurisprudência", texto_informado: "Conteúdo informado", outro: "Outra" };

/** Faixa preta com "///" e barra vermelha (título de parte, como no PDF). */
function Band({ children, id }: { children: ReactNode; id?: string }) {
  return (
    <h2 className="ap-faixa" id={id}>
      <span className="ap-faixa-barras" aria-hidden>{"///"}</span> {children}
    </h2>
  );
}

/**
 * Aula no formato apostila — o mesmo visual do PDF do APROVUM — dividida em páginas:
 * início (capa, resumo do estudo e sumário), um módulo por página, questões por nível e,
 * por fim, pontos de revisão e referências. Concluir todos os módulos registra a leitura.
 */
export function LessonReader(props: ReaderProps) {
  const api = useStudyApi();
  const { lesson, sections, nodes, questions, context } = props;
  const [annotations, setAnnotations] = useState(props.annotations);
  const [readingDone, setReadingDone] = useState(props.readingDone);
  const [levelsPassed, setLevelsPassed] = useState(props.levelsPassed);
  const [sessionAnswers, setSessionAnswers] = useState<Record<string, SavedAnswer>>({});
  const savedFor = (id: string) => sessionAnswers[id] ?? props.answers?.[id];
  const remember = (o: AnswerOutcome) => setSessionAnswers((m) => ({ ...m, [o.questionId]: { choice: o.choice, feedback: o.feedback } }));
  const [completing, startCompleting] = useTransition();
  const notesRef = useRef<HTMLDialogElement>(null);

  // Registra a abertura da aula (máquina de estados no servidor).
  useEffect(() => {
    void api.startLesson(lesson.id);
  }, [lesson.id, api]);

  const legal = useMemo(() => sections.some((s) => s.kind === "texto_legal"), [sections]);
  const modules = useMemo(() => groupIntoModules(sections, { legal }), [sections, legal]);
  const pages = useMemo(() => apostilaPages(modules.length), [modules.length]);
  const [storedPage, setStoredPage] = useStored<string>(`na:apostila:${lesson.id}`, "inicio");
  const storedP: ApostilaPage = pages.find((p) => pageKey(p) === storedPage) ?? pages[0]!;

  // Seções lidas: contam quando o aluno conclui o módulo que as contém.
  const [seenList, setSeenList] = useStored<string[]>(`na:secoes-vistas:${lesson.id}`, []);
  const seen = useMemo(() => new Set(seenList), [seenList]);
  const isSeen = (id: string) => readingDone || seen.has(id);
  const seenCount = sections.filter((s) => isSeen(s.id)).length;
  const moduleDone = (i: number) => modules[i]!.sections.every((s) => isSeen(s.id));
  const modulesDone = modules.filter((_, i) => moduleDone(i)).length;

  /** Cada módulo só abre depois de concluir o anterior; as questões, depois de toda a teoria. */
  const theoryDone = readingDone || modulesDone === modules.length;
  const isUnlocked = (p: ApostilaPage) =>
    p.kind === "modulo" ? readingDone || p.index === 0 || moduleDone(p.index - 1) : p.kind === "questoes" ? theoryDone || context === "revisao" : true;
  const firstPending = modules.findIndex((_, i) => !moduleDone(i));
  // Página guardada que ainda está trancada (ex.: veio de outro aparelho): abre o módulo pendente.
  const current: ApostilaPage = isUnlocked(storedP) ? storedP : firstPending >= 0 ? { kind: "modulo", index: firstPending } : pages[0]!;
  const currentIdx = pages.findIndex((p) => pageKey(p) === pageKey(current));
  const [lockMsg, setLockMsg] = useState<string | null>(null);
  useEffect(() => {
    if (!lockMsg) return;
    const t = setTimeout(() => setLockMsg(null), 3500);
    return () => clearTimeout(t);
  }, [lockMsg]);
  const go = (p: ApostilaPage) => {
    if (!isUnlocked(p)) {
      setLockMsg(firstPending >= 0 ? `Conclua o Módulo ${firstPending + 1} para avançar.` : "Conclua o módulo pendente para avançar.");
      return;
    }
    setLockMsg(null);
    setStoredPage(pageKey(p));
    requestAnimationFrame(() => document.getElementById("apostila")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };
  const goIdx = (i: number) => pages[i] && go(pages[i]!);

  /** Conclui o módulo: marca as seções como lidas e abre a próxima página. */
  const concludeModule = (i: number) => {
    const nextSeen = new Set([...seen, ...modules[i]!.sections.map((s) => s.id)]);
    setSeenList([...nextSeen]);
    // Navega direto (o módulo acabou de ser concluído; o estado ainda não foi atualizado).
    const next = () => {
      const target = pages[currentIdx + 1];
      if (!target) return;
      setLockMsg(null);
      setStoredPage(pageKey(target));
      requestAnimationFrame(() => document.getElementById("apostila")?.scrollIntoView({ behavior: "smooth", block: "start" }));
    };
    if (!readingDone && sections.every((s) => nextSeen.has(s.id))) {
      startCompleting(async () => {
        await api.completeReading(lesson.id);
        setReadingDone(true);
        next();
      });
      return;
    }
    next();
  };

  const annotationsBySection = useMemo(() => {
    const m = new Map<string, Annotation[]>();
    for (const a of annotations) {
      const k = a.section_id ?? "geral";
      m.set(k, [...(m.get(k) ?? []), a]);
    }
    return m;
  }, [annotations]);

  const official = questions.filter((q) => !q.recovery_of);
  const answered = questions.filter((q) => savedFor(q.id));
  const correct = answered.filter((q) => savedFor(q.id)!.feedback.correct);
  const wrong = answered.filter((q) => !savedFor(q.id)!.feedback.correct);
  const numberOf = useMemo(() => new Map(questions.map((q, i) => [q.id, i + 1])), [questions]);

  const firstOpenLevel = LEVELS.find((l) => levelStatus(levelsPassed, l.n) !== "aprovado")?.key ?? "dificil";
  const [levelTab, setLevelTab] = useState<LevelKey>(firstOpenLevel);
  const levelIndex = LEVELS.findIndex((l) => l.key === levelTab);
  const levelPending = official.filter((q) => (q.level ?? "facil") === levelTab && !savedFor(q.id)).length;
  const finished = levelsPassed >= 3;

  const renderQuestion = (q: ReaderQuestion, n: number, label?: string) => (
    <div key={q.id}>
      {label && <p className="ap-kicker mb-2">{label}</p>}
      <ApostilaQuestion q={q} number={n} level={q.level} context={context} initialMarked={props.markedQuestionIds.includes(q.id)} saved={savedFor(q.id)} onAnswered={remember} />
    </div>
  );

  const pageLabel = (p: ApostilaPage) => (p.kind === "inicio" ? "Início" : p.kind === "modulo" ? `Módulo ${p.index + 1}` : p.kind === "questoes" ? "Questões" : "Revisão e fontes");
  const pageDone = (p: ApostilaPage) => (p.kind === "modulo" ? moduleDone(p.index) : p.kind === "questoes" ? finished : false);

  // ---------------------------------------------------------------- páginas
  const startTarget = modules.findIndex((_, i) => !moduleDone(i));
  const inicio = (
    <>
      <section className="ap-banner" aria-label="Capa">
        {props.meta?.banner ? (
          <>
            {/* Arte da matéria inteira, na proporção dela (4:1), sem cortes nem texto por cima. */}
            <div className="ap-banner-img" role="img" aria-label={`Banner de ${props.meta.subject ?? "matéria"}`} style={{ ["--bn" as string]: `url("${props.meta.banner}")` }} />
            <div className="ap-banner-texto ap-banner-texto-faixa">
              <p className="ap-kicker ap-kicker-claro">Material de estudo{props.meta?.subject ? ` · ${props.meta.subject}` : ""}</p>
              <h1 className="ap-banner-titulo">{lesson.title}</h1>
            </div>
          </>
        ) : (
          <div className="ap-banner-arte" data-padrao="1">
            <div className="ap-banner-texto">
              <p className="ap-kicker ap-kicker-claro">Material de estudo{props.meta?.subject ? ` · ${props.meta.subject}` : ""}</p>
              <h1 className="ap-banner-titulo">{lesson.title}</h1>
            </div>
          </div>
        )}
        <dl className="ap-banner-info">
          <div>
            <dt>Estudo</dt>
            <dd>{lesson.trailTitle}</dd>
          </div>
          {props.meta?.board && (
            <div>
              <dt>Banca</dt>
              <dd>{props.meta.board}</dd>
            </div>
          )}
          <div>
            <dt>Tipo</dt>
            <dd>{props.meta?.contentType ?? (legal ? "Artigo ou trecho de lei" : "Tema")}</dd>
          </div>
          <div>
            <dt>Níveis</dt>
            <dd>{levelsPassed === 0 ? "Nenhum concluído" : LEVELS.slice(0, levelsPassed).map((l) => l.label).join(", ")}</dd>
          </div>
        </dl>
      </section>

      <Band>Resumo do estudo</Band>
      <div className="ap-stats">
        <div className="ap-stat"><b>{answered.length}</b><span>questões respondidas</span></div>
        <div className="ap-stat"><b>{answered.length ? `${Math.round((correct.length / answered.length) * 100)}%` : "—"}</b><span>acerto na última resposta</span></div>
        <div className="ap-stat"><b>{modulesDone}/{modules.length}</b><span>módulos concluídos</span></div>
        <div className="ap-stat"><b>{wrong.length}</b><span>pontos de revisão</span></div>
      </div>
      {props.notices && <div className="mt-4 flex flex-col gap-3">{props.notices}</div>}

      <Band>Sumário</Band>
      <nav aria-label="Sumário da aula" className="ap-sumario">
        <p className="ap-sum-grupo">Teoria</p>
        <ol>
          {modules.map((m, i) => (
            <li key={i}>
              <button type="button" onClick={() => go({ kind: "modulo", index: i })} data-testid={`sumario-modulo-${i + 1}`} aria-disabled={!isUnlocked({ kind: "modulo", index: i }) || undefined}>
                <span className="ap-sum-num">{String(i + 1).padStart(2, "0")}</span>
                <span className="ap-sum-titulo">{m.title}</span>
                <span className="ap-sum-pontos" aria-hidden />
                <span className="ap-sum-info">
                  {moduleDone(i) ? (
                    <><Icon name="check" className="size-4" /> concluído</>
                  ) : !isUnlocked({ kind: "modulo", index: i }) ? (
                    <><Icon name="cadeado" className="size-3.5" /> bloqueado</>
                  ) : (
                    `${m.sections.length} seç${m.sections.length === 1 ? "ão" : "ões"}`
                  )}
                </span>
              </button>
            </li>
          ))}
        </ol>
        <p className="ap-sum-grupo">Questões</p>
        <ol>
          {LEVELS.map((l) => {
            const st = levelStatus(levelsPassed, l.n);
            return (
              <li key={l.key}>
                <button type="button" onClick={() => { setLevelTab(l.key); go({ kind: "questoes" }); }}>
                  <span className="ap-sum-num" aria-hidden>·</span>
                  <span className="ap-sum-titulo">{LEVEL_TITLE[l.key]}</span>
                  <span className="ap-sum-pontos" aria-hidden />
                  <span className="ap-sum-info">{st === "aprovado" ? "aprovado" : st === "bloqueado" ? "bloqueado" : "liberado"}</span>
                </button>
              </li>
            );
          })}
        </ol>
        <p className="ap-sum-grupo">
          <button type="button" onClick={() => go({ kind: "revisao" })}>Pontos de revisão e referências</button>
        </p>
      </nav>
      <div className="ap-fim">
        <span />
        <button type="button" className="ap-btn ap-btn-vermelho" onClick={() => (startTarget >= 0 ? go({ kind: "modulo", index: startTarget }) : go({ kind: "questoes" }))} data-testid="comecar-aula">
          {seenCount === 0 ? "Começar a aula" : startTarget >= 0 ? `Continuar: Módulo ${startTarget + 1}` : "Ir para as questões"} <Icon name="setaDireita" className="size-4" />
        </button>
      </div>
    </>
  );

  const moduloPage = (i: number) => {
    const m = modules[i]!;
    const last = i === modules.length - 1;
    return (
      <>
        <Band>Teoria</Band>
        <p className="ap-kicker">Módulo {i + 1} de {modules.length}</p>
        <h2 className="ap-unidade">{m.title}</h2>
        {i === 0 && lesson.objective && (
          <div className="ap-objetivo">
            <p className="ap-kicker">Objetivo</p>
            <p>{lesson.objective}</p>
          </div>
        )}
        <div className="ap-secoes">
          {m.sections.map((s) => (
            <ApostilaSection
              key={s.id}
              section={s}
              lessonId={lesson.id}
              annotations={annotationsBySection.get(s.id) ?? []}
              clarifications={props.clarifications.filter((c) => c.section_id === s.id)}
              onAnnotation={(a, removed) => setAnnotations((list) => (removed ? list.filter((x) => x.id !== a.id) : [a, ...list.filter((x) => x.id !== a.id)]))}
            />
          ))}
        </div>
        {last && (props.unverifiedClaims?.length ?? 0) > 0 && (
          <div className="ap-pendente">
            <p className="ap-kicker">Pendente de verificação na fonte oficial</p>
            <ul>{props.unverifiedClaims!.map((c) => <li key={c}>{c}</li>)}</ul>
          </div>
        )}
        <div className="ap-fim">
          <button type="button" className="ap-btn ap-btn-contorno" onClick={() => goIdx(currentIdx - 1)}>
            <Icon name="setaEsquerda" className="size-4" /> <span className="sr-only sm:not-sr-only">Anterior</span>
          </button>
          <button type="button" className="ap-btn ap-btn-vermelho" disabled={completing} onClick={() => concludeModule(i)} data-testid={`concluir-modulo-${i + 1}`}>
            {completing ? "Salvando…" : last ? "Concluir a teoria e ir às questões" : `Concluir e ir ao Módulo ${i + 2}`} <Icon name="setaDireita" className="size-4" />
          </button>
        </div>
      </>
    );
  };

  const conclusion = (
    <section className="flex flex-col gap-3" aria-label="Concluir e avançar" data-testid="conclusao-aula">
      {finished || context === "revisao" ? (
        <Notice tone="sucesso" title="Tema concluído">Você passou por todos os módulos e aprovou os três níveis desta aula.</Notice>
      ) : (
        <Notice tone="info" title="Ainda falta aprovar os níveis">
          {LEVELS.filter((l) => levelStatus(levelsPassed, l.n) !== "aprovado").map((l) => l.label).join(", ")} ainda não aprovado(s). Você pode avançar e voltar depois.
        </Notice>
      )}
      {props.nextHref ? (
        <Link href={props.nextHref} className="ap-proximo">
          <span>
            <span className="ap-kicker ap-kicker-claro">Próximo tema</span>
            <span className="block text-lg font-bold">{props.nextLabel}</span>
          </span>
          <Icon name="setaDireita" className="size-6 shrink-0" />
        </Link>
      ) : (
        <p className="t-small text-tinta-suave">Este é o último tema desta matéria. Para continuar, crie um estudo novo ou coloque outros temas nesta pasta.</p>
      )}
    </section>
  );

  const questoesPage =
    context === "revisao" ? (
      <>
        <Band>Questões de revisão</Band>
        <div className="flex flex-col gap-4">{questions.map((q) => renderQuestion(q, numberOf.get(q.id)!))}</div>
        <UnitResult lessonId={lesson.id} context={context} readingDone={readingDone} nextId={props.nextId} total={questions.length} />
      </>
    ) : (
      <>
        <Band>Questões</Band>
        <p className="ap-intro">
          Três níveis, nesta ordem: fácil, médio e difícil. Cada um exige pelo menos 90% de acerto para liberar o seguinte. Errou? A recuperação refaz só os pontos errados.
          São questões de treino elaboradas pela plataforma, não questões oficiais.
        </p>
        <div className="ap-niveis" role="tablist" aria-label="Níveis de questões">
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
        <p className="ap-kicker">{official.filter((q) => (q.level ?? "facil") === levelTab).length} questões · {official.filter((q) => (q.level ?? "facil") === levelTab && savedFor(q.id)?.feedback.correct).length} acerto(s)</p>
        <h2 className="ap-unidade">{LEVEL_TITLE[levelTab]}</h2>
        <section aria-label={LEVEL_TITLE[levelTab]}>
          <SingleLevel
            key={levelTab}
            lessonId={lesson.id}
            levelKey={levelTab}
            questions={questions}
            interleavedIds={new Set()}
            levelsPassed={levelsPassed}
            readingDone={readingDone}
            renderQuestion={renderQuestion}
            onPassed={(n) => setLevelsPassed((p) => Math.max(p, n))}
            onAdvance={() => {
              const nxt = LEVELS[levelIndex + 1];
              if (nxt) setLevelTab(nxt.key);
            }}
            isAnswered={(id) => !!savedFor(id)}
          />
        </section>
        <div className="ap-fim">
          <button type="button" className="ap-btn ap-btn-contorno" onClick={() => goIdx(currentIdx - 1)}>
            <Icon name="setaEsquerda" className="size-4" /> <span className="sr-only sm:not-sr-only">Anterior</span>
          </button>
          <button
            type="button"
            className="ap-btn ap-btn-vermelho"
            onClick={() => {
              const nxt = LEVELS[levelIndex + 1];
              if (nxt) setLevelTab(nxt.key);
              else go({ kind: "revisao" });
              requestAnimationFrame(() => document.getElementById("apostila")?.scrollIntoView({ behavior: "smooth", block: "start" }));
            }}
            data-testid="proximo-nivel"
          >
            {LEVELS[levelIndex + 1] ? `Próximo nível: ${LEVELS[levelIndex + 1]!.label}` : "Pontos de revisão"} <Icon name="setaDireita" className="size-4" />
          </button>
        </div>
        {levelPending > 0 && <p className="ap-nota">Faltam {levelPending} questão(ões) neste nível.</p>}
        {levelTab === "dificil" && <div className="mt-6">{conclusion}</div>}
      </>
    );

  const revisaoPage = (
    <>
      <Band>Pontos de revisão</Band>
      {wrong.length === 0 ? (
        <div className="ap-callout ap-callout-preto">
          <p>{answered.length ? "Você não errou nenhuma questão deste conteúdo. Mesmo assim, faça as revisões espaçadas para manter o domínio." : "Responda as questões para ver aqui os pontos que precisam de revisão."}</p>
        </div>
      ) : (
        <ul className="ap-revisao">
          {wrong.map((q) => (
            <li key={q.id}>
              <span className="ap-chip">{LEVEL_TITLE[q.level ?? "facil"].replace("Nível ", "").toUpperCase()}</span>
              <span>
                <b>Questão {String(numberOf.get(q.id)).padStart(2, "0")}</b>
                {q.topic ? ` — ${q.topic}` : ""}
                <span className="block t-small text-tinta-suave">{q.statement.slice(0, 160)}{q.statement.length > 160 ? "…" : ""}</span>
              </span>
              <button type="button" className="ap-link" onClick={() => { setLevelTab(q.level ?? "facil"); go({ kind: "questoes" }); }}>Refazer</button>
            </li>
          ))}
        </ul>
      )}

      <Band>Referências e fontes</Band>
      {(props.references?.length ?? 0) > 0 ? (
        <div className="ap-tabela">
          <table>
            <thead>
              <tr>
                <th className="w-10">Nº</th>
                <th>Referência</th>
                <th className="w-32">Situação</th>
              </tr>
            </thead>
            <tbody>
              {props.references!.map((r, i) => (
                <tr key={`${i}-${r.citation}`}>
                  <td><b>{i + 1}</b></td>
                  <td>{r.kind && REF_KIND[r.kind] ? <span className="text-tinta-fraca">{REF_KIND[r.kind]}: </span> : null}{r.citation}</td>
                  <td className={r.verified ? "ap-ok" : "ap-nao-verificada"}>{r.verified ? "Do seu conteúdo" : "Não verificada"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="ap-intro">Esta aula não tem referências cadastradas.</p>
      )}
      <aside className="ap-callout"><p><i>Dispositivos legais, doutrina e jurisprudência citados devem ser conferidos na fonte oficial.</i></p></aside>

      <h3 className="ap-sub">Conteúdo desta aula</h3>
      <ul className="ap-itens">
        {nodes.map((n) => (
          <li key={n.key}>
            <span className={/\brevogad[oa]s?\b/i.test(n.title) ? "item-revogado" : undefined}>{n.marker && <b className="mr-1">{n.marker}</b>}{n.title}</span>
            <Tag tone={n.taught ? "azul" : "ambar"}>{n.taught ? "Ensinado" : "Pendente"}</Tag>
          </li>
        ))}
      </ul>
      {props.pdf && <div className="mt-6">{props.pdf}</div>}
      {finished && <div className="mt-6">{conclusion}</div>}
      <div className="ap-fim">
        <button type="button" className="ap-btn ap-btn-contorno" onClick={() => goIdx(currentIdx - 1)}>
          <Icon name="setaEsquerda" className="size-4" /> <span className="sr-only sm:not-sr-only">Anterior</span>
        </button>
        <button type="button" className="ap-btn ap-btn-contorno" onClick={() => go({ kind: "inicio" })}>Voltar ao início</button>
      </div>
    </>
  );

  return (
    <div className="ap" id="apostila">
      {lockMsg && (
        <p role="alert" className="ap-aviso" data-testid="trava-modulo">
          <Icon name="cadeado" className="size-4 shrink-0" /> {lockMsg}
        </p>
      )}
      {props.outline && <LessonTreePortal trailId={lesson.trailId} trailTitle={lesson.trailTitle} outline={props.outline} currentId={lesson.id} />}

      <div className="ap-topo">
        <div className="ap-topo-linha">
          <Link href={`/trilhas/${lesson.trailId}`} className="ap-topo-estudo">{lesson.trailTitle}</Link>
          <div className="ap-topo-acoes">
            {props.position && <span className="ap-topo-pos">Aula {String(props.position.index + 1).padStart(2, "0")} de {props.position.total}</span>}
            <button type="button" className="ap-link" onClick={() => notesRef.current?.showModal()}>
              <Icon name="nota" className="size-4" /> Minhas anotações{annotations.length ? ` (${annotations.length})` : ""}
            </button>
          </div>
        </div>
        <nav className="ap-paginas" aria-label="Páginas da aula">
          {pages.map((p, i) => (
            <button
              key={pageKey(p)}
              type="button"
              onClick={() => go(p)}
              aria-current={i === currentIdx ? "page" : undefined}
              aria-disabled={!isUnlocked(p) || undefined}
              data-concluida={pageDone(p) ? "1" : undefined}
              data-trancada={!isUnlocked(p) ? "1" : undefined}
              title={!isUnlocked(p) ? "Conclua o módulo anterior para liberar" : p.kind === "modulo" ? modules[p.index]!.title : undefined}
            >
              {pageDone(p) ? <Icon name="check" className="size-3.5" /> : !isUnlocked(p) ? <Icon name="cadeado" className="size-3.5" /> : null}
              {pageLabel(p)}
            </button>
          ))}
        </nav>
        <div className="ap-progresso" aria-hidden>
          <span style={{ width: `${Math.round((((readingDone ? 1 : sections.length ? seenCount / sections.length : 0) + levelsPassed) / 4) * 100)}%` }} />
        </div>
      </div>

      <div className="ap-folha" data-pagina={pageKey(current)}>
        {current.kind === "inicio" ? inicio : current.kind === "modulo" ? moduloPage(current.index) : current.kind === "questoes" ? questoesPage : revisaoPage}
        <footer className="ap-rodape">
          <span><b className="text-[#E10600]">{"///"}</b> <b>APROVUM</b> · Preparação de alto desempenho</span>
          <span className="ap-rodape-pag">{currentIdx + 1} / {pages.length}</span>
        </footer>
      </div>

      <div className="ap-aulas">
        {props.prevId ? <Link href={`/aula/${props.prevId}`} className="ap-link"><Icon name="setaEsquerda" className="size-4" /> Aula anterior</Link> : <span />}
        {props.nextId ? <Link href={`/aula/${props.nextId}`} className="ap-link">Próxima aula <Icon name="setaDireita" className="size-4" /></Link> : <span />}
      </div>

      <AnnotationsDialog
        refEl={notesRef}
        annotations={annotations}
        onGo={(id) => {
          notesRef.current?.close();
          if (id) {
            const mi = modules.findIndex((m) => m.sections.some((s) => s.id === id));
            if (mi >= 0 && !isUnlocked({ kind: "modulo", index: mi })) {
              setLockMsg(`Esta anotação está no Módulo ${mi + 1}: conclua os módulos anteriores para abri-lo.`);
              return;
            }
            if (mi >= 0) setStoredPage(pageKey({ kind: "modulo", index: mi }));
            setTimeout(() => document.getElementById(sectionDomId(id))?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
          }
        }}
        onChange={(a, removed) => setAnnotations((list) => (removed ? list.filter((x) => x.id !== a.id) : list.map((x) => (x.id === a.id ? a : x))))}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Seção no visual do PDF + ações (esclarecer, revisar depois, anotar, dúvida)
// ---------------------------------------------------------------------------


function ApostilaSection({
  section: s,
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
  const unverified = s.verification_status === "pendente";
  // Exemplos ":::exemplo" viram caixas "Na prática", exatamente como no PDF.
  let md = practiceToMarkdown(s.body_markdown);
  if (!s.body_markdown.includes(":::exemplo") && s.practice?.length) {
    md += s.practice.map((c) => `\n\n> **Na prática:** ${c.situation}${c.question ? `\n>\n> **Pergunta:** ${c.question}` : ""}\n>\n> **Resposta:** ${c.answer}`).join("");
  }
  const legal = s.kind === "texto_legal";
  return (
    <section id={sectionDomId(s.id)} className="ap-secao" aria-labelledby={`h-${s.id}`}>
      <h3 id={`h-${s.id}`} className="ap-sub">
        {s.title}
        {unverified && <i className="ap-nao-verificado"> [não verificado]</i>}
      </h3>
      <ApostilaMarkdown legal={legal}>{md}</ApostilaMarkdown>
      {legal && <p className="ap-nota">Confira sempre a redação vigente no Portal da Legislação do Planalto.</p>}
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

function UnitResult({ lessonId, context, nextId, total }: { lessonId: string; context: "fixacao" | "revisao"; readingDone: boolean; nextId: string | null; total: number }) {
  const hasQuestions = total > 0;
  const api = useStudyApi();
  const [result, setResult] = useState<QuizResult | null>(null);
  const [pending, start] = useTransition();
  if (!hasQuestions) return <div className="mt-4"><Notice tone="alerta">Esta aula ainda não tem questões.</Notice></div>;
  return (
    <div className="mt-6 flex flex-col gap-3 rounded-lg border border-linha bg-superficie p-4">
      <p className="font-semibold">Resultado da unidade</p>
      {(
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
          disabled={pending}
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
