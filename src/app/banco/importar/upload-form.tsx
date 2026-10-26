"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import type { BankUploadPreview } from "@/domain/bank/upload";
import { QUESTIONS_PROMPT } from "@/domain/catalog/chatgpt-prompts";
import type { BankResult } from "../actions";
import { DBadge, DNotice, dButton, dTextarea } from "../ui";

export interface BankUploadActions {
  preview: (text: string) => Promise<BankResult<BankUploadPreview>>;
  save: (text: string) => Promise<BankResult<{ created: number; skipped: number; published: number; codes: string[] }>>;
}

/** Questões por texto colado: copiar o comando → colar a resposta → conferir → cadastrar (aguardando conferência). */
export function BankUploadForm({ actions }: { actions: BankUploadActions }) {
  const [text, setText] = useState("");
  const [checked, setChecked] = useState("");
  const [preview, setPreview] = useState<BankUploadPreview | null>(null);
  const [done, setDone] = useState<{ created: number; skipped: number; published: number; codes: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();
  const [saving, setSaving] = useState(false);

  const check = () => {
    setPreview(null);
    setDone(null);
    setError(null);
    const t = text;
    start(async () => {
      const r = await actions.preview(t);
      if (r.ok && r.data) {
        setPreview(r.data);
        setChecked(t);
      } else setError(r.error ?? "Não foi possível ler o texto.");
    });
  };
  const save = () => {
    setSaving(true);
    start(async () => {
      const r = await actions.save(checked);
      if (r.ok && r.data) {
        setDone(r.data);
        setPreview(null);
        setText("");
      } else setError(r.error ?? "Não foi possível cadastrar.");
      setSaving(false);
    });
  };
  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(QUESTIONS_PROMPT);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setError("Não consegui copiar automaticamente. Abra “Ver o comando” e copie o texto.");
    }
  };
  const stale = preview && text !== checked;

  return (
    <div className="flex flex-col gap-4" data-testid="upload-questoes">
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <p className="font-semibold">1. Peça ao ChatGPT para organizar as questões</p>
        <p className="mt-1 text-[13px] text-white/60">Copie o comando, cole as questões (ou a prova) no lugar indicado e envie no ChatGPT.</p>
        <button type="button" className={`${dButton("secundario")} mt-3`} onClick={copyPrompt}>{copied ? "Comando copiado ✓" : "Copiar comando para o ChatGPT"}</button>
        <details className="mt-2 text-[13px]">
          <summary className="cursor-pointer text-[#ff6b6b]">Ver o comando</summary>
          <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap rounded-md bg-black/40 p-3 text-[12px] text-white/80">{QUESTIONS_PROMPT}</pre>
        </details>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="texto-questoes" className="font-semibold">2. Cole aqui as questões</label>
        <textarea
          id="texto-questoes"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={"=== PADRÃO ===\nMatéria: …\n=== QUESTÕES ===\n--- QUESTÃO ---\nEnunciado: …"}
          spellCheck={false}
          className={`${dTextarea} min-h-72 font-mono text-[13px]`}
        />
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className={dButton()} disabled={!text.trim() || pending} onClick={check}>{pending && !saving ? "Conferindo…" : "3. Conferir questões"}</button>
          {text && <button type="button" className={dButton("discreto")} disabled={pending} onClick={() => { setText(""); setPreview(null); setError(null); }}>Limpar</button>}
          <span className="text-[12px] text-white/45">{text.length.toLocaleString("pt-BR")} caracteres</span>
        </div>
      </div>

      {stale && <DNotice tone="alerta">O texto mudou depois da conferência. Clique em “Conferir questões” de novo antes de cadastrar.</DNotice>}
      {error && <DNotice tone="erro">{error}</DNotice>}
      {done && (
        <DNotice tone="ok">
          {done.published === done.created ? (
            <>{done.created} questão(ões) <strong>publicada(s)</strong>: já aparecem para os alunos no site.</>
          ) : (
            <>
              {done.published} publicada(s) no site; {done.created - done.published} cadastrada(s) aguardando a justificativa para publicar.
            </>
          )}
          {done.skipped ? ` ${done.skipped} já existia(m) e foi(ram) ignorada(s).` : ""}
          {done.codes.length > 0 && <span className="block text-[12px] text-white/70">{done.codes.slice(0, 30).join(", ")}{done.codes.length > 30 ? "…" : ""}</span>}
          <Link href="/banco/questoes" className="mt-1 inline-block font-semibold underline">Ver no banco</Link>
        </DNotice>
      )}

      {preview && (
        <section aria-labelledby="previa-q" className="flex flex-col gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="previa-q" className="font-[Space_Grotesk] text-[18px] font-bold">
              {preview.total} questão(ões) no texto · {preview.fresh} nova(s){preview.duplicates ? ` · ${preview.duplicates} já cadastrada(s)` : ""}
            </h2>
            <DBadge tone={preview.ok ? "verde" : "vermelho"}>{preview.ok ? "Pronto para cadastrar" : `${preview.errors.length} erro(s)`}</DBadge>
          </div>
          {preview.errors.length > 0 && (
            <DNotice tone="erro">
              <p className="font-semibold">Corrija o texto e confira de novo:</p>
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
            <button type="button" className={dButton()} disabled={!preview.ok || pending || !!stale} onClick={save}>
              {saving ? "Cadastrando…" : `Cadastrar e publicar ${preview.fresh} questão(ões)`}
            </button>
          </div>
          <p className="text-[12px] text-white/50">Ao cadastrar, as questões com justificativa já são publicadas e aparecem para os alunos.</p>
        </section>
      )}
    </div>
  );
}
