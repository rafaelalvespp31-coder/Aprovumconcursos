import { cookies } from "next/headers";
import { requireUser } from "@/server/auth";
import { carregarMissao } from "@/server/services/missao";
import { getShellSummary, getStudySeconds, getStudyStats, listTrailProgress } from "@/server/queries";
import { CentralMissao } from "@/components/missao/central-missao";
import { COOKIE_INTRO } from "@/components/missao/intro-constantes";

export const metadata = { title: "Central de Missão" };
export const dynamic = "force-dynamic";

/** Home pós-login: Mentor, a pergunta e os quadrados dos concursos publicados e das matérias catalogadas. O restante do app segue nas rotas de sempre. */
export default async function MissaoPage() {
  const user = await requireUser("/painel");
  // O plano pinta o menu inferior do celular (mesmas cores do resto do app); em paralelo, sem atrasar a home.
  const [dados, plano, indicadores] = await Promise.all([
    carregarMissao(user.id).catch(() => ({ primeiroNome: null, objetivo: null, materias: [], concursos: [] })),
    getShellSummary(user.email ?? null).then((r) => r.plan).catch(() => "gratuito" as const),
    // números reais do aluno (tempo de estudo, questões, acerto e aulas concluídas); se alguma consulta falhar, o campo some em vez de inventar
    Promise.all([getStudySeconds(), getStudyStats(), listTrailProgress()])
      .then(([segundos, stats, trilhas]) => {
        const aulas = Object.values(trilhas).reduce((a, t) => ({ done: a.done + t.done, total: a.total + t.total }), { done: 0, total: 0 });
        return {
          horas: Math.floor(segundos / 3600),
          questoes: stats.answered,
          aproveitamento: stats.answered > 0 ? Math.round((stats.correct / stats.answered) * 100) : null,
          concluido: aulas.total > 0 ? Math.round((aulas.done / aulas.total) * 100) : 0,
        };
      })
      .catch(() => null),
  ]);
  // a abertura com o retrato aparece uma vez por sessão do navegador (cookie de sessão gravado ao tocar em "Começar a estudar")
  const intro = (await cookies()).get(COOKIE_INTRO)?.value !== "1";
  return <CentralMissao {...dados} email={user.email} intro={intro} plano={plano} indicadores={indicadores} />;
}
