import Link from "next/link";
import { requireUser } from "@/server/auth";
import { listHistory } from "@/server/services/redacao";
import { MODALIDADE_LABEL, Secao, dataBR } from "@/components/redacao/ui";

export const metadata = { title: "Histórico de redações" };
export const dynamic = "force-dynamic";

const STATUS: Record<string, string> = { rascunho: "Rascunho", enviada: "Enviada", processando: "Corrigindo…", concluida: "Corrigida", falhou: "Falhou" };

export default async function HistoricoPage() {
  const user = await requireUser("/redacao/historico");
  const itens = await listHistory(user.id);
  return (
    <Secao titulo="Suas redações">
      {itens.length === 0 ? (
        <p className="text-[13.5px] text-[#64666D]">Você ainda não escreveu nenhuma redação. <Link href="/redacao/escrever" className="font-semibold text-[#E50914]">Começar agora</Link></p>
      ) : (
        <ul className="flex flex-col divide-y divide-[#ECEDF0]" data-testid="redacao-historico">
          {itens.map((i) => (
            <li key={i.id}>
              <Link href={i.status === "rascunho" ? `/redacao/escrever?id=${i.id}` : `/redacao/${i.id}`} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <span className="min-w-0">
                  <span className="block text-[14px] font-bold text-[#08090B] [overflow-wrap:anywhere]">{i.title}{i.parentId ? " · reescrita" : ""}</span>
                  <span className="text-[12px] text-[#64666D]">{MODALIDADE_LABEL[i.modality] ?? i.modality} · {i.wordCount} palavras · {dataBR(i.createdAt)} · {STATUS[i.status] ?? i.status}</span>
                </span>
                {i.score !== null && i.max !== null ? <span className="shrink-0 text-[16px] font-extrabold text-[#08090B]">{i.score}<span className="text-[12px] text-[#8A8C93]">/{i.max}</span></span> : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Secao>
  );
}
