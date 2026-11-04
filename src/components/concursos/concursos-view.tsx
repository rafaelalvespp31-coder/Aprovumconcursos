"use client";

import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useMemo, useState, useTransition } from "react";
import { Bell, BellRing, CalendarDays, ExternalLink, FolderSearch, GraduationCap, MapPin, SlidersHorizontal, Star, Users, Wallet, X, Activity, Landmark, Lock, FileText } from "lucide-react";
import { CONTEST_STATUS, daysUntil } from "@/domain/gamification/home";
import { BUCKETS, UFS, UF_NAME, bucketOf, byUf, countBuckets, type Bucket } from "@/domain/concursos";
import type { Contest } from "@/server/services/gamification";

const BrazilMap = dynamic(() => import("./brazil-map"), { ssr: false, loading: () => <div className="cn-mapa cn-mapa-carrega" aria-busy>Carregando o mapa…</div> });

const dateBR = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
type Toggle = (key: string, on: boolean) => Promise<{ ok: boolean }>;

const CARD_ICON: Record<Bucket, typeof Landmark> = { abertos: FolderSearch, andamento: Activity, concluidos: FileText, embreve: Lock };
const DOT: Record<Bucket, string> = { abertos: "#16a34a", andamento: "#2563eb", concluidos: "#6b7280", embreve: "#e50914" };

