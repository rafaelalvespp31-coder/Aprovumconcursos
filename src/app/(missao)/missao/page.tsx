import { requireUser } from "@/server/auth";
import { carregarMissao } from "@/server/services/missao";
import { CentralMissao } from "@/components/missao/central-missao";
import { escolherConcursoAction, sugerirConcursosAction } from "./actions";

export const metadata = { title: "Central de Missão" };
export const dynamic = "force-dynamic";

/** Home pós-login: Mentor 3D, a pergunta e o campo de concurso. O restante do app segue nas rotas de sempre. */
export default async function MissaoPage() {
  const user = await requireUser("/missao");
  const dados = await carregarMissao(user.id).catch(() => ({ primeiroNome: null, objetivo: null, iniciais: [], editais: [] }));
  return <CentralMissao {...dados} email={user.email} sugerir={sugerirConcursosAction} escolher={escolherConcursoAction} />;
}
