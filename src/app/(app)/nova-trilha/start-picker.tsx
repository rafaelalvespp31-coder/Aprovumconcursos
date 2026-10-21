"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { StudyPicker } from "@/components/estudos/study-picker";
import type { ThemeCard } from "@/domain/studies/home";
import { EXAM_BOARDS, type ExamBoardSlug } from "@/domain/trail-input";
import { createTrailAction, type CreateTrailState } from "./actions";
import { BuildingOverlay } from "./building-overlay";

/** Mesmo critério do formulário antigo: título com artigo/lei vira estudo de dispositivo. */
const contentTypeOf = (title: string) =>
  /\b(arts?\.?|artigos?|§|inciso|lei\s+n?º?|c[óo]digo|constitui[çc][ãa]o|\bCF\b|\bCP\b|\bCPP\b)/i.test(title) ? "artigo_lei" : "tema_livre";

/**
 * Novo estudo: o aluno escolhe a matéria e o tema; "Começar estudo" pede só a banca de
 * referência e cria o estudo com a aula pronta do catálogo.
 */
export function StartPicker({ themes, base = "" }: { themes: ThemeCard[]; base?: string }) {
  const [theme, setTheme] = useState<ThemeCard | null>(null);
  const [board, setBoard] = useState<ExamBoardSlug | "">("");
  const [other, setOther] = useState("");
  const [touched, setTouched] = useState(false);
  const [state, action, pending] = useActionState<CreateTrailState, FormData>(createTrailAction, {});
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (theme && !d.open) d.showModal();
    if (!theme && d.open) d.close();
  }, [theme]);

  const missing = !board || (board === "outra" && !other.trim());
  return (
    <>
      <StudyPicker
        themes={themes}
        base={base}
        onStart={(t) => {
          setTouched(false);
          setTheme(t);
        }}
      />
      <dialog
        ref={dialog}
        onClose={() => setTheme(null)}
        className="m-auto w-[min(92vw,440px)] rounded-[20px] p-0 backdrop:bg-black/60"
        aria-labelledby="comecar-titulo"
        data-testid="comecar-estudo"
      >
        {theme && (
          <form
            action={action}
            onSubmit={(e) => {
              setTouched(true);
              if (missing) e.preventDefault();
            }}
            className="p-5"
            noValidate
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-[#F01820]">{theme.discipline}</p>
                <h2 id="comecar-titulo" className="mt-1 text-[19px] font-bold leading-tight text-[#080808]">
                  {theme.title}
                </h2>
              </div>
              <button type="button" onClick={() => setTheme(null)} className="rounded-full p-1.5 text-[#646B75] hover:bg-[#F8F9FB]" aria-label="Fechar">
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>
            <input type="hidden" name="catalogTopicId" value={theme.id} />
            <input type="hidden" name="content" value={theme.title} />
            <input type="hidden" name="contentType" value={contentTypeOf(theme.title)} />
            <label htmlFor="banca-estudo" className="mt-5 block text-[14px] font-semibold text-[#080808]">
              Banca de referência
            </label>
            <p className="text-[12.5px] text-[#646B75]">Orienta o estilo das questões e dos exemplos.</p>
            <select
              id="banca-estudo"
              name="board"
              value={board}
              onChange={(e) => setBoard(e.target.value as ExamBoardSlug)}
              aria-invalid={touched && !board ? true : undefined}
              className="mt-2 h-12 w-full rounded-[12px] border border-[#E5E8ED] bg-white px-3 text-[15px] aria-[invalid=true]:border-[#F01820]"
            >
              <option value="" disabled>
                Selecione a banca
              </option>
              {EXAM_BOARDS.map((b) => (
                <option key={b.slug} value={b.slug}>
                  {b.name}
                </option>
              ))}
            </select>
            {board === "outra" && (
              <input
                name="otherBoardName"
                value={other}
                onChange={(e) => setOther(e.target.value)}
                placeholder="Nome da banca"
                aria-label="Nome da banca"
                maxLength={80}
                className="mt-2 h-12 w-full rounded-[12px] border border-[#E5E8ED] px-3 text-[15px]"
              />
            )}
            {touched && missing && (
              <p className="mt-2 text-[13px] text-[#C81018]" role="alert">
                {board === "outra" ? "Informe o nome da banca." : "Selecione a banca para começar."}
              </p>
            )}
            {state.error && (
              <p className="mt-3 rounded-[10px] bg-[#FDECEC] px-3 py-2 text-[13.5px] text-[#C81018]" role="alert">
                {state.error}
              </p>
            )}
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setTheme(null)} className="h-12 rounded-full border border-[#E5E8ED] text-[14px] font-bold text-[#080808]">
                Cancelar
              </button>
              <button type="submit" disabled={pending} className="h-12 rounded-full bg-[#F01820] text-[14px] font-bold text-white shadow-[0_8px_18px_rgba(240,24,32,0.35)] disabled:opacity-60">
                {pending ? "Preparando…" : "Criar estudo"}
              </button>
            </div>
          </form>
        )}
      </dialog>
      {pending && theme && <BuildingOverlay topic={theme.title} durationMs={5200} />}
    </>
  );
}
