"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Button, Notice, Tag } from "@/components/ui";
import type { BulkPreview, BulkResult } from "@/server/services/catalog-bulk";
import type { BulkImportResult, BulkPreviewResult } from "../../actions";

const LV = { facil: "Fácil", medio: "Médio", dificil: "Difícil" } as const;

/**
 * Importação em massa: 1) copiar o comando-mestre do tópico, 2) enviar o .txt (ou colar) com todas as aulas,
 * 3) conferir cada aula, 4) publicar tudo.
 */
export function BulkForm({ prompt, topicLabel, base, admin, actions }: {
  prompt: string | null;
  topicLabel: string | null;
  base: string;
  admin: boolean;
  actions: { preview: (t: string) => Promise<BulkPreviewResult>; publish: (t: string, name: string) => Promise<BulkImportResult> };
}) {
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState("");
  const [checked, setChecked] = useState("");
  const [preview, setPreview] = useState<BulkPreview | null>(null);
  const [result, setResult] = useState<BulkResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();
  const [publishing, setPublishing] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const stale = !!preview && text !== checked;

  const copy = async () => {
    if (!prompt) return;
    try { await navigator.clipboard.writeText(prompt); setCopied(true); setTimeout(() => setCopied(false), 2500); }
    catch { setError("Não consegui copiar automaticamente. Baixe o comando em .txt."); }
  };
  const download = () => {
    if (!prompt) return;
    const url = URL.createObjectURL(new Blob([prompt], { type: "text/plain;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `comando-mestre-${(topicLabel ?? "topico").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").slice(0, 50)}.txt`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };
  const reset = () => { setText(""); setFileName(""); setPreview(null); setResult(null); setError(null); if (fileInput.current) fileInput.current.value = ""; };
  const onFile = async (f: File | undefined) => {
    if (!f) return;
    setError(null); setPreview(null); setResult(null);
    if (f.size > 3_000_000) { setError("Arquivo grande demais (máximo de 3 MB)."); return; }
    setFileName(f.name);
    setText(await f.text());
  };
  const check = () => {
    setError(null); setResult(null); setPreview(null);
    start(async () => {
      const r = await actions.preview(text);
      if (r.ok) { setPreview(r.preview); setChecked(text); } else setError(r.error);
    });
  };
  const publish = () => {
    setError(null); setPublishing(true);
    start(async () => {
      const r = await actions.publish(checked, fileName);
      if (r.ok) { setResult(r.result); setPreview(null); } else setError(r.error);
      setPublishing(false);
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-lg border border-linha p-4" data-testid="massa-comando">
        <h2 className="t-h2">1. Comando-mestre do tópico</h2>
        {prompt ? (
          <>
            <p className="mt-1 t-small text-tinta-suave">Tópico <strong>{topicLabel}</strong>: um comando só, com todos os subtópicos. Cole no ChatGPT; ele entrega uma aula por subtópico (digite “próximo” se ele parar). Junte todas as respostas em um único arquivo .txt.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button variant="secundario" onClick={copy}>{copied ? "Comando copiado ✓" : "Copiar comando-mestre"}</Button>
              <Button variant="discreto" onClick={download}>Baixar (.txt)</Button>
            </div>
            <p className="mt-2 t-tiny text-tinta-fraca">{prompt.length.toLocaleString("pt-BR")} caracteres.</p>
          </>
        ) : (
          <p className="mt-1 t-small text-tinta-suave">Escolha um tópico de um plano na lista abaixo para gerar o comando-mestre. Se você já tem o arquivo com as aulas, pode pular para o passo 2.</p>
        )}
      </section>

      <section className="rounded-lg border border-linha p-4" data-testid="massa-envio">
        <h2 className="t-h2">2. Enviar o arquivo com as aulas</h2>
        <p className="mt-1 t-small text-tinta-suave">Envie o .txt (ou cole o texto). Cada aula começa em <code>=== AULA ===</code>; até 40 aulas por envio.</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input ref={fileInput} type="file" accept=".txt,text/plain" hidden onChange={(e) => onFile(e.target.files?.[0])} data-testid="massa-arquivo" />
          <Button variant="secundario" onClick={() => fileInput.current?.click()}>{fileName ? "Trocar arquivo" : "Enviar arquivo .txt"}</Button>
          {fileName && <span className="t-small text-tinta-suave">{fileName}</span>}
        </div>
        <textarea
          value={text}
          onChange={(e) => { setText(e.target.value); setFileName((n) => n || ""); }}
          placeholder="Ou cole aqui todas as aulas, uma depois da outra…"
          rows={8}
          className="mt-3 w-full rounded-md border border-linha bg-papel p-3 font-mono t-small"
          aria-label="Texto com as aulas"
          data-testid="massa-texto"
        />
        <div className="mt-3 flex flex-wrap gap-2">
          <Button disabled={!text.trim() || pending} onClick={check} data-testid="massa-conferir">{pending && !publishing ? "Conferindo…" : "3. Conferir aulas"}</Button>
          {(text || preview || result) && <Button variant="discreto" disabled={pending} onClick={reset}>Limpar</Button>}
        </div>
      </section>

      {stale && <Notice tone="alerta">O texto mudou depois da conferência. Confira de novo antes de publicar.</Notice>}
      {error && <Notice tone="erro" title="Não deu para usar este arquivo">{error}</Notice>}

      {preview && (
        <section className="rounded-lg border border-linha p-4" data-testid="massa-previa">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="t-h2">Conferência: {preview.total} {preview.total === 1 ? "aula" : "aulas"}</h2>
            <Tag tone="verde">{preview.ready} prontas</Tag>
            {preview.blocked > 0 && <Tag tone="vermelho">{preview.blocked} com erro</Tag>}
            <Tag tone="azul">{preview.willPublish} vão ao ar na hora</Tag>
          </div>
          <ul className="mt-3 divide-y divide-linha">
            {preview.items.map((it) => (
              <li key={it.index} className="py-3" data-testid="massa-aula" data-ok={it.ok ? 1 : 0}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="tabular-nums text-tinta-fraca">{String(it.index).padStart(2, "0")}</span>
                  <strong>{it.title}</strong>
                  <Tag tone={!it.ok ? "vermelho" : it.willPublish ? "verde" : "ambar"}>{!it.ok ? "Com erro" : it.willPublish ? "Publica na hora" : "Entra como rascunho"}</Tag>
                  {it.updates && <Tag tone="neutro">atualiza “{it.updates.title}”</Tag>}
                </div>
                {it.group && <p className="t-tiny text-tinta-fraca">{it.group}</p>}
                {it.questions && <p className="t-tiny text-tinta-suave">Questões: {(["facil", "medio", "dificil"] as const).map((lv) => `${LV[lv]} ${it.questions![lv]}`).join(" · ")}{!it.willPublish && it.ok ? " (precisa de 10 por nível para publicar)" : ""}</p>}
                {it.errors.map((e, i) => <p key={i} className="mt-1 t-small text-erro">• {e}</p>)}
                {it.warnings.slice(0, 3).map((w, i) => <p key={i} className="mt-1 t-tiny text-alerta">• {w}</p>)}
              </li>
            ))}
          </ul>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Button disabled={pending || stale || preview.ready === 0} onClick={publish} data-testid="massa-publicar">{publishing ? "Publicando…" : `Publicar ${preview.ready} ${preview.ready === 1 ? "aula" : "aulas"}`}</Button>
            {preview.blocked > 0 && <span className="t-small text-tinta-suave">As {preview.blocked} com erro ficam de fora; corrija e envie de novo só elas.</span>}
          </div>
        </section>
      )}

      {result && (
        <section className="rounded-lg border border-linha p-4" data-testid="massa-resultado">
          <Notice tone={result.failed ? "alerta" : "sucesso"} title={`${result.published} publicada(s), ${result.drafts} em rascunho${result.failed ? `, ${result.failed} não entrou(entraram)` : ""}`}>
            Tudo o que entrou já está no catálogo e no plano do tópico.
          </Notice>
          <ul className="mt-3 divide-y divide-linha">
            {result.items.map((it) => (
              <li key={it.index} className="flex flex-wrap items-center gap-2 py-2">
                <span className="tabular-nums text-tinta-fraca">{String(it.index).padStart(2, "0")}</span>
                {it.id && admin ? <Link href={`${base}/${it.id}`} className="font-semibold text-destaque underline underline-offset-2">{it.title}</Link> : <strong>{it.title}</strong>}
                <Tag tone={it.status === "publicada" ? "verde" : it.status === "rascunho" ? "ambar" : "vermelho"}>{it.status}</Tag>
                {it.message && <span className="t-tiny text-tinta-suave">{it.message}</span>}
              </li>
            ))}
          </ul>
          <Link href={`${base}/plano`} className="mt-3 inline-block t-small font-semibold text-destaque underline underline-offset-2">Ver o plano de tópicos</Link>
        </section>
      )}
    </div>
  );
}
