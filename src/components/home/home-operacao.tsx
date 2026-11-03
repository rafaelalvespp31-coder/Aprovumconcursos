import Link from "next/link";
import { BarChart3, Brain, CalendarDays, Check, ChevronRight, Clock, Crosshair, Crown, Flame, Play, Star, Target, TrendingDown, TrendingUp, Trophy } from "lucide-react";
import { AvatarStage } from "@/components/avatar/avatar-stage";
import { AvatarRequestBox, type AvatarRequestInfo, type RequestAction } from "@/components/avatar/avatar-request";
import { rankFor, type AvatarConfig, type AvatarItem } from "@/domain/avatar/catalog";
import {
  CONTEST_STATUS, MISSION_ORDER, accuracy, daysUntil, formatStudyTime, levelPct, missionXp, nextMilestone, rankTrend, subjectSplit, weekDays, weeklyEvolution,
  type MissionKey,
} from "@/domain/gamification/home";
import type { HomeData } from "@/server/services/gamification";
import { Medal } from "./medal";
import { LevelUp } from "./level-up";

const fmt = (n: number) => n.toLocaleString("pt-BR");
const dateBR = (iso: string) => new Date(iso.length === 10 ? `${iso}T12:00:00Z` : iso).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });

const MISSION_LABEL: Record<MissionKey, string> = {
  estudar: "Estudar uma aula completa",
  combater: "Resolver 20 questões",
  revisar: "Revisar 15 questões",
};

export interface HomeOperacaoProps {
  name: string | null;
  data: HomeData;
  avatar: { config: AvatarConfig; items: AvatarItem[] } | null;
  request: AvatarRequestInfo | null;
  requestAction: RequestAction;
  ackLevels: () => Promise<void>;
  /** Só galeria/testes. */
  mannequin?: boolean;
}

