import Link from "next/link";
import { requireUser } from "@/server/auth";
import { listExercises, weakCategories } from "@/server/services/redacao";
import { categoriaLabel } from "@/domain/redacao/rubricas";
import { GerarExercicio } from "@/components/redacao/exercicio";
import { Secao, dataBR } from "@/components/redacao/ui";

export const metadata = { title: "Exercícios de redação" };
export const dynamic = "force-dynamic";

export default async function ExerciciosPage() {
  const user = await requireUser("/redacao/exercicios");
  const [lista, fracas] = await Promise.all([listExercises(user.id), weakCategories(user.id)]);
  return (
    <div className="flex flex-col gap-4">
      <Secao titulo="Novo exercício personalizado">
        {fracas.length === 0 ? (
          <p className="text-[13.5px] text-[#64666D]">Os exercícios são criados a partir dos seus erros reais. <Link href="/redacao/escrever" className="font-semibold text-[#E50914]">Envie uma redação</Link> para receber exercícios sob medida.</p>
        ) : (
          <>
            <p className="mb-3 text-[13px] text-[#64666D]">Escolha a dificuldade que mais apareceu nas suas redações:</p>
            <GerarExercicio fracas={fracas} />
          </>
        )}
      </Secao>
      <Secao titulo="Seus exercícios">
        {lista.length === 0 ? <p className="text-[13px] text-[#64666D]">Nenhum exercício ainda.</p> : (
          <ul className="flex flex-col divide-y divide-[#ECEDF0]">
            {lista.map((e) => (
              <li key={e.id}>
                <Link href={`/redacao/exercicios/${e.id}`} className="flex items-center justify-between gap-3 py-3">
                  <span><span className="block text-[14px] font-bold text-[#08090B]">{categoriaLabel(e.category)}</span><span className="text-[12px] text-[#64666D]">{dataBR(e.createdAt)} · {e.status === "corrigido" ? "corrigido" : "em aberto"}</span></span>
                  {e.score !== null && e.max !== null && <span className="font-extrabold">{e.score}/{e.max}</span>}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Secao>
    </div>
  );
}
