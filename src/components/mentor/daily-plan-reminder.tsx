"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { mentorPanelAction } from "@/app/(app)/mentor/actions";
import type { PlanDay } from "@/domain/mentor/plan";

const KEY = "na:plano-do-dia:v1";
const KIND: Record<string, string> = { aula: "Aula", questoes: "Questões", revisao: "Revisão", simulado: "Simulado" };

function hm(min: number): string {
  const h = Math.floor(min / 60), m = min % 60;
  return h ? `${h}h${m ? String(m).padStart(2, "0") : ""}` : `${m} min`;
}

/** Uma vez por dia, ao abrir a plataforma, lembra o aluno do que estudar hoje no plano do concurso que ele escolheu. */
export function DailyPlanReminder() {
  const [data, setData] = useState<{ contest: string; day: PlanDay } | null>(null);

  useEffect(() => {
    let alive = true;
    const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
    try { if (localStorage.getItem(KEY) === today) return; } catch { /* segue */ }
    const t = setTimeout(() => {
      mentorPanelAction().then((r) => {
        if (!alive || r.state !== "ok" || !r.plan || !r.goal) return;
        const wd = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" })).getDay();
        const day = r.plan.days.find((d) => d.weekday === wd);
        if (day && day.blocks.length) setData({ contest: r.goal.contest, day });
      }).catch(() => {});
    }, 2500);
    return () => { alive = false; clearTimeout(t); };
  }, []);

  if (!data) return null;
  const close = () => {
    try { localStorage.setItem(KEY, new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" })); } catch { /* ok */ }
    setData(null);
  };
  const { day, contest } = data;
  return (
    <div role="dialog" aria-label="Plano de estudo de hoje" data-testid="plano-do-dia"
      className="fixed inset-x-3 bottom-24 z-[60] mx-auto max-w-md rounded-2xl border border-[#E10600]/60 bg-[#0b0b0d] p-4 text-white shadow-2xl">
      <button onClick={close} aria-label="Fechar" className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full text-white/70"><X className="h-4 w-4" /></button>
      <p className="pr-8 text-[11px] font-bold uppercase tracking-wider text-[#ff6b61]">Mentor · hoje, {day.label} · {contest}</p>
      <p className="mt-1 text-[15px] font-extrabold">Hoje: {hm(day.minutes)} de estudo{day.questions ? ` e ${day.questions} questões` : ""}</p>
      <ul className="mt-2 space-y-1.5">
        {day.blocks.map((b, i) => (
          <li key={i} className="text-[13px] leading-snug text-white/85">
            <strong className="text-white">{KIND[b.kind] ?? b.kind} · {b.subject}</strong> — {hm(b.minutes)}. <span className="text-white/65">{b.detail}</span>
          </li>
        ))}
      </ul>
      <Link href="/mentor" onClick={close} className="mt-3 inline-flex min-h-10 items-center rounded-xl bg-[#E10600] px-4 text-[13px] font-bold text-white">Ver meu plano</Link>
    </div>
  );
}
