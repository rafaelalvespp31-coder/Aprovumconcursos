"use client";

import { useEffect, useId, useRef, useState } from "react";
import { MAX_COMENTARIO, ROTULOS_NOTA } from "@/domain/feedback/feedback";

export type FeedbackDesfecho = "enviado" | "dispensado";
type Resultado = { ok: true } | { ok: false; error: string };

export const FEEDBACK_EVENTO = "na:feedback-feito";

function Estrela({ cheia }: { cheia: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className={`size-9 sm:size-10 ${cheia ? "fill-destaque stroke-destaque" : "fill-none stroke-linha-forte"}`} strokeWidth="1.6" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 2.8l2.8 5.9 6.4.9-4.7 4.5 1.2 6.4L12 17.4 6.3 20.5l1.2-6.4L2.8 9.6l6.4-.9L12 2.8z" />
    </svg>
  );
}

/**
 * Popup de avaliação pós-aula. A nota é gravada no servidor ANTES da confirmação;
 * "Pular" registra a dispensa (sem nota) e libera o fluxo normalmente.
 */
export function FeedbackModal({
  lessonId,
  open,
  onFinish,
  enviar,
  dispensar,
}: {
  lessonId: string;
  open: boolean;
  onFinish: (r: FeedbackDesfecho) => void;
  enviar: (lessonId: string, rating: number, comment: string) => Promise<Resultado>;
  dispensar: (lessonId: string) => Promise<Resultado>;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const uid = useId();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [feito, setFeito] = useState(false);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      setRating(0);
      setHover(0);
      setComment("");
      setErro(null);
      setFeito(false);
      d.showModal();
    }
    if (!open && d.open) d.close();
  }, [open]);

  const avisar = (r: FeedbackDesfecho) => {
    try {
      window.dispatchEvent(new CustomEvent(FEEDBACK_EVENTO, { detail: { lessonId, resultado: r } }));
    } catch {}
    onFinish(r);
  };

  const pular = async () => {
    if (busy) return;
    setBusy(true);
    await dispensar(lessonId).catch(() => null);
    setBusy(false);
    avisar("dispensado");
  };

  const enviarAval = async () => {
    if (busy) return;
    if (rating < 1) return setErro("Escolha de 1 a 5 estrelas.");
    setBusy(true);
    setErro(null);
    const r = await enviar(lessonId, rating, comment).catch(() => ({ ok: false as const, error: "Não foi possível registrar sua avaliação agora. Tente novamente." }));
    setBusy(false);
    if (!r.ok) return setErro(r.error);
    setFeito(true);
  };

  const mostrada = hover || rating;
  return (
    <dialog
      ref={ref}
      data-testid="feedback-aula"
      aria-labelledby={`${uid}-t`}
      onCancel={(e) => {
        e.preventDefault();
        if (!feito) void pular();
        else avisar("enviado");
      }}
      className="m-auto w-[min(94vw,520px)] max-h-[92dvh] overflow-y-auto rounded-2xl border border-linha bg-[#fbfbfb] p-0 text-tinta shadow-[0_12px_40px_rgba(0,0,0,0.18)]"
    >
      <div className="h-1.5 w-full bg-destaque" />
      {feito ? (
        <div className="p-6 text-center sm:p-8" data-testid="feedback-obrigado">
          <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-destaque text-white" aria-hidden="true">
            <svg viewBox="0 0 24 24" className="size-6 fill-none stroke-current" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
          </div>
          <h2 id={`${uid}-t`} className="t-h3 font-extrabold uppercase tracking-tight">Obrigado por ajudar a Aprovum a evoluir!</h2>
          <p className="mt-2 t-small text-tinta-suave">Sua avaliação foi registrada com sucesso. Bons estudos!</p>
          <button type="button" autoFocus onClick={() => avisar("enviado")} className="mt-5 inline-flex min-h-11 items-center justify-center rounded-md bg-[#0A0A0A] px-6 font-semibold text-white active:scale-[0.97]">
            Continuar
          </button>
        </div>
      ) : (
        <div className="p-5 sm:p-7">
          <h2 id={`${uid}-t`} className="text-[1.15rem] font-extrabold uppercase leading-tight tracking-tight sm:text-[1.3rem]">Sua opinião faz a Aprovum evoluir!</h2>
          <p className="mt-2 t-small text-tinta-suave">Você concluiu esta aula. Agora queremos saber como foi sua experiência. Sua avaliação nos ajuda a melhorar continuamente nossos conteúdos.</p>

          <p className="mt-5 font-semibold" id={`${uid}-q`}>Como você avalia esta aula?</p>
          <div role="radiogroup" aria-labelledby={`${uid}-q`} className="mt-2 flex items-center gap-1" onMouseLeave={() => setHover(0)}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={rating === n}
                aria-label={`${n} ${n === 1 ? "estrela" : "estrelas"}: ${ROTULOS_NOTA[n]}`}
                data-testid={`estrela-${n}`}
                onMouseEnter={() => setHover(n)}
                onClick={() => {
                  setRating(n);
                  setErro(null);
                }}
                className="rounded-md p-0.5 transition-transform active:scale-90"
              >
                <span className={n === rating ? "fb-star-on inline-block" : "inline-block"}><Estrela cheia={n <= mostrada} /></span>
              </button>
            ))}
          </div>
          <p className="mt-1 min-h-6 font-semibold text-destaque" aria-live="polite" data-testid="feedback-rotulo">{mostrada ? ROTULOS_NOTA[mostrada] : ""}</p>

          <label htmlFor={`${uid}-c`} className="mt-3 block font-semibold">O que você achou desta aula?</label>
          <textarea
            id={`${uid}-c`}
            value={comment}
            maxLength={MAX_COMENTARIO}
            rows={4}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Conte-nos o que achou do conteúdo, da explicação, dos exemplos e do material. O que podemos melhorar?"
            className="mt-1.5 w-full resize-none rounded-lg border border-linha-forte bg-white p-3 text-[16px] outline-none focus:border-destaque"
            data-testid="feedback-comentario"
          />
          <p className="mt-1 text-right t-tiny text-tinta-fraca" aria-live="off">{comment.length}/{MAX_COMENTARIO}</p>

          {erro && <p role="alert" className="mt-2 rounded-md bg-nevoa p-2.5 t-small font-semibold text-erro" data-testid="feedback-erro">{erro}</p>}

          <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" disabled={busy} onClick={pular} data-testid="feedback-pular" className="inline-flex min-h-11 items-center justify-center rounded-md border border-linha-forte px-5 font-semibold uppercase tracking-wide text-tinta-suave disabled:opacity-60">
              Pular por enquanto
            </button>
            <button type="button" disabled={busy || rating < 1} onClick={enviarAval} data-testid="feedback-enviar" className="inline-flex min-h-11 items-center justify-center rounded-md bg-destaque px-5 font-semibold uppercase tracking-wide text-white disabled:opacity-50 active:scale-[0.97]">
              {busy ? "Enviando…" : "Enviar avaliação"}
            </button>
          </div>
        </div>
      )}
    </dialog>
  );
}
