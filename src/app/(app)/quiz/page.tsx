import { getQuizHome, startRound, DAILY_GOAL } from "@/server/services/quiz";
import { getLives, mensagemTravado } from "@/server/services/game-lives";
import { tipoValido } from "@/domain/quiz/tipos";
import { QuizView } from "./quiz-view";
import { requireUser } from "@/server/auth";
import { getPlanUsage } from "@/server/services/plans";
import { UserFacingError } from "@/server/services/trails";
import { ButtonLink, Notice } from "@/components/ui";

export const metadata = { title: "Modo Jogo" };

export default async function QuizPage({ searchParams }: { searchParams: Promise<{ tema?: string; tipo?: string }> }) {
  const sp = await searchParams;
  const tipo = tipoValido(sp.tipo);
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
  let exhausted = false;
  let tipoUsado = tipo;
  try {
    try {
      round = await startRound(chosen.id, tipo);
    } catch (e) {
      // Link com um tipo que já não tem perguntas inéditas: abre o jogo misturado em vez de travar.
      if (e instanceof UserFacingError && e.code === "quiz_sem_tipo") { tipoUsado = "todas"; round = await startRound(chosen.id, "todas"); } else throw e;
    }
  } catch (e) {
    // Plano gratuito: as questões do dia acabaram; ou o aluno já respondeu todas as perguntas do jogo.
    if (!(e instanceof UserFacingError)) throw e;
    limit = e.message;
    exhausted = e.code === "quiz_exhausted";
    if (e.code === "quiz_locked") {
      const l = await getLives(user.id);
      limit = l.lockedUntil ? mensagemTravado(l.lockedUntil) : e.message;
      return (
        <div className="mx-auto max-w-2xl" data-testid="jogo-sem-vidas">
          <h1 className="t-h1">Modo Jogo</h1>
          <div className="mt-4">
            <Notice tone="alerta" title={`Sem vidas (${l.max} de ${l.max} perdidas)`}>
              {limit}
            </Notice>
          </div>
          <ButtonLink href="/questoes" className="mt-4">
            Estudar em Questões enquanto isso
          </ButtonLink>
        </div>
      );
    }
  }
  if (!round && exhausted) {
    return (
      <div className="mx-auto max-w-2xl" data-testid="jogo-esgotado">
        <h1 className="t-h1">Modo Jogo</h1>
        <div className="mt-4">
          <Notice tone="info" title="Você zerou o Modo Jogo">
            {limit}
          </Notice>
        </div>
        <ButtonLink href="/questoes" className="mt-4">
          Ir para Questões
        </ButtonLink>
      </div>
    );
  }
  if (!round) {
    return (
      <div className="mx-auto max-w-2xl" data-testid="limite-jogo">
        <h1 className="t-h1">Modo Jogo</h1>
        <div className="mt-4">
          <Notice tone="alerta" title="Modo Jogo travado até amanhã">
            {limit}
          </Notice>
        </div>
        <ButtonLink href="/questoes" className="mt-4">
          Estudar em Questões enquanto isso
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
      <QuizView key={`${round.topic.id}:${tipoUsado}`} home={home} initialTipo={tipoUsado} initialRound={round} lives={round.lives.max} dailyGoal={DAILY_GOAL} />
    </>
  );
}
