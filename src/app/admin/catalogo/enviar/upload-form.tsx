"use client";

import { useRef, useState, useTransition } from "react";
import { Button, Notice, Tag } from "@/components/ui";
import type { LessonUploadPreview } from "@/domain/catalog/upload-preview";
import type { AdminResult, UploadPreviewResult } from "../actions";

interface Actions {
  preview: (form: FormData) => Promise<UploadPreviewResult>;
  save: (form: FormData) => Promise<AdminResult>;
}

const LEVEL = { facil: "Fácil", medio: "Médio", dificil: "Difícil" } as const;

/**
 * Envio da aula pronta: 1) escolher o arquivo, 2) conferir como a aula vai ficar
 * (módulos, seções, itens, questões, erros e avisos), 3) salvar como rascunho.
 */
export function LessonUploadForm({ actions }: { actions: Actions }) {
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<LessonUploadPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [saving, setSaving] = useState(false);

  const formOf = (f: File) => {
    const fd = new FormData();
    fd.set("file", f);
    return fd;
  };
  const check = (f: File) => {
    setFile(f);
    setPreview(null);
    setError(null);
    start(async () => {
      const r = await actions.preview(formOf(f));
      if (r.ok) setPreview(r.preview);
      else setError(r.error);
    });
  };
  const save = () => {
    if (!file) return;
    setSaving(true);
    start(async () => {
      const r = await actions.save(formOf(file));
      // Em caso de sucesso a página muda para o rascunho criado.
      if (!r.ok) setError(r.error ?? "Não foi possível salvar.");
      setSaving(false);
    });
  };

  return (
    <div className="flex flex-col gap-5" data-testid="upload-aula">
      <div className="rounded-lg border-2 border-dashed border-linha-forte bg-superficie p-6 text-center">
        <label htmlFor="arquivo-aula" className="t-h3 cursor-pointer">Escolha o arquivo da aula</label>
        <p className="mt-1 t-small text-tinta-suave">PDF (com texto selecionável) ou .txt do bloco de notas, até 4 MB, no modelo de aula.</p>
        <input
          ref={input}
          id="arquivo-aula"
          type="file"
          accept=".txt,.pdf,text/plain,application/pdf"
          className="mx-auto mt-4 block t-small"
          disabled={pending}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) check(f);
          }}
        />
        {file && <p className="mt-2 t-tiny text-tinta-fraca">{file.name} · {(file.size / 1024).toFixed(0)} KB</p>}
      </div>

      {pending && !saving && <p className="t-small text-tinta-suave" role="status">Lendo o arquivo…</p>}
      {error && <Notice tone="erro" title="Não deu para usar este arquivo">{error}</Notice>}

      {preview && (
        <section aria-labelledby="previa" className="flex flex-col gap-4 rounded-lg border border-linha p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 id="previa" className="t-h2">{preview.title || "(sem título)"}</h2>
              <p className="mt-1 t-small text-tinta-suave">
                {preview.subject ?? "Matéria não reconhecida"} · {preview.kind === "dispositivo" ? preview.law : "Tema"} · {preview.items} item(ns) a ensinar
              </p>
              {preview.existing && (
                <p className="mt-1 t-small">
                  Já existe <strong>{preview.existing.title}</strong> ({preview.existing.status}) com o mesmo endereço: {preview.existing.status === "rascunho" ? "o rascunho será atualizado e as questões antigas ficarão inativas." : "não será alterada."}
                </p>
              )}
            </div>
            <Tag tone={preview.ok ? "verde" : "vermelho"}>{preview.ok ? "Pronto para salvar" : `${preview.errors.length} erro(s)`}</Tag>
          </div>

          {preview.errors.length > 0 && (
            <Notice tone="erro" title="Corrija no arquivo e envie de novo">
              <ul className="list-disc pl-5">{preview.errors.map((e) => <li key={e}>{e}</li>)}</ul>
            </Notice>
          )}
          {preview.warnings.length > 0 && (
            <Notice tone="alerta" title="Avisos (não impedem salvar)">
              <ul className="list-disc pl-5">{preview.warnings.map((w) => <li key={w}>{w}</li>)}</ul>
            </Notice>
          )}

          {preview.modules.length > 0 && (
            <div>
              <h3 className="t-h3">Estrutura da aula</h3>
              <ol className="mt-2 flex flex-col gap-3">
                {preview.modules.map((m) => (
                  <li key={m.name} className="rounded-md border border-linha bg-superficie p-3">
                    <p className="font-semibold">{m.name}</p>
                    <ul className="mt-1 flex flex-col gap-0.5 t-small">
                      {m.sections.map((s, i) => (
                        <li key={i} className="flex flex-wrap gap-x-2">
                          <span>{s.title}</span>
                          <span className="text-tinta-fraca">· {s.kind} · {s.items} item(ns)</span>
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ol>
            </div>
          )}

          <div>
            <h3 className="t-h3">Questões de fixação</h3>
            <p className="mt-1 t-small tabular-nums">
              {(Object.keys(LEVEL) as Array<keyof typeof LEVEL>).map((k) => (
                <span key={k} className={`mr-3 ${preview.questions[k] < 10 ? "text-erro" : ""}`}>{LEVEL[k]}: {preview.questions[k]}</span>
              ))}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button disabled={!preview.ok || pending} onClick={save}>{saving ? "Salvando…" : "Salvar como rascunho"}</Button>
            <Button variant="secundario" disabled={pending} onClick={() => input.current?.click()}>Escolher outro arquivo</Button>
          </div>
          <p className="t-tiny text-tinta-fraca">Nada vai para os alunos agora: a aula entra como rascunho para você revisar e publicar.</p>
        </section>
      )}
    </div>
  );
}
