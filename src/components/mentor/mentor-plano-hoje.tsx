"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { BookOpen, CheckCheck, ChevronDown, Flame, ListChecks, RotateCcw, Swords, Timer, TriangleAlert, Trophy, Check } from "lucide-react";
import type { BlockKind, PlanBlock, PlanDay, StudyPlan } from "@/domain/mentor/plan";
import { nomeConcurso } from "@/domain/mentor/nome-concurso";
import "./mentor-plano.css";

const KIND: Record<BlockKind, { label: string; Icon: typeof BookOpen; href: string; cta: string }> = {
  aula: { label: "Aula", Icon: BookOpen, href: "/trilhas", cta: "Abrir aula" },
  questoes: { label: "Questões", Icon: ListChecks, href: "/questoes", cta: "Resolver" },
  revisao: { label: "Revisão", Icon: RotateCcw, href: "/revisoes", cta: "Revisar" },
  simulado: { label: "Simulado", Icon: Swords, href: "/questoes", cta: "Iniciar" },
};
const DIAS = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
const INICIAIS = ["D", "S", "T", "Q", "Q", "S", "S"];
const fmt = (m: number) => (m >= 60 ? `${Math.floor(m / 60)}h${m % 60 ? String(m % 60).padStart(2, "0") : ""}` : `${m} min`);
const chaveDia = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const KEY = "aprovum_plano_feito_";

function lerFeitos(k: string): number[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY + k) ?? "[]");
    return Array.isArray(v) ? v.filter((n): n is number => Number.isInteger(n)) : [];
  } catch {
    return [];
  }
}

/** Frase de incentivo que acompanha o avanço do dia. */
export function incentivo(feitos: number, total: number): string {
  if (!total) return "Hoje é dia de recarregar.";
  if (feitos >= total) return "Missão cumprida! Amanhã tem mais.";
  if (feitos === 0) return "Comece pelo primeiro bloco: o difícil é começar.";
  if (feitos / total >= 0.66) return "Falta pouco. Fecha o dia!";
  return "Bom ritmo. Siga o próximo bloco.";
}

