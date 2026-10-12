"use client";

import { useActionState, useState } from "react";
import { Button, Field, Notice, inputClass } from "@/components/ui";
import { DISCIPLINE_LABELS, DISCIPLINE_MODES } from "@/ai/pedagogy";
import { LAWS } from "@/domain/catalog/match";
import { createTopicAction, updateTopicAction, type AdminResult } from "./actions";

export interface TopicFormValues {
  title: string;
  kind: "tema" | "dispositivo";
  lawCode: string | null;
  articles: string[];
  aliases: string[];
  disciplineMode: string;
  summary: string | null;
  sourceText: string;
  estimatedMinutes: number;
}

/** Cadastro/edição dos dados de um tema do catálogo. */
export function TopicForm({ id, initial }: { id?: string; initial?: TopicFormValues }) {
  const [state, action, pending] = useActionState<AdminResult, FormData>(id ? updateTopicAction.bind(null, id) : createTopicAction, { ok: false });
  const [kind, setKind] = useState<"tema" | "dispositivo">(initial?.kind ?? "tema");
  return (
    <form action={action} className="flex flex-col gap-4">
      <fieldset className="flex flex-wrap gap-3">
        <legend className="mb-1.5 t-small font-semibold">Tipo</legend>
        {(["tema", "dispositivo"] as const).map((k) => (
          <label key={k} className="flex cursor-pointer items-center gap-2 rounded-md border border-linha-forte px-3 py-2 has-[:checked]:border-azul has-[:checked]:bg-nevoa">
            <input type="radio" name="kind" value={k} checked={kind === k} onChange={() => setKind(k)} className="accent-azul" />
            {k === "tema" ? "Tema (ex.: Prisão em flagrante)" : "Dispositivo de lei (artigos)"}
          </label>
        ))}
      </fieldset>
      <Field id="title" label="Título">
        <input id="title" name="title" required maxLength={200} defaultValue={initial?.title} className={inputClass} placeholder={kind === "tema" ? "Prisão em flagrante" : "Homicídio (CP, art. 121)"} />
      </Field>
      {kind === "dispositivo" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="lawCode" label="Lei" hint="Sigla usada no reconhecimento automático dos pedidos.">
            <select id="lawCode" name="lawCode" defaultValue={initial?.lawCode ?? "CP"} className={inputClass}>
              {LAWS.map((l) => <option key={l.code} value={l.code}>{l.code} — {l.name}</option>)}
            </select>
          </Field>
          <Field id="articles" label="Artigo(s)" hint="Ex.: 121 ou 121-A. Prefira um artigo por tema: pedidos como “arts. 121 a 129” juntam os temas sozinhos.">
            <input id="articles" name="articles" defaultValue={initial?.articles.join(", ")} className={inputClass} placeholder="121" />
          </Field>
        </div>
      )}
      <Field id="aliases" label="Sinônimos (um por linha)" hint="Outras formas que os alunos usam para pedir este conteúdo. Ajudam o reconhecimento automático.">
        <textarea id="aliases" name="aliases" rows={3} defaultValue={initial?.aliases.join("\n")} className={`${inputClass} py-2`} placeholder={"flagrante delito\nprisão em flagrante delito"} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="disciplineMode" label="Disciplina">
          <select id="disciplineMode" name="disciplineMode" defaultValue={initial?.disciplineMode ?? "outra"} className={inputClass}>
            {DISCIPLINE_MODES.map((d) => <option key={d} value={d}>{DISCIPLINE_LABELS[d]}</option>)}
          </select>
        </Field>
        <Field id="estimatedMinutes" label="Tempo estimado (min)">
          <input id="estimatedMinutes" name="estimatedMinutes" type="number" min={5} max={600} defaultValue={initial?.estimatedMinutes ?? 40} className={inputClass} />
        </Field>
      </div>
      <Field id="summary" label="Resumo do escopo (opcional)" hint="O que entra e o que fica de fora. Orienta a IA ao gerar o rascunho.">
        <textarea id="summary" name="summary" rows={2} maxLength={2000} defaultValue={initial?.summary ?? ""} className={`${inputClass} py-2`} />
      </Field>
      <Field id="sourceText" label="Texto-fonte (recomendado para artigos de lei)" hint="Cole o texto oficial do dispositivo. Sem texto, a IA organiza só os títulos dos subtemas, e o texto legal não é transcrito.">
        <textarea id="sourceText" name="sourceText" rows={8} defaultValue={initial?.sourceText} className={`${inputClass} py-2 font-serif`} />
      </Field>
      {state.error && <Notice tone="erro">{state.error}</Notice>}
      {state.ok && state.message && <Notice tone="sucesso">{state.message}</Notice>}
      <Button type="submit" disabled={pending} className="self-start">{pending ? "Salvando…" : id ? "Salvar dados" : "Criar tema"}</Button>
    </form>
  );
}
