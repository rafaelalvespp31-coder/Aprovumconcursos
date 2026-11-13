"use client";

import { AlertTriangle, Briefcase, CalendarClock, ChevronDown, ChevronLeft, ChevronRight, Clock, ExternalLink, MapPin, Users, Wallet } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from "react";

export interface ContestView {
  id: string;
  name: string;
  institution: string;
  roleName: string | null;
  statusLabel: string;
  vacancies: number | null;
  salary: string | null;
  examDate: string | null;
  examDateConfirmed: boolean;
  infoConfirmed: boolean;
  sourceName: string;
  sourceUrl: string | null;
  updatedLabel: string;
  examLabel: string | null;
  imageUrl: string | null;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Tempo até a prova (meia-noite de Brasília do dia da prova). */
function remaining(examDate: string, now: number) {
  const ms = Date.parse(`${examDate}T00:00:00-03:00`) - now;
  if (!(ms > 0)) return null;
  const s = Math.floor(ms / 1000);
  return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
}

function Unit({ v, label }: { v: string; label: string }) {
  return (
    <div className="cc-un">
      {/* a chave faz o número "virar" (animação) a cada mudança */}
      <b key={v} className="cc-num">{v}</b>
      <span>{label}</span>
    </div>
  );
}

const AUTO_MS = 9000;

/** Número que conta de 0 até o valor quando o concurso entra em cena (o HTML do servidor já traz o valor final). */
function CountUp({ value }: { value: number }) {
  const [shown, setShown] = useState(value);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t0 = performance.now();
    let raf = requestAnimationFrame(function tick(t) {
      const k = Math.min(1, (t - t0) / 900);
      setShown(Math.round(value * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <>{shown.toLocaleString("pt-BR")}</>;
}

/**
 * Próximos concursos: carrossel que troca sozinho (pausa ao tocar, focar ou abrir detalhes), gesto de
 * arrastar no celular, setas e teclado, contagem regressiva ao vivo, arte com inclinação 3D e detalhes
 * que abrem ao clicar. Só mostra dados cadastrados; o que não foi confirmado aparece sinalizado.
 */
export function ContestCard({ contests, serverDays }: { contests: ContestView[]; serverDays: Array<number | null> }) {
  const [i, setI] = useState(0);
  const [open, setOpen] = useState(false);
  const [wide, setWide] = useState(false);
  const [now, setNow] = useState<number | null>(null);
  const [paused, setPaused] = useState(false);
  const [dir, setDir] = useState<1 | -1>(1);
  const root = useRef<HTMLDivElement>(null);
  const art = useRef<HTMLSpanElement>(null);
  const swipe = useRef<{ x: number; y: number } | null>(null);
  const n = contests.length;
  // Card largo (faixa inteira no desktop): todas as informações já ficam à mostra.
  useEffect(() => {
    const el = root.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([e]) => setWide((e?.contentRect.width ?? 0) >= 900));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const showDet = open || wide;

  useEffect(() => {
    // Relógio só no navegador (evita diferença entre servidor e cliente); 1 batida por segundo.
    const first = setTimeout(() => setNow(Date.now()), 0);
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => (clearTimeout(first), clearInterval(t));
  }, []);

  const go = useCallback(
    (k: number, d?: 1 | -1) => {
      if (n === 0) return;
      const next = ((k % n) + n) % n;
      setDir(d ?? (next >= i ? 1 : -1));
      setI(next);
      setOpen(false);
    },
    [n, i],
  );

  // Troca automática: só com mais de um concurso, sem detalhes abertos e sem o aluno interagindo.
  const auto = n > 1 && !open && !paused;
  useEffect(() => {
    if (!auto) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setTimeout(() => go(i + 1, 1), AUTO_MS);
    return () => clearTimeout(t);
  }, [auto, i, go]);

  const c = contests[Math.min(i, n - 1)] ?? null;
  if (!c) {
    return (
      <div className="cl-card cl-wide cc ccx" data-testid="proximos-concursos">
        <h3 className="cl-h ccx-h"><i className="ccx-radar" aria-hidden />PRÓXIMOS CONCURSOS</h3>
        <p className="cl-vazio ccx-vazio">Nenhum concurso cadastrado no momento.</p>
      </div>
    );
  }
  const idx = contests.indexOf(c);
  const days = serverDays[idx] ?? null;
  const live = c.examDate && c.examDateConfirmed && now != null ? remaining(c.examDate, now) : null;
  const unconfirmed = !c.infoConfirmed || (c.examDate && !c.examDateConfirmed);

  // Luz que segue o dedo/mouse e inclinação 3D da arte.
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    const el = root.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${((e.clientX - r.left) / r.width) * 100}%`);
    el.style.setProperty("--my", `${((e.clientY - r.top) / r.height) * 100}%`);
    const a = art.current;
    if (a && e.pointerType === "mouse") {
      const b = a.getBoundingClientRect();
      const dx = Math.max(-1, Math.min(1, (e.clientX - (b.left + b.width / 2)) / b.width));
      const dy = Math.max(-1, Math.min(1, (e.clientY - (b.top + b.height / 2)) / b.height));
      a.style.setProperty("--rx", `${(-dy * 9).toFixed(2)}deg`);
      a.style.setProperty("--ry", `${(dx * 11).toFixed(2)}deg`);
    }
  };
  const onLeave = () => {
    art.current?.style.setProperty("--rx", "0deg");
    art.current?.style.setProperty("--ry", "0deg");
    setPaused(false);
  };
  const onTabKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    go(idx + (e.key === "ArrowRight" ? 1 : -1), e.key === "ArrowRight" ? 1 : -1);
  };

  return (
    <div
      ref={root}
      className={`cl-card cl-wide cc ccx ${wide ? "is-wide" : ""}`}
      data-testid="proximos-concursos"
      onPointerMove={onMove}
      onPointerEnter={(e) => e.pointerType === "mouse" && setPaused(true)}
      onPointerLeave={onLeave}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      onTouchStart={(e) => {
        const t = e.touches[0];
        if (t) swipe.current = { x: t.clientX, y: t.clientY };
        setPaused(true);
      }}
      onTouchEnd={(e) => {
        const s0 = swipe.current;
        const t = e.changedTouches[0];
        swipe.current = null;
        if (!s0 || !t || n < 2) return;
        const dx = t.clientX - s0.x;
        if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(t.clientY - s0.y) * 1.5) go(idx + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
      }}
    >
      {c.imageUrl && <span key={`bg-${c.id}`} className="ccx-amb" aria-hidden style={{ backgroundImage: `url(${c.imageUrl})` }} />}
      <span className="ccx-grade" aria-hidden />
      <span className="ccx-luz" aria-hidden />

      <div className="cl-row ccx-topo">
        <h3 className="cl-h ccx-h"><i className="ccx-radar" aria-hidden />PRÓXIMOS CONCURSOS</h3>
        {n > 1 && (
          <div className="ccx-nav">
            <button type="button" className="ccx-seta" aria-label="Concurso anterior" onClick={() => go(idx - 1, -1)}><ChevronLeft aria-hidden /></button>
            <div className="cc-tabs ccx-tabs" role="tablist" aria-label="Concursos" onKeyDown={onTabKey}>
              {contests.map((x, k) => (
                <button key={x.id} type="button" role="tab" aria-selected={k === idx} tabIndex={k === idx ? 0 : -1} className={`cc-tab ccx-tab ${k === idx ? "is-on" : ""}`} onClick={() => go(k)} title={x.name} aria-label={`${k + 1}: ${x.name}`}>
                  {k === idx && auto && <i key={`p-${idx}`} className="ccx-prog" aria-hidden style={{ "--auto": `${AUTO_MS}ms` } as CSSProperties} />}
                  <span>{k + 1}</span>
                </button>
              ))}
            </div>
            <button type="button" className="ccx-seta" aria-label="Próximo concurso" onClick={() => go(idx + 1, 1)}><ChevronRight aria-hidden /></button>
          </div>
        )}
      </div>

      <div key={c.id} className="cc-body ccx-body" data-dir={dir}>
        <button type="button" className="cc-main ccx-main" aria-expanded={open} onClick={() => setOpen((o) => !o)} aria-label={`${c.name}: ver detalhes`}>
          {c.imageUrl && (
            <span ref={art} className="ccx-arte">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={c.imageUrl} alt={`Imagem do concurso ${c.name}`} className="cc-img ccx-img" data-testid="concurso-imagem" />
              <i className="ccx-brilho" aria-hidden />
            </span>
          )}
          <span className="cc-info ccx-info">
            <span className="ccx-chip"><i aria-hidden />{c.statusLabel}</span>
            <b className="cc-nome ccx-nome">{c.name}</b>
            <span className="ccx-linhas">
              <span className={`cc-vagas ccx-dado ${c.vacancies != null ? "ccx-ouro" : "ccx-fraco"}`}>
                <Users aria-hidden />
                {c.vacancies != null ? <>+<CountUp value={c.vacancies} /> vagas</> : "Vagas não divulgadas"}
              </span>
              <span className="cc-prova ccx-dado">
                <CalendarClock aria-hidden />
                {c.examLabel ? `Prova: ${c.examLabel}` : "Data não definida"}
              </span>
            </span>
            {unconfirmed && <span className="cl-aviso ccx-aviso"><AlertTriangle aria-hidden />Informação não confirmada</span>}
          </span>
          {days != null && (
            <span className="cc-count ccx-count" data-testid="contagem-regressiva" aria-label={`Faltam ${days} ${days === 1 ? "dia" : "dias"} para a prova`}>
              {live ? (
                <>
                  <Unit v={String(live.d)} label={live.d === 1 ? "DIA" : "DIAS"} />
                  <Unit v={pad(live.h)} label="HORAS" />
                  <Unit v={pad(live.m)} label="MIN" />
                  <Unit v={pad(live.s)} label="SEG" />
                </>
              ) : (
                <Unit v={String(days)} label={days === 1 ? "DIA" : "DIAS"} />
              )}
            </span>
          )}
          <span className="ccx-mais" aria-hidden>{open ? "Ocultar detalhes" : "Ver detalhes"}<ChevronDown className={open ? "is-up" : ""} /></span>
        </button>

        <div className={`cc-det ccx-det ${showDet ? "is-open" : ""}`} aria-hidden={!showDet}>
          <div className="cc-det-in">
            <ul>
              <li><MapPin aria-hidden /><span><small>Órgão</small>{c.institution}</span></li>
              {c.roleName && <li><Briefcase aria-hidden /><span><small>Cargo</small>{c.roleName}</span></li>}
              <li><Users aria-hidden /><span><small>Vagas</small>{c.vacancies != null ? `+${c.vacancies.toLocaleString("pt-BR")}` : "Não divulgadas"}</span></li>
              <li><CalendarClock aria-hidden /><span><small>Prova</small>{c.examLabel ?? "Data não definida"}{c.examLabel && !c.examDateConfirmed ? " (não confirmada)" : ""}</span></li>
              <li><Clock aria-hidden /><span><small>Situação</small>{c.statusLabel}</span></li>
              {c.salary && <li><Wallet aria-hidden /><span><small>Remuneração</small>{c.salary}</span></li>}
            </ul>
            <div className="ccx-rodape">
              <p className="cc-fonte-l">Fonte: {c.sourceName} · atualizado em {c.updatedLabel}</p>
              {c.sourceUrl && (
                <a href={c.sourceUrl} target="_blank" rel="noreferrer noopener" className="cc-link ccx-link" tabIndex={showDet ? 0 : -1} aria-label={`Fonte: ${c.sourceName}`}>
                  Ver fonte <ExternalLink aria-hidden />
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