export function MentorPlanoHoje({ plan, base = "", onNavigate }: { plan: StudyPlan; base?: string; onNavigate?: () => void }) {
  const agora = useMemo(() => new Date(), []);
  const hoje = agora.getDay();
  const dia: PlanDay | null = plan.days.find((d) => d.weekday === hoje) ?? null;
  const k = chaveDia(agora);
  const [feitos, setFeitos] = useState<number[]>(() => (typeof window === "undefined" ? [] : lerFeitos(k)));
  const [aberto, setAberto] = useState<number | null>(null);
  const { nome, sigla } = nomeConcurso(plan.contest);
  const blocos: PlanBlock[] = dia?.blocks ?? [];
  const total = blocos.length;
  const feitosValidos = feitos.filter((i) => i < total);
  const pct = total ? Math.round((feitosValidos.length / total) * 100) : 0;
  const proximo = blocos.findIndex((_, i) => !feitosValidos.includes(i));
  const minFeitos = blocos.reduce((s, b, i) => s + (feitosValidos.includes(i) ? b.minutes : 0), 0);
  const concluido = total > 0 && feitosValidos.length === total;

  // Dias da semana já concluídos (selo na faixa da semana); hoje acompanha as marcações em tela.
  const semana = useMemo(() => {
    const r: Record<number, boolean> = {};
    for (let i = 0; i < 7; i++) {
      const d = new Date(agora);
      d.setDate(agora.getDate() - ((hoje - i + 7) % 7));
      const dp = plan.days.find((x) => x.weekday === i);
      if (!dp || !dp.blocks.length) continue;
      const f = i === hoje ? feitos : typeof window === "undefined" ? [] : lerFeitos(chaveDia(d));
      if (f.filter((n) => n < dp.blocks.length).length === dp.blocks.length) r[i] = true;
    }
    return r;
  }, [agora, hoje, plan, feitos]);

  const alternar = (i: number) => {
    setFeitos((atual) => {
      const novo = atual.includes(i) ? atual.filter((x) => x !== i) : [...atual, i];
      try { localStorage.setItem(KEY + k, JSON.stringify(novo)); } catch { /* sem armazenamento */ }
      try { navigator.vibrate?.(12); } catch { /* sem vibração */ }
      return novo;
    });
  };

  const anel = 2 * Math.PI * 26;
  const prova = plan.daysToExam !== null && plan.daysToExam >= 0 ? plan.daysToExam : null;

  return (
    <div className="mp" data-testid="mentor-plano-hoje">
      <div className="mp-hero" data-testid="mentor-plano-concurso">
        <p className="mp-kicker">Plano de estudo para</p>
        <h3 className="mp-concurso">{nome}</h3>
        <div className="mp-chips">
          {sigla && <span className="mp-chip">{sigla}</span>}
          <span className="mp-chip is-data">{String(agora.getDate()).padStart(2, "0")}/{String(agora.getMonth() + 1).padStart(2, "0")} · {DIAS[hoje]}</span>
          {prova !== null && <span className="mp-chip is-prova"><Timer className="h-3 w-3" aria-hidden /> Prova em {prova} {prova === 1 ? "dia" : "dias"}</span>}
        </div>
      </div>

      <ol className="mp-semana" aria-label="Semana de estudo">
        {INICIAIS.map((l, i) => {
          const tem = plan.days.some((d) => d.weekday === i && d.blocks.length);
          return (
            <li key={i} className={`mp-dia ${i === hoje ? "is-hoje" : ""} ${tem ? "tem" : "folga"} ${semana[i] ? "is-feito" : ""}`} aria-current={i === hoje ? "date" : undefined} title={`${DIAS[i]}${tem ? "" : " (descanso)"}`}>
              <span>{semana[i] ? <Check className="h-3.5 w-3.5" aria-hidden /> : l}</span>
            </li>
          );
        })}
      </ol>

      {plan.notes.length > 0 && (
        <div className="mp-notas">
          {plan.notes.map((n) => (
            <div key={n} className="mp-alerta" role="note">
              <TriangleAlert className="mp-alerta-ico h-4 w-4" aria-hidden />
              <p>{n}</p>
              {/revis/i.test(n) && <Link href={`${base}/revisoes`} onClick={onNavigate} className="mp-alerta-btn">Revisar</Link>}
            </div>
          ))}
        </div>
      )}

      <section className={`mp-prog ${concluido ? "is-ok" : ""}`} aria-label="Progresso de hoje" data-testid="mentor-plano-progresso">
        <svg viewBox="0 0 60 60" className="mp-anel" aria-hidden>
          <circle cx="30" cy="30" r="26" className="mp-anel-fundo" />
          <circle cx="30" cy="30" r="26" className="mp-anel-valor" strokeDasharray={anel} strokeDashoffset={anel * (1 - pct / 100)} transform="rotate(-90 30 30)" />
        </svg>
        <span className="mp-anel-txt">{concluido ? <Trophy className="h-5 w-5" aria-hidden /> : `${pct}%`}</span>
        <div className="mp-prog-info">
          <b>{dia ? `${feitosValidos.length} de ${total} blocos` : "Dia de descanso"}</b>
          <span>{dia ? `${fmt(minFeitos)} de ${fmt(dia.minutes)} · ${dia.questions} questões` : "Sem estudo programado hoje."}</span>
          <em>{incentivo(feitosValidos.length, total)}</em>
        </div>
      </section>

      {dia ? (
        <>
          <p className="mp-tema"><Flame className="h-3.5 w-3.5" aria-hidden /> {dia.theme}</p>
          <ol className="mp-lista">
            {blocos.map((b, i) => {
              const feito = feitosValidos.includes(i);
              const prox = i === proximo;
              const { label, Icon, href, cta } = KIND[b.kind];
              const exp = aberto === i;
              return (
                <li key={i} className={`mp-bloco k-${b.kind} ${feito ? "is-feito" : ""} ${prox ? "is-proximo" : ""}`} data-testid="mentor-plano-bloco">
                  <button type="button" className="mp-check" role="checkbox" aria-checked={feito} aria-label={`${feito ? "Desmarcar" : "Marcar como feito"}: ${label} de ${b.subject}`} onClick={() => alternar(i)}>
                    {feito ? <Check className="h-4 w-4" aria-hidden /> : <Icon className="h-4 w-4" aria-hidden />}
                  </button>
                  <button type="button" className="mp-corpo" aria-expanded={exp} onClick={() => setAberto(exp ? null : i)}>
                    <span className="mp-linha1">
                      <span className="mp-tipo">{label}</span>
                      {prox && <span className="mp-prox">Próximo</span>}
                      <span className="mp-min"><Timer className="h-3 w-3" aria-hidden /> {fmt(b.minutes)}</span>
                    </span>
                    <span className="mp-mat">{b.subject}</span>
                    {exp && <span className="mp-det">{b.detail}</span>}
                    <ChevronDown className={`mp-seta h-4 w-4 ${exp ? "is-aberto" : ""}`} aria-hidden />
                  </button>
                  {!feito && (prox || exp) && (
                    <Link href={`${base}${href}`} onClick={onNavigate} className="mp-cta">{cta}</Link>
                  )}
                </li>
              );
            })}
          </ol>
          {concluido && (
            <div className="mp-vitoria" role="status" data-testid="mentor-plano-vitoria">
              <CheckCheck className="h-5 w-5" aria-hidden />
              <div><b>Missão de hoje cumprida!</b><span>Constância vence concurso. Descanse e volte amanhã.</span></div>
            </div>
          )}
        </>
      ) : (
        <div className="mp-folga">Hoje o plano prevê descanso. Descansar também faz parte de passar.</div>
      )}
    </div>
  );
}
