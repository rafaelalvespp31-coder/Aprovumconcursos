import type { AnswerFeedback } from "@/server/services/study";
import { Icon } from "./icons";
import { textoSemLatex } from "@/domain/lesson/math-text";
import { splitCommentByOption } from "@/domain/bank/option-notes";

type Opt = { id: string; label: string; text: string };

/** Explicação da alternativa correta que só repete "Correta." não acrescenta nada. */
function meaningful(s: string | undefined) {
  const t = (s ?? "").trim();
  return t && !/^corret[ao]\.?$/i.test(t) ? t.replace(/^corret[ao]\s*[:.—-]\s*/i, "") : "";
}

/**
 * Gabarito comentado, mostrado logo abaixo da questão depois da resposta:
 * por que a correta está correta e por que cada uma das outras está errada.
 */
export function AnswerExplanation({
  fb,
  options,
  certoErrado,
  chosen,
  questionLabel,
}: {
  fb: AnswerFeedback;
  /** Alternativas como apareceram para o aluno (texto incluído). Em certo/errado, ignorado. */
  options: Opt[];
  certoErrado: boolean;
  /** Id da alternativa marcada ("true"/"false" em certo/errado). */
  chosen: string | null;
  questionLabel?: string;
}) {
  const titleId = `coment-${questionLabel ?? "q"}`.replace(/\s+/g, "-");

  if (certoErrado) {
    const gab = fb.correctAnswerTrue ? "CERTO" : "ERRADO";
    const other = fb.correctAnswerTrue ? "ERRADO" : "CERTO";
    const picked = chosen === null ? null : chosen === "true" ? "CERTO" : "ERRADO";
    return (
      <section aria-labelledby={titleId} className="entrar mt-3 rounded-lg border border-linha bg-superficie p-4 sm:p-5" data-testid="gabarito-comentado">
        <Header id={titleId} gabarito={gab} picked={picked} correct={fb.correct} />
        <Block tone="ok" title={`Por que o item está ${gab}`}>
          <Comentario text={fb.justification} />
        </Block>
        <Block tone="erro" title={`Por que marcar ${other} está errado`}>
          <p>
            {fb.correctAnswerTrue
              ? "O enunciado está de acordo com a regra explicada acima — não há nele nenhum erro que justifique marcá-lo como errado."
              : "O enunciado contém o erro apontado acima; por isso ele não pode ser marcado como certo."}
          </p>
        </Block>
      </section>
    );
  }

  const byId = new Map(fb.options.map((o) => [o.id, o]));
  const right = options.find((o) => byId.get(o.id)?.isCorrect);
  const wrong = options.filter((o) => !byId.get(o.id)?.isCorrect);
  const pickedOpt = options.find((o) => o.id === chosen);
  const squash = (t: string) => t.toLowerCase().replace(/\s+/g, " ").trim();
  // Comentário escrito com uma explicação por alternativa ("A) Errada…", "E) Correta…"): cada trecho vai para a alternativa certa.
  const split = options.some((o) => !byId.get(o.id)?.explanation?.trim()) ? splitCommentByOption(fb.justification) : null;
  const flat = (t: string) => t.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  const noteFor = (o: Opt): string => {
    const own = byId.get(o.id)?.explanation?.trim();
    if (own || !split) return own ?? "";
    // Prefere o trecho que cita o texto da alternativa (vale mesmo se as letras foram embaralhadas); senão usa a letra.
    const hits = Object.entries(split.byLabel).filter(([, v]) => o.text.trim().length >= 3 && flat(v).includes(flat(o.text)));
    return (hits.length === 1 ? hits[0]![1] : split.byLabel[o.label]) ?? "";
  };
  const geral = split ? split.rest : fb.justification;
  const why = meaningful(right ? noteFor(right) : undefined);
  // Não repete o texto quando a explicação da alternativa já está na justificativa.
  const rightWhy = why && !squash(geral).includes(squash(why)) ? why : "";

  return (
    <section aria-labelledby={titleId} className="entrar mt-3 rounded-lg border border-linha bg-superficie p-4 sm:p-5" data-testid="gabarito-comentado">
      <Header id={titleId} gabarito={right?.label ?? "—"} picked={pickedOpt?.label ?? null} correct={fb.correct} />

      {right && (
        <Block tone="ok" title={`Por que a alternativa ${right.label} está correta`}>
          <OptionQuote label={right.label} text={right.text} tone="ok" />
          {rightWhy && <p className="mt-2 whitespace-pre-line">{textoSemLatex(rightWhy)}</p>}
          {geral.trim() && <Comentario text={geral} />}
        </Block>
      )}

      {wrong.length > 0 && (
        <Block tone="erro" title={wrong.length === 1 ? "Por que a outra alternativa está errada" : "Por que as outras alternativas estão erradas"}>
          <ul className="flex flex-col gap-3">
            {wrong.map((o) => (
              <li key={o.id} className={`rounded-md p-3 ${o.id === chosen ? "bg-erro-fundo ring-1 ring-erro/40" : "bg-nevoa"}`}>
                <OptionQuote label={o.label} text={o.text} tone="erro" mine={o.id === chosen} />
                <p className="mt-1.5 whitespace-pre-line">{textoSemLatex(noteFor(o)) || "Não corresponde à regra explicada na alternativa correta."}</p>
              </li>
            ))}
          </ul>
        </Block>
      )}
    </section>
  );
}

