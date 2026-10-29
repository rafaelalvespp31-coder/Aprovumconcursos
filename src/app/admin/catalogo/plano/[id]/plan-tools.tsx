"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui";
import type { AdminResult } from "../../actions";
import { OutlineForm } from "../outline-form";
import { buildSubtopicPrompt, buildSubtopicPromptParts } from "@/domain/catalog/subtopic-prompt";
import type { OutlineItem, OutlineSubtopic } from "@/domain/catalog/topic-group";

/** Itens a partir dos quais a aula é considerada grande (melhor pedir em 2 comandos). */
export const SPLIT_FROM_ITEMS = 10;

/**
 * Comandos do subtópico, montados no navegador (a página não carrega 3 textos grandes por
 * subtópico): o comando inteiro e, para aulas grandes, o comando 1 (aula) e o comando 2 (questões),
 * enviados na mesma conversa e colados nos dois campos de "Catalogar aula".
 */
export function SubtopicCommands({ disciplineMode, group, sub }: { disciplineMode: string; group: OutlineItem; sub: OutlineSubtopic }) {
  const name = (sub.code ?? sub.title).replace(/[^\p{L}\p{N}]+/gu, "-").slice(0, 40);
  const big = sub.items.length > SPLIT_FROM_ITEMS;
  const [whole] = useState(() => buildSubtopicPrompt({ disciplineMode, group, sub }));
  const [parts] = useState(() => buildSubtopicPromptParts({ disciplineMode, group, sub }));
  return (
    <span className="inline-flex flex-wrap items-center gap-2" data-testid="comandos-subtopico">
      {big && <span className="t-tiny font-semibold text-alerta">Aula grande: use os comandos 1 e 2</span>}
      <CopyPrompt prompt={parts.part1} name={`${name}-comando-1`} label="Comando 1 (aula)" testId="copiar-comando-1" primary={big} />
      <CopyPrompt prompt={parts.part2} name={`${name}-comando-2`} label="Comando 2 (questões)" testId="copiar-comando-2" primary={big} />
      <CopyPrompt prompt={whole} name={name} label={big ? "Comando inteiro" : "Copiar comando"} />
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
