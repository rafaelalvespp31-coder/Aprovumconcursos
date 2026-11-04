"use client";

import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useMemo, useState, useTransition } from "react";
import { ArrowRight, Bell, BellRing, ChartNoAxesColumn, CheckCircle2, Clock, Crosshair, Megaphone, MapPin, Rocket, X, Zap, ShieldCheck } from "lucide-react";
import { CONTEST_STATUS } from "@/domain/gamification/home";
import { BUCKETS, UFS, UF_NAME, bucketOf, byUf, countBuckets, type Bucket } from "@/domain/concursos";
import type { Contest } from "@/server/services/gamification";
import { ContestList, DOT } from "./contest-list";

const BrazilMap = dynamic(() => import("./brazil-map"), { ssr: false, loading: () => <div className="cn2-mapa cn2-mapa-carrega" aria-busy>Carregando o mapa…</div> });
type Toggle = (key: string, on: boolean) => Promise<{ ok: boolean }>;

const PILL: Record<Bucket, string> = { abertos: "Aberto", andamento: "Em Andamento", concluidos: "Concluído", embreve: "Em Breve" };

/**
 * Página Concursos, clonada da referência: topo (arte), quatro cards com contagens reais, mapa do Brasil
 * interativo + destaques, banner final e rodapé. No celular a mesma arte e os mesmos blocos, reorganizados na vertical.
 */
