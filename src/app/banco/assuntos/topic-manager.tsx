"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createSubjectAction, createTopicAction, topicStatusAction } from "../actions";
import { DBadge, DCard, DNotice, dButton, dInput } from "../ui";

interface Subject {
  id: string;
  name: string;
  status: string;
}
interface Topic {
  id: string;
  subject_id: string;
  parent_id: string | null;
  name: string;
  status: string;
}

function AddTopic({ subjectId, parentId, onDone }: { subjectId: string; parentId?: string; onDone?: () => void }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      className="flex flex-wrap gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await createTopicAction({ subjectId, parentId: parentId ?? "", name });
          if (!r.ok) return setError(r.error ?? "Erro.");
          setName("");
          setError(null);
          onDone?.();
          router.refresh();
        });
      }}
    >
      <input value={name} onChange={(e) => setName(e.target.value)} required minLength={2} maxLength={160} className={`${dInput} min-w-0 flex-1`} placeholder={parentId ? "Novo subtópico" : "Novo assunto"} aria-label={parentId ? "Nome do subtópico" : "Nome do assunto"} />
      <button disabled={pending || name.trim().length < 2} className={dButton("secundario")}>Adicionar</button>
      {error && <div className="w-full"><DNotice tone="erro">{error}</DNotice></div>}
    </form>
  );
}

function Branch({ topic, all, depth, canManage }: { topic: Topic; all: Topic[]; depth: number; canManage: boolean }) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [pending, start] = useTransition();
  const children = all.filter((t) => t.parent_id === topic.id);
  return (
    <li>
      <div className="flex flex-wrap items-center gap-2 py-1.5" style={{ paddingLeft: depth * 18 }}>
        <span className="text-white/30">{depth ? "└" : "•"}</span>
        <span className={`text-[15px] ${topic.status === "ativo" ? "" : "text-white/40 line-through"}`}>{topic.name}</span>
        {topic.status !== "ativo" && <DBadge>inativo</DBadge>}
        <button type="button" onClick={() => setAdding(!adding)} className="text-[12px] font-semibold text-[#ff8080] hover:underline">+ subtópico</button>
        {canManage && (
          <button
            type="button"
            disabled={pending}
            onClick={() => start(async () => { await topicStatusAction(topic.id, topic.status !== "ativo"); router.refresh(); })}
            className="text-[12px] text-white/50 hover:underline"
          >
            {topic.status === "ativo" ? "desativar" : "reativar"}
          </button>
        )}
      </div>
      {adding && (
        <div className="mb-2" style={{ paddingLeft: (depth + 1) * 18 }}>
          <AddTopic subjectId={topic.subject_id} parentId={topic.id} onDone={() => setAdding(false)} />
        </div>
      )}
      {children.length > 0 && (
        <ul>
          {children.map((c) => (
            <Branch key={c.id} topic={c} all={all} depth={depth + 1} canManage={canManage} />
          ))}
        </ul>
      )}
    </li>
  );
}

export function TopicManager({ subjects, topics, canManage }: { subjects: Subject[]; topics: Topic[]; canManage: boolean }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="flex flex-col gap-4">
      {subjects.map((s) => {
        const roots = topics.filter((t) => t.subject_id === s.id && !t.parent_id);
        return (
          <DCard key={s.id} title={s.name}>
            {roots.length === 0 ? <p className="mb-2 text-[14px] text-white/55">Nenhum assunto ainda.</p> : (
              <ul className="mb-3">
                {roots.map((t) => (
                  <Branch key={t.id} topic={t} all={topics} depth={0} canManage={canManage} />
                ))}
              </ul>
            )}
            <AddTopic subjectId={s.id} />
          </DCard>
        );
      })}
      {canManage && (
        <DCard title="Nova matéria">
          <form
            className="flex flex-wrap gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              start(async () => {
                const r = await createSubjectAction({ name });
                if (!r.ok) return setError(r.error ?? "Erro.");
                setName("");
                setError(null);
                router.refresh();
              });
            }}
          >
            <input value={name} onChange={(e) => setName(e.target.value)} required minLength={2} maxLength={120} className={`${dInput} min-w-0 flex-1`} placeholder="Ex.: Criminologia" aria-label="Nome da matéria" />
            <button disabled={pending} className={dButton("primario")}>Criar matéria</button>
            {error && <div className="w-full"><DNotice tone="erro">{error}</DNotice></div>}
          </form>
        </DCard>
      )}
    </div>
  );
}
