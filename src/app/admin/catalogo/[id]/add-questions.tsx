"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { checkQuestionsText } from "@/domain/catalog/upload";
import { applyFix, autoFixText, describeIssues, type TextIssue } from "@/domain/catalog/upload-fixes";
import { IssueList, MarkedTextarea, type LineMark, type MarkedTextareaHandle } from "../enviar/paste-checker";
import { Button, Notice, Tag } from "@/components/ui";
import type { AdminResult, QuestionsPreviewResult } from "../actions";
import type { TopicQuestionsPreview } from "@/server/services/catalog-upload";

const LEVEL = { facil: "Fácil", medio: "Médio", dificil: "Difícil" } as const;
type L = keyof typeof LEVEL;

/** Completar o banco de questões de uma aula já catalogada: comando do ChatGPT, colar, conferir, adicionar. */
export function AddQuestionsPanel({
  topicId,
  counts,
  prompt,
  actions,
}: {
  topicId: string;
  counts: Record<L, number>;
  prompt: string;
  actions: { preview: (id: string, text: string) => Promise<QuestionsPreviewResult>; add: (id: string, text: string) => Promise<AdminResult> };
}) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [checked, setChecked] = useState("");
  const [preview, setPreview] = useState<TopicQuestionsPreview | null>(null);
  const [msg, setMsg] = useState<AdminResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();
  const missing = (Object.keys(LEVEL) as L[]).filter((k) => counts[k] < 10);
  const stale = preview && text !== checked;

  // Conferência ao vivo e correção automática (no navegador).
  const [live, setLive] = useState<{ text: string; issues: TextIssue[] } | null>(null);
  const [autoMsg, setAutoMsg] = useState<{ applied: string[]; remaining: number } | null>(null);
  const ta = useRef<MarkedTextareaHandle>(null);
  useEffect(() => {
    if (!text.trim()) return;
    const h = setTimeout(() => {
      const r = checkQuestionsText(text);
      setLive({ text, issues: describeIssues(text, r.errors, r.warnings) });
    }, 350);
    return () => clearTimeout(h);
  }, [text]);
  const liveNow = text.trim() && live ? live : null;
  const fresh = !!liveNow && liveNow.text === text;
  const errorsNow = liveNow?.issues.filter((i) => i.severity === "erro") ?? [];
  const defaultLevel = (["facil", "medio", "dificil"] as const).findIndex((k) => counts[k] < 10);
  const marks = useMemo(() => {
    const m = new Map<number, LineMark>();
    for (const i of fresh ? liveNow!.issues : []) {
      if (!i.line) continue;
      for (let l = i.line; l < Math.max(i.line + 1, i.endLine ?? 0) && l < i.line + 400; l++) if (m.get(l) !== "erro") m.set(l, l === i.line ? i.severity : "foco");
    }
    return m;
  }, [fresh, liveNow]);
  const autoFix = () => {
    const r = autoFixText(text, checkQuestionsText, defaultLevel >= 0 ? { level: defaultLevel as 0 | 1 | 2 } : {});
    setAutoMsg({ applied: r.applied, remaining: r.remaining.length });
    if (r.text !== text) {
      setText(r.text);
      setPreview(null);
    }
  };

  return (
    <div className="flex flex-col gap-3" data-testid="adicionar-questoes">
      <p className="t-small tabular-nums">
        {(Object.keys(LEVEL) as L[]).map((k) => (
          <span key={k} className={`mr-3 ${counts[k] < 10 ? "font-semibold text-erro" : ""}`}>{LEVEL[k]}: {counts[k]}</span>
        ))}
        <span className="text-tinta-fraca">(mínimo de 10 por nível para publicar)</span>
      </p>
      {missing.length > 0 && (
        <Notice tone="alerta" title="Faltam questões nesta aula">
          {missing.map((k) => `${LEVEL[k]}: faltam ${10 - counts[k]}`).join(" · ")}. Peça ao ChatGPT com o comando abaixo e cole a resposta.
        </Notice>
      )}
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
          {copied ? "Comando copiado ✓" : "Copiar comando das questões para o ChatGPT"}
        </Button>
        <span className="t-tiny text-tinta-fraca">{prompt.length.toLocaleString("pt-BR")} caracteres · já leva o texto-base desta aula</span>
      </div>
      <details className="t-small">
        <summary className="cursor-pointer text-destaque">Ver o comando</summary>
        <pre className="mt-2 max-h-60 overflow-auto whitespace-pre-wrap rounded-md bg-nevoa p-3 t-tiny">{prompt}</pre>
      </details>
      <label htmlFor="questoes-aula" className="font-semibold">Cole aqui as questões</label>
      <MarkedTextarea ref={ta} id="questoes-aula" value={text} onChange={setText} marks={marks} placeholder={"=== QUESTÕES: MÉDIO ===\n--- QUESTÃO ---\nTipo: múltipla escolha\n…"} />
      {errorsNow.length > 0 && (
        <div className={`flex flex-col gap-2 ${fresh ? "" : "opacity-60"}`} data-testid="conferencia-questoes">
          <p className="t-small font-semibold text-erro">{errorsNow.length} erro(s) no texto — destacados em vermelho no campo.</p>
          <Button className="self-start" disabled={pending} onClick={autoFix} data-testid="autocorrigir-questoes">✓ Corrigir tudo automaticamente</Button>
          <IssueList issues={errorsNow} disabled={!fresh || pending} onGo={(i) => i.line && ta.current?.goTo(i.line, i.endLine)} onFix={(f) => { setText((t) => applyFix(t, f)); setPreview(null); }} lineLabel={(l) => `linha ${l}`} />
        </div>
      )}
      {autoMsg && (
        <Notice tone={autoMsg.remaining ? "alerta" : "sucesso"} title={autoMsg.applied.length ? `${autoMsg.applied.length} correção(ões) feita(s) no texto` : "Nada que dê para corrigir sozinho"}>
          {autoMsg.applied.length > 0 && (
            <details className="mt-1">
              <summary className="cursor-pointer">Ver o que mudou</summary>
              <ul className="mt-1 list-disc pl-5">{autoMsg.applied.map((a, k) => <li key={k}>{a}</li>)}</ul>
            </details>
          )}
          <p className="mt-1">{autoMsg.remaining ? `Falta(m) ${autoMsg.remaining} erro(s) que precisam da sua escolha.` : "Sem erros de formato. Clique em “Conferir questões”."}</p>
        </Notice>
      )}
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
          {pending && !preview ? "Conferindo…" : "Conferir questões"}
        </Button>
        {preview && (
          <Button
            disabled={!preview.ok || pending || !!stale}
            onClick={() =>
              start(async () => {
                const r = await actions.add(topicId, checked);
                setMsg(r);
                if (r.ok) {
                  setText("");
                  setPreview(null);
                  router.refresh();
                }
              })
            }
          >
            {preview.willPublish ? "Adicionar e publicar a aula" : "Adicionar questões"}
          </Button>
        )}
      </div>
      {stale && <Notice tone="alerta">O texto mudou depois da conferência. Confira de novo.</Notice>}
      {preview && (
        <div className="rounded-md border border-linha p-3 t-small">
          <div className="flex flex-wrap items-center gap-2">
            <Tag tone={preview.ok ? "verde" : "vermelho"}>{preview.ok ? "Pronto para adicionar" : `${preview.errors.length} erro(s)`}</Tag>
            <span className="tabular-nums">
              Vai adicionar — {(Object.keys(LEVEL) as L[]).map((k) => `${LEVEL[k]}: ${preview.adding[k]}`).join(" · ")}. Depois fica — {(Object.keys(LEVEL) as L[]).map((k) => `${LEVEL[k]}: ${preview.after[k]}`).join(" · ")}.
            </span>
          </div>
          {preview.willPublish && <p className="mt-1 text-tinta-suave">Com isso a aula fica completa e é publicada.</p>}
          {preview.errors.length > 0 && <ul className="mt-2 list-disc pl-5 text-erro">{preview.errors.slice(0, 20).map((e) => <li key={e}>{e}</li>)}</ul>}
          {preview.warnings.length > 0 && <ul className="mt-2 list-disc pl-5 text-tinta-suave">{preview.warnings.slice(0, 10).map((w) => <li key={w}>{w}</li>)}</ul>}
        </div>
      )}
      {msg && <Notice tone={msg.ok ? "sucesso" : "erro"}>{msg.ok ? msg.message : msg.error}</Notice>}
    </div>
  );
}
