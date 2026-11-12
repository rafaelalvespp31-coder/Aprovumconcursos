"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Activity, BookOpenText, ChevronDown, Cpu, FileSearch2, FlagTriangleRight, Inbox, Layers, ListTree, Lock, Radar, Target, TerminalSquare } from "lucide-react";
import type { PrepEvent, PrepSummary } from "@/server/services/edital";
import { DeletePrep } from "./delete-prep";
import "./aprovum-ai.css";

/**
 * Etapas reais do processamento. `now`/`done`/`wait` são as mensagens curtas dos cards — só mudam
 * quando a etapa de verdade começa ou termina (nenhuma conclusão é simulada).
 */
const STEPS = [
  { key: "recebendo", short: "Recebimento", Icon: Inbox, msg: "Recebendo documento operacional…", now: "Recebendo o edital…", done: "Edital carregado.", wait: "Aguardando…" },
  { key: "lendo", short: "Leitura", Icon: BookOpenText, msg: "Iniciando leitura estrutural do edital…", now: "Lendo o edital…", done: "Conteúdo analisado.", wait: "Aguardando…" },
  { key: "identificando", short: "Conteúdo", Icon: FileSearch2, msg: "Identificando disciplinas e conteúdos exigidos…", now: "Destrinchando o edital…", done: "Disciplinas identificadas.", wait: "Aguardando…" },
  { key: "mapeando", short: "Catálogo", Icon: Layers, msg: "Conectando conteúdos do edital à base de conhecimento APROVUM…", now: "Cruzando com o catálogo…", done: "Catálogo conectado.", wait: "Aguardando…" },
  { key: "organizando", short: "Organização", Icon: ListTree, msg: "Organizando sua preparação personalizada…", now: "Organizando a preparação…", done: "Preparação organizada.", wait: "Aguardando…" },
  { key: "concluido", short: "Finalização", Icon: FlagTriangleRight, msg: "Preparação estruturada com sucesso.", now: "Finalizando…", done: "Preparação concluída.", wait: "Aguardando…" },
] as const;

const RUNNING = new Set(["recebendo", "lendo", "identificando", "mapeando", "organizando"]);
const hhmmss = (iso: string) => new Date(iso).toLocaleTimeString("pt-BR", { hour12: false });

async function call<T>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, { method: "POST", ...init });
  const j = (await r.json().catch(() => ({}))) as T & { error?: string; code?: string };
  if (!r.ok) throw Object.assign(new Error(j.error ?? "Falha na comunicação."), { code: j.code });
  return j;
}

