"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { SOURCE_KIND_LABEL, SOURCE_KINDS, SOURCE_STATUS_LABEL, SOURCE_STATUSES, type SourceKind, type SourceStatus } from "@/domain/bank/labels";
import { createExamAction, saveSourceAction, sourceReuseAction } from "../actions";
import { DBadge, DCard, DNotice, dButton, dInput, dLabel, dTextarea, fmtDate } from "../ui";

interface Source {
  id: string;
  name: string;
  kind: string;
  author_institution: string | null;
  url: string | null;
  published_on: string | null;
  consulted_on: string | null;
  license: string | null;
  reuse_verified: boolean;
  reuse_verified_at: string | null;
  legal_notes: string | null;
  status: string;
}

function SourceForm({ initial, onDone }: { initial?: Source; onDone: () => void }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const today = new Date().toISOString().slice(0, 10);
  return (
    <form
      className="grid gap-3 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        const f = Object.fromEntries(new FormData(e.currentTarget));
        start(async () => {
          const r = await saveSourceAction(initial?.id ?? null, f);
          if (!r.ok) return setError(r.error ?? "Erro.");
          onDone();
          router.refresh();
        });
      }}
    >
      {error && <div className="sm:col-span-2"><DNotice tone="erro">{error}</DNotice></div>}
      <div className="sm:col-span-2">
        <label className={dLabel} htmlFor="s-name">Nome da fonte *</label>
        <input id="s-name" name="name" required defaultValue={initial?.name} maxLength={300} className={dInput} placeholder="Ex.: Prova Policial Penal MG 2024 — Caderno A" />
      </div>
      <div>
        <label className={dLabel} htmlFor="s-kind">Tipo *</label>
        <select id="s-kind" name="kind" defaultValue={initial?.kind ?? "legislacao"} className={dInput}>
          {SOURCE_KINDS.map((k) => (
            <option key={k} value={k}>{SOURCE_KIND_LABEL[k]}</option>
          ))}
        </select>
      </div>
      <div>
        <label className={dLabel} htmlFor="s-status">Situação</label>
        <select id="s-status" name="status" defaultValue={initial?.status ?? "ativa"} className={dInput}>
          {SOURCE_STATUSES.map((k) => (
            <option key={k} value={k}>{SOURCE_STATUS_LABEL[k]}</option>
          ))}
        </select>
      </div>
      <div>
        <label className={dLabel} htmlFor="s-author">Instituição ou autor</label>
        <input id="s-author" name="authorInstitution" defaultValue={initial?.author_institution ?? ""} maxLength={300} className={dInput} />
      </div>
      <div>
        <label className={dLabel} htmlFor="s-url">URL original</label>
        <input id="s-url" name="url" type="url" defaultValue={initial?.url ?? ""} className={dInput} placeholder="https://" />
      </div>
      <div>
        <label className={dLabel} htmlFor="s-pub">Data de publicação (se conhecida)</label>
        <input id="s-pub" name="publishedOn" type="date" max={today} defaultValue={initial?.published_on ?? ""} className={dInput} />
      </div>
      <div>
        <label className={dLabel} htmlFor="s-cons">Data de consulta</label>
        <input id="s-cons" name="consultedOn" type="date" max={today} defaultValue={initial?.consulted_on ?? today} className={dInput} />
      </div>
      <div className="sm:col-span-2">
        <label className={dLabel} htmlFor="s-lic">Licença ou condições de uso</label>
        <textarea id="s-lic" name="license" defaultValue={initial?.license ?? ""} maxLength={2000} className={dTextarea} placeholder="Ex.: domínio público (lei); licença CC BY 4.0; termo de autorização nº …; uso não autorizado" />
      </div>
      <div className="sm:col-span-2">
        <label className={dLabel} htmlFor="s-notes">Observações jurídicas</label>
        <textarea id="s-notes" name="legalNotes" defaultValue={initial?.legal_notes ?? ""} maxLength={4000} className={dTextarea} />
      </div>
      <div className="flex gap-2 sm:col-span-2">
        <button disabled={pending} className={dButton("primario")}>{pending ? "Salvando…" : initial ? "Salvar fonte" : "Cadastrar fonte"}</button>
        <button type="button" onClick={onDone} className={dButton("discreto")}>Cancelar</button>
      </div>
    </form>
  );
}

