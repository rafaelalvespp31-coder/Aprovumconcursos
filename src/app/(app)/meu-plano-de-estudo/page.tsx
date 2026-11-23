import Link from "next/link";
import { requireUser } from "@/server/auth";
import { computeMentor } from "@/server/services/mentor";
import { brDay } from "@/domain/plans/limits";
import { examDayFrom } from "@/domain/mentor/plano-calendario";
import { PlanoCalendario } from "@/components/mentor/plano-calendario";

export const metadata = { title: "Meu plano de estudo" };
export const dynamic = "force-dynamic";

/** Plano do concurso do aluno em calendário. O aluno vem da sessão; o concurso e o plano, do Mentor. */
export default async function MeuPlanoDeEstudoPage() {
  const user = await requireUser("/meu-plano-de-estudo");
  const m = await computeMentor(user.id);
  const today = brDay().day;
  if (m.goal && m.semEdital && !m.plan) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-[#E4E4E7] bg-white p-6 text-center" data-testid="meu-plano-sem-edital">
        <h1 className="text-[20px] font-extrabold">Meu plano de estudo</h1>
        <p className="mt-2 text-[14px] text-[#64666D]">Ainda não tenho o conteúdo programático de {m.goal.contest}. O plano segue as matérias do edital do concurso, então envie o edital (PDF) e eu monto o seu calendário com elas.</p>
        <Link href="/meu-concurso" className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-[#E10600] px-5 text-[14px] font-bold text-white">Enviar o edital</Link>
      </div>
    );
  }
  if (!m.goal || !m.plan) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-[#E4E4E7] bg-white p-6 text-center" data-testid="meu-plano-vazio">
        <h1 className="text-[20px] font-extrabold">Meu plano de estudo</h1>
        <p className="mt-2 text-[14px] text-[#64666D]">{m.goal ? "Não consegui montar o plano agora. Tente de novo em instantes." : "Diga ao Mentor qual concurso você quer passar e ele monta o seu calendário de estudo, com dias, horas e o que fazer em cada um."}</p>
        <Link href="/mentor" className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-[#E10600] px-5 text-[14px] font-bold text-white">Falar com o Mentor</Link>
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-5xl">
      <PlanoCalendario plan={m.plan} today={today} examDay={examDayFrom(today, m.plan.daysToExam)} />
    </div>
  );
}
