import { requireUser } from "@/server/auth";
import { getEditaisOverview, type EditaisOverview } from "@/server/services/edital-overview";
import { MeusEditaisView } from "@/components/meus-editais/meus-editais-view";

export const metadata = { title: "Meus Editais" };
export const dynamic = "force-dynamic";

export default async function MeusEditaisPage() {
  const user = await requireUser("/meu-concurso");
  let data: EditaisOverview | null = null;
  try {
    data = await getEditaisOverview(user.id);
  } catch {
    data = null;
  }
  return <MeusEditaisView data={data} />;
}
