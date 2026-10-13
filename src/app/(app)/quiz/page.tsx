import { getQuizHome, startRound, DAILY_GOAL, LIVES } from "@/server/services/quiz";
import { QuizView } from "./quiz-view";

export const metadata = { title: "Quiz" };

export default async function QuizPage({ searchParams }: { searchParams: Promise<{ tema?: string }> }) {
  const sp = await searchParams;
  const home = await getQuizHome();
  if (!home.topics.length) {
    return (
      <div className="mx-auto max-w-2xl">
        <h1 className="t-h1">Quiz</h1>
        <p className="mt-2 text-tinta-suave">Ainda não há conteúdos do catálogo com texto de lei para o quiz. Volte em breve.</p>
      </div>
    );
  }
  // Tema escolhido, ou o de menor progresso.
  const chosen =
    home.topics.find((t) => t.id === sp.tema) ??
    [...home.topics].sort((a, b) => a.mastered / a.total - b.mastered / b.total)[0]!;
  const round = await startRound(chosen.id);
  return <QuizView key={chosen.id} home={home} initialRound={round} lives={LIVES} dailyGoal={DAILY_GOAL} />;
}