/** Página Concursos: hero, quatro grupos, mapa interativo do Brasil por estado, destaques e “Em breve”. */
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
  const featured = useMemo(() => {
    const f = contests.filter((c) => c.featured);
    return (f.length ? f : contests.filter((c) => c.uf)).slice(0, 6);
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
    setShowAll(false);
    window.setTimeout(() => document.getElementById("cn-resultados")?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
  };

  const stateList = uf ? (perUf.get(uf) ?? []) : [];
  const listed = bucket && bucket !== "embreve" ? contests.filter((c) => bucketOf(c.status) === bucket) : [];

  return (
    <div className="cn" data-testid="concursos">
      {/* ===== Hero ===== */}
      <section className="cn-hero" aria-labelledby="cn-titulo">
        <div className="cn-hero-txt">
          <p className="cn-chip"><Landmark className="size-4" aria-hidden /> CONCURSOS PÚBLICOS</p>
          <h1 id="cn-titulo" className="cn-h1"><span>CONQUISTE</span> <b>SEU FUTURO!</b></h1>
          <p className="cn-lead">Acompanhe editais, inscrições e provas de todo o Brasil em um só lugar — com informações cadastradas e conferidas pela equipe APROVUM.</p>
          <ul className="cn-feats">
            <li><Activity className="size-5" aria-hidden /><b>Atualização</b> em tempo real</li>
            <li><SlidersHorizontal className="size-5" aria-hidden /><b>Filtros</b> avançados</li>
            <li><Bell className="size-5" aria-hidden /><b>Alertas</b> personalizados</li>
            <li><Star className="size-5" aria-hidden /><b>Acompanhe</b> seus favoritos</li>
          </ul>
        </div>
        <div className="cn-hero-arte" aria-hidden>
          <Image src="/icons/operador.webp" alt="" width={450} height={724} priority className="cn-soldado" />
          <Image src="/icons/instrutor-caveira.png" alt="" width={320} height={320} className="cn-caveira" />
          <p className="cn-lema">FOQUE.<br />ESTUDE.<br /><b>CONQUISTE.</b></p>
        </div>
      </section>

      {/* ===== Quatro grupos ===== */}
      <section className="cn-cards" aria-label="Concursos por situação">
        {BUCKETS.map((b) => {
          const Ic = CARD_ICON[b.id];
          return (
            <button key={b.id} type="button" className={`cn-card cn-card-${b.id} ${bucket === b.id ? "on" : ""}`} onClick={() => pickBucket(b.id)} aria-pressed={bucket === b.id} data-testid={`grupo-${b.id}`}>
              <span className="cn-card-ico"><Ic className="size-7" aria-hidden /></span>
              <span className="cn-card-nome">{b.label.toUpperCase()}</span>
              <span className="cn-card-n" data-testid={`grupo-${b.id}-n`}>{totals[b.id]}</span>
              <span className="cn-card-bt">{b.id === "embreve" ? "VER PREVISÕES" : "VER CONCURSOS"}</span>
            </button>
          );
        })}
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

      {/* ===== Mapa + painel lateral ===== */}
      <section className="cn-mapa-sec" aria-label="Concursos por estado">
        <div className="cn-mapa-col">
          <h2 className="cn-h2">Explore por <b>estado</b></h2>
          <BrazilMap selected={uf} counts={counts} onSelect={setUf} />
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

        <aside className="cn-lateral" aria-live="polite">
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
              <header className="cn-painel-topo"><h2>DESTAQUES POR ESTADO</h2></header>
              {featured.length === 0 ? (
                <p className="cn-vazio" data-testid="destaques-vazio">Nenhum concurso cadastrado no momento. Assim que a equipe publicar, ele aparece aqui.</p>
              ) : (
                <ul className="cn-dest">
                  {(showAll ? contests : featured).map((c) => (
                    <li key={c.id}>
                      <button type="button" className="cn-dest-item" onClick={() => (c.uf ? setUf(c.uf) : setBucket(bucketOf(c.status)))} data-testid="destaque">
                        <span className="cn-bandeira">{c.uf ?? "BR"}</span>
                        <span className="cn-dest-txt">
                          <b>{c.name}</b>
                          <small>{c.orgao ?? c.institution}{c.vacancies != null ? ` · ${c.vacancies.toLocaleString("pt-BR")} vagas` : ""}</small>
                        </span>
                        <span className="cn-sit"><i style={{ background: DOT[bucketOf(c.status)] }} />{CONTEST_STATUS[c.status] ?? c.status}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {contests.length > featured.length && !showAll && (
                <button type="button" className="cn-todos" onClick={() => setShowAll(true)} data-testid="ver-todos">VER TODOS</button>
              )}
            </div>
          )}
        </aside>
      </section>

      {/* ===== Banner final ===== */}
      <section className="cn-banner" aria-label="Chamada APROVUM">
        <Image src="/icons/instrutor-caveira.png" alt="" width={320} height={320} className="cn-banner-caveira" aria-hidden />
        <div>
          <p className="cn-banner-k">SEMPRE UM PASSO À FRENTE</p>
          <p className="cn-banner-t">A APROVUM transforma o seu estudo em aprovação: trilhas, questões, revisões e Mentor com IA.</p>
          <ul className="cn-banner-lista"><li>Trilhas por edital</li><li>Banco de questões</li><li>Revisão inteligente</li><li>Mentor Aprovum</li></ul>
        </div>
        <Link href="/trilhas" className="cn-banner-bt">COMECE AGORA MESMO</Link>
      </section>
    </div>
  );
}

function ContestList({ list, today, favs, onFav, empty, showForecast }: { list: Contest[]; today: string; favs: Set<string>; onFav: (id: string) => void; empty: string; showForecast?: boolean }) {
  if (!list.length) return empty ? <p className="cn-vazio">{empty}</p> : null;
  return (
    <ul className="cn-lista" data-testid="concursos-lista">
      {list.map((c) => {
        const days = daysUntil(c.examDate, c.examDateConfirmed, today);
        return (
          <li key={c.id} className="cn-item" data-testid="concurso">
            {c.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={c.imageUrl} alt="" loading="lazy" className="cn-item-img" />
            )}
            <div className="cn-item-corpo">
              <div className="cn-item-topo">
                <span className="cn-status"><i style={{ background: DOT[bucketOf(c.status)] }} />{CONTEST_STATUS[c.status] ?? c.status}</span>
                {(showForecast || c.forecast) && <span className="cn-prev">Previsão</span>}
                <button type="button" className={`cn-fav ${favs.has(c.id) ? "on" : ""}`} onClick={() => onFav(c.id)} aria-pressed={favs.has(c.id)} aria-label={favs.has(c.id) ? `Remover ${c.name} dos favoritos` : `Favoritar ${c.name}`}>
                  <Star className="size-4" aria-hidden />
                </button>
              </div>
              <h3 className="cn-item-nome">{c.name}</h3>
              <p className="cn-item-inst">{[c.orgao, c.institution, c.roleName].filter(Boolean).join(" · ")}</p>
              <dl className="cn-dados">
                {c.uf && <div><dt><MapPin className="size-4" aria-hidden /> Local</dt><dd>{[c.city, UF_NAME[c.uf]].filter(Boolean).join(" / ")}{c.location ? ` — ${c.location}` : ""}</dd></div>}
                {c.vacancies != null && <div><dt><Users className="size-4" aria-hidden /> Vagas</dt><dd>{c.vacancies.toLocaleString("pt-BR")}</dd></div>}
                {c.salary && <div><dt><Wallet className="size-4" aria-hidden /> Remuneração</dt><dd>{c.salary}</dd></div>}
                {c.education && <div><dt><GraduationCap className="size-4" aria-hidden /> Escolaridade</dt><dd>{c.education}</dd></div>}
                {c.banca && <div><dt><Landmark className="size-4" aria-hidden /> Banca</dt><dd>{c.banca}</dd></div>}
                {(c.registrationStart || c.registrationEnd) && (
                  <div><dt><CalendarDays className="size-4" aria-hidden /> Inscrições</dt><dd>{[c.registrationStart && dateBR(c.registrationStart), c.registrationEnd && dateBR(c.registrationEnd)].filter(Boolean).join(" a ")}</dd></div>
                )}
                <div><dt><CalendarDays className="size-4" aria-hidden /> Prova</dt><dd>{c.examDate ? `${dateBR(c.examDate)}${c.examDateConfirmed ? "" : " (a confirmar)"}` : "Data a definir"}</dd></div>
              </dl>
              {c.description && <p className="cn-item-desc">{c.description}</p>}
              {days != null && <p className="cn-dias"><b>{days}</b> {days === 1 ? "dia" : "dias"} para a prova</p>}
              <p className="cn-fonte">
                {c.infoConfirmed ? "Informações confirmadas" : "Informações não confirmadas"} · Fonte:{" "}
                {c.sourceUrl ? <a href={c.sourceUrl} target="_blank" rel="noopener noreferrer">{c.sourceName}</a> : c.sourceName}
              </p>
              {c.detailUrl && (
                <a className="cn-detalhes" href={c.detailUrl} target="_blank" rel="noopener noreferrer">Ver detalhes <ExternalLink className="size-3.5" aria-hidden /></a>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
