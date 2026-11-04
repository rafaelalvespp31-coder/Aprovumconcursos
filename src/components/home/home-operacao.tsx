import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { Check, Clock, Lock, TrendingDown, TrendingUp } from "lucide-react";
import { AvatarStage } from "@/components/avatar/avatar-stage";
import type { AvatarRequestInfo, RequestAction } from "@/components/avatar/avatar-request";
import { rankFor, type AvatarConfig, type AvatarItem } from "@/domain/avatar/catalog";
import type { Portrait } from "@/components/avatar/portraits";
import { CONTEST_STATUS, MISSION_ORDER, accuracy, daysUntil, formatStudyTime, levelPct, missionXp, nextMilestone, rankTrend, weeklyEvolution, type MissionKey } from "@/domain/gamification/home";
import type { HomeData } from "@/server/services/gamification";
import { LevelUp } from "./level-up";
import { RequestSlot, RequestTrigger } from "./request-slot";

/**
 * Home "Painel de operações" — réplica do layout oficial (941 px de largura de referência).
 * Molduras, ícones e cenário vêm da arte oficial (public/home/painel-fundo2.webp, só com os
 * campos de dados apagados); cada dado é desenhado por cima, na mesma posição, a partir do banco.
 */

const fmt = (n: number) => n.toLocaleString("pt-BR");
const dateBR = (iso: string) => new Date(iso.length === 10 ? `${iso}T12:00:00Z` : iso).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
const u = (n: number) => `calc(${n} * var(--u))`;
/** Caixa na grade da arte: x, y, largura e altura em px da referência. */
const at = (x: number, y: number, w: number, h: number, extra?: CSSProperties): CSSProperties => ({ left: u(x), top: u(y), width: u(w), height: u(h), ...extra });
const fs = (n: number): CSSProperties => ({ fontSize: u(n) });

const MISSION_LABEL: Record<MissionKey, string> = { estudar: "Estudar uma aula completa", combater: "Resolver 20 questões", revisar: "Revisar 15 questões" };
/** Centro vertical de cada missão e da linha clicável (referência do layout, y absoluto). */
const MISSION_ROW: Record<MissionKey, { cy: number; top: number; h: number }> = {
  estudar: { cy: 1089, top: 1066, h: 48 },
  combater: { cy: 1141, top: 1118, h: 46 },
  revisar: { cy: 1185, top: 1166, h: 42 },
};
const Y0 = 448; // y da arte onde o recorte do layout começa
const A = (x: number, y: number, w: number, h: number, extra?: CSSProperties): CSSProperties => at(x, y - Y0, w, h, extra);
/** Medalhas na ordem e com os rótulos do layout (as de disciplina ficam em "Ver todas"). */
const MEDAL_ROW = [
  { id: "primeiro_combate", l1: "Primeiro", l2: "Combate" },
  { id: "atirador_elite", l1: "Atirador", l2: "de Elite" },
  { id: "incansavel", l1: "Incansável", l2: "(30 dias)" },
  { id: "especialista", l1: "Especialista", l2: "(em 1 matéria)" },
  { id: "caveira_elite", l1: "Caveira de Elite", l2: "(Nível 10)" },
];
const medalSrc = (id: string) => `/home/medalhas/${id.startsWith("disciplina_") ? "disciplina" : id}.webp`;

export interface HomeOperacaoProps {
  name: string | null;
  data: HomeData;
  avatar: { config: AvatarConfig; items: AvatarItem[]; portrait?: Portrait | null } | null;
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
  const nameSize = Math.min(52, Math.max(22, 620 / Math.max(10, nm.length)));
  const rankLabel = rank.label.toUpperCase();
  const rankSize = rankLabel.length <= 7 ? 25 : Math.max(14, 170 / rankLabel.length);
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
  const alerts = insights?.length ?? 0;
  const numSize = String(game.streak.current).length >= 3 ? 48 : String(game.streak.current).length === 2 ? 58 : 66;
  const diasSize = String(game.streak.current).length >= 3 ? 26 : 34;

