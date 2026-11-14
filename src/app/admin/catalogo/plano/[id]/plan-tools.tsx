"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Button, Notice, Tag } from "@/components/ui";
import { importBulkUploadAction, previewBulkUploadAction, topicMasterPromptAction } from "../../actions";
import type { BulkPreview, BulkResult } from "@/server/services/catalog-bulk";
import type { AdminResult } from "../../actions";
import { OutlineForm } from "../outline-form";
import { buildNovoComandoCompleto } from "@/domain/catalog/novo-comando-completo";
import type { OutlineItem, OutlineSubtopic } from "@/domain/catalog/topic-group";

/**
 * Comando do subtópico, montado no navegador (a página não carrega um texto grande por subtópico).
 * É um comando só, completo (aula, referências e questões); a aula cresce com o assunto.
 */
export function SubtopicCommands({ disciplineMode, group, sub }: { disciplineMode: string; group: OutlineItem; sub: OutlineSubtopic }) {
  const name = (sub.code ?? sub.title).replace(/[^\p{L}\p{N}]+/gu, "-").slice(0, 40);
  const [novo] = useState(() => buildNovoComandoCompleto({ disciplineMode, group, subs: [sub] }));
  return (
    <span className="inline-flex flex-wrap items-center gap-2" data-testid="comandos-subtopico">
      <CopyPrompt prompt={novo} name={`novo-${name}`} label="Novo Comando Completo" testId="copiar-novo-comando" primary />
    </span>
  );
}

/** Copia o comando do subtópico (com baixar .txt quando a área de transferência falha). */
export function CopyPrompt({ prompt, name, label = "Copiar comando", testId = "copiar-comando", primary = false }: { prompt: string; name: string; label?: string; testId?: string; primary?: boolean }) {
  const [state, setState] = useState<"" | "ok" | "erro">("");
  const download = () => {
    const url = URL.createObjectURL(new Blob([prompt], { type: "text/plain;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `comando-${name}.txt`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <Button
        type="button"
        variant={primary ? "primario" : "secundario"}
        className="min-h-9 px-3 t-small"
        data-testid={testId}
        title={`${prompt.length.toLocaleString("pt-BR")} caracteres`}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(prompt);
            setState("ok");
            setTimeout(() => setState(""), 2500);
          } catch {
            setState("erro");
          }
        }}
      >
        {state === "ok" ? "✓ Copiado" : label}
      </Button>
      {state === "erro" && (
        <button type="button" onClick={download} className="t-tiny font-semibold text-destaque underline underline-offset-2">
          Não deu para copiar — baixar .txt
        </button>
      )}
    </span>
  );
}

type Input = { disciplineMode: string; title: string; text: string };

export function EditPlan({ id, initial, update, remove }: { id: string; initial: Input; update: (id: string, d: Input) => Promise<AdminResult>; remove: (id: string) => Promise<AdminResult> }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secundario" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
          {open ? "Fechar edição" : "Editar sumário"}
        </Button>
        {!confirm ? (
          <Button type="button" variant="secundario" onClick={() => setConfirm(true)}>Excluir plano</Button>
        ) : (
          <span className="inline-flex flex-wrap items-center gap-2 t-small">
            Excluir só o plano (as aulas catalogadas continuam)?
            <Button type="button" disabled={pending} onClick={() => start(async () => { const r = await remove(id); if (!r.ok) setErr(r.error ?? "Erro."); })}>Sim, excluir</Button>
            <Button type="button" variant="secundario" onClick={() => setConfirm(false)}>Cancelar</Button>
          </span>
        )}
        {err && <span className="t-small text-erro" role="alert">{err}</span>}
      </div>
      {open && (
        <div className="rounded-lg border border-linha p-4">
          <OutlineForm
            initial={initial}
            submitLabel="Salvar alterações"
            submit={(d) => update(id, d)}
            onDone={() => {
              setOpen(false);
              router.refresh();
            }}
          />
        </div>
      )}
    </div>
  );
}

