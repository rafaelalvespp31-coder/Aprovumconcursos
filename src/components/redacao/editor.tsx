"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileUp, Send, Trash2, Save } from "lucide-react";
import { MODALIDADES, BANCAS } from "@/domain/redacao/rubricas";
import { MAX_CHARS, MIN_WORDS, contar, linhasEstimadas, validarParaEnvio } from "@/domain/redacao/texto";
import { enviarAction, extrairArquivoAction, salvarRascunhoAction } from "@/app/(app)/redacao/actions";
import { Aviso } from "./ui";

export interface EditorInicial {
  id: string | null;
  themeId: string | null;
  themeTitle: string | null;
  themeText: string | null;
  title: string;
  body: string;
  modality: string;
  board: string | null;
  contest: string | null;
  criteriaText: string | null;
  lineLimit: number | null;
  parentId: string | null;
}

const campo = "w-full rounded-[10px] border border-[#D9DBE0] bg-white px-3 py-2 text-[14px] text-[#08090B] outline-none focus:border-[#E50914] focus:ring-2 focus:ring-[#E50914]/15";

export function Editor({ inicial, temaDaProposta }: { inicial: EditorInicial; temaDaProposta: boolean }) {
  const router = useRouter();
  const [s, setS] = useState(inicial);
  const [msg, setMsg] = useState<{ tom: "info" | "erro" | "alerta"; texto: string } | null>(null);
  const [salvo, setSalvo] = useState<"salvo" | "alterado" | "salvando" | "erro">(inicial.id ? "salvo" : "alterado");
  const [confirmaLimpar, setConfirmaLimpar] = useState(false);
  const [pend, start] = useTransition();
  const idRef = useRef(inicial.id);
  const versao = useRef(0);
  const arquivoRef = useRef<HTMLInputElement>(null);

  const c = contar(s.body);
  const linhas = linhasEstimadas(s.body);
  const enem = s.modality === "enem";

  const payload = useCallback(
    (x: EditorInicial) => ({ id: idRef.current ?? undefined, themeId: x.themeId, themeTitle: x.themeTitle, themeText: x.themeText, title: x.title, body: x.body, modality: x.modality, board: x.board, contest: x.contest, criteriaText: x.criteriaText, lineLimit: x.lineLimit }),
    [],
  );

  const salvar = useCallback(
    async (x: EditorInicial): Promise<string | null> => {
      setSalvo("salvando");
      const r = await salvarRascunhoAction(payload(x)).catch(() => null);
      if (!r || !r.ok) {
        setSalvo("erro");
        if (r && !r.ok) setMsg({ tom: "erro", texto: r.error });
        return null;
      }
      idRef.current = r.id;
      setSalvo("salvo");
      window.history.replaceState(null, "", `/redacao/escrever?id=${r.id}`);
      return r.id;
    },
    [payload],
  );

  // Salvamento automático do rascunho (2,5 s depois da última alteração).
  useEffect(() => {
    if (!versao.current) return;
    if (!s.body.trim() && !s.title.trim()) return;
    const v = versao.current;
    const t = setTimeout(() => {
      if (v === versao.current) void salvar(s);
    }, 2500);
    return () => clearTimeout(t);
  }, [s, salvar]);

  const mudar = (patch: Partial<EditorInicial>) => {
    versao.current += 1;
    setSalvo("alterado");
    setS((p) => ({ ...p, ...patch }));
  };

  const salvarAgora = () =>
    start(async () => {
      const id = await salvar(s);
      if (id) setMsg({ tom: "info", texto: "Rascunho salvo." });
    });

  const enviar = () => {
    const v = validarParaEnvio(s.body);
    if (!v.ok) return setMsg({ tom: "alerta", texto: v.error });
    setMsg(null);
    start(async () => {
      const r = await enviarAction(payload(s)).catch(() => null);
      if (!r || !r.ok) return setMsg({ tom: "erro", texto: r && !r.ok ? r.error : "Não foi possível enviar agora." });
      router.push(`/redacao/${r.id}`);
    });
  };

  const arquivo = (f: File | undefined) => {
    if (!f) return;
    const form = new FormData();
    form.set("arquivo", f);
    start(async () => {
      const r = await extrairArquivoAction(form).catch(() => null);
      if (!r || !r.ok) return setMsg({ tom: "erro", texto: r && !r.ok ? r.error : "Não foi possível ler o arquivo." });
      mudar({ body: r.texto });
      setMsg({ tom: "alerta", texto: `Texto extraído do PDF${r.truncado ? " (cortado em 12.000 caracteres)" : ""}. Confira e corrija o conteúdo abaixo antes de enviar.` });
    });
    if (arquivoRef.current) arquivoRef.current.value = "";
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]" data-testid="redacao-editor">
      <section className="pc flex min-w-0 flex-col gap-3 p-4 sm:p-5">
        {s.parentId && <Aviso>Você está reescrevendo uma redação já corrigida. A versão anterior continua guardada no histórico.</Aviso>}
        <label className="block">
          <span className="mb-1 block text-[12px] font-bold uppercase tracking-[0.05em] text-[#64666D]">Título</span>
          <input className={campo} value={s.title} maxLength={200} onChange={(e) => mudar({ title: e.target.value })} placeholder="Título da redação (opcional)" data-testid="redacao-titulo" />
        </label>
        <label className="block">
          <span className="mb-1 flex items-center justify-between text-[12px] font-bold uppercase tracking-[0.05em] text-[#64666D]">
            <span>Sua redação</span>
            <span className="font-medium normal-case tracking-normal text-[#8A8C93]">
              {salvo === "salvando" ? "Salvando…" : salvo === "salvo" ? "Rascunho salvo" : salvo === "erro" ? "Falha ao salvar" : "Alterações não salvas"}
            </span>
          </span>
          <textarea className={`${campo} min-h-[420px] resize-y leading-relaxed`} value={s.body} onChange={(e) => mudar({ body: e.target.value })} placeholder="Escreva aqui. Separe os parágrafos com uma linha em branco ou quebra de linha." data-testid="redacao-texto" aria-describedby="redacao-contagem" />
        </label>
        <div id="redacao-contagem" className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px] text-[#3A3C42]" data-testid="redacao-contagem">
          <span><b>{c.words}</b> palavras</span>
          <span><b>{c.chars.toLocaleString("pt-BR")}</b> / {MAX_CHARS.toLocaleString("pt-BR")} caracteres</span>
          <span title="Estimativa: não é a contagem oficial de linhas de nenhuma prova"><b>~{linhas}</b> linhas (estimado)</span>
          {c.words < MIN_WORDS && <span className="text-[#B45309]">Mínimo de {MIN_WORDS} palavras para corrigir</span>}
          {s.lineLimit ? <span>Limite informado: {s.lineLimit} linhas</span> : null}
        </div>
        {msg && <Aviso tom={msg.tom}>{msg.texto}</Aviso>}
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={enviar} disabled={pend} className="pc-botao" data-testid="redacao-enviar">
            <Send className="h-4 w-4" aria-hidden /> {pend ? "Enviando…" : "Enviar para correção"}
          </button>
          <button type="button" onClick={salvarAgora} disabled={pend} className="mentor-sec inline-flex items-center gap-1.5">
            <Save className="h-4 w-4" aria-hidden /> Salvar
          </button>
          <button type="button" onClick={() => arquivoRef.current?.click()} disabled={pend} className="mentor-sec inline-flex items-center gap-1.5">
            <FileUp className="h-4 w-4" aria-hidden /> Importar PDF
          </button>
          <input ref={arquivoRef} type="file" accept="application/pdf,.pdf" className="sr-only" onChange={(e) => arquivo(e.target.files?.[0])} aria-label="Importar PDF" />
          {!confirmaLimpar ? (
            <button type="button" onClick={() => setConfirmaLimpar(true)} disabled={!s.body} className="mentor-dispensar ml-auto">
              <Trash2 className="h-3.5 w-3.5" aria-hidden /> Limpar texto
            </button>
          ) : (
            <span className="ml-auto flex items-center gap-2 text-[13px]" role="alertdialog" aria-label="Confirmar limpeza">
              Apagar todo o texto?
              <button type="button" className="font-bold text-[#E50914]" onClick={() => { mudar({ body: "" }); setConfirmaLimpar(false); }}>Sim, limpar</button>
              <button type="button" className="font-semibold text-[#64666D]" onClick={() => setConfirmaLimpar(false)}>Cancelar</button>
            </span>
          )}
        </div>
      </section>

      <aside className="flex min-w-0 flex-col gap-3">
        <section className="pc p-4">
          <h2 className="mb-2 text-[13px] font-extrabold text-[#08090B]">Modalidade de avaliação</h2>
          <select className={campo} value={s.modality} onChange={(e) => mudar({ modality: e.target.value })} aria-label="Modalidade" data-testid="redacao-modalidade">
            {MODALIDADES.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
          </select>
          {!enem && (
            <div className="mt-3 flex flex-col gap-2">
              <select className={campo} value={s.board ?? ""} onChange={(e) => mudar({ board: e.target.value || null })} aria-label="Banca">
                <option value="">Banca (opcional)</option>
                {BANCAS.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
              <input className={campo} value={s.contest ?? ""} maxLength={160} onChange={(e) => mudar({ contest: e.target.value || null })} placeholder="Concurso e cargo (opcional)" />
              <input className={campo} type="number" min={1} max={200} value={s.lineLimit ?? ""} onChange={(e) => mudar({ lineLimit: e.target.value ? Number(e.target.value) : null })} placeholder="Limite de linhas da prova (opcional)" />
              <details className="rounded-[10px] border border-[#E6E7EB] p-2">
                <summary className="cursor-pointer text-[12.5px] font-semibold text-[#3A3C42]">Critérios do edital / espelho de correção</summary>
                <p className="mt-2 text-[12px] text-[#64666D]">Cole os critérios oficiais com a pontuação de cada um. Quando informados, a correção segue o que está escrito ali.</p>
                <textarea className={`${campo} mt-2 min-h-[120px] text-[13px]`} value={s.criteriaText ?? ""} maxLength={8000} onChange={(e) => mudar({ criteriaText: e.target.value || null })} placeholder="Ex.: Domínio do tema — 10 pontos…" />
              </details>
            </div>
          )}
          {!enem && !s.criteriaText && <p className="mt-2 text-[12px] text-[#64666D]">Sem os critérios do edital, a nota é uma <b>estimativa pedagógica</b> e pode não reproduzir a correção oficial da banca.</p>}
          {enem && <p className="mt-2 text-[12px] text-[#64666D]">As 5 competências do ENEM (0 a 200 cada). Nota pedagógica, não a oficial do INEP.</p>}
        </section>
        <section className="pc p-4" data-testid="redacao-tema-box">
          <h2 className="mb-2 text-[13px] font-extrabold text-[#08090B]">Tema</h2>
          {temaDaProposta ? (
            <>
              <p className="text-[14px] font-bold leading-snug text-[#08090B]">{s.themeTitle}</p>
              <details className="mt-2">
                <summary className="cursor-pointer text-[12.5px] font-semibold text-[#E50914]">Ler a proposta completa</summary>
                <p className="mt-2 whitespace-pre-line text-[13px] leading-relaxed text-[#2B2D33]">{s.themeText}</p>
              </details>
            </>
          ) : (
            <>
              <input className={campo} value={s.themeTitle ?? ""} maxLength={300} onChange={(e) => mudar({ themeTitle: e.target.value || null })} placeholder="Tema livre (recomendado)" />
              <textarea className={`${campo} mt-2 min-h-[90px] text-[13px]`} value={s.themeText ?? ""} maxLength={6000} onChange={(e) => mudar({ themeText: e.target.value || null })} placeholder="Cole aqui a proposta/comando da prova, se houver." />
              <Link href="/redacao/temas" className="mt-2 inline-block text-[12.5px] font-semibold text-[#E50914]">Pedir um tema ao professor →</Link>
            </>
          )}
        </section>
      </aside>
    </div>
  );
}
