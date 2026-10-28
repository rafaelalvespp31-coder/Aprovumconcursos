"use client";

import { createPortal } from "react-dom";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Baseline,
  Bold,
  ClipboardX,
  Highlighter,
  Italic,
  List,
  ListOrdered,
  Redo2,
  RemoveFormatting,
  RotateCcw,
  Save,
  Strikethrough,
  Underline,
  Undo2,
  X,
} from "lucide-react";
import { groupErrors, type ErrorNotebookData, type ErrorNotebookEdit, type ErrorNotebookEntry } from "@/domain/notebooks/error-notebook";
import { RICH_MAX, sanitizeRichHtml } from "@/domain/notebooks/rich-text";

type Result<T> = { ok: true; data: T } | { ok: false; error: string };
export interface ErrorNotebookApi {
  open: (notebookId: string) => Promise<Result<ErrorNotebookData>>;
  save: (notebookId: string, edits: ErrorNotebookEdit[]) => Promise<Result<{ savedAt: string }>>;
}

const TEXT_COLORS = [
  { name: "Preto", value: "#08090b" },
  { name: "Vermelho", value: "#e50914" },
  { name: "Azul", value: "#1d4ed8" },
  { name: "Verde", value: "#15803d" },
  { name: "Laranja", value: "#c2410c" },
  { name: "Roxo", value: "#7e22ce" },
  { name: "Cinza", value: "#64666d" },
];
const MARKERS = [
  { name: "Amarelo", value: "#fff3a0" },
  { name: "Verde", value: "#c9f5d4" },
  { name: "Azul", value: "#cfe3ff" },
  { name: "Rosa", value: "#ffd3e2" },
  { name: "Laranja", value: "#ffe0c2" },
];
const FORMAT_STATES = ["bold", "italic", "underline", "strikeThrough", "insertUnorderedList", "insertOrderedList"] as const;
type FormatState = (typeof FORMAT_STATES)[number];

const hhmm = (iso: string) => new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

/**
 * Caderno de erros em uma janela: os erros do caderno organizados por matéria › tema › assunto,
 * cada um com a justificativa editável (negrito, itálico, cores, marca-texto, listas) e "Salvar".
 * O texto é limpo no navegador e de novo no servidor; nada sai da conta do aluno.
 */
