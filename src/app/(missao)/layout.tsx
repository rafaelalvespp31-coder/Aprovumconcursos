import { requireUser } from "@/server/auth";
import { EquipePopup } from "@/components/mentor/equipe-popup";
import { DesafioWatcher } from "@/components/tatico/desafio-watcher";

/** Layout enxuto da Central de Missão: sem menu do app. Mantém só o aviso da Equipe e a presença/convites do Desafio Tático. */
export default async function MissaoLayout({ children }: { children: React.ReactNode }) {
  await requireUser("/missao");
  return (
    <>
      {children}
      <EquipePopup />
      <DesafioWatcher />
    </>
  );
}
