"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExcluirPlano } from "./excluir-plano";
import { useMemo, useState } from "react";
import { BookOpen, Check, ChevronLeft, ChevronRight, ListChecks, RotateCcw, Swords, Timer, Trophy } from "lucide-react";
import type { BlockKind, StudyPlan } from "@/domain/mentor/plan";
import { MESES, diaConcluido, monthCells, type CalCell } from "@/domain/mentor/plano-calendario";
import { nomeConcurso } from "@/domain/mentor/nome-concurso";
import { toggleFeito, useFeitos } from "./plano-feitos";

const KIND: Record<BlockKind, { label: string; Icon: typeof BookOpen; href: string; cta: string }> = {
  aula: { label: "Aula", Icon: BookOpen, href: "/trilhas", cta: "Abrir aula" },
  questoes: { label: "Questões", Icon: ListChecks, href: "/questoes", cta: "Resolver" },
  revisao: { label: "Revisão", Icon: RotateCcw, href: "/revisoes", cta: "Revisar" },
  simulado: { label: "Simulado", Icon: Swords, href: "/questoes", cta: "Iniciar" },
};
const DIA_CURTO = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const DIA_LONGO = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
const horas = (m: number) => (m >= 60 ? `${Math.floor(m / 60)}h${m % 60 ? String(m % 60).padStart(2, "0") : ""}` : `${m} min`);
const dataBr = (k: string) => `${k.slice(8, 10)}/${k.slice(5, 7)}`;

