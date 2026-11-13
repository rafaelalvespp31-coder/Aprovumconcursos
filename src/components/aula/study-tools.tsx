"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Download, FileText, Lightbulb, Loader2, StickyNote, X } from "lucide-react";
import { MentorIcone } from "@/components/mentor/mentor-icone";
import { MentorVoz } from "@/components/mentor/mentor-voz";
import type { StudyContext } from "@/domain/mentor/study-context";
import { createPostitAction, deletePostitAction, generatePostitPdfAction, updatePostitNoteAction } from "@/app/(app)/aula/[id]/postit-actions";
import { PostitCard, type PostitView } from "./postit-card";
import { caretAt, locateRange, readSelection, type Capture } from "./postit-dom";

type PdfInfo = { id: string; pdfVersion: number; createdAt: string; items: number };
type PostitDto = { id: string; sectionId: string | null; sectionTitle: string | null; quote: string; quoteStart: number; note: string; createdAt: string };

/** Contrato com o servidor. Na galeria de design entra uma versão em memória; no app, as ações reais. */
export interface StudyApi {
  create: typeof createPostitAction;
  updateNote: (id: string, note: string) => Promise<{ ok: true; postit: PostitDto } | { ok: false; error: string }>;
  remove: typeof deletePostitAction;
  generatePdf: typeof generatePostitPdfAction;
}
const realApi: StudyApi = { create: createPostitAction, updateNote: updatePostitNoteAction, remove: deletePostitAction, generatePdf: generatePostitPdfAction };
type Panel = null | "lista" | "pdf" | "mentor";
type Mode = "wide" | "compact";

const RAIL_GAP = 10;
const FRESH_MS = 12_000;
const fmt = (iso: string) => new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" });

/**
 * Central de ferramentas da leitura: post-it de revisão, explicação (reaproveita a do Gemini),
 * Mentor por voz e "Meu PDF de Revisão". Os post-its ficam no banco (RLS); aqui só se desenha e se
 * sincroniza. Sem espaço lateral, os post-its viram abas numeradas e abrem num painel.
 */
