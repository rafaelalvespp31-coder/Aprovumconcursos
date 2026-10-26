"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button, Notice, Tag, inputClass } from "@/components/ui";
import { LEVELS, type LevelKey } from "@/domain/progress/levels";
import type { CatalogQuestion } from "@/domain/catalog/compose";
import { deleteImpactAction, deleteTopicAction, publishAction, removeQuestionAction, saveQuestionAction, saveSectionAction, setStatusAction, type AdminResult } from "../actions";
import { DeleteTopic } from "../delete-topic";

interface Section { kind: string; title: string; bodyMarkdown: string; module?: string }

export function SectionsEditor({ id, sections }: { id: string; sections: Section[] }) {
  return (
    <div className="flex flex-col gap-4">
      {sections.map((s, i) => <SectionEditor key={`${i}-${s.title}`} id={id} index={i} section={s} />)}
    </div>
  );
}

function SectionEditor({ id, index, section }: { id: string; index: number; section: Section }) {
  const [title, setTitle] = useState(section.title);
  const [body, setBody] = useState(section.bodyMarkdown);
  const [res, setRes] = useState<AdminResult | null>(null);
  const [pending, start] = useTransition();
  const dirty = title !== section.title || body !== section.bodyMarkdown;
  return (
    <details className="rounded-md border border-linha bg-superficie p-3">
      <summary className="cursor-pointer font-semibold">
        {section.module && <span className="mr-2 t-tiny font-bold uppercase text-destaque">{section.module}</span>}
        {section.title} <span className="t-tiny font-normal text-tinta-fraca">({section.kind})</span>
      </summary>
      <div className="mt-3 flex flex-col gap-2">
        <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} aria-label="Título da seção" maxLength={160} />
        <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={10} className={`${inputClass} py-2 font-mono text-[0.85rem]`} aria-label="Conteúdo da seção (Markdown)" />
        <div className="flex items-center gap-3">
          <Button variant="secundario" disabled={!dirty || pending} onClick={() => start(async () => setRes(await saveSectionAction(id, index, { title, bodyMarkdown: body })))}>
            {pending ? "Salvando…" : "Salvar seção"}
          </Button>
          {res && <span className={`t-small ${res.ok ? "text-tinta-suave" : "text-erro"}`} role="status">{res.ok ? "Salvo." : res.error}</span>}
        </div>
      </div>
    </details>
  );
}

export function QuestionsEditor({ id, questions, nodeTitles }: { id: string; questions: CatalogQuestion[]; nodeTitles: Record<string, string> }) {
  const [level, setLevel] = useState<LevelKey>("facil");
  const list = questions.filter((q) => q.level === level);
  return (
    <div>
      <div role="tablist" aria-label="Nível" className="flex gap-2">
        {LEVELS.map((l) => (
          <button
            key={l.key}
            role="tab"
            aria-selected={level === l.key}
            onClick={() => setLevel(l.key)}
            className="rounded-full border border-linha-forte px-3 py-1 t-small font-semibold aria-selected:border-azul aria-selected:bg-azul aria-selected:text-white"
          >
            {l.label} ({questions.filter((q) => q.level === l.key).length})
          </button>
        ))}
      </div>
      <div className="mt-4 flex flex-col gap-3">
        {list.length === 0 && <p className="t-small text-tinta-suave">Nenhuma questão neste nível.</p>}
        {list.map((q, i) => <QuestionEditor key={q.id} topicId={id} q={q} n={i + 1} nodeTitle={nodeTitles[q.nodeKey] ?? q.nodeKey} />)}
      </div>
    </div>
  );
}

