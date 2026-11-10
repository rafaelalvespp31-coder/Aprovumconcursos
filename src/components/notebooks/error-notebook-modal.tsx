"use client";

import { lockScroll } from "@/lib/scroll-lock";
import { createPortal } from "react-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { CircleCheck, ClipboardX, X } from "lucide-react";
import { groupErrors, summarizeJustification, type ErrorNotebookData, type ErrorNotebookEdit } from "@/domain/notebooks/error-notebook";

type Result<T> = { ok: true; data: T } | { ok: false; error: string };
export interface ErrorNotebookApi {
  open: (notebookId: string) => Promise<Result<ErrorNotebookData>>;
  /** Mantido por compatibilidade: o caderno de erros agora é somente leitura. */
  save?: (notebookId: string, edits: ErrorNotebookEdit[]) => Promise<Result<{ savedAt: string }>>;
}

/**
 * Caderno de erros (somente leitura): as questões erradas organizadas por matéria › tema › assunto,
 * cada uma com a resposta certa e um resumo objetivo do porquê. Nada é editável.
 */
export function ErrorNotebookModal({ notebookId, title, api, onClose }: { notebookId: string; title: string; api: ErrorNotebookApi; onClose: () => void }) {
  const [data, setData] = useState<ErrorNotebookData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [apiRef] = useState(() => api);

  useEffect(() => {
    let alive = true;
    void apiRef
      .open(notebookId)
      .catch((): Result<ErrorNotebookData> => ({ ok: false, error: "Não foi possível abrir o caderno de erros agora." }))
      .then((r) => {
        if (!alive) return;
        if (r.ok) setData(r.data);
        else setLoadError(r.error);
      });
    const unlock = lockScroll();
    cardRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      alive = false;
      unlock();
      window.removeEventListener("keydown", onKey);
    };
  }, [apiRef, notebookId, onClose]);

  const entries = data?.entries;
  const groups = useMemo(() => groupErrors(entries ?? []), [entries]);
  const count = entries?.length ?? 0;

  return createPortal(
    <div className="ce-fundo" onMouseDown={(e) => e.target === e.currentTarget && onClose()} data-testid="caderno-erros">
      <div ref={cardRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="ce-titulo" className="ce-card">
        <header className="ce-topo">
          <span className="ce-topo-ico" aria-hidden>
            <ClipboardX className="h-6 w-6" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="ce-titulo" className="truncate font-[Space_Grotesk] text-[21px] font-[800] leading-tight text-white sm:text-[24px]">
              Caderno de erros
            </h2>
            <p className="truncate text-[12.5px] text-white/70">
              {title}
              {data ? ` · ${count} ${count === 1 ? "erro" : "erros"} com a resposta certa` : ""}
            </p>
          </div>
          <button type="button" onClick={onClose} className="ce-fechar" aria-label="Fechar o caderno de erros">
            <X className="h-5 w-5" aria-hidden />
          </button>
        </header>

        <div className="ce-corpo">
          {!data && !loadError ? (
            <div className="space-y-3" aria-busy data-testid="caderno-erros-carregando">
              {[0, 1, 2].map((k) => (
                <div key={k} className="h-24 animate-pulse rounded-[14px] bg-[#ECEDF0]" />
              ))}
              <span className="sr-only">Abrindo o caderno de erros…</span>
            </div>
          ) : loadError ? (
            <p role="alert" className="rounded-[12px] border border-[#FFD0D3] bg-[#FFF5F5] p-4 text-[14px] text-[#B9000B]">
              {loadError}
            </p>
          ) : !count ? (
            <p className="text-[14px] text-[#64666D]">Você ainda não errou nenhuma questão neste caderno.</p>
          ) : (
            groups.map((g) => (
              <section key={g.subject} className="ce-materia" aria-label={g.subject}>
                <h3 className="ce-materia-titulo">{g.subject}</h3>
                {g.themes.map((t) => (
                  <div key={t.theme} className="ce-tema">
                    <h4 className="ce-tema-titulo">{t.theme}</h4>
                    {t.topics.map((p) => (
                      <div key={p.topic ?? "—"} className="ce-assunto">
                        {p.topic && <h5 className="ce-assunto-titulo">{p.topic}</h5>}
                        {p.entries.map((e) => (
                          <article key={e.questionId} className="ce-item" data-testid="erro-item" data-questao={e.questionId}>
                            <div className="ce-item-topo">
                              {e.code && <span className="ce-chip">{e.code}</span>}
                              {e.source && <span className="truncate text-[11.5px] text-[#64666D]">{e.source}</span>}
                            </div>
                            {e.correctAnswer && (
                              <p className="ce-certa" data-testid="erro-resposta">
                                <CircleCheck className="h-4 w-4 shrink-0" aria-hidden />
                                <span>
                                  <b>Resposta certa:</b> {e.correctAnswer}
                                </span>
                              </p>
                            )}
                            <p className="ce-resumo" data-testid="erro-resumo">{summarizeJustification(e.originalHtml)}</p>
                          </article>
                        ))}
                      </div>
                    ))}
                  </div>
                ))}
              </section>
            ))
          )}
        </div>

        <footer className="ce-rodape">
          <p className="mr-auto text-[12.5px] text-[#64666D]">Somente leitura: o caderno mostra a resposta certa e o essencial para fixar.</p>
          <button type="button" className="pc-botao" onClick={onClose}>
            Fechar
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
