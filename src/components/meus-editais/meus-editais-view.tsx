import Link from "next/link";
import { ChevronRight, CircleAlert, Crosshair, FileText, Play, Plus, Trophy } from "lucide-react";
import type { EditaisOverview } from "@/server/services/edital-overview";
import { EditalCard } from "./edital-card";
import { ProgressRing } from "./progress-ring";
import "./meus-editais.css";

const fmt = (n: number) => n.toLocaleString("pt-BR");

/** Tela "Meus Editais" (dados reais vêm da página; null = falha ao carregar). */
export function MeusEditaisView({ data }: { data: EditaisOverview | null }) {
  const cards = data?.cards ?? [];
  const t = data?.totals;
  // "Ver estratégia": o Raio-X publicado mais recente; senão o Raio-X do edital pronto mais recente (mostra o status da análise).
  const withRaio = cards.find((c) => c.status === "concluido" && c.raioX.available);
  const firstReady = cards.find((c) => c.status === "concluido");
  const strategyHref = withRaio ? `/meu-concurso/${withRaio.id}?aba=raiox` : firstReady ? `/meu-concurso/${firstReady.id}?aba=raiox` : "/aprovum-ai";

  return (
    <div className="me-root">
      <section className="me-hero" aria-labelledby="me-titulo">
        <div className="me-hero-txt">
          <p className="me-kicker me-in"><Crosshair aria-hidden />MEUS EDITAIS</p>
          <h1 id="me-titulo" className="me-titulo me-in" style={{ ["--d" as string]: ".05s" }}>Sua preparação, focada no seu <span>objetivo!</span></h1>
          <p className="me-sub me-in" style={{ ["--d" as string]: ".1s" }}>Acompanhe e analise todos os editais que você já cadastrou e analisou com a APROVUM.</p>
          <Link href="/desempenho" className="me-cta me-in" style={{ ["--d" as string]: ".15s" }}>
            <span className="me-cta-play" aria-hidden><Play /></span>Ver Análise Geral
          </Link>
        </div>
        <div className="me-hero-arte" aria-hidden>
          {/* eslint-disable-next-line @next/next/no-img-element -- arte fixa da marca */}
          <img src="/meus-editais/hero.webp" alt="" width={918} height={672} fetchPriority="high" decoding="async" />
        </div>
      </section>

      <section className="me-kpis me-in" style={{ ["--d" as string]: ".18s" }} aria-label="Indicadores gerais">
        <div className="me-kpi">
          <FileText className="me-kpi-ic" aria-hidden />
          <div><b>{t ? fmt(t.analyzed) : "—"}</b><span>Editais Analisados</span></div>
        </div>
        <div className="me-kpi">
          <ProgressRing pct={t?.avgPct ?? null} size={60} stroke={6} tone={t?.avgPct ? "red" : "gray"}>
            <b className="me-kpi-ring">{t?.avgPct === null || !t ? "—" : `${t.avgPct}%`}</b>
          </ProgressRing>
          <div>{t?.avgPct === null || !t ? <em>Sem dados suficientes</em> : null}<span>Média de Conclusão</span></div>
        </div>
        <div className="me-kpi">
          <span className="me-barras" aria-hidden><i /><i /><i /></span>
          <div>
            {t?.evolution7d === null || !t ? <em>Sem dados suficientes</em> : <b>{t.evolution7d > 0 ? "+" : ""}{t.evolution7d}%</b>}
            <span>Evolução (7 dias)</span>
          </div>
        </div>
        <div className="me-kpi">
          <Trophy className="me-kpi-ic" aria-hidden />
          <div><b>{t ? fmt(t.questions) : "—"}</b><span>Questões Analisadas</span></div>
        </div>
      </section>

      {(!data || data.progressError) && (
        <p className="me-aviso" role="alert">
          <CircleAlert aria-hidden />
          {!data ? "Não foi possível carregar seus editais agora. Tente atualizar a página em instantes." : "Não foi possível calcular o progresso agora. Seus editais continuam aqui; tente atualizar em instantes."}
        </p>
      )}

      {data && cards.length === 0 ? (
        <section className="me-vazio me-in" style={{ ["--d" as string]: ".2s" }}>
          <div className="me-vazio-arte" aria-hidden><FileText /><span /></div>
          <h2>Você ainda não possui editais analisados.</h2>
          <p>Adicione seu primeiro edital e deixe a APROVUM organizar sua preparação.</p>
          <Link href="/aprovum-ai" className="me-btn me-btn-vermelho">ENVIAR NOVO EDITAL <ChevronRight aria-hidden /></Link>
        </section>
      ) : (
        <section className="me-lista" aria-label="Seus editais">
          {cards.map((c, i) => <EditalCard key={c.id} c={c} index={i} />)}
          {data && (
            <Link href="/aprovum-ai" className="me-novo me-in" style={{ ["--d" as string]: `${0.15 + cards.length * 0.07}s` }}>
              <span aria-hidden><Plus /></span>ENVIAR NOVO EDITAL
            </Link>
          )}
        </section>
      )}

      <section className="me-estrategia me-in" style={{ ["--d" as string]: ".3s" }} aria-labelledby="me-estrategia-t">
        {/* eslint-disable-next-line @next/next/no-img-element -- arte fixa da marca */}
        <img className="me-estrategia-alvo" src="/meus-editais/alvo.webp" alt="" width={264} height={268} loading="lazy" decoding="async" />
        <div className="me-estrategia-txt">
          <p className="me-estrategia-k">ESTRATÉGIA APROVUM</p>
          <h2 id="me-estrategia-t">Estude com inteligência!</h2>
          <p>Use os dados do seu desempenho para focar no que realmente importa.</p>
        </div>
        <Link href={strategyHref} className="me-btn me-btn-contorno">Ver Estratégia <span aria-hidden><ChevronRight /></span></Link>
        {/* eslint-disable-next-line @next/next/no-img-element -- arte fixa da marca */}
        <img className="me-estrategia-rei" src="/meus-editais/xadrez.webp" alt="" width={208} height={352} loading="lazy" decoding="async" />
      </section>
    </div>
  );
}
