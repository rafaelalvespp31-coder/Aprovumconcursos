"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { Download, FileText, Lightbulb, Loader2, StickyNote, Trash2, Wrench, X } from "lucide-react";
import { VozOrbRepouso } from "@/components/mentor/voz-orb-solo";
import type { Bands } from "@/components/mentor/voz-orbe";
import { VozOnda } from "./voz-onda";
import { MentorVoz } from "@/components/mentor/mentor-voz";
import type { StudyContext } from "@/domain/mentor/study-context";
import { createPostitAction, deletePostitAction, deletePostitPdfAction, generatePostitPdfAction, updatePostitNoteAction } from "@/app/(app)/aula/[id]/postit-actions";
import { PostitCard, type PostitView } from "./postit-card";
import { matchKey } from "@/domain/study/postit-quote";
import { caretAt, locateRange, readSelection, type Capture } from "./postit-dom";

type PdfInfo = { id: string; pdfVersion: number; createdAt: string; items: number };
type PostitDto = { structure?: PostitView["structure"]; explanation?: string; id: string; sectionId: string | null; sectionTitle: string | null; quote: string; quoteStart: number; note: string; createdAt: string };

/** Contrato com o servidor. Na galeria de design entra uma versão em memória; no app, as ações reais. */
export interface StudyApi {
  create: typeof createPostitAction;
  updateNote: (id: string, note: string) => Promise<{ ok: true; postit: PostitDto } | { ok: false; error: string }>;
  remove: typeof deletePostitAction;
  generatePdf: typeof generatePostitPdfAction;
  removePdf: typeof deletePostitPdfAction;
}
/** Mensagem que o servidor devolve para falhas inesperadas (vale tentar de novo). */
const TRANSIENT = "Não foi possível concluir agora. Tente novamente.";
const realApi: StudyApi = { create: createPostitAction, updateNote: updatePostitNoteAction, remove: deletePostitAction, generatePdf: generatePostitPdfAction, removePdf: deletePostitPdfAction };
type Panel = null | "lista" | "pdf" | "mentor";

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
  const [mentorFala, setMentorFala] = useState(false);
  const levelRef = useRef<(() => Bands) | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [armed, setArmed] = useState(false);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ text: string; tone: "ok" | "erro" } | null>(null);
  const [busyPdf, setBusyPdf] = useState(false);
  const [pdfSel, setPdfSel] = useState<string | null>(null);

  const postitsRef = useRef(postits);
  const lastCap = useRef<Capture | null>(null);
  const createRef = useRef<(c: Capture) => Promise<void>>(async () => {});
  const rangesRef = useRef(new Map<string, Range>());
  const els = useRef(new Map<string, HTMLElement>());
  const popRef = useRef<HTMLDivElement | null>(null);
  const barRef = useRef<HTMLDivElement | null>(null);
  // A barra entra no cabeçalho fixo da página (logo abaixo da logo); sem cabeçalho, fica solta no topo.
  const host = useSyncExternalStore(() => () => {}, () => document.querySelector(".mv-cabecalho"), () => null);
  const armedRef = useRef(false);
  const openRef = useRef<string | null>(null);
  const armT = useRef<ReturnType<typeof setTimeout> | null>(null);
  const panelRef = useRef<Panel>(null);
  const focusRef = useRef<string | null>(null);
  const raf = useRef(0);
  useEffect(() => { postitsRef.current = postits; }, [postits]);
  useEffect(() => { panelRef.current = panel; }, [panel]);
  useEffect(() => { focusRef.current = focusId; }, [focusId]);
  useEffect(() => { armedRef.current = armed; }, [armed]);
  useEffect(() => { openRef.current = openId; }, [openId]);

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

  /**
   * Os post-its ficam "colados" na margem direita da folha, na altura do trecho: um selinho de papel
   * dentro da folga da folha (nunca sobre o texto). Aberto, o post-it cresce ao lado do selinho.
   * Celular: sem selinhos (tocar no trecho marcado abre a lista).
   */
  // Selinhos e cartão aberto ficam no <body>, em coordenadas do documento: rolam junto com o texto, sem tremer.
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false);
  const toBody = (n: React.ReactNode) => (mounted ? createPortal(n, document.body) : null);

  /**
   * Os selinhos rolam com o texto (coordenadas do documento). Aqui só se esconde o que passou por baixo
   * da barra de ferramentas (em cima) ou do menu inferior: some aos poucos, junto com o texto.
   */
  const clip = useCallback(() => {
    const vh = window.innerHeight;
    const top = Math.round((barRef.current?.getBoundingClientRect().bottom ?? 70));
    const bottom = Math.min(vh, document.querySelector(".bn-wrap")?.getBoundingClientRect().top ?? vh);
    const sy = window.scrollY;
    for (const el of els.current.values()) {
      if (el.style.display === "none") continue;
      const vy = Number(el.dataset.y ?? 0) - sy;
      const h = 36;
      const k = Math.max(0, Math.min(1, Math.min((vy + h - top) / 28, (bottom - vy) / 28)));
      el.style.opacity = String(k);
      el.style.pointerEvents = k < 0.2 ? "none" : "";
    }
    const pop = popRef.current;
    if (pop) {
      const r = pop.getBoundingClientRect();
      const cutTop = Math.max(0, top - r.top);
      const cutBottom = Math.max(0, r.bottom - bottom);
      pop.style.clipPath = cutTop || cutBottom ? `inset(${cutTop}px -20px ${cutBottom}px -20px)` : "";
    }
  }, []);

  const layout = useCallback(() => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const folha = document.querySelector(".ap-folha") ?? document.querySelector(".ap-secao");
    const fr = folha?.getBoundingClientRect();
    const small = vw < 768;
    const stubX = small ? vw - 26 : fr ? Math.min(fr.right - 38, vw - 70) : vw - 100;
    // Limite de cima: logo abaixo da barra de ferramentas (que fica embaixo do cabeçalho).
    const topo = Math.round((barRef.current?.getBoundingClientRect().bottom ?? 70) + 8);
    document.documentElement.style.setProperty("--st-base", `${topo}px`);
    // Coordenadas do DOCUMENTO (não da tela): o selinho rola junto com o texto, sem recalcular a cada rolagem.
    const sx = window.scrollX;
    const sy = window.scrollY;
    let cursor = 0;
    for (const p of postitsRef.current) {
      const el = els.current.get(p.id);
      if (!el) continue;
      const r = rangesRef.current.get(p.id);
      const rect = r?.getBoundingClientRect();
      if (!rect || (!rect.width && !rect.height)) { el.style.display = "none"; continue; }
      const yDoc = Math.max(rect.top + sy - 2, cursor);
      const y = yDoc - sy; // mesma altura, em coordenadas da tela (só para posicionar o cartão aberto)
      el.style.display = "";
      el.style.transform = `translate(${stubX + sx}px, ${yDoc}px)`;
      el.dataset.y = String(yDoc);
      cursor = yDoc + (small ? 26 : 38);
      if (p.id === openRef.current && popRef.current) {
        const pop = popRef.current;
        const w = Math.min(small ? 220 : 210, vw - 24);
        // Fora do texto: na margem direita da folha se couber (sem encostar na barra de ferramentas); senão, na esquerda; por último junto à borda direita.
        const dock = 24;
        const margem = !small && !!fr && (vw - dock - fr.right >= w + 12 || fr.left >= 340 + w);
        const left = small ? vw - w - 34 : fr && vw - dock - fr.right >= w + 12 ? fr.right + 10
          : fr && fr.left >= 340 + w ? fr.left - w - 10
          : vw - dock - w - 4;
        const h = pop.offsetHeight || 220;
        pop.style.width = `${w}px`;
        // Sem margem livre: o cartão fica logo abaixo do trecho marcado (ou acima, se faltar espaço), sem cobri-lo.
        let top = Math.min(Math.max(topo, y - 6), Math.max(topo, vh - h - 12));
        if (!margem) {
          if (small) top = Math.min(Math.max(topo, y - 6), Math.max(topo, vh - h - 12));
          else if (rect.bottom + 10 + h <= vh - 12) top = rect.bottom + 10;
          else if (rect.top - h - 10 >= topo) top = rect.top - h - 10;
        }
        pop.style.translate = `${Math.max(12, left) + sx}px ${top + sy}px`; // `translate` (não `transform`): a animação de entrada usa transform
      }
    }
    clip();
  }, [clip]);

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
    raf.current = requestAnimationFrame(clip);
  }, [clip]);

  useEffect(() => {
    const t = setTimeout(refresh, 60);
    return () => clearTimeout(t);
  }, [postits, refresh, panel, openId]);

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
      // Modo post-it ligado: quando a seleção "assenta" (soltou o mouse/dedo), o post-it é colado.
      if (armedRef.current) {
        if (armT.current) clearTimeout(armT.current);
        armT.current = setTimeout(() => {
          const r = readSelection();
          if (!r) return;
          if ("error" in r) return say(r.error, "erro");
          setArmed(false);
          void createRef.current(r.cap);
        }, 450);
      }
    };
    document.addEventListener("selectionchange", on);
    return () => { clearTimeout(t); if (armT.current) clearTimeout(armT.current); document.removeEventListener("selectionchange", on); };
  }, [say]);

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
    if (window.innerWidth < 768) setPanel(null);
    setOpenId(null);
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
    const tmp: PostitView = { id: `tmp-${Date.now()}`, sectionId: cap.sectionId, sectionTitle: cap.sectionTitle || null, quote: cap.quote, structure: cap.structure ?? null, quoteStart: cap.quoteStart, note: "", createdAt: new Date().toISOString(), pending: true };
    setPostits((l) => sortPostits([...l, tmp]));
    window.getSelection()?.removeAllRanges();
    lastCap.current = null;
    // Falha passageira (rede, servidor frio): tenta de novo sozinho, sem o aluno precisar selecionar outra vez.
    let r = await api.create({ lessonId, sectionId: cap.sectionId, quote: cap.quote, quoteStart: cap.quoteStart, note: "", around: cap.around, structure: cap.structure }).catch(() => ({ ok: false as const, error: TRANSIENT }));
    for (let a = 1; !r.ok && r.error === TRANSIENT && a <= 3; a++) {
      await new Promise((res) => setTimeout(res, 500 * a));
      r = await api.create({ lessonId, sectionId: cap.sectionId, quote: cap.quote, quoteStart: cap.quoteStart, note: "", around: cap.around, structure: cap.structure }).catch(() => ({ ok: false as const, error: TRANSIENT }));
    }
    if (!r.ok) {
      setPostits((l) => l.filter((x) => x.id !== tmp.id));
      say(r.error, "erro");
      return;
    }
    const real: PostitView = { id: r.postit.id, sectionId: r.postit.sectionId, sectionTitle: r.postit.sectionTitle, quote: r.postit.quote, structure: r.postit.structure ?? null, quoteStart: r.postit.quoteStart, note: r.postit.note, explanation: r.postit.explanation, createdAt: r.postit.createdAt };
    setPostits((l) => {
      const without = l.filter((x) => x.id !== tmp.id && x.id !== real.id);
      return sortPostits([...without, real]);
    });
    setFocusId(real.id);
    say(r.duplicate ? "Esse trecho já tinha um post-it." : "Post-it criado.");
    setTimeout(() => setFocusId((f) => (f === real.id ? null : f)), 2600);
    if (window.innerWidth >= 768) setOpenId(real.id);
  }, [lessonId, say, sortPostits, api]);

  useEffect(() => { createRef.current = createFromCapture; }, [createFromCapture]);

  const onPostitButton = () => {
    if (armedRef.current) return setArmed(false);
    const { cap, error } = currentCapture();
    if (cap) return void createFromCapture(cap);
    if (error) return say(error, "erro");
    setPanel(null);
    setArmed(true);
  };

  // Botão "Post-it" que aparece junto da seleção (ao lado de "Explicar").
  useEffect(() => {
    const on = () => onPostitButton();
    window.addEventListener("aprovum:postit", on);
    return () => window.removeEventListener("aprovum:postit", on);
  });

  const saveNote = useCallback(async (id: string, note: string): Promise<boolean> => {
    let r = await api.updateNote(id, note).catch(() => ({ ok: false as const, error: TRANSIENT }));
    for (let a = 1; !r.ok && r.error === TRANSIENT && a <= 2; a++) {
      await new Promise((res) => setTimeout(res, 600 * a));
      r = await api.updateNote(id, note).catch(() => ({ ok: false as const, error: TRANSIENT }));
    }
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

  // O modo Explicar acabou de explicar um trecho: se ele tem post-it, a explicação passa a valer nele (e no PDF).
  useEffect(() => {
    const on = (e: Event) => {
      const d = (e as CustomEvent<{ selection?: string; meaning?: string }>).detail;
      if (!d?.selection || !d.meaning) return;
      const k = matchKey(d.selection);
      setPostits((l) => l.map((x) => (matchKey(x.quote) === k ? { ...x, explanation: d.meaning } : x)));
    };
    window.addEventListener("aprovum:explicado", on);
    return () => window.removeEventListener("aprovum:explicado", on);
  }, []);

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
          setOpenId(id);
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
  const removePdf = async (id: string) => {
    if (pdfSel !== id) { setPdfSel(id); return; }
    setPdfSel(null);
    const r = await api.removePdf(id, lessonId);
    if (!r.ok) return say(r.error, "erro");
    setPdfs(r.pdfs);
    say("PDF excluído.");
  };
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
  const getStudy = useCallback((): StudyContext & { lessonId: string } => {
    const { cap } = currentCapture();
    let section = cap?.sectionTitle ?? "";
    if (!section) {
      for (const el of document.querySelectorAll(".ap-secao")) {
        if (el.getBoundingClientRect().bottom > 120) { section = (el.querySelector("h2, h3")?.textContent ?? "").trim(); break; }
      }
    }
    return { subject, lesson: lessonTitle, section, selection: cap?.quote ?? null, around: cap?.around ?? null, lessonId };
  }, [currentCapture, lessonTitle, subject, lessonId]);

  const explain = () => {
    window.dispatchEvent(new CustomEvent("aprovum:explicar"));
  };

  useEffect(() => {
    if (!openId && !armed) return;
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpenId(null); setArmed(false); } };
    const down = (e: PointerEvent) => {
      const t = e.target as Element | null;
      if (openRef.current && !t?.closest("[data-st-pop], .st-nota")) setOpenId(null);
    };
    window.addEventListener("keydown", key);
    document.addEventListener("pointerdown", down);
    return () => { window.removeEventListener("keydown", key); document.removeEventListener("pointerdown", down); };
  }, [openId, armed]);

  useEffect(() => {
    if (!panel) return;
    const on = (e: KeyboardEvent) => { if (e.key === "Escape") setPanel(null); };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, [panel]);

  const setEl = (id: string) => (el: HTMLElement | null) => { if (el) els.current.set(id, el); else els.current.delete(id); };
  const count = postits.filter((p) => !p.pending).length;

  return (
    <>
      {(() => {
        const barra = (
          <div ref={barRef} className={`st-bar ${host ? "" : "is-solta"}`} data-st data-testid="st-dock">
            <VozOnda level={levelRef} active={panel === "mentor" && mentorFala} />
            <div className="st-bar-rotulo" aria-hidden><Wrench className="size-4" /><span className="st-rot-l">Barra de ferramentas</span><span className="st-rot-c">Ferramentas</span></div>
            <div className="st-pilula" role="toolbar" aria-label="Barra de ferramentas de estudo">
              <button type="button" className={`st-btn ${armed || panel === "lista" ? "is-on" : ""}`} onMouseDown={(e) => e.preventDefault()} onClick={onPostitButton} aria-label="Post-it de revisão" title="Post-it: toque e selecione o trecho" data-testid="st-postit">
                <StickyNote className="size-5" aria-hidden /><span className="st-btn-txt"><b>Post-it</b><small>Marcar trecho</small></span>
                {count > 0 && <span className="st-badge" aria-hidden>{count}</span>}
              </button>
              <button type="button" className="st-btn" onMouseDown={(e) => e.preventDefault()} onClick={explain} aria-label="Explicar o trecho selecionado" title="Explicar com IA: selecione uma palavra ou trecho" data-testid="st-explicar">
                <Lightbulb className="size-5" aria-hidden /><span className="st-btn-txt"><b>Explicar</b><small>Tirar dúvida</small></span>
              </button>
              <button type="button" className={`st-btn ${panel === "pdf" ? "is-on" : ""}`} onClick={() => setPanel((p) => (p === "pdf" ? null : "pdf"))} aria-label="Meu PDF de Revisão" aria-expanded={panel === "pdf"} title="Meu PDF de Revisão" data-testid="st-pdf">
                <FileText className="size-5" aria-hidden /><span className="st-btn-txt"><b>Meu PDF</b><small>Gerar revisão</small></span>
              </button>
              <div className="st-mentor-wrap">
                {panel === "mentor" ? <MentorVoz getStudy={getStudy} autoStart orbOnly orbSize={46} onSpeaking={setMentorFala} onLevel={(fn) => { levelRef.current = fn; }} onClose={() => { setMentorFala(false); setPanel(null); }} /> : <VozOrbRepouso size={46} onStart={() => { currentCapture(); setPanel("mentor"); }} />}
                <span className="st-btn-txt st-mentor-txt" aria-hidden onClick={() => { if (panel !== "mentor") { currentCapture(); setPanel("mentor"); } }}><b>Mentor</b><small>Falar com o Mentor</small></span>
              </div>
            </div>
          </div>
        );
        return host ? createPortal(barra, host) : barra;
      })()}

      {/* Post-its colados na margem da folha, na altura do trecho */}
      {postits.length > 0 && toBody(
        <div className="st-trilho" data-st aria-label="Post-its desta aula" data-testid="st-trilho">
          {postits.map((p, i) => (
            <div key={p.id} ref={setEl(p.id)} className="st-item" style={{ display: "none" }}>
              <button type="button" className={`st-nota ${focusId === p.id || openId === p.id ? "is-foco" : ""} ${p.pending ? "is-pendente" : ""}`} onClick={() => { setFocusId(p.id); setOpenId((o) => (o === p.id ? null : p.id)); }} aria-expanded={openId === p.id} aria-label={`Post-it ${i + 1}: ${p.quote.slice(0, 60)}`} title={p.note || p.quote.slice(0, 80)} data-testid="postit-aba">{i + 1}</button>
            </div>
          ))}
        </div>,
      )}
      {openId && postits.some((p) => p.id === openId) && toBody(
        <div ref={popRef} className="st-pop" data-st-pop data-st data-testid="st-pop">
          {postits.map((p, i) => p.id === openId && <PostitCard key={p.id} p={p} n={i + 1} focused={false} inRail onNote={saveNote} onDelete={async (id) => { const ok = await remove(id); if (ok) setOpenId(null); return ok; }} onGo={goTo} />)}
        </div>,
      )}
      {armed && (
        <div className="st-dica" role="status" data-st data-testid="st-dica">
          <span>Selecione o trecho na leitura: o post-it é colado ao lado da folha.</span>
          {count > 0 && <button type="button" onClick={() => { setArmed(false); setPanel("lista"); }}>Meus post-its ({count})</button>}
          <button type="button" onClick={() => setArmed(false)}>Cancelar</button>
        </div>
      )}

      {(panel === "lista" || panel === "pdf") && (
        <div className={`st-painel is-${panel}`} role="dialog" aria-modal="false" aria-label={panel === "lista" ? "Post-its da aula" : panel === "pdf" ? "Meu PDF de Revisão" : "Mentor por voz"} data-st data-testid={`st-painel-${panel}`}>
          <div className="st-painel-topo">
            <h2>{panel === "lista" ? `Post-its desta aula${count ? ` (${count})` : ""}` : "Meu PDF de Revisão"}</h2>
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
                <p className="st-pdf-txt">Reúne <b>só os seus post-its ativos</b> desta aula, na ordem da leitura, com o trecho, a sua anotação, a explicação do trecho e a seção de origem. Nada é resumido nem reescrito.</p>
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
                          <span className="st-acoes">
                            <a href={`/api/pdf/revisao/${v.id}`} download className="st-baixar" aria-label={`Baixar versão ${v.pdfVersion}`}><Download className="size-4" aria-hidden /> Baixar</a>
                            <button type="button" className={`st-excluir ${pdfSel === v.id ? "is-conf" : ""}`} onClick={() => void removePdf(v.id)} onBlur={() => setPdfSel((c) => (c === v.id ? null : c))} aria-label={pdfSel === v.id ? `Confirmar exclusão da versão ${v.pdfVersion}` : `Excluir versão ${v.pdfVersion}`} data-testid="st-pdf-excluir">
                              <Trash2 className="size-4" aria-hidden />{pdfSel === v.id && " Excluir?"}
                            </button>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            )}
                      </div>
        </div>
      )}

      <div className={`st-aviso ${toast ? "is-on" : ""} ${toast?.tone === "erro" ? "is-erro" : ""}`} role="status" aria-live="polite" data-testid="st-aviso">{toast?.text}</div>
    </>
  );
}