/** Número com contagem progressiva ao mudar de valor (respeita "reduzir movimento"). */
function Num({ value }: { value: number | undefined }) {
  const [shown, setShown] = useState(value ?? 0);
  const from = useRef(value ?? 0);
  useEffect(() => {
    if (value === undefined) return;
    const target = value;
    const start = from.current;
    if (start === target) return;
    const instant = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t0 = performance.now();
    const dur = instant ? 0 : 600;
    let raf = 0;
    const tick = (t: number) => {
      const k = dur === 0 ? 1 : Math.min(1, (t - t0) / dur);
      const e = 1 - Math.pow(1 - k, 3);
      setShown(Math.round(start + (target - start) * e));
      if (k < 1) raf = requestAnimationFrame(tick);
      else from.current = target;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  if (value === undefined) return <>—</>;
  return <>{shown.toLocaleString("pt-BR")}</>;
}

export function Processing({ initial, initialEvents }: { initial: PrepSummary; initialEvents: PrepEvent[] }) {
  const [prep, setPrep] = useState(initial);
  const [events, setEvents] = useState(initialEvents);
  const [net, setNet] = useState<string | null>(null);
  const [pulse, setPulse] = useState(0);
  const [manual, setManual] = useState(initial.programmaticText ?? "");
  const [role, setRole] = useState("");
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

  const enviarCargo = async () => {
    setBusy(true);
    try {
      setNet(null);
      apply(await call(`/api/edital/${prep.id}/cargo`, { headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role }) }));
      setRole("");
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
  const pct = Math.round((completed / 6) * 100);
  const running = !failed && !needsReview && !done;
  const s = prep.stats;

  if (done) return <Result prep={prep} />;

  const pend = s.pendentes === undefined && s.conferencia === undefined ? undefined : (s.pendentes ?? 0) + (s.conferencia ?? 0);
  // RAIO-X "em tempo real": só contadores reais que crescem conforme as etapas concluem.
  const rx: Array<{ icon: React.ReactNode; label: string; value: number | undefined; warn?: boolean }> = [
    { icon: <Layers size={16} aria-hidden />, label: "Disciplinas identificadas", value: s.disciplines },
    { icon: <ListTree size={16} aria-hidden />, label: "Tópicos mapeados", value: s.topics },
    { icon: <BookOpenText size={16} aria-hidden />, label: "Aulas localizadas", value: s.lessons },
    { icon: <FileSearch2 size={16} aria-hidden />, label: "Pendentes / conferência", value: pend, warn: (pend ?? 0) > 0 },
  ];
  // As 6 barras do gráfico refletem o avanço real das etapas (sem dados inventados).
  const bars = STEPS.map((st, i) => ({ k: String(i + 1).padStart(2, "0"), on: i < completed, h: i < completed ? 100 : i === stepIdx && running ? 55 : 16 }));

  return (
    <div className="ai-stage ai-xp ai-root" data-testid="ai-processando" role="region" aria-label="Processamento do edital">
      <div className="ai-main">
        <header className="ai-xp-head">
          <div className="ai-xp-brand">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/aprovum-mark.png" alt="" width={38} height={38} />
            <b>APROVUM <em>AI</em></b>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span className="ai-xp-chip"><Cpu size={18} aria-hidden /><span><b>APROVUM AI</b><small>INTELLIGENCE SYSTEM</small></span></span>
            <Link href="/aprovum-ai" className="ai-xp-exit">Sair</Link>
          </div>
        </header>

        <section className="ai-xp-top" aria-label="Análise do edital">
          <div className="ai-xp-intro">
            <p className="ai-kicker"><i />ANÁLISE ESTRATÉGICA DE EDITAL</p>
            <h1>{failed ? "Processamento" : needsReview ? "Precisamos" : "Analisando seu"}<em>{failed ? "interrompido" : needsReview ? "da sua conferência" : "edital…"}</em></h1>
            <p>Transformando informações em uma <em>estratégia vencedora.</em></p>
            <div className="ai-xp-stripes" aria-hidden />
          </div>
          <div className="ai-xp-stage" aria-hidden>
            <div className="ai-xp-skull">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/icons/aprovum-mark.png" alt="" width={200} height={200} />
            </div>
            <div className="ai-doc">
              <div className="ai-doc-sheet">
                <b>EDITAL</b>
                {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => <i key={i} className={running && i === (pulse % 8) ? "hi" : undefined} />)}
                <div className="ai-doc-grid" />
              </div>
              {running && <div className="ai-doc-beam" />}
            </div>
            <div className="ai-xp-base"><i /><i /><i /></div>
          </div>
        </section>

        <div className="ai-xp-status" data-run={running ? 1 : 0} role="status" aria-live="polite">
          <div className="ai-xp-badge" key={`b${pulse}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/aprovum-mark.png" alt="" width={76} height={76} />
          </div>
          <div className="ai-xp-status-txt">
            <b>{failed ? (prep.error ?? "Algo deu errado.") : needsReview ? "Preciso da sua conferência para continuar." : "Processando seu edital…"}</b>
            <span>{failed ? "Você pode retomar de onde parou." : needsReview ? "Role até as opções abaixo." : running ? STEPS[stepIdx]!.msg : "Finalizando."}</span>
          </div>
          <div className="ai-xp-pct" aria-label={`${pct}% concluído`}>{pct}<span style={{ fontSize: "0.5em" }}>%</span></div>
          <div className="ai-xp-status-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}><i style={{ width: `${Math.max(4, pct)}%` }} /></div>
        </div>

        <ol className="ai-xp-cards" aria-label="Etapas do processamento">
          {STEPS.map((st, i) => {
            const state = i < completed ? "done" : i === stepIdx ? (failed || needsReview ? "bad" : "now") : "wait";
            const St = st.Icon;
            return (
              <li key={st.key} className="ai-xp-card" data-s={state} aria-current={i === stepIdx ? "step" : undefined}>
                <span className="ai-xp-card-ico"><St size={19} aria-hidden /></span>
                <span className="ai-xp-card-n">{String(i + 1).padStart(2, "0")}</span>
                <b>{st.short}</b>
                <span className="ai-xp-card-st" aria-hidden>
                  {state === "done" ? <Check18 /> : state === "now" ? <span className="ai-xp-spin" /> : state === "bad" ? <Target size={18} /> : <Lock size={16} />}
                </span>
                <small>{state === "done" ? st.done : state === "now" ? st.now : state === "bad" ? "Requer sua ação." : st.wait}</small>
              </li>
            );
          })}
        </ol>

        <section className="ai-xp-rx" aria-label="Raio-X do edital em tempo real">
          <div className="ai-xp-rx-h"><Radar size={18} aria-hidden /><span>Raio-X do edital em tempo real</span></div>
          <div className="ai-xp-rx-grid">
            <ul className="ai-xp-rx-list">
              {rx.map((r) => (
                <li key={r.label} data-warn={r.warn ? 1 : undefined}>
                  {r.icon}
                  <span>{r.label}</span>
                  <b><Num value={r.value} /></b>
                </li>
              ))}
            </ul>
            <div className="ai-xp-rx-chart" role="img" aria-label="Avanço das etapas">
              {bars.map((b) => <i key={b.k} data-k={b.k} data-on={b.on ? 1 : 0} style={{ height: `${b.h}%` }} />)}
            </div>
          </div>
          <p className="ai-xp-rx-note">Os números acima vêm da leitura real do seu edital e aumentam conforme cada etapa é concluída. O diagnóstico estratégico completo (incidência, notas de corte e prioridades) aparece na sua preparação, com fonte, quando o concurso já foi catalogado pela equipe APROVUM.</p>
        </section>

        <details className="ai-xp-term">
          <summary><TerminalSquare size={16} aria-hidden />REGISTRO DE OPERAÇÕES<ChevronDown size={16} aria-hidden className="ai-xp-term-chev" /></summary>
          <div className="ai-term" ref={term} role="log" aria-label="Histórico de operações" tabIndex={0}>
            {events.map((e) => (
              <p key={e.id} data-l={e.level}><time>{hhmmss(e.at)}</time><span>{e.message}</span></p>
            ))}
            {running && <p className="ai-cursor"><span>&nbsp;</span></p>}
          </div>
        </details>

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

        {needsReview && s.needRole && (
          <div className="ai-actions" data-testid="ai-cargo">
            <p style={{ fontSize: 14, color: "#e5e7eb", lineHeight: 1.5 }}>
              <b>Qual é o seu cargo?</b> Este edital tem {prep.roleOptions?.length ?? "vários"} cargos. Escolha o seu para o APROVUM analisar só o que corresponde à sua função.
            </p>
            <div role="radiogroup" aria-label="Cargo pretendido" style={{ display: "grid", gap: 8 }}>
              {(prep.roleOptions ?? []).map((r) => (
                <label key={r} style={{ display: "flex", gap: 10, alignItems: "center", padding: "10px 12px", border: `1px solid ${role === r ? "#e50919" : "#3a3d44"}`, borderRadius: 10, cursor: "pointer", color: "#fff" }}>
                  <input type="radio" name="cargo" checked={role === r} onChange={() => setRole(r)} />
                  <span>{r}</span>
                </label>
              ))}
            </div>
            <input className="ai-area" style={{ minHeight: 0, height: 46 }} value={prep.roleOptions?.includes(role) ? "" : role} onChange={(e) => setRole(e.target.value)} placeholder="Ou digite o cargo, se não estiver na lista" aria-label="Outro cargo" data-testid="ai-cargo-outro" />
            <button type="button" className="ai-go" disabled={busy || role.trim().length < 3} onClick={enviarCargo}>{busy ? "CONTINUANDO…" : "CONTINUAR COM ESTE CARGO"}</button>
            <DeletePrep id={prep.id} redirectTo="/aprovum-ai" />
          </div>
        )}

        {needsReview && !s.needRole && s.notEdital && (
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

        {needsReview && !s.needRole && !s.notEdital && (
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

function Check18() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M20 6 9 17l-5-5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

const code = (p: PrepSummary) => p.stats.errorCode;

function Result({ prep }: { prep: PrepSummary }) {
  const s = prep.stats;
  const [show, setShow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShow(true), 60);
    return () => clearTimeout(t);
  }, []);
  const kpis: Array<{ v: number; label: string }> = [
    { v: s.disciplines ?? 0, label: "Disciplinas identificadas" },
    { v: s.topics ?? 0, label: "Tópicos extraídos" },
    { v: s.lessons ?? 0, label: "Aulas localizadas" },
    { v: s.parcial ?? 0, label: "Conteúdos parcialmente cobertos" },
    { v: (s.pendentes ?? 0) + (s.conferencia ?? 0), label: "Conteúdos pendentes" },
    { v: s.coveragePct ?? 0, label: "Cobertura do catálogo (%)" },
  ];
  return (
    <div className="ai-stage ai-xp ai-root" data-testid="ai-pronto">
      <div className="ai-main" style={{ justifyItems: "center", textAlign: "center" }}>
        <header className="ai-xp-head" style={{ width: "100%" }}>
          <div className="ai-xp-brand">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/aprovum-mark.png" alt="" width={38} height={38} />
            <b>APROVUM <em>AI</em></b>
          </div>
          <Link href="/aprovum-ai" className="ai-xp-exit">Fechar</Link>
        </header>
        <div className="ai-xp-skull" style={{ position: "relative", width: "min(46vw, 210px)", margin: "6px auto 0", inset: "auto" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/aprovum-mark.png" alt="" width={180} height={180} />
        </div>
        <div className="ai-done">
          <small className="ai-kicker" style={{ justifyContent: "center" }}><i />PREPARAÇÃO CONCLUÍDA</small>
          <h1>Sua preparação está pronta.</h1>
          <p>O conteúdo programático foi organizado e as aulas disponíveis foram vinculadas ao seu concurso.</p>
        </div>
        <div className="ai-kpis" style={{ width: "100%", maxWidth: 760 }}>
          {kpis.map((k) => (
            <div className="ai-kpi" key={k.label}><b>{show ? <Num value={k.v} /> : 0}</b><span>{k.label}</span></div>
          ))}
        </div>
        <div className="ai-actions" style={{ width: "100%", maxWidth: 480 }}>
          <Link href={`/meu-concurso/${prep.id}`} className="ai-go" data-testid="ai-acessar"><Activity size={18} aria-hidden style={{ marginRight: 2 }} />ACESSAR MINHA PREPARAÇÃO</Link>
          <Link href={`/meu-concurso/${prep.id}/relatorio`} className="ai-ghost" style={{ textAlign: "center", lineHeight: "44px" }}>Ver relatório completo do edital</Link>
        </div>
      </div>
    </div>
  );
}
