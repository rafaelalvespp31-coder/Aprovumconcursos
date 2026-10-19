import Link from "next/link";
import { redirect } from "next/navigation";
import { getTrail, getTrailPlan } from "@/server/queries";
import { requireUser } from "@/server/auth";
import { activateTrail, UserFacingError } from "@/server/services/trails";
import { ButtonLink, Notice } from "@/components/ui";

export const metadata = { title: "Estudo" };

/** Estados em que a aula já está liberada para o aluno, na ordem de preferência. */
const OPEN_STATES = ["em_andamento", "disponivel", "aula_concluida", "em_revisao"];

/**
 * Abrir um estudo (novo ou em andamento) leva direto para a aula: não há mais uma
 * página intermediária com "Começar a estudar" e PDF — o PDF fica dentro da aula.
 * Esta rota só renderiza algo quando não há aula para abrir (falha ou erro).
 */
export default async function TrailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ erro?: string }> }) {
  const { id } = await params;
  const { erro } = await searchParams;
  const trail = await getTrail(id);
  if (trail.status === "pending" || trail.status === "processing" || trail.status === "clarification") redirect(`/trilhas/${id}/processando`);

  if (trail.status === "failed") {
    return (
      <div className="mx-auto max-w-2xl">
        <h1 className="t-h1">{trail.title}</h1>
        <div className="mt-6">
          <Notice tone="erro" title="A preparação deste estudo não foi concluída">
            O conteúdo está salvo. Você pode retomar o processamento a partir da etapa que falhou.
          </Notice>
        </div>
        <ButtonLink href={`/trilhas/${id}/processando`} className="mt-4">Ver e retomar</ButtonLink>
      </div>
    );
  }

  let problem = erro ?? null;
  if (!problem && trail.status === "review") {
    // Estudo recém-montado: libera a primeira aula e segue direto para ela.
    const user = await requireUser();
    try {
      await activateTrail(id, user.id);
    } catch (e) {
      if (!(e instanceof UserFacingError)) throw e;
      problem = e.message;
    }
  }

  if (!problem) {
    const lessons = (await getTrailPlan(id)).flatMap((m) => m.lessons);
    const target =
      OPEN_STATES.map((s) => lessons.find((l) => l.state === s)).find(Boolean) ??
      lessons.find((l) => l.state && l.state !== "nao_iniciada") ??
      lessons[0];
    if (target) redirect(`/aula/${target.id}`);
    problem = "Este estudo ainda não tem aulas.";
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="t-h1">{trail.title}</h1>
      <div className="mt-6">
        <Notice tone="erro" title="Não foi possível abrir a aula">{problem}</Notice>
      </div>
      <Link href="/trilhas" className="mt-4 inline-block font-semibold text-destaque underline underline-offset-2">Voltar para meus estudos</Link>
    </div>
  );
}
