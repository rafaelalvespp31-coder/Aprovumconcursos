import Link from "next/link";
import { getQuestionBank } from "@/server/queries";
import { ButtonLink, EmptyState } from "@/components/ui";
import { parseFilters } from "../filters";
import { Simulado } from "./simulado";

export const metadata = { title: "Simulado" };

export default async function SimuladoPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const bank = await getQuestionBank(parseFilters(sp));
  return (
    <div className="flex flex-col gap-5">
      <div>
        <Link href="/questoes" className="t-small text-destaque underline underline-offset-2">Questões</Link>
        <h1 className="mt-1 t-h1">Simulado</h1>
        <p className="mt-1 max-w-2xl text-tinta-suave">
          Questões sorteadas entre as {bank.questions.length} que correspondem aos filtros atuais, com tempo corrido. O gabarito e a análise aparecem só ao final.
        </p>
      </div>
      {bank.questions.length === 0 ? (
        <EmptyState title="Nenhuma questão disponível" action={<ButtonLink href="/questoes">Voltar às questões</ButtonLink>}>
          Ajuste os filtros ou prepare mais aulas.
        </EmptyState>
      ) : (
        <Simulado pool={bank.questions} />
      )}
    </div>
  );
}
