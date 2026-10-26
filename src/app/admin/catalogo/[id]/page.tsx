import Link from "next/link";
import { Markdown } from "@/components/markdown";
import { getTopic, getTopicQuestions, publishBlockers, requireAdmin } from "@/server/services/catalog";
import { DISCIPLINE_LABELS, type DisciplineMode } from "@/ai/pedagogy";
import { PublishPanel, QuestionsEditor, SectionsEditor } from "./editor";
import { AddQuestionsPanel } from "./add-questions";
import { addTopicQuestionsAction, previewTopicQuestionsAction } from "../actions";
import { buildQuestionsPrompt } from "@/domain/catalog/export";

export const metadata = { title: "Tema do catálogo" };

export default async function TopicPage({ params }: { params: Promise<{ id: string }> }) {
  // A verificação fica também na página: layout e página renderizam em paralelo.
  await requireAdmin();
  const { id } = await params;
  const [topic, questions] = await Promise.all([getTopic(id), getTopicQuestions(id)]);
  const items = topic.nodes.filter((n) => n.requiresDirectCoverage);
  const nodeTitles = Object.fromEntries(topic.nodes.map((n) => [n.key, `${n.marker ? `${n.marker} ` : ""}${n.title}`.slice(0, 80)]));
  const blockers = publishBlockers(topic, questions);
  const counts = { facil: questions.filter((q) => q.level === "facil").length, medio: questions.filter((q) => q.level === "medio").length, dificil: questions.filter((q) => q.level === "dificil").length };

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link href="/admin/catalogo" className="t-small text-destaque underline underline-offset-2">Catálogo</Link>
        <h1 className="mt-1 t-h1">{topic.title}</h1>
        <p className="mt-1 t-small text-tinta-suave">slug: {topic.slug}{topic.origin === "promovido" ? " · promovido de uma aula gerada pela IA" : ""}</p>
      </div>

      <section aria-labelledby="pub" className="rounded-lg border border-linha p-5">
        <h2 id="pub" className="t-h2">Publicação</h2>
        <div className="mt-3"><PublishPanel id={id} status={topic.status} version={topic.version} blockers={blockers} title={topic.title} /></div>
      </section>

      <section aria-labelledby="dados" className="rounded-lg border border-linha p-5">
        <h2 id="dados" className="t-h2">Dados e reconhecimento</h2>
        <dl className="mt-3 grid gap-x-6 gap-y-2 t-small sm:grid-cols-[max-content_1fr]">
          <dt className="font-semibold">Matéria</dt>
          <dd>{DISCIPLINE_LABELS[topic.discipline_mode as DisciplineMode] ?? topic.discipline_mode}</dd>
          <dt className="font-semibold">Tipo</dt>
          <dd>{topic.kind === "dispositivo" ? `${topic.law_code}, art. ${topic.articles.join(", ")}` : "Tema"}</dd>
          <dt className="font-semibold">Sinônimos</dt>
          <dd>{topic.aliases.length ? topic.aliases.join("; ") : "—"}</dd>
          <dt className="font-semibold">Tempo estimado</dt>
          <dd>{topic.estimated_minutes} min</dd>
          {topic.summary && (
            <>
              <dt className="font-semibold">Resumo</dt>
              <dd>{topic.summary}</dd>
            </>
          )}
        </dl>
        <p className="mt-3 t-small text-tinta-suave">
          Para mudar dados, texto-base ou a estrutura dos módulos, corrija o texto e{" "}
          <Link href="/admin/catalogo/enviar" className="font-semibold text-destaque underline underline-offset-2">cole de novo</Link>
          {topic.status === "publicado" ? " (aula publicada: envie como nova parte ou arquive esta antes)." : " — o rascunho é atualizado."} Os textos das seções e as questões podem ser corrigidos aqui mesmo.
        </p>
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
          <p className="mt-2 t-small text-tinta-suave">Ainda sem estrutura. Cole a aula com o bloco === TEXTO-BASE === em “Catalogar aula”.</p>
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
                {topic.lesson.sections.map((s, i, all) => (
                  <div key={i}>
                    {(s as { module?: string }).module && (s as { module?: string }).module !== (all[i - 1] as { module?: string } | undefined)?.module && (
                      <p className="mb-2 t-tiny font-bold uppercase tracking-wide text-destaque">{(s as { module?: string }).module}</p>
                    )}
                    <h3 className="t-h3">{s.title}</h3>
                    <Markdown>{s.bodyMarkdown}</Markdown>
                  </div>
                ))}
              </div>
            </details>
          </>
        ) : (
          <p className="mt-2 t-small text-tinta-suave">Ainda sem aula. <Link href="/admin/catalogo/enviar" className="font-semibold text-destaque underline underline-offset-2">Catalogue a aula colando o texto</Link>.</p>
        )}
      </section>

      <section aria-labelledby="addq" className="rounded-lg border border-linha p-5">
        <h2 id="addq" className="t-h2">Adicionar questões</h2>
        <p className="mt-1 t-small text-tinta-suave">Cole questões no formato do painel para completar o banco desta aula. As que já existem continuam.</p>
        <div className="mt-3">
          <AddQuestionsPanel
            topicId={id}
            counts={counts}
            prompt={buildQuestionsPrompt({ title: topic.title, sourceText: topic.source_text, need: { facil: Math.max(12 - counts.facil, counts.facil < 10 ? 10 - counts.facil : 0), medio: Math.max(12 - counts.medio, counts.medio < 10 ? 10 - counts.medio : 0), dificil: Math.max(12 - counts.dificil, counts.dificil < 10 ? 10 - counts.dificil : 0) } })}
            actions={{ preview: previewTopicQuestionsAction, add: addTopicQuestionsAction }}
          />
        </div>
      </section>

      <section aria-labelledby="quest" className="rounded-lg border border-linha p-5">
        <h2 id="quest" className="t-h2">Banco de questões ({questions.length})</h2>
        <p className="mt-1 t-small text-tinta-suave">Cada aluno recebe 10 questões por nível, sorteadas do banco; as demais servem para a recuperação, sem IA.</p>
        <div className="mt-4"><QuestionsEditor id={id} questions={questions} nodeTitles={nodeTitles} /></div>
      </section>
    </div>
  );
}
