import { getQuizHome, startRound, DAILY_GOAL, LIVES } from "@/server/services/quiz";
import { QuizView } from "./quiz-view";
import { requireUser } from "@/server/auth";
import { getPlanUsage } from "@/server/services/plans";
import { UserFacingError } from "@/server/services/trails";
import { ButtonLink, Notice } from "@/components/ui";
import Link from "next/link";
import { Zap } from "lucide-react";

/** Entrada do Desafio rápido (rodadas de 10 perguntas curtas, de todas as matérias). */
function RapidoCard() {
  return (
    <Link href="/quiz/rapido" className="mt-4 mb-3 flex min-h-16 items-center gap-3 rounded-[18px] border border-[#E6E7EB] bg-white px-4 transition-[transform,border-color] duration-150 hover:border-[#E10600]/50 active:scale-[0.98] motion-reduce:transition-none" data-testid="rapido-entrada">
      <span className="grid h-10 w-10 place-items-center rounded-[12px] bg-[#E10600] text-white">
        <Zap className="h-5 w-5" aria-hidden />
      </span>
      <span className="flex-1">
        <span className="block text-[14px] font-extrabold text-[#08090B]">Desafio rápido</span>
        <span className="block text-[12px] text-[#64666D]">Português, Matemática, CTB, Penal e mais: 10 perguntas curtas</span>
      </span>
    </Link>
  );
}

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
  let exhausted = false;
  try {
    round = await startRound(chosen.id);
  } catch (e) {
    // Plano gratuito: as questões do dia acabaram; ou o aluno já respondeu todas as perguntas do jogo.
    if (!(e instanceof UserFacingError)) throw e;
    limit = e.message;
    exhausted = e.code === "quiz_exhausted";
  }
  if (!round && exhausted) {
    return (
      <div className="mx-auto max-w-2xl" data-testid="jogo-esgotado">
        <h1 className="t-h1">Modo Jogo</h1>
        <div className="mt-4">
          <RapidoCard />
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
      <QuizView key={round.topic.id} home={home} initialRound={round} lives={LIVES} dailyGoal={DAILY_GOAL} extra={<RapidoCard />} />
    </>
  );
}