export function StudyTools({
  lessonId, lessonTitle, subject, sectionOrder, initialPostits, initialPdfs, api = realApi,
}: {
  api?: StudyApi;
  lessonId: string;
  lessonTitle: string;
  subject: string | null;
  sectionOrder: string[];
  initialPostits: PostitView[];
  initialPdfs: PdfInfo[];
}) {
  const rank = useMemo(() => new Map(sectionOrder.map((id, i) => [id, i])), [sectionOrder]);
  const sortPostits = useCallback(
    (list: PostitView[]) => [...list].sort((a, b) => (rank.get(a.sectionId ?? "") ?? 9999) - (rank.get(b.sectionId ?? "") ?? 9999) || a.quoteStart - b.quoteStart || a.createdAt.localeCompare(b.createdAt)),
    [rank],
  );
  const [postits, setPostits] = useState<PostitView[]>(() => sortPostits(initialPostits));
  const [pdfs, setPdfs] = useState<PdfInfo[]>(initialPdfs);
  const [panel, setPanel] = useState<Panel>(null);
  const [mode, setMode] = useState<Mode>("compact");
  const [focusId, setFocusId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ text: string; tone: "ok" | "erro" } | null>(null);
  const [busyPdf, setBusyPdf] = useState(false);

  const postitsRef = useRef(postits);
  const lastCap = useRef<Capture | null>(null);
  const rangesRef = useRef(new Map<string, Range>());
  const els = useRef(new Map<string, HTMLElement>());
  const modeRef = useRef<Mode>("compact");
  const panelRef = useRef<Panel>(null);
  const focusRef = useRef<string | null>(null);
  const raf = useRef(0);
  useEffect(() => { postitsRef.current = postits; }, [postits]);
  useEffect(() => { panelRef.current = panel; }, [panel]);
  useEffect(() => { focusRef.current = focusId; }, [focusId]);

  const say = useCallback((text: string, tone: "ok" | "erro" = "ok") => {
    setToast({ text, tone });
  }, []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4200);
    return () => clearTimeout(t);
  }, [toast]);

  // ---------- Marcação no texto + posição lateral ----------
  const paint = useCallback(() => {
    const css = (window as unknown as { CSS?: { highlights?: Map<string, unknown> } }).CSS;
    const H = (window as unknown as { Highlight?: new (...r: Range[]) => unknown }).Highlight;
    if (!css?.highlights || !H) return;
    const normal: Range[] = [];
    const foco: Range[] = [];
    for (const [id, r] of rangesRef.current) (id === focusRef.current ? foco : normal).push(r);
    css.highlights.set("postit", new H(...normal));
    css.highlights.set("postit-foco", new H(...foco));
  }, []);

  const layout = useCallback(() => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const sec = document.querySelector(".ap-secao");
    const contentRight = sec ? sec.getBoundingClientRect().right : vw / 2;
    const left = contentRight + 18;
    const avail = vw - left - 84;
    const next: Mode = vw >= 1024 && avail >= 230 ? "wide" : "compact";
    if (next !== modeRef.current) {
      modeRef.current = next;
      setMode(next);
    }
    const list = postitsRef.current;
    let cursor = 76;
    list.forEach((p) => {
      const el = els.current.get(p.id);
      if (!el) return;
      const r = rangesRef.current.get(p.id);
      const rect = r?.getBoundingClientRect();
      const visible = !!rect && rect.bottom > 70 && rect.top < vh - 40;
      if (!visible || !rect) { el.style.display = "none"; return; }
      el.style.display = "";
      const h = el.offsetHeight || 40;
      let y = Math.max(rect.top - 6, cursor);
      if (y + h > vh - 16) { el.style.display = "none"; return; }
      if (next === "wide") {
        el.style.width = `${Math.min(290, avail)}px`;
        el.style.transform = `translate(${left}px, ${y}px)`;
      } else {
        y = Math.max(rect.top - 2, cursor);
        el.style.transform = `translate(${vw - 92}px, ${y}px)`;
      }
      cursor = y + h + RAIL_GAP;
    });
  }, []);

  const refresh = useCallback(() => {
    const map = new Map<string, Range>();
    for (const p of postitsRef.current) {
      if (!p.sectionId) continue;
      const r = locateRange({ sectionId: p.sectionId, quote: p.quote, quoteStart: p.quoteStart });
      if (r) map.set(p.id, r);
    }
    rangesRef.current = map;
    paint();
    layout();
  }, [paint, layout]);

  const schedule = useCallback(() => {
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(layout);
  }, [layout]);

  useEffect(() => {
    const t = setTimeout(refresh, 60);
    return () => clearTimeout(t);
  }, [postits, refresh, panel, mode]);

  useEffect(() => { paint(); }, [focusId, paint]);

  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | undefined;
    const soon = () => { clearTimeout(t); t = setTimeout(refresh, 120); };
    const main = document.querySelector("main");
    const mo = main ? new MutationObserver(soon) : null;
    mo?.observe(main!, { childList: true, subtree: true });
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", soon);
    window.addEventListener("aprovum:secao-aberta", soon);
    return () => {
      clearTimeout(t);
      mo?.disconnect();
      cancelAnimationFrame(raf.current);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", soon);
      window.removeEventListener("aprovum:secao-aberta", soon);
      const css = (window as unknown as { CSS?: { highlights?: Map<string, unknown> } }).CSS;
      css?.highlights?.delete("postit");
      css?.highlights?.delete("postit-foco");
    };
  }, [refresh, schedule]);

  // ---------- Seleção ----------
  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | undefined;
    const on = () => {
      clearTimeout(t);
      t = setTimeout(() => {
        const r = readSelection();
        if (r && "cap" in r) lastCap.current = r.cap;
      }, 150);
    };
    document.addEventListener("selectionchange", on);
    return () => { clearTimeout(t); document.removeEventListener("selectionchange", on); };
  }, []);

  /** Seleção viva ou, se o toque na barra a desfez, a última de poucos segundos atrás. */
  const currentCapture = useCallback((): { cap?: Capture; error?: string } => {
    const live = readSelection();
    if (live && "cap" in live) return { cap: live.cap };
    if (live && "error" in live) return { error: live.error };
    const last = lastCap.current;
    if (last && Date.now() - last.at < FRESH_MS) return { cap: last };
    return {};
  }, []);

  // ---------- Post-its ----------
  const goTo = useCallback((p: PostitView) => {
    if (!p.sectionId) return;
    window.dispatchEvent(new CustomEvent("aprovum:ir-secao", { detail: { sectionId: p.sectionId } }));
    setFocusId(p.id);
    if (modeRef.current === "compact") setPanel(null);
    let tries = 0;
    const go = () => {
      refresh();
      const r = rangesRef.current.get(p.id);
      if (r) {
        const rect = r.getBoundingClientRect();
        window.scrollTo({ top: window.scrollY + rect.top - Math.round(window.innerHeight * 0.3), behavior: "smooth" });
      } else if (tries++ < 6) setTimeout(go, 160);
    };
    setTimeout(go, 220);
    setTimeout(() => setFocusId((f) => (f === p.id ? null : f)), 3200);
  }, [refresh]);

  const createFromCapture = useCallback(async (cap: Capture) => {
    const dup = postitsRef.current.find((x) => !x.pending && x.sectionId === cap.sectionId && x.quote === cap.quote && Math.abs(x.quoteStart - cap.quoteStart) < 2);
    if (dup) { setFocusId(dup.id); say("Esse trecho já tem um post-it."); return; }
    const tmp: PostitView = { id: `tmp-${Date.now()}`, sectionId: cap.sectionId, sectionTitle: cap.sectionTitle || null, quote: cap.quote, quoteStart: cap.quoteStart, note: "", createdAt: new Date().toISOString(), pending: true };
    setPostits((l) => sortPostits([...l, tmp]));
    window.getSelection()?.removeAllRanges();
    lastCap.current = null;
    const r = await api.create({ lessonId, sectionId: cap.sectionId, quote: cap.quote, quoteStart: cap.quoteStart, note: "" });
    if (!r.ok) {
      setPostits((l) => l.filter((x) => x.id !== tmp.id));
      say(r.error, "erro");
      return;
    }
    const real: PostitView = { id: r.postit.id, sectionId: r.postit.sectionId, sectionTitle: r.postit.sectionTitle, quote: r.postit.quote, quoteStart: r.postit.quoteStart, note: r.postit.note, createdAt: r.postit.createdAt };
    setPostits((l) => {
      const without = l.filter((x) => x.id !== tmp.id && x.id !== real.id);
      return sortPostits([...without, real]);
    });
    setFocusId(real.id);
    say(r.duplicate ? "Esse trecho já tinha um post-it." : "Post-it criado.");
    setTimeout(() => setFocusId((f) => (f === real.id ? null : f)), 2600);
    if (modeRef.current === "compact" && !r.duplicate) setPanel("lista");
  }, [lessonId, say, sortPostits, api]);

  const onPostitButton = () => {
    const { cap, error } = currentCapture();
    if (cap) return void createFromCapture(cap);
    if (error) return say(error, "erro");
    if (postitsRef.current.length) setPanel((p) => (p === "lista" ? null : "lista"));
    else say("Selecione um trecho da aula e toque em Post-it para marcá-lo.");
  };

  // Botão "Post-it" que aparece junto da seleção (ao lado de "Explicar").
  useEffect(() => {
    const on = () => onPostitButton();
    window.addEventListener("aprovum:postit", on);
    return () => window.removeEventListener("aprovum:postit", on);
  });

  const saveNote = useCallback(async (id: string, note: string): Promise<boolean> => {
    const r = await api.updateNote(id, note);
    if (!r.ok) { say(r.error, "erro"); return false; }
    setPostits((l) => l.map((x) => (x.id === id ? { ...x, note: r.postit.note } : x)));
    return true;
  }, [say, api]);

  const remove = useCallback(async (id: string): Promise<boolean> => {
    const r = await api.remove(id);
    if (!r.ok) { say(r.error, "erro"); return false; }
    setPostits((l) => l.filter((x) => x.id !== id));
    say("Post-it excluído. O texto da aula não mudou.");
    return true;
  }, [say, api]);

  // Toque no trecho marcado abre o post-it.
  useEffect(() => {
    const on = (e: MouseEvent) => {
      const t = e.target as Element | null;
      if (!t || t.closest("[data-st]")) return;
      const s = window.getSelection();
      if (s && !s.isCollapsed) return;
      const pos = caretAt(e.clientX, e.clientY);
      if (!pos) return;
      for (const [id, r] of rangesRef.current) {
        let inside = false;
        try { inside = r.isPointInRange(pos.node, pos.offset); } catch { inside = false; }
        if (inside) {
          setFocusId(id);
          if (modeRef.current === "compact") setPanel("lista");
          setTimeout(() => setFocusId((f) => (f === id ? null : f)), 3200);
          return;
        }
      }
    };
    const main = document.querySelector("main");
    main?.addEventListener("click", on);
    return () => main?.removeEventListener("click", on);
  }, []);

  // ---------- PDF ----------
  const generatePdf = async () => {
    if (busyPdf) return;
    setBusyPdf(true);
    const r = await api.generatePdf(lessonId);
    setBusyPdf(false);
    if (!r.ok) return say(r.error, "erro");
    setPdfs(r.pdfs);
    say(r.reused ? `Nada mudou desde a v${r.pdfVersion}: baixando a mesma versão.` : `PDF v${r.pdfVersion} gerado.`);
    const a = document.createElement("a");
    a.href = `/api/pdf/revisao/${r.id}`;
    a.download = "";
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  // ---------- Mentor ----------
  const getStudy = useCallback((): StudyContext => {
    const { cap } = currentCapture();
    let section = cap?.sectionTitle ?? "";
    if (!section) {
      for (const el of document.querySelectorAll(".ap-secao")) {
        if (el.getBoundingClientRect().bottom > 120) { section = (el.querySelector("h2, h3")?.textContent ?? "").trim(); break; }
      }
    }
    return { subject, lesson: lessonTitle, section, selection: cap?.quote ?? null, around: cap?.around ?? null };
  }, [currentCapture, lessonTitle, subject]);

  const explain = () => {
    window.dispatchEvent(new CustomEvent("aprovum:explicar"));
  };

  useEffect(() => {
    if (!panel) return;
    const on = (e: KeyboardEvent) => { if (e.key === "Escape") setPanel(null); };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, [panel]);

  const setEl = (id: string) => (el: HTMLElement | null) => { if (el) els.current.set(id, el); else els.current.delete(id); };
  const count = postits.filter((p) => !p.pending).length;
  const onlyOpenSide = panel === "lista";

  return (
    <>
      <div className="st-dock" data-st data-testid="st-dock">
        <div className="st-pilula" role="toolbar" aria-label="Ferramentas de estudo">
          <button type="button" className={`st-btn ${panel === "lista" ? "is-on" : ""}`} onMouseDown={(e) => e.preventDefault()} onClick={onPostitButton} aria-label="Post-it de revisão" data-tip="Post-it: selecione um trecho e toque aqui" data-testid="st-postit">
            <StickyNote className="size-5" aria-hidden />
            {count > 0 && <span className="st-badge" aria-hidden>{count}</span>}
          </button>
          <button type="button" className="st-btn" onMouseDown={(e) => e.preventDefault()} onClick={explain} aria-label="Explicar o trecho selecionado" data-tip="Explicar com IA: selecione uma palavra ou trecho" data-testid="st-explicar">
            <Lightbulb className="size-5" aria-hidden />
          </button>
          <button type="button" className={`st-btn ${panel === "pdf" ? "is-on" : ""}`} onClick={() => setPanel((p) => (p === "pdf" ? null : "pdf"))} aria-label="Meu PDF de Revisão" aria-expanded={panel === "pdf"} data-tip="Meu PDF de Revisão" data-testid="st-pdf">
            <FileText className="size-5" aria-hidden />
          </button>
        </div>
        <button type="button" className={`st-mentor ${panel === "mentor" ? "is-on" : ""}`} onMouseDown={(e) => e.preventDefault()} onClick={() => { currentCapture(); setPanel((p) => (p === "mentor" ? null : "mentor")); }} aria-label="Falar com o Mentor por voz" aria-expanded={panel === "mentor"} data-tip="Mentor por voz" data-testid="st-mentor">
          <MentorIcone size={50} />
        </button>
      </div>

      {/* Post-its ao lado do trecho (com espaço) ou abas numeradas (sem espaço) */}
      {!onlyOpenSide && postits.length > 0 && (
        <div className={`st-trilho is-${mode}`} data-st aria-label="Post-its desta aula" data-testid="st-trilho">
          {postits.map((p, i) => (
            <div key={p.id} ref={setEl(p.id)} className="st-item" style={{ display: "none" }}>
              {mode === "wide" ? (
                <PostitCard p={p} n={i + 1} focused={focusId === p.id} inRail onNote={saveNote} onDelete={remove} onGo={goTo} />
              ) : (
                <button type="button" className={`st-aba ${focusId === p.id ? "is-foco" : ""}`} onClick={() => { setFocusId(p.id); setPanel("lista"); }} aria-label={`Abrir post-it ${i + 1}`} data-testid="postit-aba">{i + 1}</button>
              )}
            </div>
          ))}
        </div>
      )}

      {panel && (
        <div className={`st-painel is-${panel}`} role="dialog" aria-modal="false" aria-label={panel === "lista" ? "Post-its da aula" : panel === "pdf" ? "Meu PDF de Revisão" : "Mentor por voz"} data-st data-testid={`st-painel-${panel}`}>
          <div className="st-painel-topo">
            <h2>{panel === "lista" ? `Post-its desta aula${count ? ` (${count})` : ""}` : panel === "pdf" ? "Meu PDF de Revisão" : "Mentor APROVUM"}</h2>
            <button type="button" className="st-fechar" onClick={() => setPanel(null)} aria-label="Fechar painel"><X className="size-4" aria-hidden /></button>
          </div>
          <div className="st-painel-corpo">
            {panel === "lista" && (
              postits.length === 0 ? (
                <p className="st-vazio">Nenhum post-it ainda. Selecione um trecho na leitura e toque em <b>Post-it</b>.</p>
              ) : (
                <ul className="st-lista">
                  {postits.map((p, i) => (
                    <li key={p.id} ref={(el) => { if (el && focusId === p.id) el.scrollIntoView({ block: "nearest" }); }}>
                      <PostitCard p={p} n={i + 1} focused={focusId === p.id} onNote={saveNote} onDelete={remove} onGo={goTo} />
                    </li>
                  ))}
                </ul>
              )
            )}
            {panel === "pdf" && (
              <div className="st-pdf">
                <p className="st-pdf-txt">Reúne <b>só os seus post-its ativos</b> desta aula, na ordem da leitura, com o trecho, a sua anotação e a seção de origem. Nada é resumido nem reescrito.</p>
                <button type="button" className="st-cta" onClick={generatePdf} disabled={busyPdf || count === 0} data-testid="st-gerar-pdf">
                  {busyPdf ? <><Loader2 className="size-4 animate-spin" aria-hidden /> Gerando…</> : <><FileText className="size-4" aria-hidden /> {pdfs.length ? "Gerar nova versão" : "Gerar meu PDF"} · {count} post-it{count === 1 ? "" : "s"}</>}
                </button>
                {count === 0 && <p className="st-vazio">Crie ao menos um post-it para gerar o PDF.</p>}
                {pdfs.length > 0 && (
                  <>
                    <h3 className="st-sub">Versões anteriores</h3>
                    <ul className="st-versoes" data-testid="st-versoes">
                      {pdfs.map((v) => (
                        <li key={v.id}>
                          <span><b>v{v.pdfVersion}</b> · {fmt(v.createdAt)} · {v.items} post-it{v.items === 1 ? "" : "s"}</span>
                          <a href={`/api/pdf/revisao/${v.id}`} download className="st-baixar" aria-label={`Baixar versão ${v.pdfVersion}`}><Download className="size-4" aria-hidden /> Baixar</a>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            )}
            {panel === "mentor" && <div className="st-mentor-corpo"><MentorVoz getStudy={getStudy} autoStart /></div>}
          </div>
        </div>
      )}

      <div className={`st-aviso ${toast ? "is-on" : ""} ${toast?.tone === "erro" ? "is-erro" : ""}`} role="status" aria-live="polite" data-testid="st-aviso">{toast?.text}</div>
    </>
  );
}
