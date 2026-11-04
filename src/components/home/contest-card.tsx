"use client";

import { Clock, ExternalLink, MapPin, Wallet } from "lucide-react";
import { useEffect, useState } from "react";

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

/** Próximos concursos: contagem regressiva ao vivo, troca entre concursos e detalhes ao clicar. */
export function ContestCard({ contests, serverDays }: { contests: ContestView[]; serverDays: Array<number | null> }) {
  const [i, setI] = useState(0);
  const [open, setOpen] = useState(false);
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    // Relógio só no navegador (evita diferença entre servidor e cliente); 1 batida por segundo.
    const first = setTimeout(() => setNow(Date.now()), 0);
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => (clearTimeout(first), clearInterval(t));
  }, []);

  const c = contests[Math.min(i, contests.length - 1)] ?? null;
  if (!c) {
    return (
      <div className="cl-card cl-wide cc" data-testid="proximos-concursos">
        <h3 className="cl-h">PRÓXIMOS CONCURSOS</h3>
        <p className="cl-vazio">Nenhum concurso cadastrado no momento.</p>
      </div>
    );
  }
  const idx = contests.indexOf(c);
  const days = serverDays[idx] ?? null;
  const live = c.examDate && c.examDateConfirmed && now != null ? remaining(c.examDate, now) : null;
  const unconfirmed = !c.infoConfirmed || (c.examDate && !c.examDateConfirmed);

  return (
    <div className="cl-card cl-wide cc" data-testid="proximos-concursos">
      <div className="cl-row">
        <h3 className="cl-h">PRÓXIMOS CONCURSOS</h3>
        {contests.length > 1 && (
          <div className="cc-tabs" role="tablist" aria-label="Concursos">
            {contests.map((x, k) => (
              <button key={x.id} type="button" role="tab" aria-selected={k === idx} className={`cc-tab ${k === idx ? "is-on" : ""}`} onClick={() => (setI(k), setOpen(false))} title={x.name}>
                {k + 1}
              </button>
            ))}
          </div>
        )}
      </div>

      <div key={c.id} className="cc-body">
        <button type="button" className="cc-main" aria-expanded={open} onClick={() => setOpen((o) => !o)} aria-label={`${c.name}: ver detalhes`}>
          {c.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={c.imageUrl} alt={`Imagem do concurso ${c.name}`} className="cc-img" data-testid="concurso-imagem" />
          )}
          <span className="cc-info">
            <b className="cc-nome">{c.name}</b>
            <span className={c.vacancies != null ? "cl-ouro cc-vagas" : "cl-dim cc-vagas"}>{c.vacancies != null ? `+${c.vacancies.toLocaleString("pt-BR")} vagas` : "Vagas não divulgadas"}</span>
            <span className="cc-prova">
              <Clock aria-hidden />
              {c.examLabel ? `Prova: ${c.examLabel}` : "Data não definida"}
            </span>
            {unconfirmed && <span className="cl-aviso">Informação não confirmada</span>}
          </span>
          {days != null && (
            <span className="cc-count" data-testid="contagem-regressiva" aria-label={`Faltam ${days} ${days === 1 ? "dia" : "dias"} para a prova`}>
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
        </button>

        <div className={`cc-det ${open ? "is-open" : ""}`} aria-hidden={!open}>
          <div className="cc-det-in">
            <ul>
              <li><MapPin aria-hidden /><span><small>Órgão</small>{c.institution}{c.roleName ? ` · ${c.roleName}` : ""}</span></li>
              <li><Clock aria-hidden /><span><small>Situação</small>{c.statusLabel}</span></li>
              {c.salary && <li><Wallet aria-hidden /><span><small>Remuneração</small>{c.salary}</span></li>}
            </ul>
            <p className="cc-fonte-l">Fonte: {c.sourceName} · atualizado em {c.updatedLabel}</p>
            {c.sourceUrl && (
              <a href={c.sourceUrl} target="_blank" rel="noreferrer noopener" className="cc-link" tabIndex={open ? 0 : -1} aria-label={`Fonte: ${c.sourceName}`}>
                Ver fonte <ExternalLink aria-hidden />
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
