import { requireUser } from "@/server/auth";
import { computeMentor } from "@/server/services/mentor";
import { getRaioXNotices } from "@/server/services/raiox-notice";
import { MentorView } from "@/components/mentor/mentor-view";

export const metadata = { title: "Mentor" };

/** O Mentor do aluno logado: o usuário vem da sessão (nunca de parâmetro do navegador). */
export default async function MentorPage() {
  const user = await requireUser("/mentor");
  const m = await computeMentor(user.id);
  const notices = await getRaioXNotices(user.id).catch(() => []);
  return <MentorView name={m.name} result={m.result} visible={m.visible} lessons={m.lessons} notices={notices.map((n) => ({ prepId: n.prepId, title: n.title, href: n.href }))} />;
}
