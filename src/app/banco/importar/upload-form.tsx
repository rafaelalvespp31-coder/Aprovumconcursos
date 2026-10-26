"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import type { BankUploadPreview } from "@/domain/bank/upload";
import type { BankResult } from "../actions";
import { DBadge, DNotice, dButton } from "../ui";

export interface BankUploadActions {
  preview: (form: FormData) => Promise<BankResult<BankUploadPreview>>;
  save: (form: FormData) => Promise<BankResult<{ created: number; skipped: number; codes: string[] }>>;
}

/** Upload de questões: escolher o arquivo → conferir a lista → cadastrar (aguardando conferência). */
export function BankUploadForm({ actions }: { actions: BankUploadActions }) {
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<BankUploadPreview | null>(null);
  const [done, setDone] = useState<{ created: number; skipped: number; codes: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [saving, setSaving] = useState(false);

  const fd = (f: File) => {
    const x = new FormData();
    x.set("file", f);
    return x;
  };
  const check = (f: File) => {
    setFile(f);
    setPreview(null);
    setDone(null);
    setError(null);
    start(async () => {
      const r = await actions.preview(fd(f));
      if (r.ok && r.data) setPreview(r.data);
      else setError(r.error ?? "Não foi possível ler o arquivo.");
    });
  };
  const save = () => {
    if (!file) return;
    setSaving(true);
    start(async () => {
      const r = await actions.save(fd(file));
      if (r.ok && r.data) {
        setDone(r.data);
        setPreview(null);
      } else setError(r.error ?? "Não foi possível cadastrar.");
      setSaving(false);
    });
  };

  return (
    <div className="flex flex-col gap-4" data-testid="upload-questoes">
      <div className="rounded-xl border-2 border-dashed border-white/20 bg-white/[0.03] p-6 text-center">
        <label htmlFor="arquivo-questoes" className="cursor-pointer font-[Space_Grotesk] text-[18px] font-bold">Escolha o arquivo de questões</label>
        <p className="mt-1 text-[13px] text-white/60">PDF (com texto selecionável) ou .txt do bloco de notas, até 4 MB, no modelo de questões.</p>
        <input
          ref={input}
          id="arquivo-questoes"
          type="file"
          accept=".txt,.pdf,text/plain,application/pdf"
          className="mx-auto mt-4 block text-[13px] text-white/80"
          disabled={pending}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) check(f);
          }}
        />
        {file && <p className="mt-2 text-[12px] text-white/45">{file.name} · {(file.size / 1024).toFixed(0)} KB</p>}
      </div>

      {pending && !saving && <p className="text-[13px] text-white/60" role="status">Lendo o arquivo…</p>}
      {error && <DNotice tone="erro">{error}</DNotice>}
      {done && (
        <DNotice tone="ok">
          {done.created} questão(ões) cadastrada(s) como <strong>aguardando conferência</strong>
          {done.skipped ? ` · ${done.skipped} já existia(m) e foi(ram) ignorada(s)` : ""}.
          {done.codes.length > 0 && <span className="block text-[12px] text-white/70">{done.codes.slice(0, 30).join(", ")}{done.codes.length > 30 ? "…" : ""}</span>}
          <Link href="/banco/questoes?status=aguardando_conferencia" className="mt-1 inline-block font-semibold underline">Conferir agora</Link>
        </DNotice>
      )}

      {preview && (
        <section aria-labelledby="previa-q" className="flex flex-col gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="previa-q" className="font-[Space_Grotesk] text-[18px] font-bold">
              {preview.total} questão(ões) no arquivo · {preview.fresh} nova(s){preview.duplicates ? ` · ${preview.duplicates} já cadastrada(s)` : ""}
            </h2>
            <DBadge tone={preview.ok ? "verde" : "vermelho"}>{preview.ok ? "Pronto para cadastrar" : `${preview.errors.length} erro(s)`}</DBadge>
          </div>
          {preview.errors.length > 0 && (
            <DNotice tone="erro">
              <p className="font-semibold">Corrija no arquivo e envie de novo:</p>
              <ul className="list-disc pl-5">{preview.errors.slice(0, 40).map((e) => <li key={e}>{e}</li>)}</ul>
            </DNotice>
          )}
          {preview.warnings.length > 0 && (
            <DNotice tone="alerta">
              <ul className="list-disc pl-5">{preview.warnings.map((w) => <li key={w}>{w}</li>)}</ul>
            </DNotice>
          )}
          {preview.rows.length > 0 && (
            <div className="overflow-x-auto rounded-lg border border-white/10">
              <table className="w-full min-w-[760px] text-[13px]">
                <thead className="bg-white/[0.05] text-left text-white/70">
                  <tr>
                    <th className="px-3 py-2">Nº</th>
                    <th className="px-3 py-2">Matéria › assunto</th>
                    <th className="px-3 py-2">Prova</th>
                    <th className="px-3 py-2">Formato</th>
                    <th className="px-3 py-2">Gabarito</th>
                    <th className="px-3 py-2">Enunciado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {preview.rows.map((r, i) => (
                    <tr key={i} className={r.duplicate ? "opacity-45" : ""}>
                      <td className="px-3 py-2 tabular-nums">{r.number}</td>
                      <td className="px-3 py-2">{r.subject}<span className="block text-white/55">{r.topic}</span></td>
                      <td className="px-3 py-2">{r.exam}</td>
                      <td className="px-3 py-2">{r.type}</td>
                      <td className="px-3 py-2 font-semibold">{r.answer}</td>
                      <td className="px-3 py-2 text-white/75">{r.duplicate && <DBadge tone="ambar">já cadastrada</DBadge>} {r.snippet}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <button type="button" className={dButton()} disabled={!preview.ok || pending} onClick={save}>
              {saving ? "Cadastrando…" : `Cadastrar ${preview.fresh} questão(ões)`}
            </button>
            <button type="button" className={dButton("secundario")} disabled={pending} onClick={() => input.current?.click()}>Escolher outro arquivo</button>
          </div>
          <p className="text-[12px] text-white/50">Entram como “Aguardando conferência”: só chegam aos alunos depois que você conferir o gabarito e publicar.</p>
        </section>
      )}
    </div>
  );
}
