import { requireUser } from "@/server/auth";
import { carregarMissao } from "@/server/services/missao";
import { CentralMissao } from "@/components/missao/central-missao";

export const metadata = { title: "Central de Missão" };
export const dynamic = "force-dynamic";

/** Home pós-login: Mentor, a pergunta e os quadrados dos concursos publicados e das matérias catalogadas. O restante do app segue nas rotas de sempre. */
export default async function MissaoPage() {
  const user = await requireUser("/painel");
  const dados = await carregarMissao(user.id).catch(() => ({ primeiroNome: null, objetivo: null, materias: [], concursos: [] }));
  return <CentralMissao {...dados} email={user.email} />;
}
