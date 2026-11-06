"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { PrepEvent, PrepSummary } from "@/server/services/edital";
import { DeletePrep } from "./delete-prep";
import "./aprovum-ai.css";

/** Mensagens oficiais de cada etapa — só aparecem quando a etapa de verdade começa/termina. */
const STEPS = [
  { key: "recebendo", short: "Recebimento", msg: "Recebendo documento operacional…" },
  { key: "lendo", short: "Leitura", msg: "Iniciando leitura estrutural do edital…" },
  { key: "identificando", short: "Conteúdo", msg: "Identificando disciplinas e conteúdos exigidos…" },
  { key: "mapeando", short: "Catálogo", msg: "Conectando conteúdos do edital à base de conhecimento APROVUM…" },
  { key: "organizando", short: "Organização", msg: "Organizando sua preparação personalizada…" },
  { key: "concluido", short: "Finalização", msg: "Preparação estruturada com sucesso." },
] as const;

const RUNNING = new Set(["recebendo", "lendo", "identificando", "mapeando", "organizando"]);
const hhmmss = (iso: string) => new Date(iso).toLocaleTimeString("pt-BR", { hour12: false });

async function call<T>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, { method: "POST", ...init });
  const j = (await r.json().catch(() => ({}))) as T & { error?: string; code?: string };
  if (!r.ok) throw Object.assign(new Error(j.error ?? "Falha na comunicação."), { code: j.code });
  return j;
}

