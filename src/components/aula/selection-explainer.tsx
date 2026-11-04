"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Lightbulb, X } from "lucide-react";

type Explain = (input: { lessonId: string; selection: string; around: string }) => Promise<{ ok: true; meaning: string } | { ok: false; error: string }>;
type Box = { x: number; y: number; text: string; around: string };
type Balloon = { x: number; y: number; text: string; state: "loading" | "ok" | "erro"; body: string };

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

  const read = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) return setBox(null);
    const text = sel.toString().replace(/\s+/g, " ").trim();
    if (text.length < 2 || text.length > MAX) return setBox(null);
    const range = sel.getRangeAt(0);
    const anchor = range.commonAncestorContainer instanceof Element ? range.commonAncestorContainer : range.commonAncestorContainer.parentElement;
    const main = document.querySelector("main");
    if (!anchor || !main || !main.contains(anchor) || anchor.closest("input, textarea, [contenteditable=true], [data-sem-explicar]")) return setBox(null);
    const rect = range.getBoundingClientRect();
    if (!rect.width && !rect.height) return setBox(null);
    const around = (anchor.closest("p, li, blockquote, td, h1, h2, h3, h4") ?? anchor).textContent?.replace(/\s+/g, " ").trim().slice(0, 1500) ?? "";
    const x = Math.min(Math.max(16, rect.left + rect.width / 2), window.innerWidth - 16);
    setBox({ x, y: Math.min(rect.bottom + 8, window.innerHeight - 56), text, around });
  }, []);

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

  const ask = async () => {
    if (!box) return;
    const id = ++seq.current;
    const at = { x: box.x, y: box.y };
    setBalloon({ ...at, text: box.text, state: "loading", body: "" });
    setBox(null);
    const slow = new Promise<{ ok: false; error: string }>((res) => setTimeout(() => res({ ok: false, error: "Demorou demais para responder. Tente de novo." }), 45_000));
    const r = await Promise.race([explain({ lessonId, selection: box.text, around: box.around }), slow]).catch(() => ({ ok: false as const, error: "Sem conexão. Tente de novo." }));
    if (id !== seq.current) return;
    setBalloon({ ...at, text: box.text, state: r.ok ? "ok" : "erro", body: r.ok ? r.meaning : r.error });
  };

  const close = () => {
    seq.current++;
    setBalloon(null);
  };

  return (
    <>
      {box && !balloon && (
        <button
          type="button"
          className="sx-botao"
          style={{ left: box.x, top: box.y }}
          onMouseDown={(e) => e.preventDefault()}
          onClick={ask}
          data-testid="explicar-botao"
        >
          <Lightbulb className="size-4" aria-hidden /> Explicar
        </button>
      )}
      {balloon && (
        <div className="sx-balao" style={{ left: Math.min(Math.max(12, balloon.x - 160), Math.max(12, (typeof window === "undefined" ? 400 : window.innerWidth) - 332)), top: balloon.y }} role="dialog" aria-label="Explicação do trecho" data-testid="explicar-balao" data-sem-explicar>
          <button type="button" className="sx-fechar" onClick={close} aria-label="Fechar explicação">
            <X className="size-4" aria-hidden />
          </button>
          <p className="sx-trecho">“{balloon.text.length > 90 ? `${balloon.text.slice(0, 90)}…` : balloon.text}”</p>
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
