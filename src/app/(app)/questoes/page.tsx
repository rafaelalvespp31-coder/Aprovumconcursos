import { getQuestionBank } from "@/server/queries";
import { ButtonLink, EmptyState } from "@/components/ui";
import { Icon } from "@/components/icons";
import { BankFiltersForm, parseFilters } from "./filters";
import { Practice } from "./practice";

export const metadata = { title: "Questões" };

export default async function QuestionsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const filters = parseFilters(sp);
  const bank = await getQuestionBank(filters);
  const qs = new URLSearchParams(Object.entries(sp).filter(([, v]) => v) as Array<[string, string]>).toString();

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="sr-only">Questões</h1>
          {bank.total > 0 && <p className="mt-1 text-tinta-suave">
            {bank.questions.length} de {bank.total} questão(ões). Aqui ficam as questões comentadas que estão no conteúdo das suas aulas; as frases da lei ficam no Modo Jogo.
          </p>}
        </div>
        {bank.questions.length > 0 && (
          <ButtonLink href={`/questoes/simulado${qs ? `?${qs}` : ""}`} variant="secundario">
            <Icon name="relogio" className="size-4" /> Fazer simulado
          </ButtonLink>
        )}
      </div>
      {bank.total > 0 && <BankFiltersForm action="/questoes" filters={filters} trails={bank.trails} boards={bank.boards} modules={bank.modules} />}
      {bank.total === 0 ? (
        <EmptyState
          title="Questões de concursos: em breve"
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <ButtonLink href="/trilhas">Ir para os estudos</ButtonLink>
              <ButtonLink href="/quiz" variant="secundario">Abrir o Modo Jogo</ButtonLink>
            </div>
          }
        >
          Aqui vão ficar as questões de provas de concursos catalogadas pela equipe APROVUM. Enquanto isso, pratique com as questões comentadas dentro das aulas e no Modo Jogo.
        </EmptyState>
      ) : bank.questions.length === 0 ? (
        <EmptyState title="Nenhuma questão com esses filtros" action={<ButtonLink href="/questoes" variant="secundario">Limpar filtros</ButtonLink>}>
          Tente outra situação ou dificuldade.
        </EmptyState>
      ) : (
        <Practice questions={bank.questions} />
      )}
    </div>
  );
}
