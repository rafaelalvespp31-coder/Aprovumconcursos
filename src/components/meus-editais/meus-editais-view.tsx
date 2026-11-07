import Link from "next/link";
import { ArrowRight, BookOpen, ChevronRight, CircleAlert, CircleCheck, CircleHelp, FileText, Plus } from "lucide-react";
import type { EditaisOverview } from "@/server/services/edital-overview";
import { EditalCard } from "./edital-card";
import "./meus-editais.css";

const fmt = (n: number) => n.toLocaleString("pt-BR");

/** Tela "Meus Editais" (dados reais vêm da página; null = falha ao carregar). */
export function MeusEditaisView({ data }: { data: EditaisOverview | null }) {
  const cards = data?.cards ?? [];
  const t = data?.totals;
  // Indicadores do topo = soma do progresso REAL de cada edital pronto (nada fictício).
  const ready = cards.filter((c) => c.status === "concluido" && c.progress);
  const hasProg = ready.length > 0;
  const lessons = ready.reduce((s, c) => s + (c.progress?.lessons ?? 0), 0);
  const lessonsDone = ready.reduce((s, c) => s + (c.progress?.lessonsDone ?? 0), 0);
  const pending = ready.reduce((s, c) => s + Math.max(0, (c.progress?.topics ?? 0) - (c.progress?.topicsDone ?? 0)), 0);
  // "Ver relatório": o Raio-X publicado mais recente; senão o Raio-X do edital pronto mais recente (mostra o status da análise).
  const withRaio = cards.find((c) => c.status === "concluido" && c.raioX.available);
  const firstReady = cards.find((c) => c.status === "concluido");
  const strategyHref = withRaio ? `/meu-concurso/${withRaio.id}?aba=raiox` : firstReady ? `/meu-concurso/${firstReady.id}?aba=raiox` : "/aprovum-ai";
  const pendingHref = firstReady ? `/meu-concurso/${firstReady.id}?aba=visao` : "/trilhas";

  const kpis = [
    { href: "/trilhas", icon: BookOpen, n: hasProg ? fmt(lessons) : "—", label: "Aulas disponíveis", tone: "borda" },
    { href: "/trilhas", icon: CircleCheck, n: hasProg ? fmt(lessonsDone) : "—", label: "Aulas concluídas", tone: "" },
    { href: pendingHref, icon: null, n: hasProg ? fmt(pending) : "—", label: "Tópicos pendentes", tone: "borda" },
    { href: "/desempenho", icon: CircleHelp, n: t ? fmt(t.questions) : "—", label: "Questões respondidas", tone: "borda" },
  ] as const;

  return (
    <div className="me-root">
      <section className="me-hero" aria-labelledby="me-titulo">
        <div className="me-hero-txt">
          <h1 id="me-titulo" className="me-in">
            <span className="me-sr">Meus Editais — </span>
            {/* eslint-disable-next-line @next/next/no-img-element -- arte fixa da marca (lettering) */}
            <img className="me-titulo-img" src="/meus-editais/ref-titulo.webp" alt="Fala, Guerreiro!" width={390} height={122} fetchPriority="high" decoding="async" />
          </h1>
          <p className="me-sub me-in" style={{ ["--d" as string]: ".06s" }}>Sua jornada rumo à aprovação continua. Vamos evoluir?</p>
          {/* eslint-disable-next-line @next/next/no-img-element -- selo fixo da marca */}
          <img className="me-foco me-in" style={{ ["--d" as string]: ".1s" }} src="/meus-editais/ref-foco.webp" alt="Foco, disciplina, aprovação" width={350} height={55} decoding="async" />
        </div>
        <div className="me-hero-arte" aria-hidden>
          {/* eslint-disable-next-line @next/next/no-img-element -- arte fixa da marca */}
          <img src="/meus-editais/ref-soldado.webp" alt="" width={412} height={490} fetchPriority="high" decoding="async" />
        </div>
      </section>

      <section className="me-kpis" aria-label="Indicadores gerais">
        {kpis.map((k, i) => {
          const Ic = k.icon;
          return (
            <Link key={k.label} href={k.href} className="me-kpi me-in" data-borda={k.tone || undefined} style={{ ["--d" as string]: `${0.12 + i * 0.05}s` }}>
              <span className="me-kpi-ic" aria-hidden>
                {Ic ? <Ic /> : <span className="me-barras"><i /><i /><i /></span>}
              </span>
              <b>{k.n}</b>
              <span className="me-kpi-l">{k.label}</span>
              <span className="me-kpi-go" aria-hidden><ArrowRight /></span>
            </Link>
          );
        })}
      </section>

      <div className="me-secao me-in" style={{ ["--d" as string]: ".3s" }}>
        <h2><span className="me-riscos" aria-hidden><i /><i /><i /></span>PROGRESSO POR EDITAL</h2>
        <Link href="/desempenho" className="me-detalhes">VER DETALHES <ArrowRight aria-hidden /></Link>
      </div>
      {t && (
        <p className="me-resumo me-in" style={{ ["--d" as string]: ".32s" }}>
          <span><b>{fmt(t.analyzed)}</b> {t.analyzed === 1 ? "edital analisado" : "editais analisados"}</span>
          <span>Média de conclusão: <b>{t.avgPct === null ? "sem dados suficientes" : `${t.avgPct}%`}</b></span>
          <span>Evolução (7 dias): <b>{t.evolution7d === null ? "sem dados suficientes" : `${t.evolution7d > 0 ? "+" : ""}${t.evolution7d}%`}</b></span>
        </p>
      )}

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
            <Link href="/aprovum-ai" className="me-novo me-in" style={{ ["--d" as string]: `${0.3 + cards.length * 0.07}s` }}>
              <span aria-hidden><Plus /></span>ENVIAR NOVO EDITAL
            </Link>
          )}
        </section>
      )}

      <Link href={strategyHref} className="me-relat me-in" style={{ ["--d" as string]: ".4s" }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- arte fixa da marca */}
        <img className="me-relat-arte" src="/meus-editais/ref-cerebro.webp" alt="" width={382} height={164} loading="lazy" decoding="async" />
        <span className="me-relat-txt"><em>VER RELATÓRIO</em><em>COMPLETO DO EDITAL</em></span>
        <span className="me-relat-go" aria-hidden><ChevronRight /></span>
      </Link>
    </div>
  );
}
