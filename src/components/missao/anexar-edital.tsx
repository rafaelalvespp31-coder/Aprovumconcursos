"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { createClient } from "@supabase/supabase-js";
import { Check, FileText, Loader2, Paperclip, X } from "lucide-react";
import type { PrepSummary } from "@/server/services/edital";
import { deletePreparationAction } from "@/app/(app)/meu-concurso/actions";
import "./anexar-edital.css";

const MAX = 25 * 1024 * 1024;
const BUCKET = "editais";
const RODANDO = new Set(["recebendo", "lendo", "identificando", "mapeando", "organizando"]);
/** Etapas reais do leitor (o servidor executa uma por chamada; nada aqui é simulado). */
const ETAPAS: Array<[string, string]> = [
  ["recebendo", "Recebendo o edital"],
  ["lendo", "Lendo o PDF"],
  ["identificando", "O especialista separa as matérias e os tópicos"],
  ["mapeando", "Cruzando com as aulas do Aprovum"],
  ["organizando", "Organizando a sua preparação"],
];
const REENVIAR = new Set(["upload_missing", "not_pdf", "hash_mismatch"]);

type Etapa = "enviando" | "lendo" | "conferencia" | "erro" | "pronto";

const tamanho = (n: number) => (n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

async function sha256(file: File): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function chamar<T>(url: string, corpo?: unknown): Promise<T> {
  const r = await fetch(url, { method: "POST", ...(corpo !== undefined ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(corpo) } : {}) });
  const j = (await r.json().catch(() => ({}))) as T & { error?: string };
  if (!r.ok) throw new Error(j.error ?? "Falha na comunicação. Tente de novo.");
  return j;
}

export interface AnexarEditalProps {
  /** O edital foi lido e tem disciplinas: a tela leva o aluno à página do conteúdo programático completo. */
  onLido: (editalId: string) => void;
  /** Avisa a tela quando o fluxo começa (ela encerra a conversa por voz). */
  onIniciar?: () => void;
  desabilitado?: boolean;
}

/**
 * "Anexar edital": o aluno escolhe o PDF, o leitor extrai as disciplinas e os tópicos do conteúdo programático
 * (mesmo leitor do Aprovum AI) e o plano passa a seguir esse edital. Cargo, texto colado e erros são tratados aqui.
 */
