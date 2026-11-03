import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { Bell, Check, Clock, Lock, Settings, TrendingDown, TrendingUp, UserRound } from "lucide-react";
import { AvatarStage } from "@/components/avatar/avatar-stage";
import type { AvatarRequestInfo, RequestAction } from "@/components/avatar/avatar-request";
import { rankFor, type AvatarConfig, type AvatarItem } from "@/domain/avatar/catalog";
import { CONTEST_STATUS, MISSION_ORDER, accuracy, daysUntil, formatStudyTime, levelPct, missionXp, nextMilestone, rankTrend, weeklyEvolution, type MissionKey } from "@/domain/gamification/home";
import type { HomeData } from "@/server/services/gamification";
import { LevelUp } from "./level-up";
import { RequestSlot, RequestTrigger } from "./request-slot";

/**
 * Home "Painel de operações" — réplica do layout oficial (941 px de largura de referência).
 * Molduras, ícones e cenário vêm da arte oficial (public/home/painel-fundo.webp, só com os
 * campos de dados apagados); cada dado é desenhado por cima, na mesma posição, a partir do banco.
 */

const fmt = (n: number) => n.toLocaleString("pt-BR");
const dateBR = (iso: string) => new Date(iso.length === 10 ? `${iso}T12:00:00Z` : iso).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
const u = (n: number) => `calc(${n} * var(--u))`;
/** Caixa na grade da arte: x, y, largura e altura em px da referência. */
const at = (x: number, y: number, w: number, h: number, extra?: CSSProperties): CSSProperties => ({ left: u(x), top: u(y), width: u(w), height: u(h), ...extra });
const fs = (n: number): CSSProperties => ({ fontSize: u(n) });

