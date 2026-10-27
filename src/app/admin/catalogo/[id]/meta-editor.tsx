"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button, inputClass } from "@/components/ui";
import { LAWS } from "@/domain/catalog/match";
import { saveTopicMetaAction, type AdminResult } from "../actions";

interface Props {
  id: string;
  title: string;
  kind: string;
  lawCode: string | null;
  articles: string[];
  /** Troca a gravação (prévia da galeria). */
  save?: typeof saveTopicMetaAction;
}

/** Botão "Editar tema e tipo": corrige o título e o tipo (tema ou artigo de lei) sem recolar a aula. */
export function TopicMetaEditor(p: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(p.title);
  const [kind, setKind] = useState(
    p.kind === "dispositivo" ? "dispositivo" : "tema",
  );
  const [law, setLaw] = useState(p.lawCode ?? "");
  const [articles, setArticles] = useState(p.articles.join(", "));
  const [res, setRes] = useState<AdminResult | null>(null);
  const [pending, start] = useTransition();

  const reset = () => {
    setTitle(p.title);
    setKind(p.kind === "dispositivo" ? "dispositivo" : "tema");
    setLaw(p.lawCode ?? "");
    setArticles(p.articles.join(", "));
    setRes(null);
  };

  if (!open)
    return (
      <div className="flex items-center gap-3">
        <Button
          variant="secundario"
          onClick={() => setOpen(true)}
          data-testid="editar-tema"
        >
          Editar tema e tipo
        </Button>
        {res?.ok && (
          <span className="t-small text-tinta-suave" role="status">
            Salvo.
          </span>
        )}
      </div>
    );

  return (
    <form
      className="flex flex-col gap-3 rounded-md border border-linha bg-superficie p-4"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await (p.save ?? saveTopicMetaAction)(p.id, {
            title,
            kind,
            law,
            articles,
          });
          setRes(r);
          if (r.ok) {
            setOpen(false);
            router.refresh();
          }
        });
      }}
    >
      <label className="flex flex-col gap-1 t-small font-semibold">
        Tema
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={inputClass}
          maxLength={200}
          required
          name="tema"
        />
      </label>
      <fieldset className="flex flex-col gap-1">
        <legend className="t-small font-semibold">Tipo</legend>
        <div className="flex flex-wrap gap-4 t-small">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="tipo"
              value="tema"
              checked={kind === "tema"}
              onChange={() => setKind("tema")}
            />
            Tema
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="tipo"
              value="dispositivo"
              checked={kind === "dispositivo"}
              onChange={() => setKind("dispositivo")}
            />
            Dispositivo (artigo de lei)
          </label>
        </div>
      </fieldset>
      {kind === "dispositivo" && (
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 t-small font-semibold">
            Lei
            <input
              value={law}
              onChange={(e) => setLaw(e.target.value)}
              className={inputClass}
              list="leis-catalogo"
              placeholder="ex.: CP, CPP, CF, Lei 11.343"
              name="lei"
            />
          </label>
          <datalist id="leis-catalogo">
            {LAWS.map((l) => (
              <option key={l.code} value={l.code}>
                {l.name}
              </option>
            ))}
          </datalist>
          <label className="flex flex-col gap-1 t-small font-semibold">
            Artigos
            <input
              value={articles}
              onChange={(e) => setArticles(e.target.value)}
              className={inputClass}
              placeholder="ex.: 155 ou 121, 122 ou 1 a 5"
              name="artigos"
            />
          </label>
        </div>
      )}
      <p className="t-tiny text-tinta-fraca">
        Muda só o nome e o tipo da aula. O texto, as seções e as questões
        continuam iguais, e a mudança vale na hora para os alunos.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando…" : "Salvar"}
        </Button>
        <Button
          variant="secundario"
          type="button"
          disabled={pending}
          onClick={() => {
            reset();
            setOpen(false);
          }}
        >
          Cancelar
        </Button>
        {res && !res.ok && (
          <span className="t-small text-erro" role="alert">
            {res.error}
          </span>
        )}
      </div>
    </form>
  );
}
