"use client";

import type { Notebook, Notice } from "@/server/services/notebooks";
import { NotebooksCard, type NotebookActions } from "./notebooks-card";
import { NoticesCard } from "./notices-card";
import { ActivityCard } from "./activity-card";

export function QuestionsHome({
  notebooks,
  notices,
  activity,
  year,
  thisYear,
  today,
  view,
  month,
  base,
  actions,
}: {
  notebooks: Notebook[];
  notices: Notice[];
  activity: Array<[string, number]>;
  year: number;
  thisYear: number;
  today: string;
  view: "anual" | "mensal";
  month: number;
  /** Prefixo das rotas (a galeria usa /dev/galeria). */
  base: string;
  /** A galeria troca as ações do servidor por uma versão em memória. */
  actions?: NotebookActions;
}) {
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.42fr)_minmax(0,1fr)] xl:gap-6" data-testid="questoes-home">
      <NotebooksCard notebooks={notebooks} base={base} actions={actions} />
      <div className="flex min-w-0 flex-col gap-5 xl:gap-6">
        <NoticesCard notices={notices} base={base} />
        <ActivityCard activity={activity} year={year} thisYear={thisYear} today={today} view={view} month={month} base={base} />
      </div>
    </div>
  );
}
