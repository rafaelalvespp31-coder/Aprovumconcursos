import Link from "next/link";
import { BarChart3, ClipboardList, Dumbbell, MessageCircle, PenLine, Shuffle } from "lucide-react";
import { requireUser } from "@/server/auth";
import { aiIsConfigured } from "@/ai";
import { listHistory } from "@/server/services/redacao";
import { Aviso, MODALIDADE_LABEL, Secao, dataBR } from "@/components/redacao/ui";

export const metadata = { title: "Redação Elite" };
export const dynamic = "force-dynamic";

const CARDS = [
  { href: "/redacao/escrever", t: "Escrever redação", d: "Editor com rascunho automático e envio para correção.", Icon: PenLine },
  { href: "/redacao/temas", t: "Desafio de tema", d: "A IA propõe um tema inédito, por categoria ou surpresa.", Icon: Shuffle },
  { href: "/redacao/historico", t: "Histórico", d: "Redações, notas e relatórios anteriores.", Icon: ClipboardList },
  { href: "/redacao/evolucao", t: "Evolução", d: "Notas, competências e erros recorrentes ao longo do tempo.", Icon: BarChart3 },
  { href: "/redacao/exercicios", t: "Exercícios", d: "Treino montado a partir dos seus erros reais.", Icon: Dumbbell },
  { href: "/redacao/professor", t: "Professor", d: "Converse sobre sua redação e seu diagnóstico.", Icon: MessageCircle },
];

export default async function RedacaoHome() {
  const user = await requireUser("/redacao");
  const hist = await listHistory(user.id, 5);
  const rascunho = hist.find((h) => h.status === "rascunho");
  return (
    <div className="flex flex-col gap-4">
      <section className="pc overflow-hidden p-0">
        <div className="bg-[#08090B] p-5 text-white sm:p-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#FF6B73]">APROVUM REDAÇÃO ELITE</p>
          <h2 className="mt-1 text-[22px] font-black leading-tight tracking-[-0.02em] sm:text-[26px]">ESCREVA. CORRIJA. EVOLUA. CONQUISTE.</h2>
          <p className="mt-2 max-w-xl text-[13.5px] text-white/75">Seu professor de redação para ENEM, concursos e vestibulares: correção detalhada, nota justificada, diagnóstico e plano de evolução.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/redacao/escrever" className="pc-botao">Escrever agora</Link>
            {rascunho && <Link href={`/redacao/escrever?id=${rascunho.id}`} className="inline-flex items-center rounded-[12px] border border-white/30 px-4 py-2 text-[13.5px] font-semibold">Continuar rascunho</Link>}
          </div>
        </div>
      </section>
      {!aiIsConfigured("estudos") && <Aviso tom="alerta">O professor de IA ainda não foi ativado neste ambiente (a equipe precisa configurar o provedor de IA). Você já pode escrever e salvar rascunhos; a correção fica disponível assim que a IA for ativada.</Aviso>}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {CARDS.map(({ href, t, d, Icon }) => (
          <Link key={href} href={href} className="pc group flex gap-3 p-4 transition-shadow hover:shadow-md">
            <span className="pc-ico shrink-0"><Icon className="h-4 w-4" aria-hidden /></span>
            <span><span className="block text-[14.5px] font-bold text-[#08090B]">{t}</span><span className="text-[12.5px] text-[#64666D]">{d}</span></span>
          </Link>
        ))}
      </div>
      <Secao titulo="Últimas redações" aside={<Link href="/redacao/historico" className="pc-vertodas">Ver todas</Link>}>
        {hist.length === 0 ? <p className="text-[13px] text-[#64666D]">Você ainda não escreveu nenhuma redação.</p> : (
          <ul className="flex flex-col divide-y divide-[#ECEDF0]">
            {hist.map((h) => (
              <li key={h.id}>
                <Link href={h.status === "rascunho" ? `/redacao/escrever?id=${h.id}` : `/redacao/${h.id}`} className="flex items-center justify-between gap-3 py-2.5">
                  <span className="min-w-0"><span className="block truncate text-[14px] font-bold text-[#08090B]">{h.title}</span><span className="text-[12px] text-[#64666D]">{MODALIDADE_LABEL[h.modality] ?? h.modality} · {dataBR(h.createdAt)}</span></span>
                  {h.score !== null && h.max !== null ? <span className="font-extrabold">{h.score}/{h.max}</span> : <span className="text-[12px] text-[#64666D]">{h.status === "rascunho" ? "Rascunho" : h.status === "processando" ? "Corrigindo…" : h.status === "falhou" ? "Falhou" : ""}</span>}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Secao>
    </div>
  );
}
