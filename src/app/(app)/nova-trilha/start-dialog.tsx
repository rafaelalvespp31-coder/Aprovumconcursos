"use client";

import { useActionState, useEffect, useRef } from "react";
import { X } from "lucide-react";
import { createTrailAction, type CreateTrailState } from "./actions";
import { BuildingOverlay, preloadLoadingScene } from "./building-overlay";

/** Mesmo critério do formulário antigo: título com artigo/lei vira estudo de dispositivo. */
export const contentTypeOf = (title: string) =>
  /\b(arts?\.?|artigos?|§|inciso|lei\s+n?º?|c[óo]digo|constitui[çc][ãa]o|\bCF\b|\bCP\b|\bCPP\b)/i.test(title) ? "artigo_lei" : "tema_livre";

export interface StartTheme {
  id: string;
  title: string;
  discipline: string;
  /** Tópico inteiro: as aulas dos subtópicos, na ordem (o estudo junta todas). */
  ids?: string[];
}

/**
 * Confirmação de "Começar estudo": cria o estudo com a aula pronta do catálogo (ação existente).
 * Não há escolha de banca: as aulas e questões do catálogo seguem o estilo das principais bancas.
 */
export function StartStudyDialog({ theme, onClose }: { theme: StartTheme | null; onClose: () => void }) {
  const [state, action, pending] = useActionState<CreateTrailState, FormData>(createTrailAction, {});
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (theme && !d.open) {
      d.showModal();
      // A cena da tela de carregamento já vem baixando enquanto o aluno confirma.
      preloadLoadingScene();
    }
    if (!theme && d.open) d.close();
  }, [theme]);

  return (
    <>
      <dialog
        ref={dialog}
        onClose={onClose}
        className="m-auto w-[min(92vw,440px)] rounded-[20px] p-0 backdrop:bg-black/60"
        aria-labelledby="comecar-titulo"
        data-testid="comecar-estudo"
      >
        {theme && (
          <form action={action} className="p-5" noValidate>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-[#F01820]">{theme.discipline}</p>
                <h2 id="comecar-titulo" className="mt-1 text-[19px] font-bold leading-tight text-[#080808]">
                  {theme.title}
                </h2>
              </div>
              <button type="button" onClick={onClose} className="rounded-full p-1.5 text-[#646B75] hover:bg-[#F8F9FB]" aria-label="Fechar">
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>
            {theme.ids && theme.ids.length > 1 ? (
              <>
                <input type="hidden" name="catalogTopicIds" value={theme.ids.join(",")} />
                <input type="hidden" name="title" value={theme.title} />
              </>
            ) : (
              <input type="hidden" name="catalogTopicId" value={theme.id} />
            )}
            <input type="hidden" name="content" value={theme.title} />
            <input type="hidden" name="contentType" value={contentTypeOf(theme.title)} />
            {/* Sem escolha de banca: o estudo usa o padrão do catálogo (estilo das principais bancas). */}
            <input type="hidden" name="board" value="outra" />
            <input type="hidden" name="otherBoardName" value="Várias bancas" />
            <p className="mt-4 text-[13.5px] text-[#646B75]">
              {theme.ids && theme.ids.length > 1 ? `O estudo junta as ${theme.ids.length} aulas deste tópico, na ordem do edital. ` : ""}A aula e as questões seguem o estilo das principais bancas. Toque em criar para começar.
            </p>
            {state.error && (
              <p className="mt-3 rounded-[10px] bg-[#FDECEC] px-3 py-2 text-[13.5px] text-[#C81018]" role="alert">
                {state.error}
              </p>
            )}
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button type="button" onClick={onClose} className="h-12 rounded-full border border-[#E5E8ED] text-[14px] font-bold text-[#080808]">
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