export function ConcursosView({
  contests,
  today,
  favorites = [],
  alerts = [],
  toggleFavorite,
  toggleAlert,
}: {
  contests: Contest[];
  today: string;
  favorites?: string[];
  alerts?: string[];
  toggleFavorite?: Toggle;
  toggleAlert?: Toggle;
}) {
  const [bucket, setBucket] = useState<Bucket | null>(null);
  const [uf, setUf] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [favs, setFavs] = useState(() => new Set(favorites));
  const [alertSet, setAlertSet] = useState(() => new Set(alerts));
  const [, start] = useTransition();

  const totals = useMemo(() => countBuckets(contests), [contests]);
  const perUf = useMemo(() => byUf(contests), [contests]);
  const counts = useMemo(() => Object.fromEntries([...perUf].map(([k, v]) => [k, v.length])), [perUf]);
  // Cor de cada estado: o grupo mais "quente" entre os concursos dele (aberto > em andamento > em breve > concluído).
  const tone = useMemo(() => {
    const order: Bucket[] = ["abertos", "andamento", "embreve", "concluidos"];
    const out: Record<string, Bucket> = {};
    for (const [k, list] of perUf) out[k] = order.find((b) => list.some((c) => bucketOf(c.status) === b))!;
    return out;
  }, [perUf]);
  const featured = useMemo(() => {
    const f = contests.filter((c) => c.featured);
    return (f.length ? f : contests).slice(0, 5);
  }, [contests]);

  const flip = (set: Set<string>, setter: (s: Set<string>) => void, key: string, fn?: Toggle) => {
    const on = !set.has(key);
    const next = new Set(set);
    if (on) next.add(key);
    else next.delete(key);
    setter(next);
    if (fn) start(async () => void (await fn(key, on).catch(() => ({ ok: false })).then((r) => !r.ok && setter(set))));
  };
  const onFav = (id: string) => flip(favs, setFavs, id, toggleFavorite);
  const onAlert = (scope: string) => flip(alertSet, setAlertSet, scope, toggleAlert);

  const pickBucket = (b: Bucket) => {
    setBucket((cur) => (cur === b ? null : b));
    window.setTimeout(() => document.getElementById("cn-resultados")?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
  };
  const stateList = uf ? (perUf.get(uf) ?? []) : [];
  const listed = bucket && bucket !== "embreve" ? contests.filter((c) => bucketOf(c.status) === bucket) : [];
  const shown = showAll ? contests : featured;

  return (
    <div className="cn2" data-testid="concursos">
      {/* ===== Topo (arte da referência) ===== */}
      <section className="cn2-hero" aria-labelledby="cn-titulo">
        <h1 id="cn-titulo" className="sr-only">Concursos públicos: conquiste seu futuro</h1>
        <Image src="/concursos/hero-d.webp" alt="" width={1024} height={370} priority className="cn2-hero-d" sizes="(min-width: 1100px) 1000px, 100vw" />
        {/* Celular: texto nativo + a arte do soldado e da caveira */}
        <div className="cn2-hero-m">
          <p className="cn2-chip">CONCURSOS PÚBLICOS <i /><i /><i /></p>
          <p className="cn2-h1" aria-hidden><span>CONQUISTE</span><b>SEU FUTURO!</b></p>
          <p className="cn2-lead">Aqui você encontra todos os concursos do Brasil, em um só lugar, com informações atualizadas, inteligência e foco total na sua aprovação.</p>
          <ul className="cn2-feats">
            <li><Zap aria-hidden /><span>Atualização<br />em tempo real</span></li>
            <li><Crosshair aria-hidden /><span>Filtros<br />avançados</span></li>
            <li><Bell aria-hidden /><span>Alertas<br />personalizados</span></li>
            <li><ChartNoAxesColumn aria-hidden /><span>Acompanhe<br />sua jornada</span></li>
          </ul>
          <Image src="/concursos/hero-arte-m.webp" alt="" width={484} height={374} className="cn2-hero-arte" />
        </div>
      </section>

      {/* ===== Quatro cards ===== */}
      <section className="cn2-cards" aria-label="Concursos por situação">
        <Card id="abertos" Icon={Megaphone} title={<>Concursos<br />Abertos</>} n={totals.abertos} cta="Ver Concursos" on={bucket === "abertos"} onClick={() => pickBucket("abertos")} />
        <Card id="andamento" Icon={Clock} title={<>Concursos<br />Em Andamento</>} n={totals.andamento} cta="Ver Concursos" on={bucket === "andamento"} onClick={() => pickBucket("andamento")} />
        <Card id="concluidos" Icon={CheckCircle2} title={<>Concursos<br />Concluídos</>} n={totals.concluidos} cta="Ver Histórico" on={bucket === "concluidos"} onClick={() => pickBucket("concluidos")} />
        <Card id="embreve" Icon={Rocket} title={<>Em Breve</>} n={totals.embreve} sub="Novos concursos chegando em breve!" cta="Fique por dentro" on={bucket === "embreve"} onClick={() => pickBucket("embreve")} />
      </section>

      {/* ===== Resultado do grupo ===== */}
      {bucket && bucket !== "embreve" && (
        <section id="cn-resultados" className="cn-painel" aria-label={BUCKETS.find((b) => b.id === bucket)!.label} data-testid="painel-grupo">
          <header className="cn-painel-topo">
            <h2>{BUCKETS.find((b) => b.id === bucket)!.label}</h2>
            <button type="button" className="cn-x" onClick={() => setBucket(null)} aria-label="Fechar lista"><X className="size-4" aria-hidden /></button>
          </header>
          <ContestList list={listed} today={today} favs={favs} onFav={onFav} empty="Ainda não há concursos nesta situação." />
        </section>
      )}
      {bucket === "embreve" && (
        <section id="cn-resultados" className="cn-painel cn-painel-breve" aria-label="Em breve" data-testid="painel-embreve">
          <header className="cn-painel-topo">
            <div>
              <p className="cn-breve-k">EM BREVE</p>
              <h2>Concursos previstos e movimentações</h2>
              <p className="cn-breve-aviso">Tudo aqui é <b>previsão ou movimentação anunciada</b> — não é edital publicado. Confira sempre a fonte.</p>
            </div>
            <button type="button" className="cn-x" onClick={() => setBucket(null)} aria-label="Fechar Em breve"><X className="size-4" aria-hidden /></button>
          </header>
          <button type="button" className={`cn-alerta ${alertSet.has("*") ? "on" : ""}`} onClick={() => onAlert("*")} aria-pressed={alertSet.has("*")} data-testid="alerta-todos">
            {alertSet.has("*") ? <BellRing className="size-5" aria-hidden /> : <Bell className="size-5" aria-hidden />}
            {alertSet.has("*") ? "Alertas de novos concursos ativados" : "Ativar alertas de novos concursos"}
          </button>
          <ContestList list={contests.filter((c) => bucketOf(c.status) === "embreve")} today={today} favs={favs} onFav={onFav} empty="Nenhuma previsão cadastrada por enquanto. Ative o alerta e avisamos quando houver novidade." showForecast />
          {favs.size > 0 && (
            <>
              <h3 className="cn-sub">Seus favoritos</h3>
              <ContestList list={contests.filter((c) => favs.has(c.id))} today={today} favs={favs} onFav={onFav} empty="" />
            </>
          )}
        </section>
      )}

      {/* ===== Mapa + destaques ===== */}
      <section className="cn2-mapa-sec" aria-label="Concursos por estado">
        <div className="cn2-lado">
          <Image src="/concursos/titulo-brasil.webp" alt="Mapa do concurso: Brasil" width={232} height={108} className="cn2-titulo" />
          <p className="cn2-explore">Explore o mapa e descubra os concursos disponíveis em cada estado e no DF.</p>
          <ul className="cn2-legenda" aria-label="Legenda do mapa">
            <li><i className="l-abertos" />Concursos Abertos</li>
            <li><i className="l-andamento" />Concursos em Andamento</li>
            <li><i className="l-concluidos" />Concursos Concluídos</li>
            <li><i className="l-embreve" />Em Breve</li>
          </ul>
          <button type="button" className="cn2-todos-estados" onClick={() => setUf(null)} data-testid="ver-todos-estados"><MapPin className="size-4" aria-hidden /> Ver todos os estados <ArrowRight className="size-4" aria-hidden /></button>
        </div>

        <div className="cn2-mapa-col">
          <BrazilMap selected={uf} counts={counts} tone={tone} onSelect={setUf} />
          <ul className="cn-ufs" aria-label="Estados">
            {UFS.map(([u, n]) => (
              <li key={u}>
                <button type="button" className={`${uf === u ? "on" : ""} ${counts[u] ? "tem" : ""}`} onClick={() => setUf(uf === u ? null : u)} aria-pressed={uf === u} aria-label={`${n}${counts[u] ? `: ${counts[u]}` : ""}`} data-testid={`chip-${u}`}>
                  {u}{counts[u] ? <i>{counts[u]}</i> : null}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <aside className="cn2-dest" aria-live="polite">
          {uf ? (
            <div data-testid="painel-estado">
              <header className="cn-painel-topo">
                <div>
                  <p className="cn-breve-k">ESTADO SELECIONADO</p>
                  <h2 data-testid="estado-nome">{UF_NAME[uf]?.toUpperCase()}</h2>
                </div>
                <button type="button" className="cn-x" onClick={() => setUf(null)} aria-label="Voltar ao mapa completo"><X className="size-4" aria-hidden /></button>
              </header>
              <button type="button" className={`cn-alerta cn-alerta-sm ${alertSet.has(uf) ? "on" : ""}`} onClick={() => onAlert(uf)} aria-pressed={alertSet.has(uf)}>
                {alertSet.has(uf) ? <BellRing className="size-4" aria-hidden /> : <Bell className="size-4" aria-hidden />} {alertSet.has(uf) ? `Alertas de ${uf} ativados` : `Avisar de novos concursos em ${uf}`}
              </button>
              {stateList.length === 0 ? (
                <p className="cn-vazio" data-testid="estado-vazio">Ainda não existem concursos disponíveis para {UF_NAME[uf]}. Ative o alerta e avisamos quando houver.</p>
              ) : (
                BUCKETS.map((b) => {
                  const l = stateList.filter((c) => bucketOf(c.status) === b.id);
                  if (!l.length) return null;
                  return (
                    <div key={b.id} className="cn-grupo">
                      <h3 className="cn-sub"><i style={{ background: DOT[b.id] }} /> {b.label} ({l.length})</h3>
                      <ContestList list={l} today={today} favs={favs} onFav={onFav} empty="" showForecast={b.id === "embreve"} />
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            <div data-testid="painel-destaques">
              <header className="cn2-dest-topo">
                <h2><ChartNoAxesColumn className="size-4" aria-hidden /> DESTAQUES POR ESTADO</h2>
                {contests.length > featured.length && (
                  <button type="button" onClick={() => setShowAll((v) => !v)} data-testid="ver-todos">{showAll ? "Ver menos" : "Ver todos"} <ArrowRight className="size-3" aria-hidden /></button>
                )}
              </header>
              {contests.length === 0 ? (
                <p className="cn-vazio" data-testid="destaques-vazio">Nenhum concurso cadastrado no momento. Assim que a equipe publicar, ele aparece aqui.</p>
              ) : (
                <ul className="cn2-dest-lista">
                  {shown.map((c) => (
                    <li key={c.id}>
                      <button type="button" className="cn2-dest-item" onClick={() => (c.uf ? setUf(c.uf) : setBucket(bucketOf(c.status)))} data-testid="destaque">
                        <span className="cn2-bandeira">{c.uf ?? "BR"}</span>
                        <span className="cn2-dest-nome"><b>{c.name}</b><small>{c.uf ? UF_NAME[c.uf] : "Nacional"}</small></span>
                        <span className="cn2-dest-dir">
                          <span className="cn2-dest-vagas">{c.vacancies != null ? `+${c.vacancies.toLocaleString("pt-BR")} vagas` : CONTEST_STATUS[c.status] ?? ""}</span>
                          <span className={`cn2-pill p-${bucketOf(c.status)}`}>{PILL[bucketOf(c.status)]}</span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </aside>
      </section>

      {/* ===== Banner "Sempre um passo à frente" ===== */}
      <section className="cn2-banner" aria-label="Sempre um passo à frente">
        <Image src="/concursos/banner-d.webp" alt="" width={1024} height={246} className="cn2-banner-d" />
        <Link href="/trilhas" className="cn2-banner-hit" aria-label="Comece agora mesmo" data-testid="banner-comece" />
        <div className="cn2-banner-m">
          <Image src="/concursos/banner-rosto.webp" alt="" width={285} height={246} className="cn2-banner-rosto" />
          <div className="cn2-banner-txt">
            <p className="cn2-banner-k">SEMPRE UM PASSO <b>À FRENTE</b></p>
            <p className="cn2-banner-t">Com o Aprovum, você fica por dentro de todos os concursos, recebe alertas, acompanha editais e se prepara com o melhor conteúdo, do jeito certo.</p>
            <Link href="/trilhas" className="cn2-banner-bt">COMECE AGORA MESMO <ArrowRight className="size-4" aria-hidden /></Link>
            <ul className="cn2-banner-lista">
              <li><ShieldCheck aria-hidden />26 Estados + DF</li>
              <li><ShieldCheck aria-hidden />Notificações em tempo real</li>
              <li><ShieldCheck aria-hidden />Conteúdo de alta performance</li>
              <li><ShieldCheck aria-hidden />Sua aprovação mais perto</li>
            </ul>
          </div>
        </div>
      </section>

      {/* ===== Rodapé ===== */}
      <footer className="cn2-rodape">
        <Image src="/concursos/rodape-d.webp" alt="APROVUM — Sua preparação. Seu próximo cargo. Estude, evolua, conquiste." width={1024} height={153} className="cn2-rodape-d" />
        <div className="cn2-rodape-m">
          <Image src="/concursos/rodape-logo.webp" alt="APROVUM — Sua preparação. Seu próximo cargo." width={294} height={100} />
          <Image src="/concursos/rodape-selos.webp" alt="" width={280} height={60} aria-hidden />
          <p>ESTUDE <i>•</i> <b>EVOLUA</b> <i>•</i> CONQUISTE</p>
        </div>
      </footer>
    </div>
  );
}

function Card({ id, Icon, title, n, sub, cta, on, onClick }: { id: Bucket; Icon: typeof Megaphone; title: React.ReactNode; n: number; sub?: string; cta: string; on: boolean; onClick: () => void }) {
  return (
    <button type="button" className={`cn2-card cn2-card-${id} ${on ? "on" : ""}`} onClick={onClick} aria-pressed={on} data-testid={`grupo-${id}`}>
      <span className="cn2-card-fundo" style={{ backgroundImage: `url(/concursos/card-${{ abertos: "c1", andamento: "c2", concluidos: "c3", embreve: "c4" }[id]}.webp)` }} aria-hidden />
      <span className="cn2-card-topo"><Icon className="cn2-card-ico" aria-hidden /><span className="cn2-card-nome">{title}</span></span>
      <span className="cn2-card-n" data-testid={`grupo-${id}-n`}>{id === "embreve" && n > 0 ? `+${n}` : n}</span>
      {sub && <span className="cn2-card-sub">{sub}</span>}
      <span className="cn2-card-bt">{cta} <ArrowRight aria-hidden /></span>
      {id === "embreve" && <span className="cn2-sino" aria-hidden><Bell /></span>}
    </button>
  );
}
