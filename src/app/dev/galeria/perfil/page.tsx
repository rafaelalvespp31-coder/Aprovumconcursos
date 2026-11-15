import { PastelProfile } from "@/app/(app)/perfil/pastel-profile";
import { PastelCard } from "@/components/pastel/card";
import { ProfileForm } from "@/app/(app)/perfil/form";
import { PainelAdmin } from "@/app/(app)/perfil/painel-admin";
import { computeGamification } from "@/domain/progress/gamification";
import { dashboard, studyStats } from "../fixtures";

export default function Page() {
  return (
    <PastelProfile
      p={{
        name: "Rafael",
        planLabel: "Gratuito",
        email: "exemplo@nivelaprovado.dev",
        since: "2026-06-01T12:00:00Z",
        now: "2026-10-10T12:00:00Z",
        gamification: computeGamification(studyStats),
        themesPassed: studyStats.themesPassed,
        goals: dashboard.goals,
        today: { answered: dashboard.today.answered },
        weekLessonsCompleted: dashboard.weekLessonsCompleted,
      }}
    >
      <PainelAdmin admin items={[{ href: "/admin/catalogo/enviar", label: "Catalogar aula" }, { href: "/banco", label: "Banco de questões" }, { href: "/admin/alunos", label: "Alunos e planos" }]} notes={[{ id: "1", title: "Novo pedido de Raio-X", detail: "Aluno: exemplo", when: "hoje", href: "/admin" }]} />
      <PastelCard noTilt className="p-6">
        <h2 className="mb-1 font-[Space_Grotesk] text-[20px] font-[800] leading-tight">Dados e metas</h2>
        <p className="mb-5 text-[12px] text-[#4D4D4D]">Edite e veja a prévia na hora. Nada muda até você salvar.</p>
        <ProfileForm displayName="Rafael Alves" whatsapp={null} motto="VOU CHEGAR EM VOCÊ. ABREU !!!" birthDate={null} avatarGender="m" dailyQuestions={20} weeklyLessons={5} />
      </PastelCard>
    </PastelProfile>
  );
}
