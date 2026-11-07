import Link from "next/link";
import { requireUser } from "@/server/auth";
import { getProgress } from "@/server/services/redacao";
import { Aviso, Linha, MODALIDADE_LABEL, Secao, dataBR } from "@/components/redacao/ui";

export const metadata = { title: "Evolução na redação" };
export const dynamic = "force-dynamic";

const GRUPO: Record<string, string> = { gramatical: "Evolução gramatical (norma culta)", argumentativa: "Evolução argumentativa", estrutural: "Evolução estrutural (tema e organização)", coesao: "Evolução em coesão" };
const curta = (iso: string) => dataBR(iso).slice(0, 5);

export default async function EvolucaoPage() {
  const user = await requireUser("/redacao/evolucao");
  const p = await getProgress(user.id);
  if (p.total === 0)
    return <Secao titulo="Sua evolução"><p className="text-[13.5px] text-[#64666D]">Ainda não há redações corrigidas. <Link href="/redacao/escrever" className="font-semibold text-[#E50914]">Escreva a primeira</Link> para começar a acompanhar a evolução.</p></Secao>;
  return (
    <div className="flex flex-col gap-4" data-testid="redacao-evolucao">
      <Secao titulo="Padrões identificados">
        {!p.insights.suficiente ? (
          <Aviso>Você tem {p.total} redação(ões) corrigida(s). Para identificar padrões confiáveis o professor precisa de pelo menos 3 — faltam {p.insights.faltam}. Até lá, os gráficos mostram só o que já aconteceu, sem conclusões.</Aviso>
        ) : (
          <ul className="flex flex-col gap-2">{p.insights.itens.map((i, n) => <li key={n}><Aviso tom={i.tipo === "atencao" ? "alerta" : "info"}>{i.texto}</Aviso></li>)}</ul>
        )}
      </Secao>
      <div className="grid gap-4 md:grid-cols-2">
        <Secao titulo="Evolução das notas (% de aproveitamento)"><Linha rotulo="Aproveitamento geral" pontos={p.serie.map((s) => ({ x: curta(s.data), y: s.pct }))} /></Secao>
        {Object.entries(p.grupos).map(([g, pts]) => <Secao key={g} titulo={GRUPO[g] ?? g}><Linha rotulo={GRUPO[g] ?? g} pontos={pts.map((x) => ({ x: curta(x.data), y: x.pct }))} /></Secao>)}
        <Secao titulo="Erros por redação (objetivos / total)">
          <ul className="flex flex-col gap-1.5 text-[13px]">
            {p.errosPorRedacao.map((e, i) => <li key={i} className="flex items-center justify-between gap-3 border-b border-[#ECEDF0] pb-1 last:border-0"><span>{curta(e.data)}</span><span className="font-bold">{e.objetivos} / {e.total}</span></li>)}
          </ul>
          <p className="mt-2 text-[12px] text-[#64666D]">Erro objetivo = viola a norma culta. Total inclui construção, argumentação e oportunidades.</p>
        </Secao>
        <Secao titulo="Desempenho por modalidade">
          <ul className="flex flex-col gap-2">
            {p.porModalidade.map((m) => <li key={m.modality}><div className="flex justify-between text-[13px]"><span>{MODALIDADE_LABEL[m.modality] ?? m.modality} <span className="text-[#8A8C93]">({m.n})</span></span><b>{m.media}%</b></div><span className="pc-barra mt-1" role="img" aria-label={`${m.media}%`}><span style={{ width: `${m.media}%` }} /></span></li>)}
          </ul>
        </Secao>
      </div>
    </div>
  );
}
