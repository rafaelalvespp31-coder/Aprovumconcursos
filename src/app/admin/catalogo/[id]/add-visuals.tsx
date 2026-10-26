"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button, Notice, Tag } from "@/components/ui";
import type { AdminResult, EnrichPreviewResult } from "../actions";
import type { TopicEnrichPreview } from "@/server/services/catalog-upload";

/** Completar uma aula catalogada com os exemplos visuais (tirinha, carimbo, esquema) e os flashcards. */
export function AddVisualsPanel({
  topicId,
  status,
  prompt,
  actions,
}: {
  topicId: string;
  status: { teaching: number; withExample: number; flashcards: number };
  prompt: string;
  actions: { preview: (id: string, text: string) => Promise<EnrichPreviewResult>; apply: (id: string, text: string) => Promise<AdminResult> };
}) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [checked, setChecked] = useState("");
  const [preview, setPreview] = useState<TopicEnrichPreview | null>(null);
  const [msg, setMsg] = useState<AdminResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();
  const missing = status.teaching - status.withExample;
  const complete = missing === 0 && status.flashcards >= 4;
  const stale = preview && text !== checked;

  return (
    <div className="flex flex-col gap-3" data-testid="adicionar-visuais">
      <p className="t-small tabular-nums">
        <span className={`mr-3 ${missing ? "font-semibold text-erro" : ""}`}>Exemplos visuais: {status.withExample} de {status.teaching} seções</span>
        <span className={status.flashcards < 4 ? "font-semibold text-erro" : ""}>Flashcards: {status.flashcards || "nenhum"}</span>
      </p>
      {complete ? (
        <Notice tone="sucesso">Esta aula já tem exemplo visual em todas as seções e flashcards.</Notice>
      ) : (
        <Notice tone="alerta" title="Faltam exemplos visuais ou flashcards">
          {[missing ? `${missing} seção(ões) sem exemplo visual` : null, status.flashcards < 4 ? "sem flashcards" : null].filter(Boolean).join(" · ")}. Copie o comando, cole no ChatGPT e cole a resposta aqui: a aula não é refeita, só ganha os blocos.
        </Notice>
      )}
      {!complete && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secundario"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(prompt);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2500);
                } catch {
                  setMsg({ ok: false, error: "Não consegui copiar. Abra “Ver o comando” e copie." });
                }
              }}
            >
              {copied ? "Comando copiado ✓" : "Copiar comando dos exemplos e flashcards"}
            </Button>
            <span className="t-tiny text-tinta-fraca">{prompt.length.toLocaleString("pt-BR")} caracteres · já leva os títulos das seções desta aula</span>
          </div>
          <details className="t-small">
            <summary className="cursor-pointer text-destaque">Ver o comando</summary>
            <pre className="mt-2 max-h-60 overflow-auto whitespace-pre-wrap rounded-md bg-nevoa p-3 t-tiny">{prompt}</pre>
          </details>
        </>
      )}
      <label htmlFor="visuais-aula" className="font-semibold">Cole aqui a resposta do ChatGPT</label>
      <textarea
        id="visuais-aula"
        value={text}
        onChange={(e) => setText(e.target.value)}
        spellCheck={false}
        placeholder={"=== EXEMPLOS VISUAIS ===\n--- SEÇÃO: (título) ---\n:::exemplo\n…\n:::\n=== FLASHCARDS ===\n**Pergunta?**\n→ resposta"}
        className="min-h-48 w-full rounded-md border border-linha-forte bg-superficie p-3 font-mono text-[13px] leading-relaxed focus:border-azul focus:outline-none focus:ring-2 focus:ring-azul/20"
      />
      <div className="flex flex-wrap items-center gap-2">
        <Button
          disabled={!text.trim() || pending}
          onClick={() =>
            start(async () => {
              setMsg(null);
              setPreview(null);
              const t = text;
              const r = await actions.preview(topicId, t);
              if (r.ok) {
                setPreview(r.preview);
                setChecked(t);
              } else setMsg({ ok: false, error: r.error });
            })
          }
        >
          {pending && !preview ? "Conferindo…" : "Conferir"}
        </Button>
        {preview && (
          <Button
            disabled={!preview.ok || pending || !!stale}
            onClick={() =>
              start(async () => {
                const r = await actions.apply(topicId, checked);
                setMsg(r);
                if (r.ok) {
                  setText("");
                  setPreview(null);
                  router.refresh();
                }
              })
            }
          >
            Acrescentar à aula
          </Button>
        )}
      </div>
      {stale && <Notice tone="alerta">O texto mudou depois da conferência. Confira de novo.</Notice>}
      {preview && (
        <div className="rounded-md border border-linha p-3 t-small">
          <div className="flex flex-wrap items-center gap-2">
            <Tag tone={preview.ok ? "verde" : "vermelho"}>{preview.ok ? "Pronto para acrescentar" : `${preview.errors.length} erro(s)`}</Tag>
            <span className="tabular-nums">
              Vai acrescentar {preview.examples.length} exemplo(s){preview.flashcards ? ` e ${preview.flashcards} flashcards` : ""}. Depois fica — exemplos: {preview.after.withExample} de {preview.after.teaching} · flashcards: {preview.after.flashcards}.
            </span>
          </div>
          {preview.errors.length > 0 && <ul className="mt-2 list-disc pl-5 text-erro">{preview.errors.slice(0, 20).map((e) => <li key={e}>{e}</li>)}</ul>}
          {preview.warnings.length > 0 && <ul className="mt-2 list-disc pl-5 text-tinta-suave">{preview.warnings.slice(0, 12).map((w) => <li key={w}>{w}</li>)}</ul>}
        </div>
      )}
      {msg && <Notice tone={msg.ok ? "sucesso" : "erro"}>{msg.ok ? msg.message : msg.error}</Notice>}
    </div>
  );
}
