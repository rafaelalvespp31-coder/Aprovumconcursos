import { requireUser } from "@/server/auth";
import { listNotebooks, listNotices, yearActivity } from "@/server/services/notebooks";
import { todayBr } from "@/domain/notebooks/model";
import { QuestionsHome } from "./home";

export const metadata = { title: "Cadernos de Questões" };

/**
 * Menu Questões: cadernos de questões de concurso (filtros salvos do banco revisado),
 * avisos da plataforma e o mapa anual de estudo. Tudo vem do banco, do próprio aluno.
 */
export default async function QuestionsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireUser("/questoes");
  const sp = await searchParams;
  const today = todayBr();
  const thisYear = Number(today.slice(0, 4));
  const year = clampInt(sp.ano, 2020, thisYear, thisYear);
  const view = sp.exibir === "mensal" ? "mensal" : "anual";
  const month = clampInt(sp.mes, 1, 12, year === thisYear ? Number(today.slice(5, 7)) : 12);
  const [notebooks, notices, activity] = await Promise.all([listNotebooks(user.id), listNotices(), yearActivity(year)]);
  return <QuestionsHome notebooks={notebooks} notices={notices} activity={activity} year={year} thisYear={thisYear} today={today} view={view} month={month} base="" />;
}

function clampInt(raw: string | undefined, min: number, max: number, fallback: number) {
  const n = Number(raw);
  return Number.isInteger(n) && n >= min && n <= max ? n : fallback;
}
