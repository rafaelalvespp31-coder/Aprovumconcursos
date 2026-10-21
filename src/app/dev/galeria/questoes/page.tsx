"use client";

import { useSearchParams } from "next/navigation";
import { QuestionsHome } from "@/app/(app)/questoes/home";
import { todayBr } from "@/domain/notebooks/model";
import { demoActivity, demoNotebooks, demoNotices } from "../questoes-fixtures";
import { demoNotebookActions } from "./demo-actions";

export default function Page() {
  const sp = useSearchParams();
  const today = todayBr();
  const thisYear = Number(today.slice(0, 4));
  const ano = Number(sp.get("ano"));
  const year = Number.isInteger(ano) && ano >= 2020 && ano <= thisYear ? ano : thisYear;
  const mes = Number(sp.get("mes"));
  const month = Number.isInteger(mes) && mes >= 1 && mes <= 12 ? mes : Number(today.slice(5, 7));
  return (
    <QuestionsHome
      notebooks={demoNotebooks}
      notices={demoNotices}
      activity={demoActivity(year)}
      year={year}
      thisYear={thisYear}
      today={today}
      view={sp.get("exibir") === "mensal" ? "mensal" : "anual"}
      month={month}
      base="/dev/galeria"
      actions={demoNotebookActions}
    />
  );
}
