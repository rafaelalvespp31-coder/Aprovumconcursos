"use client";

import Link from "next/link";
import { ArrowRight, CalendarDays, Flame, Timer } from "lucide-react";
import type { StudyPlan } from "@/domain/mentor/plan";
import { nomeConcurso } from "@/domain/mentor/nome-concurso";
import "./mentor-plano-mini.css";

const fmt = (m: number) => (m >= 60 ? `${Math.floor(m / 60)}h${m % 60 ? String(m % 60).padStart(2, "0") : ""}` : `${m} min`);
// Cores em linha: o painel do Mentor força cor de texto herdada e escondia o nome do concurso.
const W = { color: "#fff", WebkitTextFillColor: "#fff" } as const;

/** Mini card dentro do "Meu plano" do Mentor: abre a página Meu plano de estudo (calendário). */
export function MentorPlanoMini({ plan, base = "", onNavigate }: { plan: StudyPlan; base?: string; onNavigate?: () => void }) {
  const { nome } = nomeConcurso(plan.contest);
  const prova = plan.daysToExam !== null && plan.daysToExam >= 0 ? plan.daysToExam : null;
  const dias = plan.days.filter((d) => d.blocks.length).length;
  return (
    <Link href={`${base}/meu-plano-de-estudo`} onClick={onNavigate} data-testid="mentor-plano-mini" className="mpm" style={W} aria-label={`Abrir meu plano de estudo: ${nome}`}>
      <span className="mpm-brilho" aria-hidden />
      <span className="mpm-ico" aria-hidden><CalendarDays className="h-6 w-6" /></span>
      <span className="mpm-corpo">
        <span className="mpm-kicker" style={W}>Meu plano de estudo</span>
        <span className="mpm-nome" style={W}>{nome}</span>
        <span className="mpm-chips">
          <span className="mpm-chip" style={W}><Timer className="h-3 w-3" aria-hidden /> {fmt(plan.weeklyMinutes)}/semana</span>
          <span className="mpm-chip" style={W}><Flame className="h-3 w-3" aria-hidden /> {dias} dias de estudo</span>
          {prova !== null && <span className="mpm-chip is-prova" style={W}>Prova em {prova} {prova === 1 ? "dia" : "dias"}</span>}
        </span>
      </span>
      <span className="mpm-go" aria-hidden><ArrowRight className="h-5 w-5" /></span>
      <span className="mpm-cta" style={W}>Ver calendário</span>
    </Link>
  );
}
