"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Check, CheckCircle2, Play, Star, Trophy, X, Heart, Sparkles, Quote } from "lucide-react";
import { TESTIMONIAL_CATEGORIES, formatCount, formatDuration, videoSource, type Founder, type StoryQuote, type Testimonial, type TestimonialCategory } from "@/domain/testimonials";
import { UF_NAME } from "@/domain/concursos";

export interface StoriesView {
  founders: Founder[];
  stats: { students: number | null; approved: number | null; satisfaction: string | null; studentsReal: number; approvedReal: number };
  quote: StoryQuote;
  /** Banner dos idealizadores enviado pelo admin (nulo = arte original). */
  hero?: { desktop: string | null; mobile: string | null };
}

type Filter = "todos" | TestimonialCategory;
const FILTER_ICON: Record<Filter, typeof Check> = { todos: Play, aprovados: Check, superacao: Check, transformacao: Sparkles, comunidade: Heart };

/** Anima de 0 até o valor quando o elemento entra na tela (sem animar se o aluno pede menos movimento). */
function useCountUp(target: number, ref: React.RefObject<Element | null>) {
  const [v, setV] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e?.isIntersecting) return;
        io.disconnect();
        if (reduce) return setV(target);
        const t0 = performance.now();
        const tick = (t: number) => {
          const p = Math.min(1, (t - t0) / 1200);
          setV(Math.round(target * (1 - Math.pow(1 - p, 3))));
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [target, ref]);
  return v;
}

/** Revela os blocos ao rolar. */
function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const els = root.querySelectorAll<HTMLElement>("[data-rv]");
    const io = new IntersectionObserver(
      (list) => list.forEach((e) => e.isIntersecting && (e.target.classList.add("is-in"), io.unobserve(e.target))),
      { threshold: 0.12 },
    );
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, []);
  return ref;
}

/**
 * Depoimentos e Histórias, clonada da referência: arte do topo com as placas dos idealizadores (dados reais),
 * “Nossa História” com indicadores e citação, galeria com filtros e player, banner e rodapé.
 */