  return (
    <div className="clw" data-testid="home-operacao">
      <LevelUp levels={game.levelUps} ack={ackLevels} />
      <div className="cl">
        {/* ============================ Palco: cabeçalho, operador, avatar, cards */}
        <div className="cl-stage">
        <section className="cl-a" aria-label="Seu operador" data-testid="painel-avatar">
          <div className="cl-bg cl-bg-a" aria-hidden />

          {/* Cabeçalho (no celular; no computador o cabeçalho do app faz esse papel) */}
          <Link href="/perfil" aria-label="Perfil" className="cl-hit cl-round" style={A(42, 492, 78, 78)}><span className="cl-sr">Perfil</span></Link>
          <Link href="/mentor" aria-label={`Mentor APROVUM: ${alerts} recomendações`} className="cl-hit cl-round" style={A(752, 494, 74, 72)} data-testid="home-sino"><span className="cl-sr">Mentor</span></Link>
          {alerts > 0 && <span className="cl-badge" style={A(800, 493, 27, 27, fs(17))}>{alerts}</span>}
          <Link href="/perfil" aria-label="Configurações" className="cl-hit cl-round" style={A(838, 494, 74, 72)}><span className="cl-sr">Configurações</span></Link>

          {avatar ? (
            <div className="cl-palco" style={A(261, 580, 467, 698)}>
              <AvatarStage config={avatar.config} items={avatar.items} interactive className="cl-palco-arte" mannequin={mannequin} rank={rank.id} portrait={avatar.portrait} transparent />
            </div>
          ) : (
            <p role="alert" className="cl-t cl-c" style={A(350, 860, 290, 80, fs(20))}>Não foi possível carregar seu avatar agora. Recarregue a página.</p>
          )}

          {/* Card do operador */}
          <div data-testid="avatar-info">
            <T box={A(161, 621, 90, 28, { fontSize: u(rankSize) })} className="cl-label" testId="avatar-patente">{rankLabel}</T>
            <T box={A(54, 655, 254, 56, fs(nameSize))} className="cl-nome cl-c" testId="operador-nome">{nm}</T>
            <T box={A(226, 738, 80, 58, fs(62))} className="cl-nivel-n">
              <b data-testid="operador-nivel">{game.level}</b>
            </T>
            <div className="cl-xpfill" style={A(56, 810, 238, 28)} role="progressbar" aria-label="XP até o próximo nível" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
              <i style={{ width: `${pct}%` }} />
            </div>
            <T box={A(54, 807, 244, 34, fs(30))} className="cl-xp cl-c">
              <span data-testid="avatar-xp">{fmt(game.xp)}</span>&nbsp;/ {fmt(game.levelNext)} XP
            </T>
            <T box={A(138, 887, 150, 30, fs(rankReady ? 28 : 26))} className="cl-rank-v" testId="avatar-ranking">
              {rankReady ? (
                <>
                  #{fmt(game.ranking.position!)}
                  {trend != null && trend !== 0 && (trend > 0 ? <TrendingUp className="cl-up" aria-label={`subiu ${trend}`} /> : <TrendingDown className="cl-down" aria-label={`caiu ${-trend}`} />)}
                </>
              ) : (
                <span>Em formação</span>
              )}
            </T>

            {/* Áreas clicáveis do card */}
            <Link href="/perfil" className="cl-hit cl-card-hit" style={A(48, 616, 262, 104)} aria-label={`${rank.label} ${nm} — abrir perfil`} />
            <details className="cl-rank" name="cl-pop" style={A(48, 732, 262, 112)}>
              <summary aria-label="Ver nível e XP" />
              <div className="cl-pop" style={at(0, 120, 262, 0, fs(20))} data-testid="nivel-detalhe">
                <p className="cl-pop-h">NÍVEL {game.level} · {rank.label.toUpperCase()}</p>
                <p className="cl-pop-s">{fmt(game.xp)} de {fmt(game.levelNext)} XP para o nível {game.level + 1} ({pct}%).</p>
                <p className="cl-pop-s">Missões de hoje: {fmt(mx.earned)} XP conquistados · {fmt(mx.available)} XP ainda disponíveis.</p>
              </div>
            </details>
            <details className="cl-rank" name="cl-pop" style={A(48, 846, 262, 80)}>
              <summary aria-label="Ver ranking APROVUM" />
              <div className="cl-pop" style={at(-16, 86, 330, 0, fs(19))} data-testid="ranking-aprovum">
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
            <Link href="/mentor" className="cl-hit cl-card-hit" style={A(48, 930, 262, 60)} aria-label="Mentor APROVUM: disciplina é o caminho da vitória" />
          </div>

          {/* Sua disciplina */}
          <div data-testid="sua-disciplina">
            <T box={A(764, 806, 130, 66)} className="cl-dias">
              <b data-testid="streak-atual" style={fs(numSize)}>{game.streak.current}</b>
              <span style={fs(diasSize)}>{game.streak.current === 1 ? "DIA" : "DIAS"}</span>
            </T>
            {last6.map((d, i) => (
              <span key={d} className={`cl-dot ${active.has(d) ? "is-on" : ""}`} style={A(688 + i * 34.7, 912.5, 27, 27)} data-day={d}>
                {active.has(d) && <Check aria-hidden />}
              </span>
            ))}
            <T box={A(742, 966, 160, 30, fs(27))} className="cl-rec">
              Recorde: <b>{game.streak.best} {game.streak.best === 1 ? "dia" : "dias"}</b>
            </T>
            <details className="cl-rank" name="cl-pop" style={A(670, 758, 244, 250)}>
              <summary aria-label="Ver detalhes da sua disciplina" />
              <div className="cl-pop" style={at(-90, 256, 330, 0, fs(19))} data-testid="disciplina-detalhe">
                <p className="cl-pop-h">SUA DISCIPLINA</p>
                <p className="cl-pop-s">{goal ? `Próxima meta: ${goal} dias seguidos.` : "Todas as metas de disciplina alcançadas."} Recorde: {game.streak.best} {game.streak.best === 1 ? "dia" : "dias"}.</p>
                <ul className="cl-pop-dias">
                  {last6.map((d) => (
                    <li key={d} className={active.has(d) ? "is-on" : ""}><span>{dateBR(d).slice(0, 5)}</span><b>{active.has(d) ? "estudou" : "—"}</b></li>
                  ))}
                </ul>
              </div>
            </details>
          </div>

          {/* Operação do dia */}
          <div data-testid="operacao-do-dia" title={`Hoje: ${fmt(mx.earned)} XP conquistados · ${fmt(mx.available)} XP ainda disponíveis`}>
            <T box={A(262, 1022, 56, 33, fs(30))} className="cl-c cl-pill">{game.missions.completed}/3</T>
            {MISSION_ORDER.map((k) => {
              const m = game.missions[k];
              const r = MISSION_ROW[k];
              return (
                <Link key={k} href={missionHref[k]} className={`cl-mis ${m.done ? "is-done" : ""}`} style={A(40, r.top, 284, r.h)} data-testid={`missao-${k}`} data-done={m.done}>
                  <span className="cl-chk" style={at(9, r.cy - r.top - 15.5, 31, 31)}>{m.done && <Check aria-hidden />}</span>
                  <span className="cl-mis-t" style={at(56, 0, m.done ? (k === "estudar" ? 150 : 178) : k === "estudar" ? 190 : 200, r.h, fs(m.done && k !== "estudar" ? 19 : 22))}>{MISSION_LABEL[k].replace(/\d+/, String(m.target))}</span>
                  <span className="cl-mis-x" style={at(m.done ? 230 : 214, 0, m.done ? 52 : 66, r.h, fs(m.done ? 17 : 22))}>{m.done ? `+${game.missionXp[k]} XP` : m.target > 1 ? `${m.progress}/${m.target}` : ""}</span>
                </Link>
              );
            })}
            <span className="cl-sr" data-testid="xp-hoje">Hoje: {fmt(mx.earned)} XP · disponível: {fmt(mx.available)} XP</span>
          </div>

          {/* Foco, disciplina, aprovação */}
          <Link href="/mentor" className="cl-hit cl-card-hit" style={A(678, 1046, 240, 224)} aria-label="Foco, disciplina, aprovação — abrir o Mentor APROVUM" />

          <RequestTrigger box={A(325, 1248, 340, 76)} />
        </section>

        <RequestSlot initial={request} action={requestAction} />
        </div>

        {/* ============================ Estudos, conquistas e concursos */}
        <section className="cl-low" aria-label="Seus estudos">
          <div className="cl-card cl-cont" data-testid="continuar-estudando" title={cont ? `Última atividade: ${dateBR(cont.at)}${cont.module ? ` · ${cont.module}` : ""}` : undefined}>
            <h3 className="cl-h">CONTINUAR ESTUDANDO</h3>
            {cont ? (
              <>
                <p className="cl-cont-t">{cont.subject} • {cont.lesson}</p>
                <div className="cl-prog"><i style={{ width: `${cont.pct}%` }} /><b>{cont.pct}%</b></div>
                <Link href={`/aula/${cont.lessonId}`} className="cl-cta" data-testid="retomar-missao">RETOMAR MISSÃO</Link>
              </>
            ) : (
              <>
                <p className="cl-cont-t">Você ainda não iniciou nenhuma aula.</p>
                <Link href="/trilhas" className="cl-cta" data-testid="comecar-missao">COMEÇAR MISSÃO</Link>
              </>
            )}
          </div>

          <div className="cl-card cl-perf" data-testid="seu-desempenho">
            <h3 className="cl-h"><span className="cl-bars" aria-hidden><i /><i /><i /></span>SEU DESEMPENHO</h3>
            {!perf || perf.answered === 0 ? (
              <p className="cl-vazio">Ainda não existem dados suficientes para gerar sua análise.</p>
            ) : (
              <Link href="/desempenho" aria-label="Ver análise completa" className="cl-perf-g">
                <div><b data-testid="perf-questoes">{fmt(perf.answered)}</b><small>Questões</small></div>
                <div><b data-testid="perf-taxa">{acc}%</b><small>Acertos</small></div>
                <div><b>{hours ?? "—"}</b><small>{hours ? "Horas de estudo" : "Sem tempo registrado"}</small></div>
                <div><b>{evo == null ? "—" : `${evo > 0 ? "+" : ""}${evo}%`}</b><small>Evolução</small></div>
                <span className="cl-sr">{fmt(perf.correct)} acertos e {fmt(perf.wrong)} erros</span>
              </Link>
            )}
          </div>

          <div className="cl-card cl-wide" data-testid="conquistas">
            <div className="cl-row">
              <h3 className="cl-h">CONQUISTAS</h3>
              <details className="cl-todas">
                <summary aria-label="Ver todas as conquistas">Ver todas · {unlocked}/{game.achievements.length}</summary>
                <div className="cl-pop cl-pop-conq" style={fs(19)}>
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
            <span className="cl-sr">{unlocked} de {game.achievements.length} conquistas desbloqueadas</span>
            <div className="cl-medals">
              {MEDAL_ROW.map((m) => {
                const a = byId.get(m.id);
                const on = !!a?.unlockedAt;
                return (
                  <div key={m.id} className={`cl-medal ${on ? "is-on" : "is-off"}`} data-testid={`conquista-${m.id}`} data-unlocked={on}
                    title={a ? `${a.description} ${on ? `Desbloqueada em ${dateBR(a.unlockedAt!)}.` : `Como desbloquear: ${a.criterion}.`}` : undefined}>
                    <span className="cl-medal-i">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={medalSrc(m.id)} alt="" />
                      {!on && <Lock className="cl-lock" aria-label="bloqueada" />}
                    </span>
                    <span>{m.l1}<br />{m.l2}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="cl-card cl-wide" data-testid="proximos-concursos">
            <h3 className="cl-h">PRÓXIMOS CONCURSOS</h3>
            {contest ? (
              <div className="cl-conc" title={`Fonte: ${contest.sourceName} · atualizado em ${dateBR(contest.infoUpdatedAt)} · ${CONTEST_STATUS[contest.status] ?? contest.status}`}>
                {contest.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={contest.imageUrl} alt={`Imagem do concurso ${contest.name}`} className="cl-conc-img" data-testid="concurso-imagem" />
                )}
                <div className="cl-conc-i">
                  <b className="cl-conc-n">{contest.name}</b>
                  <span className={contest.vacancies != null ? "cl-ouro" : "cl-dim"}>{contest.vacancies != null ? `+${fmt(contest.vacancies)} vagas` : "Vagas não divulgadas"}</span>
                </div>
                <div className="cl-conc-i cl-conc-p">
                  <span className="cl-prova"><Clock aria-hidden />{contest.examDate ? `Prova: ${dateBR(contest.examDate)}` : "Data não definida"}</span>
                  {(!contest.infoConfirmed || (contest.examDate && !contest.examDateConfirmed)) && <span className="cl-aviso">Informação não confirmada</span>}
                </div>
                {left != null && (
                  <div className="cl-dias-box" data-testid="contagem-regressiva">
                    <b>{left}</b>
                    <span>{left === 1 ? "DIA" : "DIAS"}</span>
                  </div>
                )}
                {contest.sourceUrl && <a href={contest.sourceUrl} target="_blank" rel="noreferrer noopener" className="cl-fonte" aria-label={`Fonte: ${contest.sourceName}`}>Fonte</a>}
              </div>
            ) : (
              <p className="cl-vazio">Nenhum concurso cadastrado no momento.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
