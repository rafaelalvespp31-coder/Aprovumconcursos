import Link from "next/link";
import type { PreparationTree } from "@/server/services/edital-view";
import "./visao-geral.css";

const fmt = (n: number) => n.toLocaleString("pt-BR");
const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Arte da disciplina (as 4 artes da referência): por assunto; as demais alternam pela posição. */
function arte(name: string, i: number): number {
  const n = norm(name);
  if (/portugu|reda[cç]|interpreta|lingua/.test(n)) return 1;
  if (/matem|calcul|estatist|financ/.test(n)) return 2;
  if (/racioc|logic|informat/.test(n)) return 3;
  if (/especific|direito|legisla|constitu|penal|administr/.test(n)) return 4;
  return (i % 4) + 1;
}

const RAIO = 44;
const CIRC = 2 * Math.PI * RAIO;

/** Aba "Visão geral" do edital: clone da referência, com os dados reais deste edital. */
export function VisaoGeral({ tree }: { tree: PreparationTree }) {
  const { prep, disciplines, totals } = tree;
  const base = `/meu-concurso/${prep.id}`;
  const kpis = [
    { href: `${base}?aba=aulas`, n: totals.lessonsAvailable, l: "Aulas disponíveis", ic: "ic1", red: true },
    { href: `${base}?aba=desempenho`, n: totals.lessonsDone, l: "Aulas concluídas", ic: "ic2", red: false },
    { href: `${base}?aba=aulas`, n: totals.pending, l: "Tópicos pendentes", ic: "ic3", red: true },
    { href: `${base}?aba=questoes`, n: totals.questionsAnswered, l: "Questões respondidas", ic: "ic4", red: true },
  ];
  return (
    <section className="vg-wrap" aria-label="Visão geral" data-testid="visao-geral">
      <div className="vg">
        <div className="vg-hero">
          {/* eslint-disable @next/next/no-img-element -- artes fixas da marca, recortadas da referência */}
          <img className="vg-riscos" src="/visao-geral/riscos.webp" alt="" aria-hidden width={76} height={142} />
          <img className="vg-arte" src="/meus-editais/ref-soldado.webp" alt="" aria-hidden width={412} height={490} fetchPriority="high" decoding="async" />
          <img className="vg-titulo" src="/meus-editais/ref-titulo.webp" alt="Fala, Guerreiro!" width={390} height={122} decoding="async" />
          <p className="vg-sub">Sua jornada rumo à aprovação continua. Vamos evoluir?</p>
          <img className="vg-foco" src="/meus-editais/ref-foco.webp" alt="Foco, disciplina, aprovação" width={350} height={55} decoding="async" />
        </div>

        <nav className="vg-kpis" aria-label="Indicadores do edital">
          {kpis.map((k, i) => (
            <Link key={k.l} href={k.href} className="vg-kpi" style={{ backgroundImage: `url(/visao-geral/k${i + 1}.webp)`, ["--d" as string]: `${i * 0.05}s` }}>
              <img className="vg-kic" src={`/visao-geral/${k.ic}.webp`} alt="" aria-hidden decoding="async" />
              <b>{fmt(k.n)}</b>
              <span>{k.l}</span>
              <img className="vg-kgo" src="/visao-geral/kseta.webp" alt="" aria-hidden decoding="async" />
            </Link>
          ))}
        </nav>

        <div className="vg-sec">
          <div className="vg-barra" style={{ backgroundImage: "url(/visao-geral/barra.webp)" }}><h2>PROGRESSO POR DISCIPLINA</h2></div>
          <Link href={`${base}?aba=desempenho`} className="vg-detalhes" aria-label="Ver detalhes do desempenho">
            <img src="/visao-geral/detalhes.webp" alt="" aria-hidden width={204} height={60} decoding="async" />
          </Link>
        </div>
        <p className="vg-resumo">{fmt(disciplines.length)} {disciplines.length === 1 ? "disciplina" : "disciplinas"} · Progresso no edital: <b>{totals.pct}%</b></p>

        {disciplines.length === 0 ? (
          <p className="vg-vazio">As disciplinas deste edital ainda estão sendo organizadas.</p>
        ) : (
          <div className="vg-lista">
            {disciplines.map((d, i) => (
              <Link key={d.id} href={`${base}?aba=aulas`} className="vg-row" style={{ backgroundImage: "url(/visao-geral/painel.webp)", ["--d" as string]: `${0.2 + i * 0.05}s` }} aria-label={`${d.name}: ${d.pct}% concluído`}>
                <img className="vg-thumb" src={`/meus-editais/ref-disc-${arte(d.name, i)}.webp`} alt="" aria-hidden width={202} height={114} loading="lazy" decoding="async" />
                <span className="vg-info">
                  <b>{d.name}</b>
                  <small>{d.topics.length} tópicos • {d.doneCount} concluídos</small>
                  <span className="vg-trilho"><i style={{ width: `${d.pct}%` }} /></span>
                </span>
                <span className="vg-anel" style={{ backgroundImage: "url(/visao-geral/anel.webp)" }} role="img" aria-label={`${d.pct}% concluído`}>
                  <svg viewBox="0 0 112 106" aria-hidden>
                    {d.pct > 0 && <circle cx="56" cy="53" r={RAIO} pathLength={CIRC} strokeDasharray={CIRC} style={{ ["--o" as string]: CIRC * (1 - Math.min(100, d.pct) / 100), ["--c" as string]: CIRC }} transform="rotate(-90 56 53)" />}
                  </svg>
                  <b>{d.pct}%</b>
                </span>
                <img className="vg-seta" src="/visao-geral/seta.webp" alt="" aria-hidden width={56} height={64} decoding="async" />
              </Link>
            ))}
          </div>
        )}

        <Link href={`${base}/relatorio`} className="vg-banner" aria-label="Ver relatório completo do edital" style={{ backgroundImage: "url(/visao-geral/banner.webp)" }}>
          <img className="vg-riscos2" src="/visao-geral/riscos2.webp" alt="" aria-hidden width={60} height={34} />
          <span className="vg-btxt"><em>VER RELATÓRIO</em><em>COMPLETO DO EDITAL</em></span>
          <img className="vg-hex" src="/visao-geral/hex.webp" alt="" aria-hidden width={78} height={72} decoding="async" />
        </Link>
        {/* eslint-enable @next/next/no-img-element */}
      </div>
    </section>
  );
}
