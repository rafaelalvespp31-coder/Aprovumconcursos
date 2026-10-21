"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, Zap } from "lucide-react";
import { ACTIVITY_LABELS, activityLevel, daysInMonth, yearGrid, yearSummary, type ActivityLevel } from "@/domain/notebooks/model";

const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const MONTHS_FULL = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const WEEK = ["D", "S", "T", "Q", "Q", "S", "S"];

const fmt = (d: string) => d.split("-").reverse().join("/");
const tip = (date: string, n: number) => `${fmt(date)}: ${n ? `${n} ${n === 1 ? "resposta" : "respostas"}` : "sem estudo"}`;

/** "Investida": respostas por dia (aulas, Modo Jogo e cadernos), por ano ou por mês. */
export function ActivityCard({
  activity,
  year,
  thisYear,
  today,
  view,
  month,
  base,
}: {
  activity: Array<[string, number]>;
  year: number;
  thisYear: number;
  today: string;
  view: "anual" | "mensal";
  month: number;
  base: string;
}) {
  const router = useRouter();
  const counts = useMemo(() => new Map(activity), [activity]);
  const grid = useMemo(() => yearGrid(year, counts, today), [year, counts, today]);
  const sum = yearSummary(counts, year);
  // No celular a grade rola para o lado: começa mostrando os meses mais recentes.
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scroller.current;
    if (el && year === thisYear) el.scrollLeft = el.scrollWidth;
  }, [year, thisYear, view]);
  const url = (p: { ano?: number; exibir?: string; mes?: number }) => {
    const q = new URLSearchParams();
    const ano = p.ano ?? year;
    const exibir = p.exibir ?? view;
    if (ano !== thisYear) q.set("ano", String(ano));
    if (exibir === "mensal") {
      q.set("exibir", "mensal");
      q.set("mes", String(p.mes ?? month));
    }
    const s = q.toString();
    return `${base}/questoes${s ? `?${s}` : ""}`;
  };
  // Navegação do mês atravessa o ano (dez → jan do ano seguinte), sem passar de hoje.
  const prevMonth = month === 1 ? { ano: year - 1, mes: 12 } : { ano: year, mes: month - 1 };
  const nextMonth = month === 12 ? { ano: year + 1, mes: 1 } : { ano: year, mes: month + 1 };
  const nextMonthDisabled = nextMonth.ano > thisYear || (nextMonth.ano === thisYear && nextMonth.mes > Number(today.slice(5, 7)));

  return (
    <section className="pc min-w-0 p-4 sm:p-6" aria-labelledby="investida-titulo" data-testid="investida-card">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="investida-titulo" className="flex items-center gap-3 text-[19px] font-extrabold tracking-[-0.01em] text-[#08090B] sm:text-[21px]">
          <Zap className="h-6 w-6 fill-[#E50914] text-[#E50914]" aria-hidden />
          Investida
        </h2>
        <label className="relative flex items-center gap-1.5 text-[13px] text-[#64666D]">
          Exibir:
          <select
            value={view}
            onChange={(e) => router.push(url({ exibir: e.target.value }), { scroll: false })}
            className="cursor-pointer appearance-none rounded-md bg-transparent py-1 pl-1 pr-6 text-[13.5px] font-bold text-[#08090B] outline-none focus-visible:ring-2 focus-visible:ring-[#E50914]"
          >
            <option value="anual">Anual</option>
            <option value="mensal">Mensal</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-0.5 h-4 w-4 text-[#08090B]" aria-hidden />
        </label>
      </div>

      {view === "anual" ? (
        <>
          <Stepper
            label={String(year)}
            prev={year > 2020 ? url({ ano: year - 1 }) : null}
            next={year < thisYear ? url({ ano: year + 1 }) : null}
            prevLabel={`Ano ${year - 1}`}
            nextLabel={`Ano ${year + 1}`}
          />
          <div ref={scroller} className="-mx-1 overflow-x-auto px-1 pb-1" data-scroll-x>
            <div className="grid min-w-[440px] grid-cols-12 gap-x-[5px]" role="img" aria-label={`Mapa de estudo de ${year}: ${sum.days} dias com estudo e ${sum.answers} respostas.`}>
              {grid.map((weeks, m) => (
                <div key={m} className="flex min-w-0 flex-col items-center">
                  <span className="mb-1.5 text-[10.5px] font-medium text-[#64666D]">{MONTHS[m]}</span>
                  <div className="flex gap-[2px]">
                    {weeks.map((w, k) => (
                      <div key={k} className="flex flex-col gap-[2px]">
                        {w.map((c, d) =>
                          c.date ? <Cell key={d} level={c.level} future={c.future} title={tip(c.date, c.answers)} small /> : <span key={d} className="cq-cel cq-cel-sm opacity-0" />,
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <>
          <Stepper
            label={`${MONTHS_FULL[month - 1]} ${year}`}
            prev={prevMonth.ano >= 2020 ? url(prevMonth) : null}
            next={nextMonthDisabled ? null : url(nextMonth)}
            prevLabel="Mês anterior"
            nextLabel="Próximo mês"
          />
          <MonthView year={year} month={month} counts={counts} today={today} />
        </>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[12px] text-[#64666D]">
        {([0, 1, 2, 3] as ActivityLevel[]).map((l) => (
          <span key={l} className="inline-flex items-center gap-1.5">
            <span className={`cq-legenda cq-nivel-${l}`} aria-hidden />
            {ACTIVITY_LABELS[l]}
          </span>
        ))}
      </div>
      <p className="mt-2 text-center text-[12px] text-[#8A8C93]">
        {sum.days
          ? `${sum.days} ${sum.days === 1 ? "dia" : "dias"} com estudo e ${sum.answers} ${sum.answers === 1 ? "resposta" : "respostas"} em ${year}.`
          : `Nenhuma resposta registrada em ${year}.`}{" "}
        Conta aulas, Modo Jogo e cadernos.
      </p>
    </section>
  );
}

function Stepper({ label, prev, next, prevLabel, nextLabel }: { label: string; prev: string | null; next: string | null; prevLabel: string; nextLabel: string }) {
  const cls = "flex h-9 w-9 items-center justify-center rounded-full text-[#08090B] transition hover:bg-[#F2F3F5] focus-visible:outline-2 focus-visible:outline-[#E50914]";
  return (
    <div className="my-4 flex items-center justify-center gap-8">
      {prev ? (
        <Link href={prev} scroll={false} className={cls} aria-label={prevLabel}>
          <ChevronLeft className="h-5 w-5" aria-hidden />
        </Link>
      ) : (
        <span className={`${cls} opacity-25`} aria-hidden>
          <ChevronLeft className="h-5 w-5" />
        </span>
      )}
      <span className="min-w-[96px] text-center text-[19px] font-extrabold tabular-nums text-[#08090B]" aria-live="polite">
        {label}
      </span>
      {next ? (
        <Link href={next} scroll={false} className={cls} aria-label={nextLabel}>
          <ChevronRight className="h-5 w-5" aria-hidden />
        </Link>
      ) : (
        <span className={`${cls} opacity-25`} aria-hidden>
          <ChevronRight className="h-5 w-5" />
        </span>
      )}
    </div>
  );
}

function Cell({ level, future, title, small }: { level: ActivityLevel; future: boolean; title: string; small?: boolean }) {
  return <span className={`cq-cel ${small ? "cq-cel-sm" : ""} cq-nivel-${level} ${future ? "cq-cel-futuro" : ""}`} title={title} />;
}

function MonthView({ year, month, counts, today }: { year: number; month: number; counts: ReadonlyMap<string, number>; today: string }) {
  const first = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const days = daysInMonth(year, month);
  const cells: Array<{ day: number; date: string } | null> = [...Array(first).fill(null)];
  for (let d = 1; d <= days; d++) cells.push({ day: d, date: `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}` });
  return (
    <div className="mx-auto grid max-w-[360px] grid-cols-7 gap-1.5" role="grid" aria-label={`${MONTHS_FULL[month - 1]} de ${year}`}>
      {WEEK.map((w, k) => (
        <span key={k} className="text-center text-[11px] font-semibold text-[#8A8C93]" role="columnheader">
          {w}
        </span>
      ))}
      {cells.map((c, k) =>
        c ? (
          <span
            key={k}
            role="gridcell"
            title={tip(c.date, counts.get(c.date) ?? 0)}
            aria-label={tip(c.date, counts.get(c.date) ?? 0)}
            className={`cq-dia cq-nivel-${activityLevel(counts.get(c.date) ?? 0)} ${c.date > today ? "cq-cel-futuro" : ""} ${c.date === today ? "cq-dia-hoje" : ""}`}
          >
            {c.day}
          </span>
        ) : (
          <span key={k} role="gridcell" aria-hidden />
        ),
      )}
    </div>
  );
}