function QuestionEditor({ topicId, q, n, nodeTitle }: { topicId: string; q: CatalogQuestion; n: number; nodeTitle: string }) {
  const router = useRouter();
  const [statement, setStatement] = useState(q.statement);
  const [justification, setJustification] = useState(q.justification);
  const [essential, setEssential] = useState(q.essential);
  const [truth, setTruth] = useState(q.correctAnswerTrue ?? false);
  const [options, setOptions] = useState(q.options);
  const [res, setRes] = useState<AdminResult | null>(null);
  const [pending, start] = useTransition();
  const ce = q.type === "certo_errado";
  return (
    <details className="rounded-md border border-linha bg-superficie p-3">
      <summary className="cursor-pointer">
        <span className="font-semibold">{n}.</span> {q.statement.slice(0, 110)}{q.statement.length > 110 ? "…" : ""}
        <span className="ml-2 t-tiny text-tinta-fraca">{ce ? "Certo/errado" : "Múltipla escolha"} · {nodeTitle}</span>
      </summary>
      <div className="mt-3 flex flex-col gap-2 t-small">
        <textarea value={statement} onChange={(e) => setStatement(e.target.value)} rows={3} className={`${inputClass} py-2`} aria-label="Enunciado" />
        {ce ? (
          <div className="flex gap-3">
            <label className="flex items-center gap-1.5"><input type="radio" checked={truth} onChange={() => setTruth(true)} className="accent-azul" /> Gabarito: Certo</label>
            <label className="flex items-center gap-1.5"><input type="radio" checked={!truth} onChange={() => setTruth(false)} className="accent-azul" /> Gabarito: Errado</label>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {options.map((o, i) => (
              <div key={i} className="grid gap-1 rounded-md border border-linha p-2">
                <label className="flex items-center gap-2 font-semibold">
                  <input type="radio" name={`correta-${q.id}`} checked={o.correct} onChange={() => setOptions(options.map((x, j) => ({ ...x, correct: j === i })))} className="accent-azul" />
                  {o.label}) correta
                </label>
                <input value={o.text} onChange={(e) => setOptions(options.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))} className={inputClass} aria-label={`Alternativa ${o.label}`} />
                <input value={o.explanation} onChange={(e) => setOptions(options.map((x, j) => (j === i ? { ...x, explanation: e.target.value } : x)))} className={inputClass} aria-label={`Explicação da alternativa ${o.label}`} />
              </div>
            ))}
          </div>
        )}
        <textarea value={justification} onChange={(e) => setJustification(e.target.value)} rows={3} className={`${inputClass} py-2`} aria-label="Justificativa" />
        <label className="flex items-center gap-2"><input type="checkbox" checked={essential} onChange={(e) => setEssential(e.target.checked)} className="accent-azul" /> Conceito essencial (precisa ser acertado)</label>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="secundario" disabled={pending} onClick={() => start(async () => setRes(await saveQuestionAction(topicId, q.id, { statement, justification, essential, correctAnswerTrue: truth, options })))}>
            Salvar questão
          </Button>
          <Button variant="perigo" disabled={pending} onClick={() => start(async () => { const r = await removeQuestionAction(topicId, q.id); setRes(r); if (r.ok) router.refresh(); })}>
            Remover
          </Button>
          {res && <span className={res.ok ? "text-tinta-suave" : "text-erro"} role="status">{res.ok ? "Salvo." : res.error}</span>}
        </div>
      </div>
    </details>
  );
}

export function PublishPanel({ id, status, version, blockers, title = "este tema" }: { id: string; status: string; version: number; blockers: string[]; title?: string }) {
  const router = useRouter();
  const [res, setRes] = useState<AdminResult | null>(null);
  const [pending, start] = useTransition();
  const act = (fn: () => Promise<AdminResult>) => start(async () => { const r = await fn(); setRes(r); if (r.ok) router.refresh(); });
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Tag tone={status === "publicado" ? "verde" : status === "rascunho" ? "ambar" : "neutro"}>{status}{version ? ` · versão ${version}` : ""}</Tag>
      </div>
      {blockers.length > 0 ? (
        <Notice tone="alerta" title="Falta para publicar">
          <ul className="list-disc pl-5">{blockers.map((b) => <li key={b}>{b}</li>)}</ul>
        </Notice>
      ) : (
        <p className="t-small text-tinta-suave">Tudo pronto. Publicar torna o tema disponível para os alunos{version ? " e cria uma nova versão (quem estudou a anterior verá o aviso de conteúdo atualizado)" : ""}.</p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button disabled={pending || blockers.length > 0} onClick={() => act(() => publishAction(id))}>{status === "publicado" ? "Publicar nova versão" : "Publicar"}</Button>
        {status === "publicado" && <Button variant="secundario" disabled={pending} onClick={() => act(() => setStatusAction(id, "rascunho"))}>Despublicar</Button>}
        {status !== "arquivado" && <Button variant="perigo" disabled={pending} onClick={() => act(() => setStatusAction(id, "arquivado"))}>Arquivar</Button>}
        {status === "arquivado" && <Button variant="secundario" disabled={pending} onClick={() => act(() => setStatusAction(id, "rascunho"))}>Restaurar como rascunho</Button>}
        <DeleteTopic id={id} title={title} actions={{ impact: deleteImpactAction, remove: deleteTopicAction }} redirectTo="/admin/catalogo" />
      </div>
      {res && <Notice tone={res.ok ? "sucesso" : "erro"}>{res.ok ? res.message ?? "Feito." : res.error}</Notice>}
    </div>
  );
}
