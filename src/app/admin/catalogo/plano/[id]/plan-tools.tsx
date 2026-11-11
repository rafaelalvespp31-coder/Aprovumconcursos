"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui";
import type { AdminResult } from "../../actions";
import { OutlineForm } from "../outline-form";
import { buildSubtopicPrompt } from "@/domain/catalog/subtopic-prompt";
import type { OutlineItem, OutlineSubtopic } from "@/domain/catalog/topic-group";

/**
 * Comando do subtópico, montado no navegador (a página não carrega um texto grande por subtópico).
 * É um comando só, completo (aula, referências e questões); a aula cresce com o assunto.
 */
export function SubtopicCommands({ disciplineMode, group, sub }: { disciplineMode: string; group: OutlineItem; sub: OutlineSubtopic }) {
  const name = (sub.code ?? sub.title).replace(/[^\p{L}\p{N}]+/gu, "-").slice(0, 40);
  const [whole] = useState(() => buildSubtopicPrompt({ disciplineMode, group, sub }));
  return (
    <span className="inline-flex flex-wrap items-center gap-2" data-testid="comandos-subtopico">
      <CopyPrompt prompt={whole} name={name} label="Copiar comando completo" primary />
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