/** Comentário do professor: bem sinalizado, para não se perder no meio das explicações. */
function Comentario({ text }: { text: string }) {
  return (
    <div className="mt-3 overflow-hidden rounded-xl border-2 border-[#10B981] border-l-[8px] bg-[#ECFDF5] shadow-[0_6px_20px_-8px_rgba(16,185,129,0.55)]" data-testid="comentario-professor">
      <div className="flex items-center gap-2 bg-[#10B981] px-3 py-1.5">
        <Icon name="livro" className="size-4 text-white" />
        <span className="text-[14px] font-black uppercase tracking-[0.16em] text-white">Comentário</span>
        <span className="ml-auto text-[12px] font-bold text-white/90">explicação da questão</span>
      </div>
      <p className="whitespace-pre-line p-3 text-[16px] font-medium leading-relaxed text-[#064E3B]">{textoSemLatex(text)}</p>
    </div>
  );
}

function Header({ id, gabarito, picked, correct }: { id: string; gabarito: string; picked: string | null; correct: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <h4 id={id} className="mr-auto inline-flex items-center gap-1.5 font-semibold">
        <Icon name="livro" className="size-4 text-destaque" /> Gabarito comentado
      </h4>
      <span className="rounded-full bg-acerto px-2.5 py-0.5 t-tiny font-bold text-white">Gabarito: {gabarito}</span>
      {picked && (
        <span className={`rounded-full px-2.5 py-0.5 t-tiny font-bold ${correct ? "bg-acerto-fundo text-acerto" : "bg-erro-fundo text-erro"}`}>
          Você marcou: {picked}
        </span>
      )}
    </div>
  );
}

function Block({ tone, title, children }: { tone: "ok" | "erro"; title: string; children: React.ReactNode }) {
  return (
    <div className={`mt-4 border-l-4 pl-3 t-small ${tone === "ok" ? "border-acerto" : "border-erro/70"}`}>
      <p className={`mb-2 inline-flex items-center gap-1.5 font-semibold ${tone === "ok" ? "text-acerto" : "text-erro"}`}>
        <Icon name={tone === "ok" ? "check" : "x"} className="size-4" /> {title}
      </p>
      <div className="text-tinta-suave">{children}</div>
    </div>
  );
}

function OptionQuote({ label, text, tone, mine }: { label: string; text: string; tone: "ok" | "erro"; mine?: boolean }) {
  return (
    <p className="flex gap-2 text-tinta">
      <span className={`flex size-6 shrink-0 items-center justify-center rounded-full t-tiny font-bold text-white ${tone === "ok" ? "bg-acerto" : "bg-erro"}`} aria-hidden>
        {label}
      </span>
      <span className="pt-0.5">
        <span className="sr-only">Alternativa {label}: </span>
        <span className="font-medium">{textoSemLatex(text)}</span>
        {mine && <span className="ml-1.5 whitespace-nowrap t-tiny font-bold text-erro">(sua resposta)</span>}
      </span>
    </p>
  );
}
