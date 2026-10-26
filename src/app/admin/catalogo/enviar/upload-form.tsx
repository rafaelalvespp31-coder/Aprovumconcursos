"use client";

import { useState, useTransition } from "react";
import { Button, Notice, Tag } from "@/components/ui";
import type { LessonUploadPreview } from "@/domain/catalog/upload-preview";
import { LESSON_PROMPT } from "@/domain/catalog/chatgpt-prompts";
import type { AdminResult, UploadPreviewResult } from "../actions";
import { BannerSlot, type BannerActions } from "../banners/banner-slot";

interface Actions {
  preview: (text: string) => Promise<UploadPreviewResult>;
  save: (text: string) => Promise<AdminResult>;
}

const LEVEL = { facil: "Fácil", medio: "Médio", dificil: "Difícil" } as const;

/**
 * Catalogação por texto colado: 1) copiar o comando para o ChatGPT, 2) colar a resposta,
 * 3) conferir como a aula vai ficar (módulos, seções, questões, erros e avisos), 4) salvar.
 */
export interface PromptModel {
  title: string;
  slug: string;
  stats: { modules: number; sections: number; questions: { facil: number; medio: number; dificil: number } };
  options: Array<{ slug: string; title: string }>;
  selfCheck: string[];
}

export function LessonUploadForm({ actions, bannerActions, prompt = LESSON_PROMPT, model }: { actions: Actions; bannerActions?: BannerActions; prompt?: string; model?: PromptModel | null }) {
  const [text, setText] = useState("");
  const [checked, setChecked] = useState("");
  const [preview, setPreview] = useState<LessonUploadPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();
  const [saving, setSaving] = useState(false);

  const check = () => {
    setPreview(null);
    setError(null);
    const t = text;
    start(async () => {
      const r = await actions.preview(t);
      if (r.ok) {
        setPreview(r.preview);
        setChecked(t);
      } else setError(r.error);
    });
  };
  const save = () => {
    setSaving(true);
    start(async () => {
      const r = await actions.save(checked);
      // Em caso de sucesso a página muda para o rascunho criado.
      if (!r.ok) setError(r.error ?? "Não foi possível salvar.");
      setSaving(false);
    });
  };
  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setError("Não consegui copiar automaticamente. Abra “Ver o comando” e copie o texto.");
    }
  };
  const stale = preview && text !== checked;
  const full = !!preview && preview.questions.facil >= 10 && preview.questions.medio >= 10 && preview.questions.dificil >= 10;

  return (
    <div className="flex flex-col gap-5" data-testid="upload-aula">
      <div className="rounded-lg border border-linha bg-superficie p-4">
        <p className="font-semibold">1. Peça a aula ao ChatGPT</p>
        {model ? (
          <p className="mt-1 t-small text-tinta-suave">
            O comando leva a aula <strong>{model.title}</strong> inteira como modelo oficial ({model.stats.modules} módulos, {model.stats.sections} seções, {model.stats.questions.facil}/{model.stats.questions.medio}/{model.stats.questions.dificil} questões por nível) e manda o ChatGPT fazer a nova aula exatamente na mesma forma. Troque só a linha <strong>TEMA DA NOVA AULA</strong>.
          </p>
        ) : (
          <p className="mt-1 t-small text-tinta-suave">Copie o comando, troque o tema na primeira linha e envie no ChatGPT. Ele responde já no formato do painel.</p>
        )}
        {model && model.options.length > 1 && (
          <form method="get" className="mt-2 flex flex-wrap items-center gap-2 t-small">
            <label htmlFor="modelo" className="font-semibold">Aula-modelo:</label>
            <select id="modelo" name="modelo" defaultValue={model.slug} className="min-h-10 rounded-md border border-linha-forte bg-superficie px-2" onChange={(e) => e.currentTarget.form?.requestSubmit()}>
              {model.options.map((o) => (
                <option key={o.slug} value={o.slug}>{o.title}</option>
              ))}
            </select>
            <noscript><button className="underline">Usar</button></noscript>
          </form>
        )}
        {model && model.selfCheck.length > 0 && (
          <Notice tone="alerta" title="A aula-modelo tem pontos que o painel não lê bem">
            <ul className="list-disc pl-5">{model.selfCheck.slice(0, 5).map((e) => <li key={e}>{e}</li>)}</ul>
          </Notice>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button variant="secundario" onClick={copyPrompt}>{copied ? "Comando copiado ✓" : "Copiar comando para o ChatGPT"}</Button>
          <Button
            variant="discreto"
            onClick={() => {
              const url = URL.createObjectURL(new Blob([prompt], { type: "text/plain;charset=utf-8" }));
              const a = document.createElement("a");
              a.href = url;
              a.download = `comando-aprovum${model ? `-modelo-${model.slug}` : ""}.txt`;
              a.click();
              setTimeout(() => URL.revokeObjectURL(url), 2000);
            }}
          >
            Baixar comando (.txt)
          </Button>
          <span className="t-tiny text-tinta-fraca">{prompt.length.toLocaleString("pt-BR")} caracteres</span>
        </div>
        <p className="mt-1 t-tiny text-tinta-fraca">Comando longo: se o ChatGPT recusar colar, anexe o arquivo .txt baixado e escreva o tema na mensagem.</p>
        <details className="mt-2 t-small">
          <summary className="cursor-pointer text-destaque">Ver o comando</summary>
          <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap rounded-md bg-nevoa p-3 t-tiny">{prompt}</pre>
        </details>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="texto-aula" className="font-semibold">2. Cole aqui a resposta do ChatGPT</label>
        <textarea
          id="texto-aula"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={"=== AULA ===\nTítulo: …\nMatéria: …"}
          spellCheck={false}
          className="min-h-72 w-full rounded-md border border-linha-forte bg-superficie p-3 font-mono text-[13px] leading-relaxed focus:border-azul focus:outline-none focus:ring-2 focus:ring-azul/20"
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button disabled={!text.trim() || pending} onClick={check}>{pending && !saving ? "Conferindo…" : "3. Conferir aula"}</Button>
          {text && (
            <Button variant="discreto" disabled={pending} onClick={() => { setText(""); setPreview(null); setError(null); }}>Limpar</Button>
          )}
          <span className="t-tiny text-tinta-fraca">{text.length.toLocaleString("pt-BR")} caracteres</span>
        </div>
      </div>

      {stale && <Notice tone="alerta">O texto mudou depois da conferência. Clique em “Conferir aula” de novo antes de salvar.</Notice>}
      {error && <Notice tone="erro" title="Não deu para usar este texto">{error}</Notice>}

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
                  Já existe <strong>{preview.existing.title}</strong> ({preview.existing.status}) com o mesmo endereço: ela será atualizada com este texto.
                </p>
              )}
            </div>
            <Tag tone={preview.ok ? "verde" : "vermelho"}>{preview.ok ? (full ? "Pronto para publicar" : "Pronto para salvar") : `${preview.errors.length} erro(s)`}</Tag>
          </div>

          {preview.errors.length > 0 && (
            <Notice tone="erro" title="Corrija o texto (ou peça ao ChatGPT para corrigir) e confira de novo">
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

          {bannerActions && preview.disciplineMode && (
            <div>
              <h3 className="t-h3">Banner da matéria ({preview.subject})</h3>
              <p className="mt-1 mb-2 t-small text-tinta-suave">Vale para todas as aulas de {preview.subject}. Anexe uma vez; troque quando quiser.</p>
              <BannerSlot compact mode={preview.disciplineMode} label={preview.subject ?? preview.disciplineMode} url={preview.banner ?? null} actions={bannerActions} />
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
            <Button disabled={!preview.ok || pending || !!stale} onClick={save}>{saving ? "Salvando…" : full ? "4. Catalogar e publicar" : "4. Salvar como rascunho"}</Button>
          </div>
          <p className="t-tiny text-tinta-fraca">
            {full
              ? "Ao catalogar, a aula já é publicada e aparece no site para os alunos, sem etapa de aprovação."
              : "Com menos de 10 questões em algum nível a aula fica como rascunho; complete as questões e cole de novo para publicar."}
          </p>
        </section>
      )}
    </div>
  );
}