/** Home "Painel de operações": avatar no centro e cards com dados reais do aluno ao redor. */
export function HomeOperacao({ name, data, avatar, request, requestAction, ackLevels, mannequin }: HomeOperacaoProps) {
  const { game, performance: perf, continueLesson, contests, insights, top } = data;
  const rank = rankFor(game.level);
  const pct = levelPct(game);
  const mx = missionXp(game);
  const trend = rankTrend(game.ranking);
  const goal = nextMilestone(game.streak.current, game.streak.milestones);
  const week = weekDays(game.today, game.streak.week);
  const rankReady = game.ranking.position != null && game.ranking.total >= 2;
  const missionHref: Record<MissionKey, string> = {
    estudar: continueLesson ? `/aula/${continueLesson.lessonId}` : "/trilhas",
    combater: "/questoes",
    revisar: "/revisoes",
  };
  const acc = perf ? accuracy(perf.correct, perf.answered) : null;
  const evo = perf ? weeklyEvolution(perf.week) : null;
  const hours = perf ? formatStudyTime(perf.seconds) : null;
  const split = perf ? subjectSplit(perf.subjects) : { best: [], attention: [] };
  const unlocked = game.achievements.filter((a) => a.unlockedAt).length;
  const medal = (a: (typeof game.achievements)[number]) => (
    <li key={a.id} className={a.unlockedAt ? "is-on" : "is-off"} data-testid={`conquista-${a.id}`} data-unlocked={!!a.unlockedAt}
      title={`${a.description} ${a.unlockedAt ? `Desbloqueada em ${dateBR(a.unlockedAt)}.` : `Como desbloquear: ${a.criterion}.`}`}>
      <Medal icon={a.icon} locked={!a.unlockedAt} />
      <span>{a.name}</span>
      <small>{a.unlockedAt ? dateBR(a.unlockedAt) : a.criterion}</small>
    </li>
  );

  return (
    <div className="hm" data-testid="home-operacao">
      <LevelUp levels={game.levelUps} ack={ackLevels} />

      {/* ------------------------------------------------ Palco do operador */}
      <section className="hm-hero" aria-label="Seu operador" data-testid="painel-avatar">
        <div className="hm-palco" aria-hidden={!avatar}>
          {avatar ? (
            <AvatarStage config={avatar.config} items={avatar.items} interactive className="hm-palco-arte" mannequin={mannequin} rank={rank.id} />
          ) : (
            <p role="alert" className="hm-palco-erro">Não foi possível carregar seu avatar agora. Recarregue a página.</p>
          )}
        </div>

        <div className="hm-col hm-col-esq">
          <div className="hm-card hm-op" data-testid="avatar-info">
            <p className="hm-op-patente" data-testid="avatar-patente">
              <Crown aria-hidden /> {rank.label.toUpperCase()}
            </p>
            <p className="hm-op-nome" data-testid="operador-nome">{name ?? "Operador APROVUM"}</p>
            <div className="hm-op-nivel">
              <span className="hm-chevrons" aria-hidden><i /><i /><i /></span>
              NÍVEL <b data-testid="operador-nivel">{game.level}</b>
            </div>
            <p className="hm-op-xp">
              <span data-testid="avatar-xp">{fmt(game.xp)}</span> / {fmt(game.levelNext)} XP
            </p>
            <div className="hm-bar" role="progressbar" aria-label="XP até o próximo nível" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
              <i style={{ width: `${pct}%` }} />
            </div>
            <div className="hm-op-rank" data-testid="avatar-ranking">
              <Trophy aria-hidden />
              <div>
                <small>Posição no Ranking</small>
                {rankReady ? (
                  <b>
                    #{fmt(game.ranking.position!)}
                    {trend != null && trend !== 0 && (trend > 0 ? <TrendingUp className="hm-up" aria-label={`subiu ${trend}`} /> : <TrendingDown className="hm-down" aria-label={`caiu ${-trend}`} />)}
                  </b>
                ) : (
                  <b className="hm-muted">Em formação</b>
                )}
              </div>
            </div>
            <p className="hm-op-frase">“Disciplina é o caminho da vitória.”</p>
          </div>

          <div className="hm-card hm-ops" data-testid="operacao-do-dia">
            <p className="hm-card-h">
              <Crosshair aria-hidden /> OPERAÇÃO DO DIA <span className="hm-badge">{game.missions.completed}/3</span>
            </p>
            <ul>
              {MISSION_ORDER.map((k) => {
                const m = game.missions[k];
                return (
                  <li key={k} className={m.done ? "is-done" : ""} data-testid={`missao-${k}`} data-done={m.done}>
                    <Link href={missionHref[k]}>
                      <span className="hm-check">{m.done && <Check aria-hidden />}</span>
                      <span className="hm-ops-t">
                        {MISSION_LABEL[k].replace(/\d+/, String(m.target))}
                        {!m.done && m.target > 1 && <small>{m.progress}/{m.target}</small>}
                      </span>
                      <em>+{game.missionXp[k]} XP</em>
                    </Link>
                  </li>
                );
              })}
            </ul>
            <div className="hm-ops-bonus">
              <Star aria-hidden />
              <div>
                <b>+{game.missionXp.bonus} XP</b>
                <small>{game.missions.completed === 3 ? "Recompensa conquistada" : "Recompensa ao completar as 3"}</small>
              </div>
            </div>
            <p className="hm-ops-tot" data-testid="xp-hoje">
              Hoje: <b>{fmt(mx.earned)} XP</b> · disponível: {fmt(mx.available)} XP
            </p>
          </div>
        </div>

        <div className="hm-col hm-col-dir">
          <div className="hm-card hm-disc" data-testid="sua-disciplina">
            <p className="hm-card-h">SUA DISCIPLINA</p>
            <div className="hm-disc-n">
              <Flame aria-hidden />
              <div>
                <b data-testid="streak-atual">{game.streak.current}</b> <span>{game.streak.current === 1 ? "DIA" : "DIAS"}</span>
                <small>CONSECUTIVOS</small>
              </div>
            </div>
            <ol className="hm-week" aria-label="Semana atual">
              {week.map((d) => (
                <li key={d.day} className={`is-${d.state}`} title={`${dateBR(d.day)}: ${d.state === "feito" ? "estudou" : d.state === "perdido" ? "sem estudo" : d.state === "hoje" ? "hoje" : ""}`}>
                  {d.state === "feito" && <Check aria-hidden />}
                  <span>{d.label}</span>
                </li>
              ))}
            </ol>
            <p className="hm-disc-rec">
              <Trophy aria-hidden /> Recorde: <b>{game.streak.best} {game.streak.best === 1 ? "dia" : "dias"}</b>
            </p>
            {goal && <p className="hm-disc-meta">Próxima meta: {goal} dias</p>}
          </div>

          <div className="hm-card hm-lema" aria-hidden>
            <p>
              <span>FOCO.</span>
              <span>DISCIPLINA.</span>
              <span className="hm-red">APROVAÇÃO.</span>
            </p>
          </div>
        </div>

        <div className="hm-solicitar">
          <AvatarRequestBox initial={request} action={requestAction} />
        </div>
      </section>

      {/* ------------------------------------------------ Continuar + desempenho */}
      <div className="hm-row">
        <section className="hm-card hm-cont" data-testid="continuar-estudando">
          {continueLesson ? (
            <>
              <div className="hm-cont-top">
                <Play className="hm-play" aria-hidden />
                <div>
                  <h2>CONTINUAR ESTUDANDO</h2>
                  <p>
                    {continueLesson.subject} • {continueLesson.lesson}
                  </p>
                </div>
              </div>
              <div className="hm-cont-bar">
                <div className="hm-bar"><i style={{ width: `${continueLesson.pct}%` }} /></div>
                <b>{continueLesson.pct}%</b>
              </div>
              <p className="hm-small">Última atividade: {dateBR(continueLesson.at)}{continueLesson.module ? ` · ${continueLesson.module}` : ""}</p>
              <Link className="hm-btn" href={`/aula/${continueLesson.lessonId}`} data-testid="retomar-missao">RETOMAR MISSÃO</Link>
            </>
          ) : (
            <>
              <div className="hm-cont-top">
                <Play className="hm-play" aria-hidden />
                <div>
                  <h2>COMECE SUA PRIMEIRA MISSÃO</h2>
                  <p>Você ainda não tem uma aula em andamento.</p>
                </div>
              </div>
              <Link className="hm-btn" href="/trilhas" data-testid="comecar-missao">COMEÇAR A ESTUDAR</Link>
            </>
          )}
        </section>

        <section className="hm-card hm-perf" data-testid="seu-desempenho">
          <h2 className="hm-card-h"><BarChart3 aria-hidden /> SEU DESEMPENHO</h2>
          {!perf || perf.answered === 0 ? (
            <p className="hm-empty">Ainda não existem dados suficientes para gerar sua análise.</p>
          ) : (
            <>
              <div className="hm-perf-grid">
                <div><Check aria-hidden className="hm-ok" /><b data-testid="perf-questoes">{fmt(perf.answered)}</b><small>Questões</small></div>
                <div><Target aria-hidden className="hm-redi" /><b data-testid="perf-taxa">{acc}%</b><small>Taxa de acertos</small></div>
                <div><Clock aria-hidden className="hm-redi" /><b>{hours ?? "—"}</b><small>{hours ? "Horas de estudo" : "Sem tempo registrado"}</small></div>
                <div>
                  <BarChart3 aria-hidden className="hm-redi" />
                  <b>{evo == null ? "—" : `${evo > 0 ? "+" : ""}${evo}%`}</b>
                  <small>{evo == null ? "Evolução (poucos dados)" : "Evolução semanal"}</small>
                </div>
              </div>
              <p className="hm-small">{fmt(perf.correct)} acertos · {fmt(perf.wrong)} erros</p>
              {(split.best.length > 0 || split.attention.length > 0) && (
                <ul className="hm-subj">
                  {split.best.map((s) => <li key={s.name} className="is-best">▲ {s.name} <b>{s.pct}%</b></li>)}
                  {split.attention.map((s) => <li key={s.name} className="is-att">▼ {s.name} <b>{s.pct}%</b></li>)}
                </ul>
              )}
              <Link href="/desempenho" className="hm-link">Ver análise completa <ChevronRight aria-hidden /></Link>
            </>
          )}
        </section>
      </div>

      {/* ------------------------------------------------ Conquistas */}
      <section className="hm-card hm-conq" data-testid="conquistas">
        <h2 className="hm-card-h"><Trophy aria-hidden className="hm-gold" /> CONQUISTAS DESBLOQUEADAS <span className="hm-badge">{unlocked}/{game.achievements.length}</span></h2>
        <ul className="hm-medals">{game.achievements.slice(0, 5).map(medal)}</ul>
        {game.achievements.length > 5 && (
          <details className="hm-mais">
            <summary className="hm-link">Ver todas <ChevronRight aria-hidden /></summary>
            <ul className="hm-medals">{game.achievements.slice(5).map(medal)}</ul>
          </details>
        )}
      </section>

      {/* ------------------------------------------------ Inteligência + ranking */}
      <div className="hm-row hm-row-b">
        <section className="hm-card hm-ia" data-testid="inteligencia-aprovum">
          <h2 className="hm-card-h"><Brain aria-hidden /> INTELIGÊNCIA APROVUM</h2>
          {insights && insights.length > 0 ? (
            <ul>
              {insights.map((r) => (
                <li key={r.href + r.title}>
                  <p className="hm-ia-t">{r.title}</p>
                  <p className="hm-small">{r.reason}</p>
                  <Link href={r.href} className="hm-link">{r.actionLabel} <ChevronRight aria-hidden /></Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="hm-empty">{insights ? "Estude e resolva questões: o Mentor APROVUM vai apontar o que reforçar com base no seu histórico." : "Recomendações indisponíveis agora."}</p>
          )}
          <Link href="/mentor" className="hm-link">Abrir Mentor APROVUM <ChevronRight aria-hidden /></Link>
        </section>

        <section className="hm-card hm-rank" data-testid="ranking-aprovum">
          <h2 className="hm-card-h"><Trophy aria-hidden className="hm-gold" /> RANKING APROVUM</h2>
          {top.length < 2 ? (
            <p className="hm-empty">O ranking começa quando houver alunos com XP de missões. Complete a Operação do Dia para entrar.</p>
          ) : (
            <ol>
              {top.map((r) => (
                <li key={r.pos} className={r.pos === game.ranking.position ? "is-me" : ""}>
                  <b>#{r.pos}</b> <span>{r.name}</span> <small>Nv {r.level}</small> <em>{fmt(r.xp)} XP</em>
                </li>
              ))}
              {game.ranking.position != null && game.ranking.position > top.length && (
                <li className="is-me"><b>#{game.ranking.position}</b> <span>Você</span> <small>Nv {game.level}</small> <em>{fmt(game.xp)} XP</em></li>
              )}
            </ol>
          )}
        </section>
      </div>

      {/* ------------------------------------------------ Próximos concursos */}
      <section className="hm-card hm-conc" data-testid="proximos-concursos">
        <h2 className="hm-card-h"><CalendarDays aria-hidden /> PRÓXIMOS CONCURSOS</h2>
        {contests.length === 0 ? (
          <p className="hm-empty">Nenhum concurso cadastrado no momento.</p>
        ) : (
          <ul>
            {contests.map((c) => {
              const left = daysUntil(c.examDate, c.examDateConfirmed, game.today);
              return (
                <li key={c.id}>
                  <div className="hm-conc-main">
                    <b className="hm-conc-n">{c.name}</b>
                    <span className="hm-small">{c.institution}{c.roleName ? ` · ${c.roleName}` : ""}</span>
                    <span className="hm-conc-tags">
                      <i>{CONTEST_STATUS[c.status] ?? c.status}</i>
                      {c.vacancies != null ? <i className="hm-gold-t">{fmt(c.vacancies)} vagas</i> : <i>Vagas não divulgadas</i>}
                      {c.salary && <i>{c.salary}</i>}
                      {!c.infoConfirmed && <i className="hm-warn">Informação não confirmada</i>}
                    </span>
                  </div>
                  <div className="hm-conc-data">
                    <Clock aria-hidden />
                    {c.examDate ? <>Prova: {dateBR(c.examDate)}{!c.examDateConfirmed && " (não confirmada)"}</> : "Data da prova não definida"}
                  </div>
                  {left != null && (
                    <div className="hm-conc-dias" data-testid="contagem-regressiva"><b>{left}</b><span>{left === 1 ? "DIA" : "DIAS"}</span></div>
                  )}
                  <p className="hm-conc-fonte">
                    Fonte: {c.sourceUrl ? <a href={c.sourceUrl} target="_blank" rel="noreferrer noopener">{c.sourceName}</a> : c.sourceName} · atualizado em {dateBR(c.infoUpdatedAt)}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