/** Meu plano de estudo: calendário do mês com data, horas e o que fazer em cada dia; o dia concluído fica todo verde. */
export function PlanoCalendario({ plan, today, examDay }: { plan: StudyPlan; today: string; examDay: string | null }) {
  const [ym, setYm] = useState({ y: Number(today.slice(0, 4)), m: Number(today.slice(5, 7)) - 1 });
  const [sel, setSel] = useState<string | null>(today);
  const feitos = useFeitos();
  const router = useRouter();
  const { nome, sigla } = nomeConcurso(plan.contest);
  const cells = useMemo(() => monthCells(plan, ym.y, ym.m, today, examDay), [plan, ym, today, examDay]);
  const offset = cells[0]?.weekday ?? 0;
  const comPlano = cells.filter((c) => c.plan);
  const concluidos = comPlano.filter((c) => diaConcluido(c.plan, feitos[c.key] ?? [])).length;
  const prova = plan.daysToExam !== null && plan.daysToExam >= 0 ? plan.daysToExam : null;
  const mover = (d: number) => setYm((v) => { const n = v.m + d; return n < 0 ? { y: v.y - 1, m: 11 } : n > 11 ? { y: v.y + 1, m: 0 } : { y: v.y, m: n }; });
  const cel = sel ? (cells.find((c) => c.key === sel) ?? null) : null;

  return (
    <div className="flex flex-col gap-5" data-testid="meu-plano-calendario">
      <header className="rounded-2xl bg-[#08090B] p-5 text-white">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#ff5a52]">Meu plano de estudo</p>
        <h1 className="mt-1 text-[24px] font-extrabold leading-tight tracking-[-0.02em]">{nome}</h1>
        <div className="mt-2.5 flex flex-wrap gap-2 text-[12px] font-semibold">
          {sigla && <span className="rounded-full bg-white/12 px-2.5 py-1">{sigla}</span>}
          {prova !== null && <span className="inline-flex items-center gap-1 rounded-full bg-[#E10600] px-2.5 py-1"><Timer className="h-3.5 w-3.5" aria-hidden /> Prova em {prova} {prova === 1 ? "dia" : "dias"}</span>}
          <span className="rounded-full bg-white/12 px-2.5 py-1">{horas(plan.weeklyMinutes)} por semana</span>
          <span className="rounded-full bg-white/12 px-2.5 py-1">{plan.weeklyQuestions} questões por semana</span>
        </div>
        {plan.notes.length > 0 && <p className="mt-3 text-[12.5px] text-white/75">{plan.notes.join(" ")}</p>}
      </header>

      <section aria-label="Calendário do plano" className="rounded-2xl border border-[#E4E4E7] bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => mover(-1)} aria-label="Mês anterior" className="grid size-10 place-items-center rounded-xl border border-[#E4E4E7] hover:bg-[#F4F4F6]"><ChevronLeft className="h-4 w-4" aria-hidden /></button>
            <h2 className="min-w-[10.5rem] text-center text-[17px] font-extrabold tracking-[-0.01em]" aria-live="polite">{MESES[ym.m]} {ym.y}</h2>
            <button type="button" onClick={() => mover(1)} aria-label="Próximo mês" className="grid size-10 place-items-center rounded-xl border border-[#E4E4E7] hover:bg-[#F4F4F6]"><ChevronRight className="h-4 w-4" aria-hidden /></button>
          </div>
          <p className="text-[12.5px] font-semibold text-[#64666D]" data-testid="meu-plano-resumo">{concluidos} de {comPlano.length} dias concluídos neste mês</p>
        </div>

        <div className="hidden grid-cols-7 gap-2 pb-1.5 md:grid" aria-hidden>
          {DIA_CURTO.map((d) => <p key={d} className="text-center text-[11px] font-bold uppercase tracking-wide text-[#8B8D94]">{d}</p>)}
        </div>
        <ol className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-7">
          {Array.from({ length: offset }, (_, i) => <li key={`v${i}`} className="hidden md:block" aria-hidden />)}
          {cells.map((c) => <Dia key={c.key} c={c} idx={c.day} qtd={(feitos[c.key] ?? []).filter((n) => n < (c.plan?.blocks.length ?? 0)).length} feito={diaConcluido(c.plan, feitos[c.key] ?? [])} ativo={sel === c.key} onSelect={() => setSel(c.key)} />)}
        </ol>

        <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11.5px] text-[#64666D]">
          <span className="inline-flex items-center gap-1.5"><span className="size-3 rounded border border-[#86CFA0] bg-[#DDF5E4]" /> Dia concluído</span>
          <span className="inline-flex items-center gap-1.5"><span className="size-3 rounded border border-[#F5B8B3] bg-[#FDECEA]" /><span className="size-3 rounded border border-[#D3D5DA] bg-[#ECEDEF]" /> Dias de estudo</span>
          <span className="inline-flex items-center gap-1.5"><span className="size-3 rounded border-2 border-[#E10600] bg-white" /> Hoje</span>
          <span className="inline-flex items-center gap-1.5"><span className="size-3 rounded bg-[#08090B]" /> Dia da prova</span>
        </p>
      </section>

      <div className="flex justify-center"><ExcluirPlano onDone={() => router.refresh()} /></div>

      {cel && <Detalhe c={cel} feitos={feitos[cel.key] ?? []} />}
    </div>
  );
}

function Dia({ c, idx, qtd, feito, ativo, onSelect }: { c: CalCell; idx: number; qtd: number; feito: boolean; ativo: boolean; onSelect: () => void }) {
  const base = "group relative flex min-h-[136px] w-full flex-col rounded-xl border p-2.5 text-left transition duration-200 ease-out hover:-translate-y-1 hover:scale-[1.03] hover:shadow-lg active:scale-[0.97] motion-reduce:transition-none motion-reduce:hover:transform-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E10600]";
  const tema = c.isExam
    ? "border-[#08090B] bg-[#08090B] text-white"
    : feito
      ? "border-[#86CFA0] bg-[#DDF5E4] text-[#14532D]"
      : c.plan
        ? idx % 2 === 1
          ? "border-[#F5B8B3] bg-[#FDECEA] text-[#3a0b08] hover:border-[#E10600]"
          : "border-[#D3D5DA] bg-[#ECEDEF] text-[#26272B] hover:border-[#5b5d64]"
        : "border-dashed border-[#E4E4E7] bg-[#FAFAFB] text-[#8B8D94]";
  const hoje = c.isToday ? " ring-2 ring-[#E10600] ring-offset-1" : "";
  const sel = ativo && !c.isToday ? " outline outline-2 outline-[#08090B]" : "";
  return (
    <li>
      <button type="button" onClick={onSelect} aria-pressed={ativo} aria-label={`${DIA_LONGO[c.weekday]}, ${dataBr(c.key)}${feito ? ", concluído" : ""}`} className={`${base} ${tema}${hoje}${sel}`} data-testid="meu-plano-dia" data-feito={feito ? "1" : "0"}>
        <span className="flex items-start justify-between gap-1">
          <span className="leading-none"><b className="text-[22px] font-extrabold tabular-nums">{String(c.day).padStart(2, "0")}</b><span className="ml-1 text-[11px] font-bold uppercase opacity-70">{DIA_CURTO[c.weekday]}</span></span>
          {feito ? <span className="grid size-5 place-items-center rounded-full bg-[#2e7d32] text-white"><Check className="h-3.5 w-3.5" aria-hidden /></span>
            : c.plan ? <span className="inline-flex items-center gap-0.5 rounded-full bg-[#F1F1F3] px-1.5 py-0.5 text-[11px] font-bold text-[#3a3b40]"><Timer className="h-3 w-3" aria-hidden />{horas(c.plan.minutes)}</span> : null}
        </span>
        {c.isExam ? (
          <span className="mt-auto pt-2 text-[13px] font-extrabold uppercase tracking-wide">Dia da prova</span>
        ) : c.plan ? (
          <span className="mt-1.5 flex flex-col gap-0.5 text-[11.5px] leading-snug">
            {c.plan.blocks.map((b, i) => (
              <span key={i} className="block truncate"><b>{KIND[b.kind].label}</b> {b.subject} · {horas(b.minutes)}</span>
            ))}
          </span>
        ) : (
          <span className="mt-auto pt-2 text-[11.5px] font-semibold">{c.afterExam ? "Após a prova" : "Descanso"}</span>
        )}
        {c.plan && !feito && qtd > 0 && (
          <span className="mt-auto block pt-1.5" aria-hidden><span className="block h-1.5 overflow-hidden rounded-full bg-black/10"><span className="block h-full rounded-full bg-[#2e7d32] transition-all duration-300" style={{ width: `${Math.round((qtd / c.plan.blocks.length) * 100)}%` }} /></span></span>
        )}
        {feito && c.plan && <span className="mt-auto pt-1.5 text-[11px] font-extrabold uppercase tracking-wide text-[#166534]">Concluído · {horas(c.plan.minutes)}</span>}
      </button>
    </li>
  );
}

function Detalhe({ c, feitos }: { c: CalCell; feitos: number[] }) {
  const dp = c.plan;
  const ok = diaConcluido(dp, feitos);
  const minFeitos = dp ? dp.blocks.reduce((s, b, i) => s + (feitos.includes(i) ? b.minutes : 0), 0) : 0;
  return (
    <section className={`rounded-2xl border p-4 ${ok ? "border-[#86CFA0] bg-[#EEFAF2]" : "border-[#E4E4E7] bg-white"}`} aria-label={`Plano de ${dataBr(c.key)}`} data-testid="meu-plano-detalhe">
      <h3 className="text-[16px] font-extrabold">{DIA_LONGO[c.weekday]}, {dataBr(c.key)}{c.isToday ? " · hoje" : ""}</h3>
      {c.isExam ? (
        <p className="mt-1 text-[13.5px] text-[#3a3b40]">É o dia da prova. Descanse, revise só o essencial e confie no que você estudou.</p>
      ) : !dp ? (
        <p className="mt-1 text-[13.5px] text-[#64666D]">{c.afterExam ? "A prova já passou: não há estudo programado depois dela." : "Dia de descanso. Descansar também faz parte de passar."}</p>
      ) : (
        <>
          <p className="mt-0.5 text-[13px] text-[#64666D]">{dp.theme} · {horas(minFeitos)} de {horas(dp.minutes)} · {dp.questions} questões</p>
          {ok && <p className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-[#DDF5E4] px-2.5 py-1 text-[12.5px] font-bold text-[#166534]" role="status"><Trophy className="h-4 w-4" aria-hidden /> Dia concluído!</p>}
          <ul className="mt-3 grid gap-2">
            {dp.blocks.map((b, i) => {
              const feito = feitos.includes(i);
              const { label, Icon, href, cta } = KIND[b.kind];
              return (
                <li key={i} className={`flex items-center gap-3 rounded-xl border p-3 ${feito ? "border-[#86CFA0] bg-[#DDF5E4]" : "border-[#E4E4E7] bg-white"}`}>
                  <button type="button" role="checkbox" aria-checked={feito} aria-label={`${feito ? "Desmarcar" : "Marcar como feito"}: ${label} de ${b.subject}`} onClick={() => toggleFeito(c.key, i)} className={`grid size-9 shrink-0 place-items-center rounded-full border-2 ${feito ? "border-[#2e7d32] bg-[#2e7d32] text-white" : "border-[#B8B8BF] bg-white text-[#64666D]"}`}>
                    {feito ? <Check className="h-4 w-4" aria-hidden /> : <Icon className="h-4 w-4" aria-hidden />}
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-bold">{label} · {b.subject} <span className="font-semibold text-[#64666D]">({horas(b.minutes)})</span></p>
                    <p className="text-[12.5px] text-[#64666D]">{b.detail}</p>
                  </div>
                  {!feito && <Link href={href} className="shrink-0 rounded-lg bg-[#E10600] px-3 py-2 text-[12.5px] font-bold text-white">{cta}</Link>}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}
