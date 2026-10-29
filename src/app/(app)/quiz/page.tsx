import { getQuizHome, startRound, DAILY_GOAL, LIVES } from "@/server/services/quiz";
import { QuizView } from "./quiz-view";
import { requireUser } from "@/server/auth";
import { getPlanUsage } from "@/server/services/plans";
import { UserFacingError } from "@/server/services/trails";
import { ButtonLink, Notice } from "@/components/ui";

export const metadata = { title: "Modo Jogo" };

export default async function QuizPage({ searchParams }: { searchParams: Promise<{ tema?: string }> }) {
  const sp = await searchParams;
  const home = await getQuizHome();
  if (!home.topics.length) {
    return (
      <div className="mx-auto max-w-2xl">
        <h1 className="t-h1">Modo Jogo</h1>
        <p className="mt-2 text-tinta-suave">Ainda não há conteúdos do catálogo com texto de lei para o Modo Jogo. Volte em breve.</p>
      </div>
    );
  }
  // Tema escolhido, ou o de menor progresso.
  const chosen =
    home.topics.find((t) => t.id === sp.tema) ??
    [...home.topics].sort((a, b) => a.mastered / a.total - b.mastered / b.total)[0]!;
  const user = await requireUser("/quiz");
  const usage = await getPlanUsage(user.id);
  let round: Awaited<ReturnType<typeof startRound>> | null = null;
  let limit: string | null = null;
  try {
    round = await startRound(chosen.id);
  } catch (e) {
    // Plano gratuito: as questões do dia no Modo Jogo acabaram.
    if (!(e instanceof UserFacingError)) throw e;
    limit = e.message;
  }
  if (!round) {
    return (
      <div className="mx-auto max-w-2xl" data-testid="limite-jogo">
        <h1 className="t-h1">Modo Jogo</h1>
        <div className="mt-4">
          <Notice tone="alerta" title="Limite diário do plano gratuito">
            {limit}
          </Notice>
        </div>
        <ButtonLink href="/perfil#plano" className="mt-4">
          Ver planos
        </ButtonLink>
      </div>
    );
  }
  return (
    <>
      {!usage.unlimited && usage.gameLeft !== null && (
        <p className="mb-3 rounded-[12px] border border-[#E6E7EB] bg-white px-3 py-2 text-[13px] text-[#08090B]" data-testid="cota-jogo">
          Plano gratuito: {usage.gameLeft === 1 ? "resta 1 questão" : `restam ${usage.gameLeft} questões`} no Modo Jogo hoje.
        </p>
      )}
      <QuizView key={chosen.id} home={home} initialRound={round} lives={LIVES} dailyGoal={DAILY_GOAL} />
    </>
  );
}