export function DepoimentosView({ items, stories }: { items: Testimonial[]; stories: StoriesView }) {
  const root = useReveal();
  const [filter, setFilter] = useState<Filter>("todos");
  const [all, setAll] = useState(false);
  const [play, setPlay] = useState<Testimonial | null>(null);
  const [history, setHistory] = useState<null | "rafael" | "william" | "ambos">(null);

  const visible = useMemo(() => (filter === "todos" ? items : items.filter((i) => i.category === filter)), [items, filter]);
  const shown = all ? visible : visible.slice(0, 4);
  const [rafael, william] = stories.founders as [Founder, Founder];

  return (
    <div className="dp" ref={root} data-testid="depoimentos">
      {/* ===== Topo ===== */}
      <section className={`dp-hero${stories.hero?.desktop ? " has-d" : ""}${stories.hero?.mobile ? " has-m" : ""}`} aria-labelledby="dp-titulo">
        <h1 id="dp-titulo" className="sr-only">Histórias que inspiram. Propósitos que transformam.</h1>
        <div className="dp-hero-d">
          {stories.hero?.desktop ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={stories.hero.desktop} alt="" width={1024} height={369} data-testid="hero-personalizado" />
          ) : (
            <Image src="/depoimentos/hero-d.webp" alt="" width={1024} height={369} priority sizes="(min-width: 1100px) 1000px, 100vw" />
          )}
        </div>
        <div className="dp-hero-m">
          <p className="dp-chip">DEPOIMENTOS E HISTÓRIAS <i /><i /><i /></p>
          <p className="dp-h1" aria-hidden><span>HISTÓRIAS QUE INSPIRAM.</span><b>PROPÓSITOS QUE TRANSFORMAM.</b></p>
          <p className="dp-lead">Conheça quem faz parte dessa jornada. Alunos, aprovados e pessoas reais que encontraram no APROVUM a força para conquistar seus sonhos.</p>
          {stories.hero?.mobile ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="dp-hero-arte" src={stories.hero.mobile} alt="" width={594} height={369} />
          ) : (
            <Image className="dp-hero-arte" src="/depoimentos/hero-arte-m.webp" alt="" width={594} height={369} />
          )}
        </div>
        {/* Placas dos idealizadores (dados cadastrados) sobre a arte */}
        {[rafael, william].map((f) => (
          <button key={f.slug} type="button" className={`dp-placa dp-placa-${f.slug}`} onClick={() => setHistory(f.slug)} aria-label={`Conheça a história de ${f.name}`} data-testid={`idealizador-${f.slug}`}>
            <b>{f.name.toUpperCase()}</b>
            <span>{f.role}</span>
            {(f.age || f.city) && <small>{[f.age ? `${f.age} anos` : null, f.city].filter(Boolean).join(" • ")}</small>}
            <em aria-hidden>Ver história</em>
          </button>
        ))}
      </section>

      {/* ===== Nossa História ===== */}
      <section className="dp-hist" aria-labelledby="dp-hist-t">
        <div className="dp-hist-txt" data-rv>
          <p className="dp-k"><i /><i /><i /> NOSSA HISTÓRIA</p>
          <h2 id="dp-hist-t" className="dp-h2"><span>Do sonho à aprovação</span><b>Juntos, até o topo.</b></h2>
          <p className="dp-p">O APROVUM nasceu da experiência real de quem já enfrentou concursos, estudou, errou, aprendeu e venceu. Somos Rafael Alves e William Abreu, dois concurseiros apaixonados por ensinar, que decidiram transformar sua trajetória em uma plataforma completa, moderna e eficiente.</p>
          <button type="button" className="dp-btn-escuro" onClick={() => setHistory("ambos")} data-testid="conheca-historia">CONHEÇA NOSSA HISTÓRIA <ArrowRight className="size-4" aria-hidden /></button>
        </div>
        <Indicadores stats={stories.stats} />
        <figure className="dp-cita" data-rv data-testid="citacao">
          <Quote className="dp-cita-q" aria-hidden />
          <blockquote>“{stories.quote.text}”</blockquote>
          <figcaption><b>{stories.quote.authors}</b><span>Idealizadores</span></figcaption>
        </figure>
      </section>

      {/* ===== Galeria ===== */}
      <section className="dp-gal" aria-labelledby="dp-gal-t">
        <div className="dp-gal-topo" data-rv>
          <div>
            <p className="dp-k"><i /><i /><i /> HISTÓRIAS REAIS, RESULTADOS REAIS</p>
            <h2 id="dp-gal-t" className="dp-h2 dp-h2-gal">Depoimentos da nossa comunidade</h2>
          </div>
          {visible.length > 4 && (
            <button type="button" className="dp-vertodos" onClick={() => setAll((v) => !v)} data-testid="ver-todos-videos">{all ? "Ver menos" : "Ver todos os vídeos"} <ArrowRight className="size-3.5" aria-hidden /></button>
          )}
        </div>
        <div className="dp-filtros" role="tablist" aria-label="Filtrar depoimentos" data-rv>
          {([["todos", "Todos"], ...TESTIMONIAL_CATEGORIES.map((c) => [c.id, c.label])] as Array<[Filter, string]>).map(([id, label]) => {
            const Ic = FILTER_ICON[id];
            return (
              <button key={id} type="button" role="tab" aria-selected={filter === id} className={filter === id ? "on" : ""} onClick={() => (setFilter(id), setAll(false))} data-testid={`filtro-${id}`}>
                <Ic className="size-3.5" aria-hidden /> {label}
              </button>
            );
          })}
        </div>
        {items.length === 0 ? (
          <p className="dp-vazio" data-testid="depoimentos-vazio">Os primeiros depoimentos em vídeo chegam em breve.</p>
        ) : visible.length === 0 ? (
          <p className="dp-vazio" data-testid="filtro-vazio">Ainda não há depoimentos nesta categoria.</p>
        ) : (
          <ul className="dp-grade" key={filter}>
            {shown.map((d, i) => (
              <li key={d.id} className="dp-card" style={{ animationDelay: `${i * 60}ms` }} data-testid="depoimento">
                <button type="button" className="dp-thumb" onClick={() => setPlay(d)} aria-label={`Assistir ao depoimento de ${d.name}`} data-testid="depoimento-play">
                  {d.thumbUrl || d.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={(d.thumbUrl ?? d.photoUrl)!} alt="" loading="lazy" decoding="async" />
                  ) : (
                    <span className="dp-thumb-vazia" aria-hidden />
                  )}
                  <span className="dp-play" aria-hidden><Play className="size-6" fill="currentColor" /></span>
                  {formatDuration(d.durationSeconds) && <span className="dp-dur">{formatDuration(d.durationSeconds)}</span>}
                </button>
                <div className="dp-card-corpo">
                  {d.headline && <p className="dp-frase"><i aria-hidden>“</i>{d.headline}</p>}
                  <div className="dp-aluno">
                    {d.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={d.photoUrl} alt="" loading="lazy" className="dp-avatar" />
                    ) : (
                      <span className="dp-avatar dp-avatar-v" aria-hidden>{d.name.slice(0, 1)}</span>
                    )}
                    <span className="dp-aluno-txt"><b>{d.name}</b><small>{[d.cargo ?? d.concurso, d.estado].filter(Boolean).join(" ")}</small></span>
                    {d.approved && <span className="dp-selo" data-testid="selo-aprovado">APROVADO</span>}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ===== Banner ===== */}
      <section className="dp-banner" aria-label="Faça parte dessa história" data-rv>
        <Image className="dp-banner-d" src="/depoimentos/banner-d.webp" alt="" width={1024} height={241} loading="lazy" />
        <Link href="/plano" className="dp-banner-hit" aria-label="Faça parte dessa história" data-testid="banner-participar" />
        <div className="dp-banner-m">
          <Image className="dp-banner-rosto" src="/depoimentos/banner-rosto.webp" alt="" width={285} height={241} loading="lazy" />
          <div className="dp-banner-txt">
            <p className="dp-banner-k">AMANHÃ, A PRÓXIMA <b>HISTÓRIA DE SUPERAÇÃO</b> PODE SER A SUA.</p>
            <Link href="/plano" className="dp-banner-bt">FAÇA PARTE DESSA HISTÓRIA <ArrowRight className="size-4" aria-hidden /></Link>
            <ul className="dp-banner-lista"><li><CheckCircle2 aria-hidden />Estude com quem aprova</li><li><CheckCircle2 aria-hidden />Conte com nossa equipe</li><li><CheckCircle2 aria-hidden />Realize seus sonhos</li></ul>
          </div>
        </div>
      </section>

      {/* ===== Rodapé ===== */}
      <footer className="dp-rodape">
        <Image className="dp-rodape-d" src="/depoimentos/rodape-d.webp" alt="APROVUM — Sua preparação. Seu próximo cargo. Estude, evolua, conquiste." width={1024} height={158} loading="lazy" />
        <div className="dp-rodape-m">
          <Image src="/depoimentos/rodape-logo.webp" alt="APROVUM — Sua preparação. Seu próximo cargo." width={290} height={95} loading="lazy" />
          <Image src="/depoimentos/rodape-selos.webp" alt="" width={280} height={60} loading="lazy" aria-hidden />
          <p>ESTUDE <i>•</i> <b>EVOLUA</b> <i>•</i> CONQUISTE</p>
        </div>
      </footer>

      {play && <Player item={play} onClose={() => setPlay(null)} />}
      {history && <HistoryModal which={history} founders={stories.founders} onClose={() => setHistory(null)} />}
    </div>
  );
}

