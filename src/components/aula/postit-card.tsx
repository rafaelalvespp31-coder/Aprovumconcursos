"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Check, ChevronDown, Loader2, RotateCcw, Trash2 } from "lucide-react";

export interface PostitView {
  id: string;
  sectionId: string | null;
  sectionTitle: string | null;
  quote: string;
  quoteStart: number;
  note: string;
  /** Explicação do modo Explicar para este trecho (vai para o PDF). */
  explanation?: string;
  createdAt: string;
  /** Ainda sendo salvo no servidor (otimista). */
  pending?: boolean;
}

type NoteState = "idle" | "saving" | "saved" | "error";

/**
 * Post-it de revisão: papel amarelo com o trecho, o rótulo da seção e a anotação opcional.
 * A anotação salva sozinha (com tentativa de novo se falhar); excluir pede confirmação discreta.
 */
export function PostitCard({
  p, n, focused, inRail, onNote, onDelete, onGo,
}: {
  p: PostitView;
  n: number;
  focused: boolean;
  inRail?: boolean;
  onNote: (id: string, note: string) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
  onGo: (p: PostitView) => void;
}) {
  const [note, setNote] = useState(p.note);
  const [state, setState] = useState<NoteState>("idle");
  const [full, setFull] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seq = useRef(0);
  const lastSaved = useRef(p.note);
  const ta = useRef<HTMLTextAreaElement>(null);

  const save = async (value: string) => {
    if (timer.current) clearTimeout(timer.current);
    if (value === lastSaved.current || p.pending) return;
    const id = ++seq.current;
    setState("saving");
    const ok = await onNote(p.id, value);
    if (id !== seq.current) return;
    if (ok) lastSaved.current = value;
    setState(ok ? "saved" : "error");
  };
  const change = (v: string) => {
    setNote(v);
    setState("idle");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void save(v), 800);
  };
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  useEffect(() => {
    if (state !== "saved") return;
    const t = setTimeout(() => setState("idle"), 2200);
    return () => clearTimeout(t);
  }, [state]);

  const long = p.quote.length > 140;
  return (
    <article className={`pi-card ${focused ? "is-foco" : ""} ${inRail ? "is-lateral" : ""} ${n % 2 ? "" : "is-par"}`} data-testid="postit-card" data-pending={p.pending ? "1" : undefined} data-st>
      <header className="pi-topo">
        <span className="pi-num" aria-label={`Post-it ${n}`}>{n}</span>
        <span className="pi-secao" title={p.sectionTitle ?? undefined}>{p.sectionTitle || "Aula"}</span>
      </header>

      <blockquote className={`pi-trecho ${full ? "is-aberto" : ""}`} data-testid="postit-trecho">{p.quote}</blockquote>
      {long && (
        <button type="button" className="pi-link" onClick={() => setFull((v) => !v)} aria-expanded={full}>
          <ChevronDown className={`size-3.5 transition-transform ${full ? "rotate-180" : ""}`} aria-hidden /> {full ? "Recolher trecho" : "Ver trecho completo"}
        </button>
      )}

      {p.explanation && (
        <div className="pi-explica" data-testid="postit-explicacao">
          <b>Explicação</b>
          <p>{p.explanation}</p>
        </div>
      )}

      <label className="pi-nota">
        <span className="sr-only">Anotação pessoal (opcional)</span>
        <textarea
          ref={ta}
          value={note}
          maxLength={2000}
          rows={2}
          disabled={p.pending}
          placeholder={p.pending ? "Salvando post-it…" : "Minha anotação (opcional)"}
          onChange={(e) => change(e.target.value)}
          onBlur={() => void save(note)}
          data-testid="postit-nota"
        />
      </label>

      <footer className="pi-rodape">
        <span className="pi-estado" role="status" aria-live="polite" data-testid="postit-estado">
          {p.pending || state === "saving" ? <><Loader2 className="size-3.5 animate-spin" aria-hidden /> Salvando…</> : state === "saved" ? <><Check className="size-3.5" aria-hidden /> Salvo</> : state === "error" ? (
            <button type="button" className="pi-erro" onClick={() => void save(note)}><RotateCcw className="size-3.5" aria-hidden /> Falhou — tentar de novo</button>
          ) : null}
        </span>
        {confirm ? (
          <span className="pi-confirma" role="group" aria-label="Confirmar exclusão">
            <span>Excluir? Sai dos próximos PDFs.</span>
            <button type="button" className="pi-sim" disabled={busy} onClick={async () => { setBusy(true); const ok = await onDelete(p.id); if (!ok) { setBusy(false); setConfirm(false); } }} data-testid="postit-excluir-sim">Excluir</button>
            <button type="button" className="pi-nao" onClick={() => setConfirm(false)}>Manter</button>
          </span>
        ) : (
          <span className="pi-acoes">
            <button type="button" className="pi-icone" onClick={() => onGo(p)} aria-label="Voltar ao trecho na aula" title="Ir ao trecho na aula" data-testid="postit-ir"><ArrowUpRight className="size-4" aria-hidden /></button>
            <button type="button" className="pi-icone" onClick={() => setConfirm(true)} disabled={p.pending} aria-label="Excluir post-it" title="Excluir post-it" data-testid="postit-excluir"><Trash2 className="size-4" aria-hidden /></button>
          </span>
        )}
      </footer>
    </article>
  );
}
