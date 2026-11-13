"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Lightbulb, StickyNote, X } from "lucide-react";

type Explain = (input: { lessonId: string; selection: string; around: string }) => Promise<{ ok: true; meaning: string } | { ok: false; error: string }>;
type Box = { x: number; y: number; text: string; around: string };
type Balloon = { x: number; y: number; text: string; state: "loading" | "ok" | "erro" | "dica"; body: string };

const MAX = 600;

/**
 * Aluno seleciona palavra, frase ou oração no texto da aula → aparece "Explicar" → balão com o
 * significado naquele contexto. Só reage a seleções dentro do conteúdo (`main`), nunca em campos de texto.
 */
export function SelectionExplainer({ lessonId, explain }: { lessonId: string; explain: Explain }) {
  const [box, setBox] = useState<Box | null>(null);
  const [balloon, setBalloon] = useState<Balloon | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seq = useRef(0);
  const lastBox = useRef<{ box: Box; at: number } | null>(null);

  /** Seleção atual dentro do conteúdo, já com a posição do botão; null se não houver. */
  const compute = useCallback((): Box | null => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) return null;
    const text = sel.toString().replace(/\s+/g, " ").trim();
    if (text.length < 2 || text.length > MAX) return null;
    const range = sel.getRangeAt(0);
    const anchor = range.commonAncestorContainer instanceof Element ? range.commonAncestorContainer : range.commonAncestorContainer.parentElement;
    const main = document.querySelector("main");
    if (!anchor || !main || !main.contains(anchor) || anchor.closest("input, textarea, [contenteditable=true], [data-sem-explicar]")) return null;
    const rect = range.getBoundingClientRect();
    if (!rect.width && !rect.height) return null;
    const around = (anchor.closest("p, li, blockquote, td, h1, h2, h3, h4") ?? anchor).textContent?.replace(/\s+/g, " ").trim().slice(0, 1500) ?? "";
    const x = Math.min(Math.max(16, rect.left + rect.width / 2), window.innerWidth - 16);
    return { x, y: Math.min(rect.bottom + 8, window.innerHeight - 56), text, around };
  }, []);

  const read = useCallback(() => {
    const b = compute();
    if (b) lastBox.current = { box: b, at: Date.now() };
    setBox(b);
  }, [compute]);

  useEffect(() => {
    const onSel = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(read, 220);
    };
    document.addEventListener("selectionchange", onSel);
    return () => {
      document.removeEventListener("selectionchange", onSel);
      if (timer.current) clearTimeout(timer.current);
    };
  }, [read]);

  const ask = async (from?: Box) => {
    const b = from ?? box;
    if (!b) return;
    const id = ++seq.current;
    const at = { x: b.x, y: b.y };
    setBalloon({ ...at, text: b.text, state: "loading", body: "" });
    setBox(null);
    const slow = new Promise<{ ok: false; error: string }>((res) => setTimeout(() => res({ ok: false, error: "Demorou demais para responder. Tente de novo." }), 45_000));
    const r = await Promise.race([explain({ lessonId, selection: b.text, around: b.around }), slow]).catch(() => ({ ok: false as const, error: "Sem conexão. Tente de novo." }));
    if (id !== seq.current) return;
    if (r.ok) window.dispatchEvent(new CustomEvent("aprovum:explicado", { detail: { selection: b.text, meaning: r.meaning } }));
    setBalloon({ ...at, text: b.text, state: r.ok ? "ok" : "erro", body: r.ok ? r.meaning : r.error });
  };

  // A barra de ferramentas da aula aciona esta mesma explicação (sem segunda chamada nem outra integração).
  const askRef = useRef(ask);
  useEffect(() => { askRef.current = ask; });
  useEffect(() => {
    const on = () => {
      const live = compute();
      if (live) return void askRef.current(live);
      const last = lastBox.current;
      if (last && Date.now() - last.at < 12_000) return void askRef.current(last.box);
      seq.current++;
      setBox(null);
      setBalloon({ x: window.innerWidth / 2, y: 110, text: "", state: "dica", body: "Selecione uma palavra ou um trecho da aula e toque em Explicar." });
    };
    window.addEventListener("aprovum:explicar", on);
    return () => window.removeEventListener("aprovum:explicar", on);
  }, [compute]);

  const close = () => {
    seq.current++;
    setBalloon(null);
  };

  return (
    <>
      {box && !balloon && (
        <div className="sx-barra" style={{ left: box.x, top: box.y }} data-st>
          <button type="button" className="sx-botao" onMouseDown={(e) => e.preventDefault()} onClick={() => void ask()} data-testid="explicar-botao">
            <Lightbulb className="size-4" aria-hidden /> Explicar
          </button>
          <button type="button" className="sx-botao sx-postit" onMouseDown={(e) => e.preventDefault()} onClick={() => window.dispatchEvent(new CustomEvent("aprovum:postit"))} data-testid="postit-botao">
            <StickyNote className="size-4" aria-hidden /> Post-it
          </button>
        </div>
      )}
      {balloon && (
        <div className="sx-balao" style={{ left: Math.min(Math.max(12, balloon.x - 160), Math.max(12, (typeof window === "undefined" ? 400 : window.innerWidth) - 332)), top: balloon.y }} role="dialog" aria-label="Explicação do trecho" data-testid="explicar-balao" data-sem-explicar>
          <button type="button" className="sx-fechar" onClick={close} aria-label="Fechar explicação">
            <X className="size-4" aria-hidden />
          </button>
          {balloon.text && <p className="sx-trecho">“{balloon.text.length > 90 ? `${balloon.text.slice(0, 90)}…` : balloon.text}”</p>}
          {balloon.state === "loading" ? (
            <p className="sx-corpo" aria-busy>Explicando…</p>
          ) : (
            <p className={`sx-corpo ${balloon.state === "erro" ? "sx-erro" : ""}`} role={balloon.state === "erro" ? "alert" : undefined} data-testid="explicar-resposta">{balloon.body}</p>
          )}
        </div>
      )}
    </>
  );
}