function Indicadores({ stats }: { stats: StoriesView["stats"] }) {
  const ref = useRef<HTMLUListElement>(null);
  const students = stats.students ?? stats.studentsReal;
  const approved = stats.approved ?? stats.approvedReal;
  const a = useCountUp(students, ref);
  const b = useCountUp(approved, ref);
  return (
    <ul className="dp-ind" ref={ref} data-testid="indicadores" data-rv>
      <li><Trophy aria-hidden /><b data-testid="ind-alunos">{students > 0 ? formatCount(a) : "—"}</b><span>Alunos</span></li>
      <li><CheckCircle2 aria-hidden /><b data-testid="ind-aprovados">{approved > 0 ? formatCount(b) : "—"}</b><span>Aprovados</span></li>
      <li><Star aria-hidden /><b data-testid="ind-satisfacao">{stats.satisfaction ?? "—"}</b><span>Satisfação</span></li>
    </ul>
  );
}

/** Fecha com Esc, trava a rolagem e devolve o foco. */
function useModal(onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });
  useEffect(() => {
    const prevFocus = document.activeElement as HTMLElement | null;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    ref.current?.focus();
    const key = (e: KeyboardEvent) => e.key === "Escape" && closeRef.current();
    window.addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", key);
      prevFocus?.focus?.();
    };
  }, []);
  return ref;
}