export function ErrorNotebookModal({ notebookId, title, api, onClose }: { notebookId: string; title: string; api: ErrorNotebookApi; onClose: () => void }) {
  const [data, setData] = useState<ErrorNotebookData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [entries, setEntries] = useState<ErrorNotebookEntry[]>([]);
  const [dirty, setDirty] = useState<Set<string>>(() => new Set());
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ kind: "ok" | "erro"; text: string } | null>(null);
  const [confirmClose, setConfirmClose] = useState(false);
  const [active, setActive] = useState<Partial<Record<FormatState, boolean>>>({});
  const [palette, setPalette] = useState<"cor" | "marca" | null>(null);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const edits = useRef(new Map<string, string | null>());
  const editors = useRef(new Map<string, HTMLDivElement>());
  const lastEditor = useRef<HTMLDivElement | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // Abre: carrega os erros (uma vez), trava a rolagem da página e foca a janela.
  const [apiRef] = useState(() => api);
  useEffect(() => {
    let alive = true;
    void apiRef
      .open(notebookId)
      .catch((): Result<ErrorNotebookData> => ({ ok: false, error: "Não foi possível abrir o caderno de erros agora." }))
      .then((r) => {
        if (!alive) return;
        if (r.ok) {
          setData(r.data);
          setEntries(r.data.entries);
        } else setLoadError(r.error);
      });
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    cardRef.current?.focus();
    return () => {
      alive = false;
      document.body.style.overflow = prev;
    };
  }, [apiRef, notebookId]);

  const groups = useMemo(() => groupErrors(entries), [entries]);

  const save = useCallback(async () => {
    if (!dirty.size || saving) return;
    const list: ErrorNotebookEdit[] = [...dirty].map((questionId) => {
      const v = edits.current.get(questionId);
      return { questionId, html: v === undefined || v === null ? null : sanitizeRichHtml(v) };
    });
    if (list.some((e) => e.html && e.html.length > RICH_MAX)) {
      setStatus({ kind: "erro", text: "Uma anotação ficou grande demais. Encurte o texto e salve de novo." });
      return;
    }
    setSaving(true);
    setStatus(null);
    const r = await apiRef.save(notebookId, list).catch((): Result<{ savedAt: string }> => ({ ok: false, error: "Sem conexão. Suas alterações continuam aqui; tente salvar de novo." }));
    setSaving(false);
    if (!r.ok) {
      setStatus({ kind: "erro", text: r.error });
      return;
    }
    const byId = new Map(list.map((e) => [e.questionId, e.html]));
    setEntries((all) =>
      all.map((e) => {
        if (!byId.has(e.questionId)) return e;
        const html = byId.get(e.questionId) ?? null;
        return html ? { ...e, html, edited: true, updatedAt: r.data.savedAt } : { ...e, html: e.originalHtml, edited: false, updatedAt: null };
      }),
    );
    for (const id of byId.keys()) edits.current.delete(id);
    setDirty(new Set());
    setConfirmClose(false);
    setStatus({ kind: "ok", text: `Tudo salvo às ${hhmm(r.data.savedAt)}.` });
  }, [apiRef, dirty, notebookId, saving]);

  const requestClose = useCallback(() => {
    if (dirty.size) setConfirmClose(true);
    else onClose();
  }, [dirty.size, onClose]);

  // Teclado: Esc fecha (pergunta se houver alterações); Ctrl/⌘+S salva.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        if (palette) setPalette(null);
        else requestClose();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void save();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [palette, requestClose, save]);

  // Botões da barra acesos conforme o trecho selecionado.
  useEffect(() => {
    const onSel = () => {
      const node = document.getSelection()?.anchorNode;
      const inEditor = !!node && [...editors.current.values()].some((ed) => ed.contains(node));
      if (!inEditor) return;
      const next: Partial<Record<FormatState, boolean>> = {};
      for (const c of FORMAT_STATES) {
        try {
          next[c] = document.queryCommandState(c);
        } catch {
          next[c] = false;
        }
      }
      setActive(next);
    };
    document.addEventListener("selectionchange", onSel);
    return () => document.removeEventListener("selectionchange", onSel);
  }, []);

  const markDirty = (id: string, html: string | null) => {
    edits.current.set(id, html);
    setDirty((d) => (d.has(id) ? d : new Set(d).add(id)));
    setStatus(null);
  };

  const run = (command: string, value?: string) => {
    const ed = lastEditor.current;
    if (!ed) {
      setStatus({ kind: "erro", text: "Clique dentro de uma justificativa para formatar." });
      return;
    }
    if (document.activeElement !== ed) ed.focus();
    try {
      document.execCommand("styleWithCSS", false, "true");
      document.execCommand(command, false, value);
    } catch {
      /* navegador sem o comando: ignora */
    }
    const id = ed.dataset.questao!;
    markDirty(id, ed.innerHTML);
    setPalette(null);
  };

  const restore = (e: ErrorNotebookEntry) => {
    const ed = editors.current.get(e.questionId);
    if (ed) ed.innerHTML = e.originalHtml;
    markDirty(e.questionId, null);
  };

  const noToolbar = !data || !entries.length;
  const pending = dirty.size;

  return createPortal(
    <div className="ce-fundo" onMouseDown={(e) => e.target === e.currentTarget && requestClose()} data-testid="caderno-erros">
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
              {data ? ` · ${entries.length} ${entries.length === 1 ? "erro" : "erros"} organizados por matéria, tema e assunto` : ""}
            </p>
          </div>
          <button type="button" onClick={requestClose} className="ce-fechar" aria-label="Fechar o caderno de erros">
            <X className="h-5 w-5" aria-hidden />
          </button>
        </header>

        {!noToolbar && (
          <div className="ce-barra" role="toolbar" aria-label="Formatação do texto" onMouseDown={(e) => (e.target as HTMLElement).closest("button") && e.preventDefault()}>
            <Tool label="Desfazer" onClick={() => run("undo")}>
              <Undo2 className="h-4 w-4" />
            </Tool>
            <Tool label="Refazer" onClick={() => run("redo")}>
              <Redo2 className="h-4 w-4" />
            </Tool>
            <span className="ce-sep" aria-hidden />
            <Tool label="Negrito" on={active.bold} onClick={() => run("bold")}>
              <Bold className="h-4 w-4" />
            </Tool>
            <Tool label="Itálico" on={active.italic} onClick={() => run("italic")}>
              <Italic className="h-4 w-4" />
            </Tool>
            <Tool label="Sublinhado" on={active.underline} onClick={() => run("underline")}>
              <Underline className="h-4 w-4" />
            </Tool>
            <Tool label="Riscado" on={active.strikeThrough} onClick={() => run("strikeThrough")}>
              <Strikethrough className="h-4 w-4" />
            </Tool>
            <span className="ce-sep" aria-hidden />
            <div className="sm:relative">
              <Tool label="Cor do texto" on={palette === "cor"} onClick={() => setPalette((p) => (p === "cor" ? null : "cor"))} expanded={palette === "cor"}>
                <Baseline className="h-4 w-4" />
              </Tool>
              {palette === "cor" && (
                <div className="ce-paleta" role="group" aria-label="Cores do texto">
                  {TEXT_COLORS.map((c) => (
                    <button key={c.value} type="button" className="ce-cor" style={{ background: c.value }} aria-label={`Texto ${c.name.toLowerCase()}`} title={c.name} onClick={() => run("foreColor", c.value)} />
                  ))}
                  <label className="ce-cor ce-cor-livre" title="Outra cor">
                    <span className="sr-only">Outra cor do texto</span>
                    <input type="color" defaultValue="#e50914" onChange={(e) => run("foreColor", e.target.value)} />
                  </label>
                </div>
              )}
            </div>
            <div className="sm:relative">
              <Tool label="Marca-texto" on={palette === "marca"} onClick={() => setPalette((p) => (p === "marca" ? null : "marca"))} expanded={palette === "marca"}>
                <Highlighter className="h-4 w-4" />
              </Tool>
              {palette === "marca" && (
                <div className="ce-paleta" role="group" aria-label="Cores do marca-texto">
                  {MARKERS.map((c) => (
                    <button key={c.value} type="button" className="ce-cor" style={{ background: c.value }} aria-label={`Marca-texto ${c.name.toLowerCase()}`} title={c.name} onClick={() => run("hiliteColor", c.value)} />
                  ))}
                  <button type="button" className="ce-cor ce-cor-sem" aria-label="Sem marca-texto" title="Sem marca-texto" onClick={() => run("hiliteColor", "transparent")} />
                </div>
              )}
            </div>
            <span className="ce-sep" aria-hidden />
            <Tool label="Lista com marcadores" on={active.insertUnorderedList} onClick={() => run("insertUnorderedList")}>
              <List className="h-4 w-4" />
            </Tool>
            <Tool label="Lista numerada" on={active.insertOrderedList} onClick={() => run("insertOrderedList")}>
              <ListOrdered className="h-4 w-4" />
            </Tool>
            <Tool label="Limpar formatação" onClick={() => run("removeFormat")}>
              <RemoveFormatting className="h-4 w-4" />
            </Tool>
            <span className="ml-auto hidden text-[11.5px] text-[#64666D] md:inline">{focusedId ? "Editando" : "Clique num texto para editar"}</span>
          </div>
        )}

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
          ) : !entries.length ? (
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
                          <article key={e.questionId} className={`ce-item ${dirty.has(e.questionId) ? "is-alterado" : ""}`} data-testid="erro-item" data-questao={e.questionId}>
                            <div className="ce-item-topo">
                              {e.code && <span className="ce-chip">{e.code}</span>}
                              {e.source && <span className="truncate text-[11.5px] text-[#64666D]">{e.source}</span>}
                              <span className="ml-auto flex shrink-0 items-center gap-2">
                                {dirty.has(e.questionId) ? <span className="ce-chip ce-chip-alt">Não salvo</span> : e.edited && <span className="ce-chip ce-chip-ed">Editado por você</span>}
                                {(e.edited || dirty.has(e.questionId)) && (
                                  <button type="button" className="ce-restaurar" onClick={() => restore(e)}>
                                    <RotateCcw className="h-3.5 w-3.5" aria-hidden /> Restaurar original
                                  </button>
                                )}
                              </span>
                            </div>
                            <div
                              ref={(el) => {
                                if (el) editors.current.set(e.questionId, el);
                                else editors.current.delete(e.questionId);
                              }}
                              className="ce-editor"
                              contentEditable
                              suppressContentEditableWarning
                              role="textbox"
                              aria-multiline="true"
                              aria-label={`Justificativa: ${[g.subject, t.theme, p.topic].filter(Boolean).join(" › ")}${e.code ? ` (${e.code})` : ""}`}
                              spellCheck
                              data-questao={e.questionId}
                              dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(e.html) }}
                              onFocus={(ev) => {
                                lastEditor.current = ev.currentTarget;
                                setFocusedId(e.questionId);
                              }}
                              onBlur={() => setFocusedId(null)}
                              onInput={(ev) => markDirty(e.questionId, ev.currentTarget.innerHTML)}
                              onPaste={(ev) => {
                                ev.preventDefault();
                                const html = ev.clipboardData.getData("text/html");
                                const text = ev.clipboardData.getData("text/plain");
                                const clean = html ? sanitizeRichHtml(html) : text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>");
                                document.execCommand("insertHTML", false, clean);
                                markDirty(e.questionId, ev.currentTarget.innerHTML);
                              }}
                            />
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
          {confirmClose ? (
            <div className="flex w-full flex-wrap items-center gap-2" role="alert">
              <p className="mr-auto text-[13px] font-semibold text-[#08090B]">Você tem alterações não salvas.</p>
              <button type="button" className="ce-sec" onClick={onClose}>
                Sair sem salvar
              </button>
              <button type="button" className="pc-botao" onClick={() => void save().then(() => edits.current.size === 0 && onClose())} disabled={saving}>
                <Save className="h-4 w-4" aria-hidden /> Salvar e fechar
              </button>
            </div>
          ) : (
            <>
              <p className={`mr-auto text-[12.5px] ${status?.kind === "erro" ? "font-semibold text-[#B9000B]" : "text-[#64666D]"}`} role="status" data-testid="caderno-erros-status">
                {status?.text ?? (pending ? `${pending} ${pending === 1 ? "alteração não salva" : "alterações não salvas"}` : data && entries.length ? "Edite as justificativas do seu jeito e salve." : "")}
              </p>
              <button type="button" className="ce-sec" onClick={requestClose}>
                Fechar
              </button>
              <button type="button" className="pc-botao" onClick={() => void save()} disabled={!pending || saving} data-testid="caderno-erros-salvar">
                <Save className="h-4 w-4" aria-hidden /> {saving ? "Salvando…" : "Salvar"}
              </button>
            </>
          )}
        </footer>
      </div>
    </div>,
    document.body,
  );
}

function Tool({ label, on, expanded, onClick, children }: { label: string; on?: boolean; expanded?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" className={`ce-tool ${on ? "is-on" : ""}`} aria-label={label} title={label} aria-pressed={expanded === undefined ? !!on : undefined} aria-expanded={expanded} onClick={onClick}>
      <span aria-hidden>{children}</span>
    </button>
  );
}
