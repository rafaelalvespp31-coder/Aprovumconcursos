import Link from "next/link";
import { Markdown } from "@/components/markdown";
import { getTopic, getTopicQuestions, publishBlockers, requireAdmin } from "@/server/services/catalog";
import { TopicForm } from "../topic-form";
import { GenerationPanel, PublishPanel, QuestionsEditor, SectionsEditor } from "./editor";

export const metadata = { title: "Tema do catálogo" };
// Os passos de geração chamam a IA a partir desta página.
export const maxDuration = 300;

export default async function TopicPage({ params }: { params: Promise<{ id: string }> }) {
  // A verificação fica também na página: layout e página renderizam em paralelo.
  await requireAdmin();
  const { id } = await params;
  const [topic, questions] = await Promise.all([getTopic(id), getTopicQuestions(id)]);
  const items = topic.nodes.filter((n) => n.requiresDirectCoverage);
  const nodeTitles = Object.fromEntries(topic.nodes.map((n) => [n.key, `${n.marker ? `${n.marker} ` : ""}${n.title}`.slice(0, 80)]));
  const blockers = publishBlockers(topic, questions);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link href="/admin/catalogo" className="t-small text-destaque underline underline-offset-2">Catálogo</Link>
        <h1 className="mt-1 t-h1">{topic.title}</h1>
        <p className="mt-1 t-small text-tinta-suave">slug: {topic.slug}{topic.origin === "promovido" ? " · promovido de uma aula gerada pela IA" : ""}</p>
      </div>

      <section aria-labelledby="pub" className="rounded-lg border border-linha p-5">
        <h2 id="pub" className="t-h2">Publicação</h2>
        <div className="mt-3"><PublishPanel id={id} status={topic.status} version={topic.version} blockers={blockers} /></div>
      </section>

      <section aria-labelledby="dados" className="rounded-lg border border-linha p-5">
        <h2 id="dados" className="t-h2">Dados e reconhecimento</h2>
        <div className="mt-4">
          <TopicForm
            id={id}
            initial={{
              title: topic.title,
              kind: topic.kind,
              lawCode: topic.law_code,
              articles: topic.articles,
              aliases: topic.aliases,
              disciplineMode: topic.discipline_mode,
              summary: topic.summary,
              sourceText: topic.source_text,
              estimatedMinutes: topic.estimated_minutes,
            }}
          />
        </div>
      </section>

      <section aria-labelledby="ger" className="rounded-lg border border-linha p-5">
        <h2 id="ger" className="t-h2">Rascunho com IA</h2>
        <div className="mt-3"><GenerationPanel id={id} hasStructure={items.length > 0} hasLesson={!!topic.lesson} /></div>
      </section>

      <section aria-labelledby="estr" className="rounded-lg border border-linha p-5">
        <h2 id="estr" className="t-h2">Estrutura ({items.length} itens a ensinar)</h2>
        {items.length ? (
          <ol className="mt-3 flex flex-col gap-1 t-small">
            {topic.nodes.map((n) => (
              <li key={n.key} style={{ paddingLeft: `${n.depth * 16}px` }} className={n.requiresDirectCoverage ? "" : "text-tinta-fraca"}>
                <span className="font-mono t-tiny text-tinta-fraca">{n.key}</span> {n.marker && <span className="font-semibold">{n.marker}</span>} {n.title}
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-2 t-small text-tinta-suave">Ainda sem estrutura. Use “1. Estrutura”.</p>
        )}
      </section>

      <section aria-labelledby="aula" className="rounded-lg border border-linha p-5">
        <h2 id="aula" className="t-h2">Aula ({topic.lesson?.sections.length ?? 0} seções)</h2>
        {topic.lesson ? (
          <>
            <p className="mt-1 t-small text-tinta-suave">Objetivo: {topic.lesson.objective}</p>
            {topic.lesson.unverifiedClaims.length > 0 && (
              <div className="mt-2 rounded-md bg-alerta-fundo p-3 t-small">
                <p className="font-semibold">Confira na fonte oficial antes de publicar:</p>
                <ul className="mt-1 list-disc pl-5">{topic.lesson.unverifiedClaims.map((c) => <li key={c}>{c}</li>)}</ul>
              </div>
            )}
            <div className="mt-4"><SectionsEditor id={id} sections={topic.lesson.sections} /></div>
            <details className="mt-4 rounded-md border border-linha p-3">
              <summary className="cursor-pointer font-semibold">Pré-visualizar a aula como o aluno vê</summary>
              <div className="mt-3 flex flex-col gap-6">
                {topic.lesson.sections.map((s, i) => (
                  <div key={i}>
                    <h3 className="t-h3">{s.title}</h3>
                    <Markdown>{s.bodyMarkdown}</Markdown>
                  </div>
                ))}
              </div>
            </details>
          </>
        ) : (
          <p className="mt-2 t-small text-tinta-suave">Ainda sem aula. Use “2. Aula completa”.</p>
        )}
      </section>

      <section aria-labelledby="quest" className="rounded-lg border border-linha p-5">
        <h2 id="quest" className="t-h2">Banco de questões ({questions.length})</h2>
        <p className="mt-1 t-small text-tinta-suave">Cada aluno recebe 10 questões por nível, sorteadas do banco; as demais servem para a recuperação, sem IA.</p>
        <div className="mt-4"><QuestionsEditor id={id} questions={questions} nodeTitles={nodeTitles} /></div>
      </section>
    </div>
  );
}