function ReuseControl({ source }: { source: Source }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const act = (verified: boolean) =>
    start(async () => {
      const r = await sourceReuseAction(source.id, verified, note);
      if (!r.ok) return setError(r.error ?? "Erro.");
      setOpen(false);
      setNote("");
      router.refresh();
    });
  if (!open)
    return (
      <button type="button" onClick={() => setOpen(true)} className={dButton(source.reuse_verified ? "discreto" : "secundario")}>
        {source.reuse_verified ? "Retirar autorização" : "Registrar autorização verificada"}
      </button>
    );
  return (
    <div className="entrar flex w-full flex-col gap-2 rounded-md border border-white/15 p-3">
      <label className="text-[13px] font-semibold" htmlFor={`n-${source.id}`}>
        {source.reuse_verified ? "Motivo da retirada" : "Base da autorização (licença, termo, contrato, domínio público…)"}
      </label>
      <textarea id={`n-${source.id}`} value={note} onChange={(e) => setNote(e.target.value)} rows={2} className={`${dInput} py-2`} />
      {error && <DNotice tone="erro">{error}</DNotice>}
      <div className="flex gap-2">
        <button disabled={pending} onClick={() => act(!source.reuse_verified)} className={dButton(source.reuse_verified ? "perigo" : "primario")}>Confirmar</button>
        <button onClick={() => setOpen(false)} className={dButton("discreto")}>Cancelar</button>
      </div>
    </div>
  );
}

export function SourceManager({ sources, canVerify }: { sources: Source[]; canVerify: boolean }) {
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  return (
    <div className="flex flex-col gap-3">
      {creating ? (
        <DCard title="Nova fonte">
          <SourceForm onDone={() => setCreating(false)} />
        </DCard>
      ) : (
        <button onClick={() => setCreating(true)} className={`${dButton("primario")} self-start`}>+ Nova fonte</button>
      )}
      {sources.length === 0 && <DCard><p className="text-[14px] text-white/60">Nenhuma fonte cadastrada.</p></DCard>}
      {sources.map((s) => (
        <DCard key={s.id}>
          {editing === s.id ? (
            <SourceForm initial={s} onDone={() => setEditing(null)} />
          ) : (
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[16px] font-semibold">{s.name}</p>
                <DBadge>{SOURCE_KIND_LABEL[s.kind as SourceKind]}</DBadge>
                <DBadge tone={s.status === "ativa" ? "verde" : s.status === "bloqueada" ? "vermelho" : "neutro"}>{SOURCE_STATUS_LABEL[s.status as SourceStatus]}</DBadge>
                {s.reuse_verified ? <DBadge tone="verde">Autorização verificada em {fmtDate(s.reuse_verified_at)}</DBadge> : <DBadge tone="ambar">Autorização não verificada</DBadge>}
              </div>
              <p className="text-[13px] text-white/60">
                {s.author_institution ?? "Autor não informado"} · consultada em {fmtDate(s.consulted_on)}
                {s.url && (
                  <>
                    {" · "}
                    <a href={s.url} target="_blank" rel="noreferrer noopener" className="text-[#ff8080] underline">abrir</a>
                  </>
                )}
              </p>
              {s.license && <p className="text-[14px] text-white/80">Licença/condições: {s.license}</p>}
              {s.legal_notes && <p className="whitespace-pre-wrap text-[13px] text-white/55">{s.legal_notes}</p>}
              <div className="flex flex-wrap gap-2">
                <button onClick={() => setEditing(s.id)} className={dButton("discreto")}>Editar</button>
                {canVerify && <ReuseControl source={s} />}
              </div>
            </div>
          )}
        </DCard>
      ))}
    </div>
  );
}

export function ExamForm({ boards }: { boards: Array<{ slug: string; name: string }> }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      className="grid gap-2 sm:grid-cols-5"
      onSubmit={(e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const f = Object.fromEntries(new FormData(form));
        start(async () => {
          const r = await createExamAction(f);
          if (!r.ok) return setError(r.error ?? "Erro.");
          setError(null);
          form.reset();
          router.refresh();
        });
      }}
    >
      <input name="name" required placeholder="Concurso (ex.: Polícia Penal MG)" className={`${dInput} sm:col-span-2`} aria-label="Nome do concurso" />
      <input name="roleName" placeholder="Cargo" className={dInput} aria-label="Cargo" />
      <select name="boardSlug" className={dInput} aria-label="Banca" defaultValue="">
        <option value="">Banca</option>
        {boards.map((b) => (
          <option key={b.slug} value={b.slug}>{b.name}</option>
        ))}
      </select>
      <input name="year" inputMode="numeric" placeholder="Ano" className={dInput} aria-label="Ano" />
      <input name="organ" placeholder="Órgão" className={`${dInput} sm:col-span-2`} aria-label="Órgão" />
      <button disabled={pending} className={`${dButton("secundario")} sm:col-span-1`}>Cadastrar concurso</button>
      {error && <div className="sm:col-span-5"><DNotice tone="erro">{error}</DNotice></div>}
    </form>
  );
}
