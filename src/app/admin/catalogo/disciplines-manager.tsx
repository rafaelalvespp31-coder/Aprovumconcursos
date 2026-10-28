"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { DISCIPLINE_LABELS, DISCIPLINE_MODES } from "@/ai/pedagogy";
import { Button, inputClass, Tag } from "@/components/ui";
import type { AdminResult } from "./actions";

export interface DisciplineItem {
  slug: string;
  label: string;
  base: string;
  custom: boolean;
  lessons: number;
  outlines: number;
}

export interface DisciplineActions {
  create: (data: { label: string; base: string }) => Promise<AdminResult>;
  update: (slug: string, data: { label: string; base: string }) => Promise<AdminResult>;
  remove: (slug: string) => Promise<AdminResult>;
}

/** Estilos de explicação que uma matéria nova pode seguir (as matérias fixas). */
const BASES = DISCIPLINE_MODES.filter((m) => m !== "outra");

function BaseSelect({ value, onChange, id }: { value: string; onChange: (v: string) => void; id: string }) {
  return (
    <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={inputClass} name="estilo">
      {BASES.map((m) => (
        <option key={m} value={m}>
          Como {DISCIPLINE_LABELS[m]}
        </option>
      ))}
    </select>
  );
}

/**
 * Matérias do catálogo: as fixas e as cadastradas pela equipe. "Nova matéria" cadastra uma
 * matéria com o nome e o estilo de explicação das aulas; as cadastradas podem ser renomeadas e,
 * se nada usar, excluídas.
 */