const MISSION_LABEL: Record<MissionKey, string> = { estudar: "Estudar uma aula completa", combater: "Resolver 20 questões", revisar: "Revisar 15 questões" };
const MISSION_Y: Record<MissionKey, number> = { estudar: 690, combater: 740, revisar: 785 };
/** Medalhas na ordem e com os rótulos do layout (as de disciplina ficam em "Ver todas"). */
const MEDAL_ROW = [
  { id: "primeiro_combate", x: 140, l1: "Primeiro", l2: "Combate" },
  { id: "atirador_elite", x: 310, l1: "Atirador", l2: "de Elite" },
  { id: "incansavel", x: 477, l1: "Incansável", l2: "(30 dias)" },
  { id: "especialista", x: 640, l1: "Especialista", l2: "(em 1 matéria)" },
  { id: "caveira_elite", x: 805, l1: "Caveira de Elite", l2: "(Nível 10)" },
];
const medalSrc = (id: string) => `/home/medalhas/${id.startsWith("disciplina_") ? "disciplina" : id}.webp`;
/** Silhueta (dilatada) de cada arte: só o personagem aparece sobre o cenário do layout. */
const MASK: Record<"m" | "f", CSSProperties> = {
  m: { maskImage: "url(/home/mascara-m.png)", WebkitMaskImage: "url(/home/mascara-m.png)", maskSize: "51.42% 94.29%", WebkitMaskSize: "51.42% 94.29%", maskPosition: "53.85% 6.25%", WebkitMaskPosition: "53.85% 6.25%" },
  f: { maskImage: "url(/home/mascara-f.png)", WebkitMaskImage: "url(/home/mascara-f.png)", maskSize: "36.3% 94.29%", WebkitMaskSize: "36.3% 94.29%", maskPosition: "50.28% 6.25%", WebkitMaskPosition: "50.28% 6.25%" },
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

function T({ box, className = "", children, testId, title }: { box: CSSProperties; className?: string; children: ReactNode; testId?: string; title?: string }) {
  return (
    <div className={`cl-t ${className}`} style={box} data-testid={testId} title={title}>
      {children}
    </div>
  );
}

export function HomeOperacao({ name, data, avatar, request, requestAction, ackLevels, mannequin }: HomeOperacaoProps) {
  const { game, performance: perf, continueLesson: cont, contests, insights, top } = data;
  const rank = rankFor(game.level);
  const pct = levelPct(game);
  const mx = missionXp(game);
  const trend = rankTrend(game.ranking);
  const goal = nextMilestone(game.streak.current, game.streak.milestones);
  const rankReady = game.ranking.position != null && game.ranking.total >= 2;
  const nm = name?.trim() || "Operador APROVUM";
  const nameSize = Math.min(54, Math.max(26, 640 / Math.max(8, nm.length)));
  const active = new Set(game.streak.week);
  const last6 = [...Array(6)].map((_, i) => {
    const d = new Date(`${game.today}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() - (5 - i));
    return d.toISOString().slice(0, 10);
  });
  const acc = perf ? accuracy(perf.correct, perf.answered) : null;
  const evo = perf ? weeklyEvolution(perf.week) : null;
  const hours = perf ? formatStudyTime(perf.seconds) : null;
  const byId = new Map(game.achievements.map((a) => [a.id, a]));
  const unlocked = game.achievements.filter((a) => a.unlockedAt).length;
  const contest = contests[0] ?? null;
  const left = contest ? daysUntil(contest.examDate, contest.examDateConfirmed, game.today) : null;
  const missionHref: Record<MissionKey, string> = { estudar: cont ? `/aula/${cont.lessonId}` : "/trilhas", combater: "/questoes", revisar: "/revisoes" };
  const gender = avatar?.config.gender === "f" ? "f" : "m";
  const alerts = insights?.length ?? 0;

  return (
    <div className="clw" data-testid="home-operacao">
      <LevelUp levels={game.levelUps} ack={ackLevels} />
      <div className="cl">
        {/* ============================ Palco (arte y 0–935) */}
        <section className="cl-a" aria-label="Seu operador" data-testid="painel-avatar">
          <div className="cl-bg cl-bg-a" aria-hidden />

          <Link href="/perfil" aria-label="Perfil" className="cl-hit cl-round" style={at(32, 70, 76, 76)}><UserRound className="cl-sr" /></Link>
          <Link href="/mentor" aria-label={`Mentor APROVUM: ${alerts} recomendações`} className="cl-hit" style={at(772, 78, 60, 60)} data-testid="home-sino"><Bell className="cl-sr" /></Link>
          {alerts > 0 && <span className="cl-badge" style={at(805, 73, 26, 26, fs(16))}>{alerts}</span>}
          <Link href="/perfil" aria-label="Configurações" className="cl-hit cl-round" style={at(836, 72, 76, 76)}><Settings className="cl-sr" /></Link>

          {avatar ? (
            <div className="cl-palco" style={{ ...at(220, 145, 482, 721), ...MASK[gender] }}>
              <AvatarStage config={avatar.config} items={avatar.items} interactive className="cl-palco-arte" mannequin={mannequin} rank={rank.id} />
            </div>
          ) : (
            <p role="alert" className="cl-t cl-c" style={at(350, 420, 240, 80, fs(18))}>Não foi possível carregar seu avatar agora. Recarregue a página.</p>
          )}

          {/* Card do operador */}
          <div data-testid="avatar-info">
            <T box={at(152, 219, 150, 24, fs(18))} className="cl-label" testId="avatar-patente">{rank.label.toUpperCase()}</T>
            <T box={at(52, 244, 256, 62, fs(nameSize))} className="cl-nome cl-c" testId="operador-nome">{nm}</T>
            <span className="cl-traco" style={at(70, 300, 220, 14)} aria-hidden />
            <T box={at(132, 336, 140, 50, fs(38))} className="cl-nivel">
              NÍVEL <b data-testid="operador-nivel" style={fs(48)}>{game.level}</b>
            </T>
            <T box={at(60, 398, 240, 30, fs(25))} className="cl-xp cl-c">
              <span data-testid="avatar-xp">{fmt(game.xp)}</span>&nbsp;/ {fmt(game.levelNext)} XP
            </T>
            <div className="cl-bar" style={at(75, 431, 210, 12)} role="progressbar" aria-label="XP até o próximo nível" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
              <i style={{ width: `${pct}%` }} />
            </div>
            <T box={at(138, 489, 140, 34, fs(rankReady ? 27 : 18))} className="cl-rank-v" testId="avatar-ranking">
              {rankReady ? (
                <>
                  #{fmt(game.ranking.position!)}
                  {trend != null && trend !== 0 && (trend > 0 ? <TrendingUp className="cl-up" aria-label={`subiu ${trend}`} /> : <TrendingDown className="cl-down" aria-label={`caiu ${-trend}`} />)}
                </>
              ) : (
                <span className="cl-muted">Em formação</span>
              )}
            </T>
            <details className="cl-rank" style={at(66, 462, 228, 66)}>
              <summary aria-label="Ver ranking APROVUM" />
              <div className="cl-pop" style={at(-26, 70, 300, 0, fs(17))} data-testid="ranking-aprovum">
                <p className="cl-pop-h">RANKING APROVUM</p>
                {top.length < 2 ? (
                  <p className="cl-pop-s">O ranking começa quando houver alunos com XP de missões. Complete a Operação do Dia para entrar.</p>
                ) : (
                  <ol>
                    {top.map((r) => (
                      <li key={r.pos} className={r.pos === game.ranking.position ? "is-me" : ""}><b>#{r.pos}</b><span>{r.name}</span><small>Nv {r.level}</small><em>{fmt(r.xp)} XP</em></li>
                    ))}
                    {game.ranking.position != null && game.ranking.position > top.length && (
                      <li className="is-me"><b>#{game.ranking.position}</b><span>Você</span><small>Nv {game.level}</small><em>{fmt(game.xp)} XP</em></li>
                    )}
                  </ol>
                )}
              </div>
            </details>
          </div>

          {/* Sua disciplina */}
          <div data-testid="sua-disciplina" title={goal ? `Próxima meta: ${goal} dias seguidos` : "Todas as metas de disciplina alcançadas"}>
            <T box={at(764, 396, 140, 60, fs(56))} className="cl-dias">
              <b data-testid="streak-atual">{game.streak.current}</b>
              <span style={fs(36)}>{game.streak.current === 1 ? "DIA" : "DIAS"}</span>
            </T>
            {last6.map((d, i) => (
              <span key={d} className={`cl-dot ${active.has(d) ? "is-on" : ""}`} style={at(692 + i * 34.3, 499, 24, 24)} title={`${dateBR(d)}${active.has(d) ? ": estudou" : ""}`}>
                {active.has(d) && <Check aria-hidden />}
              </span>
            ))}
            <T box={at(746, 550, 150, 28, fs(19))} className="cl-rec">
              Recorde: <b>{game.streak.best} {game.streak.best === 1 ? "dia" : "dias"}</b>
            </T>
          </div>

          {/* Operação do dia */}
          <div data-testid="operacao-do-dia" title={`Hoje: ${fmt(mx.earned)} XP conquistados · ${fmt(mx.available)} XP ainda disponíveis`}>
            <T box={at(272, 624, 40, 26, fs(20))} className="cl-c cl-b">{game.missions.completed}/3</T>
            {MISSION_ORDER.map((k) => {
              const m = game.missions[k];
              const y = MISSION_Y[k];
              return (
                <Link key={k} href={missionHref[k]} className={`cl-mis ${m.done ? "is-done" : ""}`} style={at(48, y - 26, 270, 52)} data-testid={`missao-${k}`} data-done={m.done}>
                  <span className="cl-chk" style={at(4, 11, 30, 30)}>{m.done && <Check aria-hidden />}</span>
                  <span className="cl-mis-t" style={at(49, 0, k === "estudar" ? 150 : 170, 52, fs(19))}>{MISSION_LABEL[k].replace(/\d+/, String(m.target))}</span>
                  <span className="cl-mis-x" style={at(196, 0, 70, 52, fs(18))}>{m.done ? `+${game.missionXp[k]} XP` : m.target > 1 ? `${m.progress}/${m.target}` : ""}</span>
                </Link>
              );
            })}
            <span className="cl-sr" data-testid="xp-hoje">Hoje: {fmt(mx.earned)} XP · disponível: {fmt(mx.available)} XP</span>
          </div>

          <RequestTrigger box={at(322, 846, 336, 74)} />
        </section>

        <RequestSlot initial={request} action={requestAction} />

        {/* ============================ Abaixo do palco (arte y 935–1530) */}
        <section className="cl-b2" aria-label="Seus estudos">
          <div className="cl-bg cl-bg-b" aria-hidden />
          {/* coordenadas a partir de y = 935 */}
          <div data-testid="continuar-estudando" title={cont ? `Última atividade: ${dateBR(cont.at)}${cont.module ? ` · ${cont.module}` : ""}` : undefined}>
            {cont ? (
              <>
                <T box={at(160, 1006 - 935, 390, 28, fs(19))} className="cl-ell">{cont.subject} • {cont.lesson}</T>
                <div className="cl-bar cl-bar-b" style={at(168, 1045 - 935, 308, 12)}><i style={{ width: `${cont.pct}%` }} /></div>
                <T box={at(482, 1036 - 935, 66, 28, fs(23))} className="cl-r cl-b">{cont.pct}%</T>
                <Link href={`/aula/${cont.lessonId}`} className="cl-btn" style={at(78, 1082 - 935, 436, 46, fs(25))} data-testid="retomar-missao">RETOMAR MISSÃO</Link>
              </>
            ) : (
              <>
                <T box={at(160, 1006 - 935, 390, 28, fs(19))}>Você ainda não iniciou nenhuma aula.</T>
                <Link href="/trilhas" className="cl-btn" style={at(78, 1082 - 935, 436, 46, fs(25))} data-testid="comecar-missao">COMEÇAR MISSÃO</Link>
              </>
            )}
          </div>

          <div data-testid="seu-desempenho">
            {!perf || perf.answered === 0 ? (
              <T box={at(600, 1000 - 935, 306, 180, fs(18))} className="cl-vazio cl-c">Ainda não existem dados suficientes para gerar sua análise.</T>
            ) : (
              <Link href="/desempenho" aria-label="Ver análise completa" className="cl-hit" style={at(596, 990 - 935, 312, 190)}>
                <T box={at(10, 50, 140, 28, fs(24))} className="cl-c cl-b" testId="perf-questoes">{fmt(perf.answered)}</T>
                <T box={at(165, 50, 140, 28, fs(24))} className="cl-c cl-b" testId="perf-taxa">{acc}%</T>
                <T box={at(10, 138, 140, 26, fs(24))} className="cl-c cl-b">{hours ?? "—"}</T>
                <T box={at(10, 164, 140, 24, fs(17))} className="cl-c cl-dim">{hours ? "Horas de estudo" : "Sem tempo registrado"}</T>
                <T box={at(165, 138, 140, 26, fs(21))} className="cl-c cl-b">Evolução</T>
                <T box={at(165, 162, 140, 26, fs(22))} className="cl-c cl-b">{evo == null ? <span className="cl-dim" style={fs(16)}>poucos dados</span> : `${evo > 0 ? "+" : ""}${evo}%`}</T>
                <span className="cl-sr">{fmt(perf.correct)} acertos e {fmt(perf.wrong)} erros</span>
              </Link>
            )}
          </div>

          <div data-testid="conquistas">
            <span className="cl-sr">{unlocked} de {game.achievements.length} conquistas desbloqueadas</span>
            {MEDAL_ROW.map((m) => {
              const a = byId.get(m.id);
              const on = !!a?.unlockedAt;
              return (
                <div key={m.id} className={`cl-medal ${on ? "is-on" : "is-off"}`} style={at(m.x - 80, 1228 - 935, 160, 132)} data-testid={`conquista-${m.id}`} data-unlocked={on}
                  title={a ? `${a.description} ${on ? `Desbloqueada em ${dateBR(a.unlockedAt!)}.` : `Como desbloquear: ${a.criterion}.`}` : undefined}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={medalSrc(m.id)} alt="" style={at(34, 0, 92, 88)} />
                  {!on && <Lock className="cl-lock" style={at(98, 58, 24, 24)} aria-label="bloqueada" />}
                  <span style={at(0, 90, 160, 42, fs(17))}>{m.l1}<br />{m.l2}</span>
                </div>
              );
            })}
            <details className="cl-todas" style={at(790, 1192 - 935, 116, 34)}>
              <summary aria-label="Ver todas as conquistas" />
              <div className="cl-pop cl-pop-conq" style={at(-760, 40, 876, 0, fs(17))}>
                <p className="cl-pop-h">TODAS AS CONQUISTAS · {unlocked}/{game.achievements.length}</p>
                <ul>
                  {game.achievements.map((a) => (
                    <li key={a.id} className={a.unlockedAt ? "is-on" : "is-off"} data-testid={`todas-${a.id}`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={medalSrc(a.id)} alt="" />
                      <span><b>{a.name}</b><small>{a.unlockedAt ? `Desbloqueada em ${dateBR(a.unlockedAt)}` : a.criterion}</small></span>
                    </li>
                  ))}
                </ul>
              </div>
            </details>
          </div>

          <div data-testid="proximos-concursos">
            {contest ? (
              <div title={`Fonte: ${contest.sourceName} · atualizado em ${dateBR(contest.infoUpdatedAt)} · ${CONTEST_STATUS[contest.status] ?? contest.status}`}>
                <T box={at(290, 1434 - 935, 205, 38, fs(contest.name.length > 12 ? 24 : 32))} className="cl-ell cl-b">{contest.name}</T>
                <T box={at(290, 1472 - 935, 205, 28, fs(20))} className={contest.vacancies != null ? "cl-ouro cl-b" : "cl-dim"}>
                  {contest.vacancies != null ? `+${fmt(contest.vacancies)} vagas` : "Vagas não divulgadas"}
                </T>
                <span className="cl-div" style={at(498, 1440 - 935, 2, 62)} aria-hidden />
                <T box={at(522, 1452 - 935, 262, 30, fs(20))} className="cl-prova">
                  <Clock aria-hidden />
                  {contest.examDate ? `Prova: ${dateBR(contest.examDate)}` : "Data não definida"}
                </T>
                {(!contest.infoConfirmed || (contest.examDate && !contest.examDateConfirmed)) && (
                  <T box={at(522, 1484 - 935, 262, 20, fs(14))} className="cl-aviso">Informação não confirmada</T>
                )}
                {left != null && (
                  <div className="cl-dias-box" style={at(790, 1405 - 935, 112, 96)} data-testid="contagem-regressiva">
                    <b style={fs(40)}>{left}</b>
                    <span style={fs(27)}>{left === 1 ? "DIA" : "DIAS"}</span>
                  </div>
                )}
                {contest.sourceUrl && <a href={contest.sourceUrl} target="_blank" rel="noreferrer noopener" className="cl-hit" style={at(284, 1430 - 935, 230, 76)} aria-label={`Fonte: ${contest.sourceName}`} />}
              </div>
            ) : (
              <T box={at(290, 1450 - 935, 600, 40, fs(20))} className="cl-dim">Nenhum concurso cadastrado no momento.</T>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
