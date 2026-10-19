import { BookOpen, Clock, Flame, Gauge } from "lucide-react";
import { formatDuration, formatLastAccess, pct, type StudiesHome } from "@/domain/studies/home";
import { FocusBars, Ring } from "./parts";

/** Painel de progresso geral: questões, foco (dias seguidos), progresso no conteúdo atual e estatísticas. */
export function OverallProgress({ data }: { data: StudiesHome }) {
  const p = pct(data.overall.answered, data.overall.total);
  const fmt = (n: number) => n.toLocaleString("pt-BR");
  const days = data.streak.last7.slice(-5);
  const full = days.length > 0 && days.every(Boolean);
  const cur = data.current;
  const curPct = cur ? pct(cur.lessonsDone, cur.lessonsTotal) : 0;
  return (
    <section className="ep" aria-label="Seu progresso" data-testid="progresso-geral">
      <div className="ep-geral">
        <Ring value={p} size={104} stroke={11} label={`${p}% das questões concluídas`} />
        <div className="min-w-0">
          <h2 className="ep-rotulo">Seu progresso geral</h2>
          <p className="ep-numero">
            {fmt(data.overall.answered)} <span>/ {fmt(data.overall.total)}</span>
          </p>
          <p className="ep-legenda">questões concluídas</p>
        </div>
      </div>

      <div className="ep-foco">
        <Flame className="ep-foco-icone" aria-hidden />
        <div>
          <p className="ep-foco-titulo">{full ? "Foco total" : "Foco"}</p>
          <p className="ep-foco-dias">{data.streak.current === 1 ? "1 dia seguido" : `${data.streak.current} dias seguidos`}</p>
          <FocusBars days={days} className="mt-2" />
        </div>
      </div>

      <div className="ep-conteudo">
        <div className="ep-conteudo-topo">
          <h2 className="ep-rotulo">Progresso no conteúdo</h2>
          {cur && <span className="ep-conteudo-pct">{curPct}%</span>}
        </div>
        {cur ? (
          <>
            <div className="ep-barra" role="progressbar" aria-label={`Progresso em ${cur.trailTitle}`} aria-valuenow={curPct} aria-valuemin={0} aria-valuemax={100}>
              <span style={{ width: `${curPct}%` }} />
            </div>
            <p className="ep-conteudo-nome">{cur.trailTitle}</p>
          </>
        ) : (
          <p className="ep-conteudo-nome">Nenhuma aula em andamento.</p>
        )}
        <dl className="ep-stats">
          <Stat icon={<BookOpen aria-hidden />} label="Aulas concluídas" value={`${data.lessons.done} / ${data.lessons.total}`} />
          <Stat icon={<Clock aria-hidden />} label="Tempo em questões" value={data.questionSeconds ? `~ ${formatDuration(data.questionSeconds)}` : "—"} />
          <Stat icon={<Gauge aria-hidden />} label="Último acesso" value={formatLastAccess(data.lastAccess)} />
        </dl>
      </div>
    </section>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="ep-stat">
      <span className="ep-stat-icone">{icon}</span>
      <div className="min-w-0">
        <dt>{label}</dt>
        <dd>{value}</dd>
      </div>
    </div>
  );
}
