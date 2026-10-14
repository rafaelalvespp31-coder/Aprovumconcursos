"use client";

import { startTransition, useActionState, useEffect, useMemo, useRef, useState } from "react";
import { BuildingOverlay } from "./building-overlay";
import { CatalogPicker } from "./catalog-picker";
import type { CatalogPickerGroup } from "@/domain/catalog/picker";
import { Button, Notice, inputClass } from "@/components/ui";
import { CONTENT_EXAMPLES, CONTENT_LIMITS, EXAM_BOARDS, trailRequestSchema, type ExamBoardSlug } from "@/domain/trail-input";
import type { ContentType } from "@/domain/content/types";
import { catalogHintAction, createTrailAction, type CatalogHint, type CreateTrailState } from "./actions";

const PLACEHOLDER =
  "Ex.: Prisão em flagrante · Art. 5º da Constituição Federal · Arts. 121 a 129 do Código Penal · ou cole o texto da lei, o capítulo ou a matéria que você quer estudar agora.";

function Step({ n, title, done, children }: { n: number; title: string; done: boolean; children: React.ReactNode }) {
  return (
    <fieldset className="min-w-0 border-l-2 border-linha pl-5 data-[done=true]:border-azul" data-done={done}>
      <legend className="-ml-[2.15rem] flex items-center gap-3">
        <span
          className={`flex size-7 items-center justify-center rounded-full t-small font-bold ${done ? "bg-azul text-white" : "bg-superficie text-tinta-suave ring-1 ring-linha-forte"}`}
          aria-hidden
        >
          {n}
        </span>
        <span className="t-h2">{title}</span>
      </legend>
      <div className="mt-4 pb-8">{children}</div>
    </fieldset>
  );
}

/** Duração da tela de preparação da aula do catálogo. */
const BUILD_MS = 5200;

/** Adivinha o tipo pelo texto (definido automaticamente; a escolha não aparece mais na tela). */
function guessType(text: string): ContentType {
  if (/\b(arts?\.?|artigos?|§|inciso|lei\s+n?º?|c[óo]digo|constitui[çc][ãa]o|\bCF\b|\bCP\b|\bCPP\b)/i.test(text)) return "artigo_lei";
  return "tema_livre";
}

