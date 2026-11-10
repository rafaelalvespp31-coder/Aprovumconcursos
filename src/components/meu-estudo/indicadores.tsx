"use client";

import { ArrowDown, ArrowUp, BookOpen, Check, Clock } from "lucide-react";
import { tempo } from "./base";
import { useContagem } from "./movimento";

interface Props {
  total: number;
  concluidas: number;
  studySeconds: number;
  /** Total acumulado de aulas por semana (dados reais); menos de 2 pontos distintos = sem gráfico. */
  aulasSerie?: number[];
  aulasPct30?: number | null;
  /** Tempo de estudo por semana (segundos), a última é a atual. */
  tempoSemanas?: number[];
  tempoVariacao?: number | null;
}

function Linha({ serie }: { serie: number[] }) {
  const max = Math.max(...serie);
  const min = Math.min(...serie);
  if (serie.length < 2 || max === min) return null;
  const pts = serie.map((v, i) => `${((i / (serie.length - 1)) * 100).toFixed(1)},${(30 - ((v - min) / (max - min)) * 26 - 2).toFixed(1)}`);
  return (
    <svg className="me-kpi-linha" viewBox="0 0 100 32" preserveAspectRatio="none" aria-hidden>
      <polygon points={`0,32 ${pts.join(" ")} 100,32`} />
      <polyline points={pts.join(" ")} />
    </svg>
  );
}

function Variacao({ pct, titulo }: { pct: number | null | undefined; titulo: string }) {
  if (pct === null || pct === undefined || pct === 0) return null;
  const sobe = pct > 0;
  return (
    <span className={`me-kpi-var${sobe ? "" : " me-kpi-var-baixa"}`} title={titulo}>
      {sobe ? <ArrowUp size={12} strokeWidth={3} aria-hidden /> : <ArrowDown size={12} strokeWidth={3} aria-hidden />}
      {sobe ? "+" : ""}{pct}%<span className="sr-only"> {titulo}</span>
    </span>
  );
}

/** Três indicadores com dados reais; números sobem, barra e anel se preenchem uma vez. */
export function EstudoIndicadores({ total, concluidas, studySeconds, aulasSerie = [], aulasPct30, tempoSemanas = [], tempoVariacao }: Props) {
  const pct = total ? Math.round((concluidas / total) * 100) : 0;
  const nTotal = useContagem(total);
  const nFeitas = useContagem(concluidas);
  const nPct = useContagem(pct);
  const maxSemana = Math.max(0, ...tempoSemanas);
  const R = 24;
  const C = 2 * Math.PI * R;
  return (
    <div className="me-indicadores">
      <div className="me-kpi" data-testid="kpi-total" style={{ "--i": 0 } as React.CSSProperties}>
        <span className="me-kpi-ico me-kpi-rosa"><BookOpen size={24} aria-hidden /></span>
        <div className="me-kpi-txt"><b>{nTotal.toLocaleString("pt-BR")}</b><small>{total === 1 ? "Aula no total" : "Aulas no total"}</small></div>
        <Variacao pct={aulasPct30} titulo="de aulas novas nos últimos 30 dias" />
        <Linha serie={aulasSerie} />
      </div>
      <div className="me-kpi" data-testid="kpi-concluidas" style={{ "--i": 1 } as React.CSSProperties}>
        <span className="me-kpi-ico me-kpi-verde"><Check size={24} strokeWidth={3} aria-hidden /></span>
        <div className="me-kpi-txt me-kpi-meio">
          <b>{nFeitas.toLocaleString("pt-BR")}</b><small>{concluidas === 1 ? "Concluída" : "Concluídas"}</small>
          <span className="me-kpi-barra" aria-hidden><i style={{ width: `${pct}%` }} /></span>
        </div>
        <span className="me-kpi-anel" role="img" aria-label={`${pct}% das aulas concluídas`}>
          <svg viewBox="0 0 60 60" aria-hidden>
            <circle cx="30" cy="30" r={R} className="me-anel-trilho" />
            <circle cx="30" cy="30" r={R} className="me-anel-valor" strokeDasharray={C} strokeDashoffset={C * (1 - pct / 100)} style={{ "--c0": C } as React.CSSProperties} />
          </svg>
          <b>{nPct}%</b>
        </span>
      </div>
      <div className="me-kpi" data-testid="kpi-tempo" style={{ "--i": 2 } as React.CSSProperties}>
        <span className="me-kpi-ico me-kpi-cinza"><Clock size={24} aria-hidden /></span>
        <div className="me-kpi-txt"><b>{tempo(studySeconds)}</b><small>Tempo de estudo</small></div>
        <Variacao pct={tempoVariacao} titulo="em relação à semana passada" />
        {maxSemana > 0 && (
          <span className="me-kpi-colunas" aria-hidden title="Tempo de estudo nas últimas semanas">
            {tempoSemanas.map((s, i) => <i key={i} style={{ "--h": Math.max(0.08, s / maxSemana) } as React.CSSProperties} />)}
          </span>
        )}
      </div>
    </div>
  );
}
