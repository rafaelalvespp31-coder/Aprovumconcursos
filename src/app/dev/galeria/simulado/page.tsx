import { Simulado } from "@/app/(app)/questoes/simulado/simulado";
import { bank } from "../fixtures";

export default function Page() {
  return (
    <div className="flex flex-col gap-5">
      <h1 className="t-h1">Simulado</h1>
      <Simulado pool={bank} />
    </div>
  );
}
