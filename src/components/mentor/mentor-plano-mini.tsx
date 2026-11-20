"use client";

import Link from "next/link";
import { CalendarDays, ChevronRight, Timer } from "lucide-react";
import type { StudyPlan } from "@/domain/mentor/plan";
import { nomeConcurso } from "@/domain/mentor/nome-concurso";

const fmt = (m: number) => (m >= 60 ? `${Math.floor(m / 60)}h${m % 60 ? String(m % 60).padStart(2, "0") : ""}` : `${m} min`);

/** Mini card dentro do "Meu plano" do Mentor: abre a página Meu plano de estudo (calendário). */
export function MentorPlanoMini({ plan, base = "", onNavigate }: { plan: StudyPlan; base?: string; onNavigate?: () => void }) {
  const { nome } = nomeConcurso(plan.contest);
  const prova = plan.daysToExam !== null && plan.daysToExam >= 0 ? plan.daysToExam : null;
  return (
    <Link href={`${base}/meu-plano-de-estudo`} onClick={onNavigate} data-testid="mentor-plano-mini" className="group flex items-center gap-3 rounded-2xl border border-[#E4E4E7] bg-white p-3.5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition hover:border-[#B8B8BF] active:scale-[0.99]">
      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#08090B] text-white"><CalendarDays className="h-5 w-5" aria-hidden /></span>
      <span className="min-w-0 flex-1">
        <span className="block text-[11px] font-bold uppercase tracking-[0.14em] text-[#E10600]">Meu plano de estudo</span>
        <span className="block truncate text-[15px] font-extrabold text-[#08090B]">{nome}</span>
        <span className="mt-0.5 flex flex-wrap items-center gap-x-3 text-[12px] text-[#64666D]">
          <span>{fmt(plan.weeklyMinutes)} por semana</span>
          {prova !== null && <span className="inline-flex items-center gap-1"><Timer className="h-3 w-3" aria-hidden /> prova em {prova} {prova === 1 ? "dia" : "dias"}</span>}
        </span>
      </span>
      <span className="inline-flex shrink-0 items-center gap-0.5 text-[12.5px] font-bold text-[#08090B]">Ver calendário <ChevronRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden /></span>
    </Link>
  );
}
