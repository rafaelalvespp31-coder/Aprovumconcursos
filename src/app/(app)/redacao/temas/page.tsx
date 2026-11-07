import { requireUser } from "@/server/auth";
import { aiIsConfigured } from "@/ai";
import { listCategories, listThemes } from "@/server/services/redacao";
import { Temas } from "@/components/redacao/temas";

export const metadata = { title: "Desafio de Redação" };
export const dynamic = "force-dynamic";

export default async function TemasPage() {
  const user = await requireUser("/redacao/temas");
  const [cats, temas] = await Promise.all([listCategories(), listThemes(user.id)]);
  return <Temas categorias={cats} temas={temas} iaAtiva={aiIsConfigured("estudos")} />;
}
