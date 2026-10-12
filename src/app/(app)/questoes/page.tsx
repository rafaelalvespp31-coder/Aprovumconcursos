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
          <p className="mt-1 text-tinta-suave">
            {bank.questions.length} de {bank.total} questão(ões). Todas são originais, elaboradas para treino a partir das suas aulas.
          </p>
        </div>
        {bank.questions.length > 0 && (
          <ButtonLink href={`/questoes/simulado${qs ? `?${qs}` : ""}`} variant="secundario">
            <Icon name="relogio" className="size-4" /> Fazer simulado
          </ButtonLink>
        )}
      </div>
      <BankFiltersForm action="/questoes" filters={filters} trails={bank.trails} boards={bank.boards} modules={bank.modules} />
      {bank.total === 0 ? (
        <EmptyState title="Ainda não há questões" action={<ButtonLink href="/trilhas">Ir para os estudos</ButtonLink>}>
          As questões aparecem aqui depois que você prepara as aulas de um estudo.
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