function Player({ item, onClose }: { item: Testimonial; onClose: () => void }) {
  const ref = useModal(onClose);
  const v = item.videoUrl ? videoSource(item.videoUrl) : null;
  return (
    <div className="dp-modal" onMouseDown={(e) => e.target === e.currentTarget && close()} data-testid="player">
      <div className="dp-player" ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label={`Depoimento de ${item.name}`}>
        <button type="button" className="dp-fechar" onClick={close} aria-label="Fechar o vídeo"><X className="size-5" aria-hidden /></button>
        <div className="dp-tela">
          {v?.kind === "iframe" ? (
            <iframe src={`${v.src}${v.src.includes("?") ? "&" : "?"}autoplay=1`} title={`Depoimento de ${item.name}`} allow="autoplay; accelerometer; encrypted-media; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
          ) : v?.kind === "file" ? (
            <video src={v.src} controls autoPlay playsInline preload="metadata" poster={item.thumbUrl ?? item.photoUrl ?? undefined} data-testid="player-video">
              {item.captionsUrl && <track kind="subtitles" src={item.captionsUrl} srcLang="pt-BR" label="Português" default />}
            </video>
          ) : item.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.photoUrl} alt={`Foto de ${item.name}`} />
          ) : (
            <p>Vídeo indisponível</p>
          )}
        </div>
        <div className="dp-player-info">
          <div className="dp-aluno">
            {item.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.photoUrl} alt="" className="dp-avatar" />
            ) : null}
            <span className="dp-aluno-txt"><b>{item.name}</b><small>{[item.cargo ?? item.concurso, item.estado ? UF_NAME[item.estado] ?? item.estado : null].filter(Boolean).join(" · ")}</small></span>
            {item.approved && <span className="dp-selo">APROVADO</span>}
          </div>
          {item.headline && <p className="dp-frase"><i aria-hidden>“</i>{item.headline}</p>}
          {item.description && <p className="dp-desc">{item.description}</p>}
        </div>
      </div>
    </div>
  );
}

function HistoryModal({ which, founders, onClose }: { which: "rafael" | "william" | "ambos"; founders: Founder[]; onClose: () => void }) {
  const ref = useModal(onClose);
  const list = which === "ambos" ? founders : [...founders].sort((a) => (a.slug === which ? -1 : 1));
  return (
    <div className="dp-modal" onMouseDown={(e) => e.target === e.currentTarget && close()} data-testid="historia-modal">
      <div className="dp-historia" ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Nossa história">
        <button type="button" className="dp-fechar" onClick={close} aria-label="Fechar"><X className="size-5" aria-hidden /></button>
        <p className="dp-k"><i /><i /><i /> NOSSA HISTÓRIA</p>
        <h2 className="dp-h2"><span>Do sonho à aprovação</span><b>Juntos, até o topo.</b></h2>
        {list.map((f) => (
          <article key={f.slug} className="dp-fundador" data-testid={`historia-${f.slug}`}>
            <Image src={`/depoimentos/${f.slug}.webp`} alt={`${f.name}, ${f.role}`} width={272} height={273} className="dp-fundador-foto" />
            <div>
              <h3>{f.name}</h3>
              <p className="dp-fundador-role">{f.role}{f.age || f.city ? ` · ${[f.age ? `${f.age} anos` : null, f.city].filter(Boolean).join(" • ")}` : ""}</p>
              {f.quote && <blockquote>“{f.quote}”</blockquote>}
              {f.bio && <p>{f.bio}</p>}
              {f.story && <><h4>História</h4><p>{f.story}</p></>}
              {f.trajectory && <><h4>Trajetória</h4><p>{f.trajectory}</p></>}
              {!f.bio && !f.story && !f.trajectory && <p className="dp-vazio">A história completa de {f.name.split(" ")[0]} será publicada em breve.</p>}
            </div>
          </article>
        ))}
        <p className="dp-hist-inst">O APROVUM nasceu da experiência real de quem já enfrentou concursos, estudou, errou, aprendeu e venceu.</p>
      </div>
    </div>
  );
}