export function DisciplinesManager({ rows, actions, startOpen = false }: { rows: DisciplineItem[]; actions: DisciplineActions; startOpen?: boolean }) {
  const router = useRouter();
  const [creating, setCreating] = useState(startOpen);
  const [showList, setShowList] = useState(false);
  const [label, setLabel] = useState("");
  const [base, setBase] = useState<string>("conhecimentos_especificos");
  const [res, setRes] = useState<AdminResult | null>(null);
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editBase, setEditBase] = useState("");
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const customCount = rows.filter((r) => r.custom).length;

  const run = (fn: () => Promise<AdminResult>, after?: () => void) =>
    start(async () => {
      const r = await fn().catch((): AdminResult => ({ ok: false, error: "Sem conexão. Tente de novo." }));
      setRes(r);
      if (r.ok) {
        after?.();
        router.refresh();
      }
    });

  return (
    <section className="mt-5 rounded-lg border border-linha bg-superficie p-4" aria-labelledby="materias-titulo" data-testid="materias">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="materias-titulo" className="t-h3 font-bold">
            Matérias
          </h2>
          <p className="t-small text-tinta-suave">
            {rows.length} matérias ({customCount} cadastrada{customCount === 1 ? "" : "s"} pela equipe).
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secundario" type="button" onClick={() => setShowList((v) => !v)} aria-expanded={showList} aria-controls="materias-lista">
            {showList ? "Esconder matérias" : "Ver matérias"}
          </Button>
          {!creating && (
            <Button
              type="button"
              onClick={() => {
                setCreating(true);
                setRes(null);
              }}
              data-testid="nova-materia"
            >
              Nova matéria
            </Button>
          )}
        </div>
      </div>

      {creating && (
        <form
          className="mt-4 flex flex-col gap-3 rounded-md border border-linha bg-nevoa p-4"
          onSubmit={(e) => {
            e.preventDefault();
            run(
              () => actions.create({ label, base }),
              () => {
                setLabel("");
                setShowList(true);
              },
            );
          }}
          aria-label="Cadastrar nova matéria"
        >
          <div className="grid gap-3 sm:grid-cols-[3fr_2fr]">
            <label className="flex flex-col gap-1 t-small font-semibold">
              Nome da matéria
              <input value={label} onChange={(e) => setLabel(e.target.value)} className={inputClass} placeholder="ex.: Criminologia, Direito Civil, Direitos Humanos" maxLength={60} required name="nome-materia" autoFocus />
            </label>
            <label className="flex flex-col gap-1 t-small font-semibold" htmlFor="estilo-nova">
              Estilo das aulas
              <BaseSelect id="estilo-nova" value={base} onChange={setBase} />
            </label>
          </div>
          <p className="t-tiny text-tinta-fraca">
            O estilo define como as aulas desta matéria são explicadas (ex.: uma matéria jurídica segue as regras de texto legal e jurisprudência de Direito Penal). Depois de
            cadastrar, use “Matéria: {label.trim() || "nome da matéria"}” no texto da aula, escolha a matéria no Plano de tópicos ou em “Editar” de cada aula.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={pending || label.trim().length < 2}>
              {pending ? "Cadastrando…" : "Cadastrar matéria"}
            </Button>
            <Button
              variant="secundario"
              type="button"
              disabled={pending}
              onClick={() => {
                setCreating(false);
                setLabel("");
                setRes(null);
              }}
            >
              Cancelar
            </Button>
          </div>
        </form>
      )}

      {res && (
        <p role={res.ok ? "status" : "alert"} className={`mt-3 t-small ${res.ok ? "font-semibold text-tinta" : "text-erro"}`} data-testid="materias-aviso">
          {res.ok ? res.message : res.error}
        </p>
      )}

      {showList && (
        <ul id="materias-lista" className="mt-4 divide-y divide-linha rounded-md border border-linha">
          {rows.map((r) => (
            <li key={r.slug} className="flex flex-wrap items-center gap-3 px-3 py-2.5 t-small" data-testid="materia-linha">
              {editing === r.slug ? (
                <form
                  className="flex w-full flex-wrap items-end gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    run(
                      () => actions.update(r.slug, { label: editLabel, base: editBase }),
                      () => setEditing(null),
                    );
                  }}
                >
                  <label className="flex min-w-[200px] flex-1 flex-col gap-1 font-semibold">
                    Nome
                    <input value={editLabel} onChange={(e) => setEditLabel(e.target.value)} className={inputClass} maxLength={60} required />
                  </label>
                  <label className="flex min-w-[200px] flex-1 flex-col gap-1 font-semibold" htmlFor={`estilo-${r.slug}`}>
                    Estilo das aulas
                    <BaseSelect id={`estilo-${r.slug}`} value={editBase} onChange={setEditBase} />
                  </label>
                  <Button type="submit" disabled={pending}>
                    Salvar
                  </Button>
                  <Button variant="secundario" type="button" onClick={() => setEditing(null)}>
                    Cancelar
                  </Button>
                </form>
              ) : (
                <>
                  <span className="min-w-0 flex-1">
                    <span className="font-semibold">{r.label}</span>{" "}
                    <span className="text-tinta-fraca">
                      · {r.lessons} aula{r.lessons === 1 ? "" : "s"} · {r.outlines} sumário{r.outlines === 1 ? "" : "s"}
                      {r.custom ? ` · estilo como ${DISCIPLINE_LABELS[r.base as keyof typeof DISCIPLINE_LABELS] ?? r.base}` : ""}
                    </span>
                  </span>
                  <Tag tone={r.custom ? "azul" : "neutro"}>{r.custom ? "Cadastrada" : "Fixa"}</Tag>
                  {r.custom &&
                    (confirmDel === r.slug ? (
                      <span className="flex items-center gap-2">
                        <span className="font-semibold">Excluir “{r.label}”?</span>
                        <Button variant="perigo" type="button" disabled={pending} onClick={() => run(() => actions.remove(r.slug), () => setConfirmDel(null))}>
                          Sim, excluir
                        </Button>
                        <Button variant="secundario" type="button" onClick={() => setConfirmDel(null)}>
                          Não
                        </Button>
                      </span>
                    ) : (
                      <span className="flex items-center gap-3">
                        <button
                          type="button"
                          className="font-semibold text-destaque underline underline-offset-2"
                          onClick={() => {
                            setEditing(r.slug);
                            setEditLabel(r.label);
                            setEditBase(r.base);
                            setRes(null);
                          }}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          className="font-semibold text-erro underline underline-offset-2 disabled:cursor-not-allowed disabled:no-underline disabled:opacity-50"
                          disabled={r.lessons + r.outlines > 0}
                          title={r.lessons + r.outlines > 0 ? "Em uso: mova as aulas e sumários para outra matéria antes" : undefined}
                          onClick={() => {
                            setConfirmDel(r.slug);
                            setRes(null);
                          }}
                        >
                          Excluir
                        </button>
                      </span>
                    ))}
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
