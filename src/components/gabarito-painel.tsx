"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { BookOpenCheck, ChevronDown, ChevronRight, CircleCheck, CircleX, Maximize2, X } from "lucide-react";
import { lockScroll } from "@/lib/scroll-lock";

/**
 * Painel do gabarito: o resultado e os selos ficam sempre à vista; a explicação abre e fecha
 * (o aluno que só quer ver a questão fecha, e a escolha fica lembrada) e tem um modo de leitura
 * ampliado, em folha, com letra maior, para ler o comentário com calma.
 */
export function GabaritoPainel({
  correct,
  gabarito,
  marcou,
  aberto,
  onToggle,
  onNext,
  children,
  idBase,
}: {
  correct: boolean;
  /** Letra (ou CERTO/ERRADO) do gabarito. */
  gabarito: string;
  /** O que o aluno marcou, no mesmo formato. */
  marcou: string | null;
  aberto: boolean;
  onToggle: (aberto: boolean) => void;
  /** Se houver próxima questão, a folha de leitura oferece o botão para ir a ela. */
  onNext?: (() => void) | null;
  /** A explicação (AnswerExplanation embutido + comentários). */
  children: ReactNode;
  idBase: string;
}) {
  const corpoId = `${useId()}-${idBase}`;
  const [leitura, setLeitura] = useState(false);
  const abrirLeitura = useRef<HTMLButtonElement>(null);

  return (
    <section className={`gab ${correct ? "gab-certa" : "gab-errada"}`} data-aberto={aberto ? "1" : "0"} data-testid="gabarito-painel" aria-label="Resultado e gabarito comentado">
      <header className="gab-topo">
        <span className="gab-icone" aria-hidden>
          {correct ? <CircleCheck className="h-6 w-6" /> : <CircleX className="h-6 w-6" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="gab-titulo" role="status">
            {correct ? "Resposta correta" : "Resposta incorreta"}
          </p>
          <div className="gab-selos">
            <span className="gab-selo gab-selo-gab">Gabarito: {gabarito}</span>
            {marcou && <span className={`gab-selo ${correct ? "gab-selo-ok" : "gab-selo-erro"}`}>Você marcou: {marcou}</span>}
          </div>
        </div>
        <div className="gab-acoes">
          <button ref={abrirLeitura} type="button" className="gab-botao gab-botao-icone" onClick={() => setLeitura(true)} aria-label="Ler o gabarito em tela cheia" title="Modo leitura (tecla L)">
            <Maximize2 className="h-4 w-4" aria-hidden />
            <span>Modo leitura</span>
          </button>
          <button type="button" className="gab-botao gab-botao-principal" onClick={() => onToggle(!aberto)} aria-expanded={aberto} aria-controls={corpoId} title="Abrir ou fechar o gabarito (tecla G)">
            <span>{aberto ? "Fechar gabarito" : "Abrir gabarito"}</span>
            <ChevronDown className="gab-seta h-4 w-4" aria-hidden />
          </button>
        </div>
      </header>

      <div className="gab-trilho" id={corpoId} role="region" aria-label="Explicação do gabarito" inert={!aberto}>
        <div className="gab-trilho-int">
          <div className="gab-corpo">{children}</div>
        </div>
      </div>

      {leitura && (
        <FolhaLeitura
          correct={correct}
          gabarito={gabarito}
          marcou={marcou}
          onClose={() => {
            setLeitura(false);
            abrirLeitura.current?.focus();
          }}
          onNext={onNext ?? null}
        >
          {children}
        </FolhaLeitura>
      )}
      <LeituraAtalho onOpen={() => setLeitura(true)} onToggle={() => onToggle(!aberto)} bloqueado={leitura} />
    </section>
  );
}

/** Atalhos de teclado: G abre/fecha o gabarito, L abre o modo leitura. */
function LeituraAtalho({ onOpen, onToggle, bloqueado }: { onOpen: () => void; onToggle: () => void; bloqueado: boolean }) {
  useEffect(() => {
    if (bloqueado) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target as HTMLElement;
      if (t.closest("input, textarea, select, [contenteditable=true]")) return;
      const k = e.key.toLowerCase();
      if (k === "g") {
        e.preventDefault();
        onToggle();
      } else if (k === "l") {
        e.preventDefault();
        onOpen();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onOpen, onToggle, bloqueado]);
  return null;
}

const FOCAVEIS = 'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

function FolhaLeitura({
  correct,
  gabarito,
  marcou,
  onClose,
  onNext,
  children,
}: {
  correct: boolean;
  gabarito: string;
  marcou: string | null;
  onClose: () => void;
  onNext: (() => void) | null;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const fechar = useRef<HTMLButtonElement>(null);
  const tituloId = useId();
  // Sempre a versão mais recente, sem refazer o efeito (que devolveria o foco ao botão a cada renderização do pai).
  const fecharRef = useRef(onClose);
  useEffect(() => {
    fecharRef.current = onClose;
  });

  useEffect(() => {
    const solta = lockScroll();
    fechar.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        return fecharRef.current();
      }
      if (e.key !== "Tab" || !ref.current) return;
      const itens = [...ref.current.querySelectorAll<HTMLElement>(FOCAVEIS)].filter((el) => el.offsetParent !== null);
      if (!itens.length) return;
      const primeiro = itens[0]!;
      const ultimo = itens[itens.length - 1]!;
      if (e.shiftKey && document.activeElement === primeiro) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault();
        primeiro.focus();
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      solta();
    };
  }, []);

  // Montado só depois de um clique do aluno: já existe `document`.
  return createPortal(
    <div className="gab-fundo" onMouseDown={(e) => e.target === e.currentTarget && onClose()} data-testid="gabarito-leitura">
      <div ref={ref} className={`gab-folha ${correct ? "gab-certa" : "gab-errada"}`} role="dialog" aria-modal="true" aria-labelledby={tituloId}>
        <span className="gab-alca" aria-hidden />
        <header className="gab-folha-topo">
          <span className="gab-icone" aria-hidden>
            <BookOpenCheck className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id={tituloId} className="gab-folha-titulo">
              Gabarito comentado
            </h2>
            <div className="gab-selos">
              <span className="gab-selo gab-selo-gab">Gabarito: {gabarito}</span>
              {marcou && <span className={`gab-selo ${correct ? "gab-selo-ok" : "gab-selo-erro"}`}>Você marcou: {marcou}</span>}
            </div>
          </div>
          <button ref={fechar} type="button" className="gab-botao gab-botao-icone" onClick={onClose} aria-label="Fechar o modo leitura">
            <X className="h-5 w-5" aria-hidden />
          </button>
        </header>
        <div className="gab-folha-corpo gab-leitura">{children}</div>
        <footer className="gab-folha-rodape">
          <button type="button" className="gab-botao" onClick={onClose}>
            Voltar à questão
          </button>
          {onNext && (
            <button
              type="button"
              className="gab-botao gab-botao-principal"
              onClick={() => {
                onClose();
                onNext();
              }}
            >
              Próxima questão <ChevronRight className="h-4 w-4" aria-hidden />
            </button>
          )}
        </footer>
      </div>
    </div>,
    document.body,
  );
}