export function AnexarEdital({ onLido, onIniciar, desabilitado = false }: AnexarEditalProps) {
  const entrada = useRef<HTMLInputElement>(null);
  const titulo = useRef<HTMLHeadingElement>(null);
  const rodada = useRef(0); // invalida laços antigos (cancelar, novo envio, desmontar)
  const [aberto, setAberto] = useState(false);
  const [alvo, setAlvo] = useState<Element | null>(null); // a tela inteira (.cm): o painel cobre tudo, não só o formulário
  const [etapa, setEtapa] = useState<Etapa>("enviando");
  const [nomeArquivo, setNomeArquivo] = useState("");
  const [msg, setMsg] = useState("Verificando o arquivo…");
  const [prep, setPrep] = useState<PrepSummary | null>(null);
  const [prepId, setPrepId] = useState<string | null>(null);
  const [detalhe, setDetalhe] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [cargo, setCargo] = useState("");
  const [texto, setTexto] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [arrasto, setArrasto] = useState(false);

  useEffect(() => () => { rodada.current++; }, []);
  useEffect(() => { if (aberto) titulo.current?.focus(); }, [aberto, etapa]);

  const concluir = useCallback(
    (p: PrepSummary, minha: number) => {
      if (rodada.current !== minha) return;
      setEtapa("pronto");
      onLido(p.id);
    },
    [onLido],
  );

  /** Executa as etapas reais, uma chamada por vez, até terminar ou pedir ação do aluno. */
  const ler = useCallback(
    async (id: string, minha: number) => {
      try {
        setEtapa("lendo");
        let ultimo = 0;
        for (let i = 0; i < 150; i++) {
          const r = await chamar<{ prep: PrepSummary; events?: Array<{ id: number; message: string }> }>(`/api/edital/${id}/avancar?depois=${ultimo}`);
          if (rodada.current !== minha) return;
          setPrep(r.prep);
          for (const ev of r.events ?? []) ultimo = Math.max(ultimo, ev.id);
          const novo = r.events?.length ? r.events[r.events.length - 1]!.message : null;
          if (novo) setDetalhe(novo);
          if (RODANDO.has(r.prep.status)) continue;
          if (r.prep.status === "concluido") {
            if ((r.prep.stats.disciplines ?? 0) > 0) return concluir(r.prep, minha);
            setAviso("Não encontrei disciplinas neste edital.");
            return setEtapa("conferencia");
          }
          if (r.prep.status === "conferencia") { setAviso(r.prep.error ?? r.prep.stats.warnings?.[0] ?? null); return setEtapa("conferencia"); }
          setErro(r.prep.error ?? "Não foi possível ler o edital.");
          return setEtapa("erro");
        }
        setErro("A leitura está demorando mais que o normal. Tente retomar.");
        setEtapa("erro");
      } catch (e) {
        if (rodada.current !== minha) return;
        setErro((e as Error).message);
        setEtapa("erro");
      }
    },
    [concluir],
  );

  const anexar = useCallback(
    async (file: File) => {
      const minha = ++rodada.current;
      onIniciar?.();
      setAlvo(entrada.current?.closest(".cm") ?? document.body);
      setAberto(true);
      setEtapa("enviando");
      setNomeArquivo(file.name);
      setPrep(null); setPrepId(null); setDetalhe(null); setErro(null); setAviso(null); setCargo(""); setTexto("");
      try {
        setMsg("Verificando o arquivo…");
        const hash = await sha256(file);
        if (rodada.current !== minha) return;
        setMsg("Enviando o edital…");
        const j = await chamar<{ id?: string; upload?: { path: string; token: string } | null }>("/api/edital", { fileName: file.name, size: file.size, hash });
        if (!j.id) throw new Error("Não foi possível iniciar o envio.");
        if (j.upload) {
          const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
          const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
          if (!url || !key) throw new Error("Envio indisponível no momento.");
          const sb = createClient(url, key, { auth: { persistSession: false } });
          const up = await sb.storage.from(BUCKET).uploadToSignedUrl(j.upload.path, j.upload.token, file, { contentType: "application/pdf" });
          if (up.error) throw new Error("Falha no envio do arquivo. Verifique a conexão e tente novamente.");
        }
        if (rodada.current !== minha) return;
        setPrepId(j.id);
        await ler(j.id, minha);
      } catch (e) {
        if (rodada.current !== minha) return;
        setErro((e as Error).message || "Não foi possível enviar o edital.");
        setEtapa("erro");
      }
    },
    [ler, onIniciar],
  );

  const escolhido = (list: FileList | null | undefined) => {
    const f = list?.[0];
    if (entrada.current) entrada.current.value = "";
    if (!f) return;
    let problema: string | null = null;
    if (f.type !== "application/pdf" && !/\.pdf$/i.test(f.name)) problema = "Formato inválido. Envie o edital em PDF.";
    else if (f.size === 0) problema = "O arquivo está vazio.";
    else if (f.size > MAX) problema = `O PDF tem ${tamanho(f.size)}. O limite é 25 MB.`;
    if (problema) {
      rodada.current++;
      setAlvo(entrada.current?.closest(".cm") ?? document.body);
      setAberto(true); setNomeArquivo(f.name); setPrep(null); setPrepId(null); setDetalhe(null); setAviso(null);
      setErro(problema); setEtapa("erro");
      return;
    }
    void anexar(f);
  };

  const fechar = () => {
    rodada.current++;
    setAberto(false);
    setOcupado(false);
  };

  const acao = async (fn: () => Promise<void>) => {
    if (!prepId || ocupado) return;
    const minha = ++rodada.current;
    setOcupado(true);
    setErro(null);
    try {
      await fn();
      if (rodada.current !== minha) return;
      setAviso(null);
      await ler(prepId, minha);
    } catch (e) {
      if (rodada.current !== minha) return;
      setErro((e as Error).message);
      setEtapa("erro");
    } finally {
      setOcupado(false);
    }
  };

  const enviarCargo = () => acao(async () => { await chamar(`/api/edital/${prepId}/cargo`, { role: cargo.trim() }); });
  const enviarTexto = () => acao(async () => { await chamar(`/api/edital/${prepId}/manual`, { text: texto }); });
  const tentarDeNovo = () => acao(async () => { if (prep?.status === "erro") await chamar(`/api/edital/${prepId}/retomar`); });
  const descartar = async () => {
    const id = prepId;
    fechar();
    if (id) await deletePreparationAction(id).catch(() => undefined);
  };

  const s = prep?.stats ?? {};
  const pos = (k: string | undefined) => Math.max(0, ETAPAS.findIndex(([x]) => x === k));
  const idx = pos(prep?.status);
  const feitas = etapa === "pronto" ? ETAPAS.length : prep && RODANDO.has(prep.status) ? idx : etapa === "conferencia" || etapa === "erro" ? pos(s.failedAt ?? "identificando") : 0;
  const pct = etapa === "pronto" ? 100 : etapa === "enviando" ? 6 : Math.round((feitas / ETAPAS.length) * 100);
  const precisaCargo = etapa === "conferencia" && !!s.needRole;
  const naoEdital = etapa === "conferencia" && !s.needRole && !!s.notEdital;
  const colar = etapa === "conferencia" && !s.needRole;
  const reenviar = etapa === "erro" && (REENVIAR.has(s.errorCode ?? "") || !prepId);
  const ativo = etapa === "enviando" || etapa === "lendo" || etapa === "pronto";

  const titulos: Record<Etapa, string> = {
    enviando: "Enviando o edital",
    lendo: "Lendo o conteúdo programático",
    conferencia: precisaCargo ? "Qual é o seu cargo?" : naoEdital ? "Este arquivo não parece ser um edital" : "Preciso da sua conferência",
    erro: "Não foi possível concluir",
    pronto: "Edital lido",
  };

  return (
    <>
      <div
        className="ae-zona"
        data-arrasto={arrasto || undefined}
        onDragOver={(e) => { if (desabilitado) return; e.preventDefault(); setArrasto(true); }}
        onDragLeave={() => setArrasto(false)}
        onDrop={(e) => { e.preventDefault(); setArrasto(false); if (!desabilitado) escolhido(e.dataTransfer.files); }}
      >
        <button type="button" className="ae-botao" disabled={desabilitado} onClick={() => entrada.current?.click()} data-testid="anexar-edital">
          <Paperclip size={19} aria-hidden />
          <span>Anexar edital</span>
        </button>
        <input ref={entrada} type="file" accept="application/pdf,.pdf" hidden onChange={(e) => escolhido(e.target.files)} data-testid="anexar-edital-arquivo" aria-label="Selecionar o edital em PDF" />
        <p className="ae-dica">PDF do edital, até 25 MB. O Mentor lê o conteúdo programático e monta o seu plano.</p>
      </div>

      {aberto && alvo && createPortal(
        <div className="ae-fundo" role="dialog" aria-modal="true" aria-labelledby="ae-titulo" data-testid="anexar-edital-painel">
          <div className="ae-card">
            <button type="button" className="ae-fechar" onClick={fechar} aria-label="Fechar" disabled={etapa === "pronto"}><X size={18} aria-hidden /></button>
            <p className="ae-arquivo"><FileText size={15} aria-hidden /><span title={nomeArquivo}>{nomeArquivo}</span></p>
            <h2 id="ae-titulo" className="ae-titulo" ref={titulo} tabIndex={-1}>{titulos[etapa]}</h2>

            {ativo && (
              <div role="status" aria-live="polite">
                <div className="ae-barra" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}><i style={{ width: `${Math.max(4, pct)}%` }} /></div>
                <p className="ae-msg">
                  {etapa === "pronto" ? "Abrindo o conteúdo programático…" : etapa === "enviando" ? msg : (ETAPAS[idx]?.[1] ?? "Lendo") + "…"}
                  {etapa !== "pronto" && <Loader2 size={14} className="ae-gira" aria-hidden />}
                </p>
                {etapa !== "enviando" && (
                  <ol className="ae-etapas" aria-label="Etapas da leitura">
                    {ETAPAS.map(([k, nome], i) => (
                      <li key={k} data-s={i < feitas ? "ok" : i === feitas && etapa === "lendo" ? "agora" : "espera"}>
                        <span aria-hidden>{i < feitas ? <Check size={13} /> : i + 1}</span>{nome}
                      </li>
                    ))}
                  </ol>
                )}
                {etapa === "lendo" && detalhe && prep?.status === "identificando" && <p className="ae-detalhe" role="status" aria-live="polite">{detalhe}</p>}
                {(s.disciplines !== undefined || s.topics !== undefined) && (
                  <dl className="ae-dados">
                    <div><dt>Disciplinas</dt><dd>{(s.disciplines ?? 0).toLocaleString("pt-BR")}</dd></div>
                    <div><dt>Tópicos</dt><dd>{(s.topics ?? 0).toLocaleString("pt-BR")}</dd></div>
                  </dl>
                )}
              </div>
            )}

            {precisaCargo && (
              <div className="ae-bloco" data-testid="anexar-edital-cargo">
                <p>Este edital tem {prep?.roleOptions?.length ? `${prep.roleOptions.length} cargos` : "vários cargos"}. Escolha o seu para eu ler só o conteúdo programático dele.</p>
                <div role="radiogroup" aria-label="Cargo pretendido" className="ae-cargos">
                  {(prep?.roleOptions ?? []).map((r) => (
                    <label key={r} data-on={cargo === r || undefined}>
                      <input type="radio" name="ae-cargo" checked={cargo === r} onChange={() => setCargo(r)} />
                      <span>{r}</span>
                    </label>
                  ))}
                </div>
                <input className="ae-campo" value={prep?.roleOptions?.includes(cargo) ? "" : cargo} onChange={(e) => setCargo(e.target.value)} placeholder="Ou digite o cargo, se não estiver na lista" aria-label="Outro cargo" maxLength={160} />
                <button type="button" className="ae-primario" disabled={ocupado || cargo.trim().length < 3} onClick={() => void enviarCargo()}>{ocupado ? "Continuando…" : "Continuar com este cargo"}</button>
              </div>
            )}

            {naoEdital && (
              <div className="ae-bloco">
                <p>Não encontrei inscrições, cargos, vagas ou banca neste arquivo, então não há conteúdo programático para ler. Anexe o PDF do edital oficial do concurso.</p>
                <div className="ae-linha">
                  <button type="button" className="ae-primario" onClick={() => entrada.current?.click()}>Anexar outro edital</button>
                  <button type="button" className="ae-sec" onClick={() => void descartar()}>Descartar este envio</button>
                </div>
              </div>
            )}

            {colar && (
              <div className="ae-bloco" data-testid="anexar-edital-colar">
                <details open={!naoEdital}>
                  <summary>{naoEdital ? "Prefiro colar o conteúdo programático" : "Colar o conteúdo programático"}</summary>
                  <p>{aviso ?? "Não localizei o conteúdo programático com segurança."} Cole só o conteúdo programático do edital: o nome de cada disciplina em uma linha e, embaixo, os assuntos numerados (1, 1.1, 2…).</p>
                  <textarea className="ae-area" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder={"DIREITO PENAL\n1 Princípios básicos\n2 Aplicação da lei penal\n\nLÍNGUA PORTUGUESA\n1 Compreensão e interpretação de textos"} aria-label="Conteúdo programático" />
                  <button type="button" className="ae-primario" disabled={ocupado || texto.trim().length < 20} onClick={() => void enviarTexto()}>{ocupado ? "Organizando…" : "Continuar com este conteúdo"}</button>
                </details>
                {!naoEdital && (
                  <div className="ae-linha">
                    <button type="button" className="ae-sec" onClick={() => entrada.current?.click()}>Anexar outro PDF</button>
                    <button type="button" className="ae-sec" onClick={() => void descartar()}>Descartar este envio</button>
                  </div>
                )}
              </div>
            )}

            {etapa === "erro" && (
              <div className="ae-bloco" role="alert">
                <p className="ae-erro">{erro ?? "Algo deu errado."}</p>
                <div className="ae-linha">
                  {reenviar ? (
                    <button type="button" className="ae-primario" onClick={() => entrada.current?.click()}>Anexar o PDF de novo</button>
                  ) : (
                    <button type="button" className="ae-primario" disabled={ocupado} onClick={() => void tentarDeNovo()}>{ocupado ? "Retomando…" : "Tentar de novo"}</button>
                  )}
                  <button type="button" className="ae-sec" onClick={fechar}>Fechar</button>
                </div>
              </div>
            )}

            {(etapa === "enviando" || etapa === "lendo") && (
              <button type="button" className="ae-sec ae-cancelar" onClick={fechar}>Cancelar</button>
            )}
          </div>
        </div>,
        alvo,
      )}
    </>
  );
}