export function NewTrailForm({
  initialContent = "",
  aiOn = true,
  catalog = [],
  folders = [],
}: {
  initialContent?: string;
  aiOn?: boolean;
  catalog?: CatalogPickerGroup[];
  folders?: Array<{ id: string; name: string }>;
}) {
  const allTopics = catalog.flatMap((g) => g.topics);
  // Aula pré-escolhida pelo link (?conteudo=Título exato).
  const preset = allTopics.find((t) => t.title === initialContent.trim()) ?? null;
  const [picked, setPicked] = useState<{ id: string; title: string } | null>(preset);
  // Com aulas no catálogo, o padrão é escolher uma; o texto livre só existe com a IA ligada.
  const [mode, setMode] = useState<"catalogo" | "livre">(allTopics.length || !aiOn ? "catalogo" : "livre");
  const fromCatalog = mode === "catalogo";
  const [state, action, pending] = useActionState<CreateTrailState, FormData>(createTrailAction, {});
  const [board, setBoard] = useState<ExamBoardSlug | null>(null);
  const [other, setOther] = useState("");
  const [content, setContent] = useState(preset ? "" : initialContent);
  const [type, setType] = useState<ContentType>(() => guessType(initialContent));
  const [typeTouched, setTypeTouched] = useState(false);
  const [title, setTitle] = useState("");
  const [touched, setTouched] = useState(false);
  const [hint, setHint] = useState<{ for: string; data: CatalogHint } | null>(null);
  const [useAi, setUseAi] = useState(false);
  // Estado no momento do envio: a tela de preparação some quando chega uma resposta nova (ex.: erro).
  const [buildFrom, setBuildFrom] = useState<CreateTrailState | null>(null);
  const building = buildFrom !== null && buildFrom === state;
  const formRef = useRef<HTMLFormElement>(null);

  // Sugestão ao vivo do catálogo revisado (o resultado final é decidido no servidor).
  useEffect(() => {
    if (fromCatalog) return;
    const text = content.trim();
    if (text.length < 4 || text.length > 300) return;
    let alive = true;
    const t = setTimeout(async () => {
      const data = await catalogHintAction(text);
      if (alive) setHint({ for: text, data });
    }, 450);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [content, fromCatalog]);
  const catalogHint = hint && hint.for === content.trim() && hint.data.kind !== "nenhum" ? hint.data : null;

  // No seletor, o "conteúdo" enviado é o título da aula escolhida (o servidor usa o id).
  const sentContent = fromCatalog ? picked?.title ?? "" : content;
  const sentType: ContentType = fromCatalog ? guessType(picked?.title ?? "") : type;
  const validation = useMemo(
    () => trailRequestSchema.safeParse({ board: board ?? undefined, otherBoardName: other, contentType: sentType, content: sentContent, title }),
    [board, other, sentType, sentContent, title],
  );
  const issues = validation.success ? {} : Object.fromEntries(validation.error.issues.map((i) => [String(i.path[0]), i.message]));
  const len = content.length;
  const onContent = (v: string) => {
    setContent(v);
    if (!typeTouched) setType(guessType(v));
  };

  return (
    <form
      ref={formRef}
      action={action}
      onSubmit={(e) => {
        setTouched(true);
        if (!validation.success || (fromCatalog && !picked)) {
          e.preventDefault();
          return;
        }
        // Conteúdo do catálogo: mostra a preparação da aula com calma antes de abrir o estudo.
        // No modo só catálogo, anima sempre — exceto quando já se sabe que o pedido não está no catálogo
        // (aí o aviso aparece na hora). Assim a animação não depende de a sugestão ter chegado a tempo.
        const knownMiss = !!hint && hint.for === content.trim() && hint.data.kind !== "completo";
        const animate = fromCatalog || (!useAi && (catalogHint?.kind === "completo" || (!aiOn && !knownMiss)));
        if (animate) {
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          setBuildFrom(state);
          setTimeout(() => startTransition(() => action(data)), BUILD_MS - 900);
        }
      }}
      noValidate
    >
      {building && <BuildingOverlay topic={fromCatalog ? picked?.title ?? "" : catalogHint?.titles[0] ?? content.trim().slice(0, 80)} durationMs={BUILD_MS} />}
      <input type="hidden" name="contentType" value={sentType} />
      {fromCatalog && (
        <>
          <input type="hidden" name="content" value={sentContent} />
          <input type="hidden" name="catalogTopicId" value={picked?.id ?? ""} />
        </>
      )}
      <Step n={1} title={fromCatalog ? "Escolha a aula" : "O que você quer estudar agora?"} done={fromCatalog ? !!picked : !issues.content && content.trim().length > 0}>
        {fromCatalog ? (
          <>
            <p className="mb-3 t-small text-tinta-suave">Aulas prontas e revisadas pela equipe, separadas por matéria. Cada uma vem com aula, três níveis de questões e PDF.</p>
            <CatalogPicker groups={catalog} value={picked?.id ?? null} onChange={(t) => setPicked({ id: t.id, title: t.title })} invalid={touched && !picked} />
            {touched && !picked && <p className="mt-2 t-tiny text-erro" role="alert">Escolha uma aula para continuar.</p>}
            {aiOn && (
              <button type="button" onClick={() => setMode("livre")} className="mt-4 t-small font-semibold text-destaque underline-offset-2 hover:underline">
                Não achou? Escrever outro conteúdo para a IA gerar
              </button>
            )}
          </>
        ) : (
        <>
        <p className="mb-3 t-small text-tinta-suave">
          Informe um tema, uma matéria, um artigo ou um capítulo. Não precisa do edital: a plataforma identifica o assunto, delimita o escopo e monta a aula e as avaliações só disso.
        </p>
        {allTopics.length > 0 && (
          <button type="button" onClick={() => setMode("catalogo")} className="mb-3 t-small font-semibold text-destaque underline-offset-2 hover:underline">
            ← Voltar para as aulas do catálogo
          </button>
        )}
        <label htmlFor="content" className="sr-only">Conteúdo a estudar</label>
        <textarea
          id="content"
          name="content"
          value={content}
          onChange={(e) => onContent(e.target.value)}
          placeholder={PLACEHOLDER}
          rows={6}
          spellCheck={false}
          className={`${inputClass} min-h-40 resize-y py-3 font-serif leading-relaxed`}
          aria-invalid={touched && !!issues.content}
          aria-describedby="content-info"
        />
        <div id="content-info" className="mt-2 flex flex-wrap justify-between gap-2 t-tiny text-tinta-fraca">
          <span>Pedido curto ou texto completo: os dois funcionam. Se colar a lei, a numeração e a hierarquia são preservadas.</span>
          <span className={len > CONTENT_LIMITS.maxChars ? "font-semibold text-erro" : ""}>
            {len.toLocaleString("pt-BR")} / {CONTENT_LIMITS.maxChars.toLocaleString("pt-BR")}
          </span>
        </div>
        {touched && issues.content && <p className="mt-2 t-tiny text-erro" role="alert">{issues.content}</p>}
        {/* Reconhecimento do catálogo: continua ativo (decide a animação), mas não aparece na tela. */}
        {!fromCatalog && catalogHint && (
          <div hidden className="mt-3 rounded-md border border-linha-forte bg-nevoa p-3 t-small" data-testid="catalogo-sugestao">
            {catalogHint.kind === "completo" ? (
              <>
                <p className="font-semibold">
                  <span className="mr-1.5 inline-block rounded-full bg-azul px-2 py-0.5 t-tiny text-white">Revisado</span>
                  Este conteúdo já está no catálogo do APROVUM: começa na hora, sem esperar a geração.
                </p>
                <p className="mt-1 text-tinta-suave">{catalogHint.titles.join(" · ")}</p>
                {aiOn && (
                  <label className="mt-2 flex items-center gap-2 text-tinta-suave">
                    <input type="checkbox" name="usarIa" value="1" checked={useAi} onChange={(e) => setUseAi(e.target.checked)} className="size-4 accent-azul" />
                    Prefiro que a IA gere uma aula nova
                  </label>
                )}
              </>
            ) : (
              <p className="text-tinta-suave">
                Parte do pedido está no catálogo ({catalogHint.titles.join(", ")}), mas não tudo{catalogHint.reason ? ` — ${catalogHint.reason}` : ""}.{" "}
                {aiOn ? "A aula será gerada pela IA." : "No momento, peça só o que já está no catálogo."}
              </p>
            )}
          </div>
        )}
        <div className="mt-3 flex flex-wrap gap-2" aria-label="Exemplos" hidden={!aiOn}>
          {CONTENT_EXAMPLES.map((ex) => (
            <button
              key={ex.text}
              type="button"
              onClick={() => {
                setContent(ex.text);
                setType(ex.type);
                setTypeTouched(false);
              }}
              className="rounded-full border border-linha-forte bg-superficie px-3 py-1.5 t-tiny font-semibold text-tinta-suave hover:border-azul hover:text-destaque"
            >
              {ex.text}
            </button>
          ))}
        </div>
        </>
        )}
        <div className="mt-4">
          <label htmlFor="title" className="t-small font-semibold">Título (opcional)</label>
          <input
            id="title"
            name="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
            className={`${inputClass} mt-1.5`}
            placeholder="Para organizar seus estudos. Ex.: Direito Penal — crimes contra a vida"
          />
          {touched && issues.title && <p className="mt-2 t-tiny text-erro" role="alert">{issues.title}</p>}
        </div>
        {folders.length > 0 && (
          <div className="mt-4">
            <label htmlFor="folderId" className="t-small font-semibold">Pasta (opcional)</label>
            <select id="folderId" name="folderId" defaultValue="" className={`${inputClass} mt-1.5`}>
              <option value="">Sem pasta</option>
              {folders.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>
        )}
      </Step>

      <Step n={2} title="Banca de referência" done={!!board}>
        <p className="mb-3 t-small text-tinta-suave">A banca orienta o estilo das questões e dos exemplos.</p>
        <div role="radiogroup" aria-label="Banca examinadora" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {EXAM_BOARDS.map((b) => (
            <label
              key={b.slug}
              className="flex min-h-16 cursor-pointer flex-col justify-center rounded-md border border-linha-forte bg-superficie px-3 py-2 has-[:checked]:border-azul has-[:checked]:bg-nevoa has-[:checked]:ring-1 has-[:checked]:ring-azul has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-azul"
            >
              <input type="radio" name="board" value={b.slug} className="sr-only" checked={board === b.slug} onChange={() => setBoard(b.slug)} />
              <span className="font-bold">{b.name}</span>
              <span className="t-tiny text-tinta-fraca">{b.slug === "cebraspe" ? "Antiga CESPE" : b.slug === "outra" ? "Informar nome" : ""}</span>
            </label>
          ))}
        </div>
        {board === "outra" && (
          <div className="mt-3">
            <label htmlFor="otherBoardName" className="t-small font-semibold">Nome da banca</label>
            <input
              id="otherBoardName"
              name="otherBoardName"
              value={other}
              onChange={(e) => setOther(e.target.value)}
              maxLength={80}
              className={`${inputClass} mt-1.5`}
              placeholder="Ex.: FCC, Quadrix, Consulplan"
              aria-invalid={touched && !!issues.otherBoardName}
            />
          </div>
        )}
        {touched && (issues.board || issues.otherBoardName) && (
          <p className="mt-2 t-tiny text-erro" role="alert">{issues.board ?? issues.otherBoardName}</p>
        )}
      </Step>

      <div className="flex flex-col gap-3 border-l-2 border-transparent pl-5">
        {state.error && <Notice tone="erro">{state.error}</Notice>}
        <Button type="submit" disabled={pending || building || !board} className="self-start">
          {pending || building ? "Preparando…" : "Começar este estudo"}
        </Button>
        {!board && <p className="t-tiny text-tinta-fraca">Selecione a banca para continuar.</p>}
      </div>
    </form>
  );
}