/** Botão "Remover aula" (só administrador) dentro do subtópico repetido: arquiva a aula e atualiza a tela. */
export function RemoveLessonButton({ id, title, remove }: { id: string; title: string; remove: (id: string) => Promise<AdminResult> }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [erro, setErro] = useState("");
  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        disabled={pending}
        data-testid="remover-aula-duplicada"
        className="rounded-full bg-erro px-3 py-1 t-small font-bold text-white disabled:opacity-60"
        onClick={() => {
          if (!window.confirm(`Remover a aula "${title}"? Ela sai do site (fica arquivada e dá para restaurar na página da aula).`)) return;
          setErro("");
          start(async () => {
            const r = await remove(id);
            if (r.ok) router.refresh();
            else setErro(r.error ?? "Não consegui remover.");
          });
        }}
      >
        {pending ? "Removendo…" : "Remover aula"}
      </button>
      {erro && <span className="t-tiny text-erro">{erro}</span>}
    </span>
  );
}

/** Botão "Remover do plano": tira o subtópico repetido (e os itens dele) do sumário. Não apaga aulas. */
export function RemoveFromPlanButton({ outlineId, refId, title, remove }: { outlineId: string; refId: string; title: string; remove: (id: string, ref: string) => Promise<AdminResult> }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [erro, setErro] = useState("");
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={pending}
        data-testid="remover-do-plano"
        className="rounded-full bg-erro px-3 py-1 t-small font-bold text-white disabled:opacity-60"
        onClick={() => {
          if (!window.confirm(`Tirar "${title}" do plano? Os módulos dele também saem do sumário. Nenhuma aula é apagada.`)) return;
          setErro("");
          start(async () => {
            const r = await remove(outlineId, refId);
            if (r.ok) router.refresh();
            else setErro(r.error ?? "Não consegui remover.");
          });
        }}
      >
        {pending ? "Removendo…" : "Remover do plano"}
      </button>
      {erro && <span className="t-tiny text-erro">{erro}</span>}
    </span>
  );
}

/** Esconde (ou mostra) os subtópicos já publicados e os tópicos completos, para ver só o que falta. Lembra a escolha neste aparelho. */
export function HidePublished({ publicados, children }: { publicados: number; children: React.ReactNode }) {
  const [hide, setHide] = useState(false);
  useEffect(() => {
    try {
      if (window.localStorage.getItem("plano-esconder-catalogados") === "1") setHide(true);
    } catch {
      /* sem armazenamento: segue mostrando tudo */
    }
  }, []);
  const toggle = () => {
    const next = !hide;
    setHide(next);
    try {
      window.localStorage.setItem("plano-esconder-catalogados", next ? "1" : "0");
    } catch {
      /* ignora */
    }
  };
  return (
    <>
      <button
        type="button"
        onClick={toggle}
        aria-pressed={hide}
        data-testid="esconder-catalogados"
        className={`self-start rounded-full px-4 py-2 t-small font-bold ${hide ? "bg-destaque text-white" : "border border-linha bg-white text-tinta"}`}
      >
        {hide ? `Mostrar os ${publicados} já catalogados` : `Esconder os ${publicados} já catalogados`}
      </button>
      <div className="flex flex-col gap-8" data-esconder={hide ? "1" : undefined}>
        {children}
      </div>
    </>
  );
}


/**
 * Dentro do card do tópico: copiar o comando-mestre (todos os subtópicos) e, logo abaixo, enviar o .txt com as aulas.
 * O envio confere cada aula e só cataloga quando se clica em Publicar.
 */
