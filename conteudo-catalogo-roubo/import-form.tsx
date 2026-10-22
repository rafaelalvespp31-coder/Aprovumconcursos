"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button, Notice } from "@/components/ui";
import { importCatalogBundleAction, type ImportResult } from "./actions";

const initialState: ImportResult = { ok: false };

function FileField({ id, label, hint, required = true }: { id: string; label: string; hint: string; required?: boolean }) {
  return (
    <label htmlFor={id} className="flex flex-col gap-1.5 rounded-lg border border-linha p-4">
      <span className="font-semibold">{label}{required ? " *" : " (opcional)"}</span>
      <span className="t-small text-tinta-suave">{hint}</span>
      <input id={id} name={id} type="file" accept=".json,application/json" required={required} className="mt-1 block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-tinta file:px-3 file:py-2 file:font-semibold file:text-white" />
    </label>
  );
}

export function ImportForm() {
  const [state, action, pending] = useActionState(importCatalogBundleAction, initialState);
  return (
    <form action={action} className="mt-6 flex flex-col gap-4">
      <div className="grid gap-3 md:grid-cols-2">
        <FileField id="topic" label="1. topic.json" hint="Metadados do tema, slug, disciplina, texto-fonte e estrutura." />
        <FileField id="lesson" label="2. lesson.json" hint="Aula completa, seções, referências e itens ensinados." />
        <FileField id="questions" label="3. questoes.json" hint="Lista de questões no formato atual do Aprovum, incluindo níveis e gabaritos." />
        <FileField id="nodes" label="4. nodes.json" hint="Estrutura da aula. Se não tiver este arquivo, usamos os nós de topic.json." required={false} />
      </div>
      <div className="rounded-lg border border-linha bg-nevoa p-4 t-small">
        <p className="font-semibold">Proteções desta importação</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-tinta-suave">
          <li>Cria somente um novo rascunho; não sobrescreve temas existentes.</li>
          <li>Confere campos obrigatórios, alternativas corretas, níveis e chaves de estrutura.</li>
          <li>As questões não são publicadas automaticamente.</li>
          <li>Limite de 1 MB por arquivo e 3,5 MB no conjunto.</li>
        </ul>
      </div>
      {state.error && <Notice tone="erro">{state.error}</Notice>}
      {state.ok && state.message && (
        <Notice tone="sucesso">
          <span>{state.message} </span>
          <Link href="/admin/catalogo" className="font-semibold underline underline-offset-2">Abrir catálogo</Link>
        </Notice>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>{pending ? "Validando e importando…" : "Validar e importar como rascunho"}</Button>
        <Link href="/admin/catalogo" className="t-small text-tinta-suave underline underline-offset-2">Cancelar</Link>
      </div>
    </form>
  );
}