export function Processing({ initial, initialEvents }: { initial: PrepSummary; initialEvents: PrepEvent[] }) {
  const [prep, setPrep] = useState(initial);
  const [events, setEvents] = useState(initialEvents);
  const [net, setNet] = useState<string | null>(null);
  const [pulse, setPulse] = useState(0);
  const [manual, setManual] = useState("");
  const [busy, setBusy] = useState(false);
  const last = useRef(initialEvents.at(-1)?.id ?? 0);
  const inflight = useRef(false);
  const term = useRef<HTMLDivElement>(null);

  const apply = useCallback((res: { prep: PrepSummary; events: PrepEvent[] }) => {
    setPrep(res.prep);
    if (res.events.length) {
      setEvents((cur) => {
        const seen = new Set(cur.map((e) => e.id));
        return [...cur, ...res.events.filter((e) => !seen.has(e.id))];
      });
      last.current = Math.max(last.current, ...res.events.map((e) => e.id));
      setPulse((n) => n + 1);
    }
  }, []);

  // Cada chamada executa UMA etapa real no servidor; só avança quando ela termina.
  useEffect(() => {
    if (!RUNNING.has(prep.status) || inflight.current || net) return;
    inflight.current = true;
    call<{ prep: PrepSummary; events: PrepEvent[] }>(`/api/edital/${prep.id}/avancar?depois=${last.current}`)
      .then(apply)
      .catch((e: Error) => setNet(e.message))
      .finally(() => {
        inflight.current = false;
      });
  }, [prep.status, prep.id, apply, net]);

  useEffect(() => {
    term.current?.scrollTo({ top: term.current.scrollHeight, behavior: "smooth" });
  }, [events.length]);

  const retomar = async () => {
    setBusy(true);
    try {
      setNet(null);
      if (prep.status === "erro") apply(await call(`/api/edital/${prep.id}/retomar`));
    } catch (e) {
      setNet((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const enviarManual = async () => {
    setBusy(true);
    try {
      setNet(null);
      apply(await call(`/api/edital/${prep.id}/manual`, { headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: manual }) }));
    } catch (e) {
      setNet((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const done = prep.status === "concluido";
  const failed = prep.status === "erro";
  const needsReview = prep.status === "conferencia";
  const stepIdx = done ? 5 : Math.max(0, STEPS.findIndex((s) => s.key === (failed || needsReview ? (prep.stats.failedAt ?? (needsReview ? "identificando" : "recebendo")) : prep.status)));
  const completed = done ? 6 : stepIdx; // etapas realmente concluídas
  const s = prep.stats;
  const num = (v: number | undefined) => (v === undefined ? "—" : v.toLocaleString("pt-BR"));

  if (done) return <Result prep={prep} />;

  return (
    <div className="ai-stage ai-root" data-testid="ai-processando" role="region" aria-label="Processamento do edital">
      <div className="ai-bar">
        <span>APROVUM AI · INTELLIGENCE SYSTEM</span>
        <Link href="/aprovum-ai">Sair</Link>
      </div>
      <div className="ai-main">
        <div className="ai-skull" data-pulse={pulse ? pulse : undefined} key={`s${pulse}`} aria-hidden>
          <div className="ai-halo" />
          <div className="ai-ring" />
          <div className="ai-ring b" />
          <div className="ai-dots">{Array.from({ length: 8 }, (_, i) => <i key={i} />)}</div>
          {/* Caveira oficial APROVUM, sem alterações. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/aprovum-mark.png" alt="" width={180} height={180} />
          {!failed && !needsReview && <div className="ai-scan" />}
        </div>

        <div className="ai-now" role="status" aria-live="polite">
          <small>
            {failed ? "PROCESSAMENTO INTERROMPIDO" : needsReview ? "CONFERÊNCIA NECESSÁRIA" : `ETAPA ${String(stepIdx + 1).padStart(2, "0")} DE 06`}
          </small>
          <h1>{failed ? (prep.error ?? "Algo deu errado.") : needsReview ? "Preciso da sua conferência para continuar." : STEPS[stepIdx]!.msg}</h1>
        </div>

        <div className="ai-prog" data-run={!failed && !needsReview ? 1 : undefined} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round((completed / 6) * 100)} aria-label="Progresso do processamento">
          <i style={{ width: `${(completed / 6) * 100}%` }} />
        </div>

        <ol className="ai-steps" aria-label="Etapas">
          {STEPS.map((st, i) => (
            <li key={st.key} className="ai-step" data-s={i < completed ? "done" : i === stepIdx ? (failed || needsReview ? "bad" : "now") : "wait"} aria-current={i === stepIdx ? "step" : undefined}>
              <em>{String(i + 1).padStart(2, "0")}</em>
              {st.short}
            </li>
          ))}
        </ol>

        <div className="ai-counts">
          <div className="ai-count"><b>{num(s.disciplines)}</b><span>DISCIPLINAS</span></div>
          <div className="ai-count"><b>{num(s.topics)}</b><span>TÓPICOS</span></div>
          <div className="ai-count"><b>{num(s.lessons)}</b><span>AULAS LOCALIZADAS</span></div>
          <div className="ai-count" data-warn={(s.pendentes ?? 0) + (s.conferencia ?? 0) > 0 ? 1 : undefined}><b>{s.pendentes === undefined ? "—" : ((s.pendentes ?? 0) + (s.conferencia ?? 0)).toLocaleString("pt-BR")}</b><span>PENDENTES / CONFERÊNCIA</span></div>
        </div>

        <div className="ai-term" ref={term} role="log" aria-label="Histórico de operações" tabIndex={0}>
          {events.map((e) => (
            <p key={e.id} data-l={e.level}><time>{hhmmss(e.at)}</time><span>{e.message}</span></p>
          ))}
          {!failed && !needsReview && <p className="ai-cursor"><span>&nbsp;</span></p>}
        </div>

        {net && <p className="ai-msg" role="alert">{net}</p>}

        {(failed || net) && (
          <div className="ai-actions">
            {code(prep) === "reupload" || ["upload_missing", "not_pdf", "hash_mismatch"].includes(prep.stats.errorCode ?? "") ? (
              <Link href="/aprovum-ai" className="ai-go">ENVIAR O PDF NOVAMENTE</Link>
            ) : (
              <button type="button" className="ai-go" onClick={retomar} disabled={busy}>{busy ? "RETOMANDO…" : "RETOMAR DE ONDE PAROU"}</button>
            )}
            <Link href="/aprovum-ai" className="ai-ghost" style={{ textAlign: "center", lineHeight: "44px" }}>Voltar</Link>
            <DeletePrep id={prep.id} redirectTo="/aprovum-ai" />
          </div>
        )}

        {needsReview && s.notEdital && (
          <div className="ai-actions">
            <p style={{ fontSize: 14, color: "#e5e7eb", lineHeight: 1.5 }}>
              <b>Este arquivo não parece ser um edital.</b> Não encontrei inscrições, cargos, vagas ou banca, então não há conteúdo programático para destrinchar. Envie o PDF do edital oficial do concurso.
            </p>
            <Link href="/aprovum-ai" className="ai-go" style={{ textDecoration: "none" }}>ENVIAR O EDITAL CORRETO</Link>
            <DeletePrep id={prep.id} redirectTo="/aprovum-ai" />
            <details className="ai-more">
              <summary>Prefiro colar o conteúdo programático</summary>
              <textarea className="ai-area" value={manual} onChange={(e) => setManual(e.target.value)} placeholder={"DIREITO PENAL\n1 Princípios básicos\n2 Aplicação da lei penal"} aria-label="Conteúdo programático" data-testid="ai-manual" />
              <button type="button" className="ai-go" disabled={busy || manual.trim().length < 20} onClick={enviarManual}>{busy ? "ORGANIZANDO…" : "CONTINUAR COM ESTE CONTEÚDO"}</button>
            </details>
          </div>
        )}

        {needsReview && !s.notEdital && (
          <div className="ai-actions">
            <p style={{ fontSize: 13.5, color: "#c4c8cf", lineHeight: 1.5 }}>
              {prep.error ?? s.warnings?.[0] ?? "Não localizei o conteúdo programático com segurança."} Cole abaixo só o conteúdo programático do edital: o nome de cada disciplina em uma linha e, embaixo, os assuntos numerados (1, 1.1, 2…).
            </p>
            <textarea className="ai-area" value={manual} onChange={(e) => setManual(e.target.value)} placeholder={"DIREITO PENAL\n1 Princípios básicos\n2 Aplicação da lei penal\n\nLÍNGUA PORTUGUESA\n1 Compreensão e interpretação de textos"} aria-label="Conteúdo programático" data-testid="ai-manual" />
            <button type="button" className="ai-go" disabled={busy || manual.trim().length < 20} onClick={enviarManual}>{busy ? "ORGANIZANDO…" : "CONTINUAR COM ESTE CONTEÚDO"}</button>
            <DeletePrep id={prep.id} redirectTo="/aprovum-ai" />
          </div>
        )}
      </div>
    </div>
  );
}

const code = (p: PrepSummary) => p.stats.errorCode;

function Result({ prep }: { prep: PrepSummary }) {
  const s = prep.stats;
  return (
    <div className="ai-stage ai-root" data-testid="ai-pronto">
      <div className="ai-bar">
        <span>APROVUM AI · INTELLIGENCE SYSTEM</span>
        <Link href="/aprovum-ai">Fechar</Link>
      </div>
      <div className="ai-main">
        <div className="ai-skull" aria-hidden>
          <div className="ai-halo" />
          <div className="ai-ring" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/aprovum-mark.png" alt="" width={180} height={180} />
        </div>
        <div className="ai-done">
          <small className="ai-kicker" style={{ justifyContent: "center" }}><i />PREPARAÇÃO CONCLUÍDA</small>
          <h1>Sua preparação está pronta.</h1>
          <p>O conteúdo programático foi organizado e as aulas disponíveis foram vinculadas ao seu concurso.</p>
        </div>
        <div className="ai-kpis">
          <div className="ai-kpi"><b>{s.disciplines ?? 0}</b><span>Disciplinas identificadas</span></div>
          <div className="ai-kpi"><b>{s.topics ?? 0}</b><span>Tópicos extraídos</span></div>
          <div className="ai-kpi"><b>{s.lessons ?? 0}</b><span>Aulas localizadas</span></div>
          <div className="ai-kpi"><b>{s.parcial ?? 0}</b><span>Conteúdos parcialmente cobertos</span></div>
          <div className="ai-kpi"><b>{(s.pendentes ?? 0) + (s.conferencia ?? 0)}</b><span>Conteúdos pendentes</span></div>
          <div className="ai-kpi"><b>{s.coveragePct ?? 0}%</b><span>Cobertura do catálogo</span></div>
        </div>
        <div className="ai-actions">
          <Link href={`/meu-concurso/${prep.id}`} className="ai-go" data-testid="ai-acessar">ACESSAR MINHA PREPARAÇÃO</Link>
          <Link href={`/meu-concurso/${prep.id}/relatorio`} className="ai-ghost" style={{ textAlign: "center", lineHeight: "44px" }}>Ver relatório completo do edital</Link>
        </div>
      </div>
    </div>
  );
}