export function TopicBulk({ outlineId, gi, label }: { outlineId: string; gi: number; label: string }) {
  const router = useRouter();
  const [copiedNovo, setCopiedNovo] = useState<"" | "ok" | "erro">("");
  const [fileName, setFileName] = useState("");
  const [text, setText] = useState("");
  const [preview, setPreview] = useState<BulkPreview | null>(null);
  const [result, setResult] = useState<BulkResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [publishing, setPublishing] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const copyWith = (novo: boolean) => {
    setError(null);
    start(async () => {
      const r = await topicMasterPromptAction(outlineId, gi, novo);
      if (!r.ok) { setError(r.error); return; }
      const mark = setCopiedNovo;
      try { await navigator.clipboard.writeText(r.prompt); mark("ok"); setTimeout(() => mark(""), 2500); }
      catch {
        const url = URL.createObjectURL(new Blob([r.prompt], { type: "text/plain;charset=utf-8" }));
        const a = document.createElement("a");
        a.href = url; a.download = `${novo ? "novo-comando-completo" : "comando-mestre"}-topico-${gi + 1}.txt`; a.click();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
        mark("erro");
      }
    });
  };
  const onFile = async (f: File | undefined) => {
    if (!f) return;
    setError(null); setPreview(null); setResult(null);
    if (f.size > 3_000_000) { setError("Arquivo grande demais (máximo de 3 MB)."); return; }
    const t = await f.text();
    setFileName(f.name); setText(t);
    start(async () => {
      const r = await previewBulkUploadAction(t);
      if (r.ok) setPreview(r.preview); else setError(r.error);
    });
    if (input.current) input.current.value = "";
  };
  const publish = () => {
    setError(null); setPublishing(true);
    start(async () => {
      const r = await importBulkUploadAction(text, fileName);
      if (r.ok) { setResult(r.result); setPreview(null); router.refresh(); } else setError(r.error);
      setPublishing(false);
    });
  };
  const clear = () => { setPreview(null); setResult(null); setError(null); setText(""); setFileName(""); };

  return (
    <div className="mt-3 flex flex-col items-start gap-2" data-testid="topico-massa" aria-label={`Catalogar o tópico ${label} em massa`}>
      <Button type="button" variant="primario" onClick={() => copyWith(true)} disabled={pending && !preview} data-testid="copiar-novo-comando-topico">
        {copiedNovo === "ok" ? "Novo Comando Completo copiado ✓" : copiedNovo === "erro" ? "Baixei o Novo Comando Completo (.txt)" : "Copiar Novo Comando Completo do tópico"}
      </Button>
      <input ref={input} type="file" accept=".txt,text/plain" hidden onChange={(e) => onFile(e.target.files?.[0])} data-testid="topico-arquivo" />
      <Button type="button" variant="secundario" onClick={() => input.current?.click()} disabled={pending} data-testid="enviar-aulas-txt">
        {pending && !publishing && fileName ? "Conferindo…" : "Enviar .txt com as aulas do tópico"}
      </Button>
      {error && <Notice tone="erro" title="Não deu para usar este arquivo">{error}</Notice>}
      {preview && (
        <div className="w-full rounded-md border border-linha bg-papel p-3" data-testid="topico-previa">
          <div className="flex flex-wrap items-center gap-2">
            <strong className="t-small">{fileName}: {preview.total} {preview.total === 1 ? "aula" : "aulas"}</strong>
            <Tag tone="verde">{preview.ready} prontas</Tag>
            {preview.blocked > 0 && <Tag tone="vermelho">{preview.blocked} com erro</Tag>}
            <Tag tone="azul">{preview.willPublish} vão ao ar na hora</Tag>
          </div>
          <ul className="mt-2 divide-y divide-linha">
            {preview.items.map((it) => (
              <li key={it.index} className="py-2 t-small">
                <span className="tabular-nums text-tinta-fraca">{String(it.index).padStart(2, "0")}</span> <strong>{it.title}</strong>{" "}
                <Tag tone={!it.ok ? "vermelho" : it.willPublish ? "verde" : "ambar"}>{!it.ok ? "Com erro" : it.willPublish ? "Publica" : "Rascunho"}</Tag>
                {it.errors.slice(0, 2).map((e, i) => <p key={i} className="t-tiny text-erro">• {e}</p>)}
              </li>
            ))}
          </ul>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button type="button" onClick={publish} disabled={pending || preview.ready === 0} data-testid="topico-publicar">{publishing ? "Publicando…" : `Publicar ${preview.ready} ${preview.ready === 1 ? "aula" : "aulas"}`}</Button>
            <Button type="button" variant="discreto" onClick={clear} disabled={pending}>Cancelar</Button>
          </div>
        </div>
      )}
      {result && (
        <div className="w-full" data-testid="topico-resultado">
          <Notice tone={result.failed ? "alerta" : "sucesso"} title={`${result.published} publicada(s), ${result.drafts} em rascunho${result.failed ? `, ${result.failed} não entrou(entraram)` : ""}`}>
            {result.items.filter((i) => i.status === "falhou" || i.status === "ignorada").map((i) => `${i.title}: ${i.message}`).join(" · ") || "Tudo catalogado neste tópico."}
          </Notice>
          <Button type="button" variant="discreto" className="mt-2" onClick={clear}>Fechar</Button>
        </div>
      )}
    </div>
  );
}
