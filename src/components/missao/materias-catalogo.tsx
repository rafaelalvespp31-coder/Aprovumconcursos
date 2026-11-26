"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { createPortal } from "react-dom";
import { BookMarked, Brain, Calculator, Car, ChevronRight, ChevronUp, Ear, FileText, Gavel, Globe, HeartHandshake, Landmark, Laptop, Link2, ListChecks, MessageCircle, MessageSquareMore, Network, PenLine, Play, Scale, Shield, X, type LucideIcon } from "lucide-react";
import { dividirPorGrupo, filtrarMaterias, formatarDuracao, type GrupoMateria, type MateriaCatalogo } from "@/domain/missao/materias";
import "./materias-catalogo.css";
import "./catalogo-pagina.css";

const ICONES: Record<string, LucideIcon> = {
  lingua_portuguesa: MessageSquareMore,
  matematica: Calculator,
  raciocinio_logico: Brain,
  informatica: Laptop,
  direito_constitucional: Landmark,
  direito_administrativo: Scale,
  direito_penal: Gavel,
  direito_processual_penal: Scale,
  legislacao_especial: Shield,
  ctb_codigo_de_transito_brasileiro: Car,
  geopolitica: Globe,
  etica_e_cidadania: HeartHandshake,
  direitos_humanos: HeartHandshake,
};

/** Cada quadrado ganha uma cor própria (par claro/escuro), sempre a mesma para a mesma posição. */
const CORES: Array<[string, string]> = [
  ["#ff4d4d", "#8f0012"],
  ["#10d9a0", "#046b52"],
  ["#4d8dff", "#1b2f9c"],
  ["#b46bff", "#4a1a9c"],
  ["#ffb020", "#a24a00"],
  ["#22d3ee", "#0a5a78"],
  ["#ff5fa2", "#8a1450"],
  ["#9be53d", "#3b7510"],
];

/** Ícones vermelhos da lista de assuntos do popup (repetem em ciclo, na ordem do layout aprovado). */
const ICONES_ASSUNTO: LucideIcon[] = [MessageSquareMore, ListChecks, Network, Link2, Landmark, MessageCircle, Ear, PenLine];

const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;
export const estilo = (i: number): CSSProperties => ({ "--c1": CORES[i % CORES.length]![0], "--c2": CORES[i % CORES.length]![1], "--i": i }) as CSSProperties;
/** Recortes de arte do layout aprovado (public/home/catalogo): a matéria correspondente usa a sua; as de Direito usam a balança. */
const ARTES: Record<string, string> = {
  lingua_portuguesa: "lingua_portuguesa",
  matematica: "matematica",
  informatica: "informatica",
  etica_e_cidadania: "etica_e_cidadania",
  geopolitica: "geopolitica",
  raciocinio_logico: "raciocinio_logico",
  direito_constitucional: "etica_e_cidadania",
  direito_administrativo: "etica_e_cidadania",
  direito_penal: "etica_e_cidadania",
  direito_processual_penal: "etica_e_cidadania",
  direitos_humanos: "etica_e_cidadania",
};
export const arteDaMateria = (slug: string): string | null => (ARTES[slug] ? `/home/catalogo/${ARTES[slug]}.webp` : null);

export const iconeDaMateria = (slug: string): LucideIcon => ICONES[slug] ?? BookMarked;

/** O brilho segue o dedo/mouse dentro do quadrado (variáveis CSS, sem re-renderizar). */
export function seguir(e: PointerEvent<HTMLElement>) {
  const r = e.currentTarget.getBoundingClientRect();
  const x = (e.clientX - r.left) / r.width;
  const y = (e.clientY - r.top) / r.height;
  e.currentTarget.style.setProperty("--mx", `${Math.round(x * 100)}%`);
  e.currentTarget.style.setProperty("--my", `${Math.round(y * 100)}%`);
  e.currentTarget.style.setProperty("--rx", `${((0.5 - y) * 10).toFixed(1)}deg`);
  e.currentTarget.style.setProperty("--ry", `${((x - 0.5) * 12).toFixed(1)}deg`);
}
export function soltar(e: PointerEvent<HTMLElement>) {
  for (const v of ["--rx", "--ry"]) e.currentTarget.style.setProperty(v, "0deg");
}

/** Matérias do catálogo da plataforma, em dois grupos (básicas e específicas). Tocar num quadrado abre os assuntos e leva ao estudo. */
export function MateriasCatalogo({ materias, termo = "", grupos: mostrar = ["basicas", "especificas"] }: { materias: MateriaCatalogo[]; termo?: string; grupos?: GrupoMateria[] }) {
  const [aberta, setAberta] = useState<string | null>(null);
  const origem = useRef<HTMLElement | null>(null);
  const fechar = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (aberta == null) return;
    fechar.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAberta(null);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      origem.current?.focus();
    };
  }, [aberta]);

  if (!materias.length) return null;
  // A cor de cada matéria vem da posição no catálogo inteiro: não muda ao buscar.
  const posicao = new Map(materias.map((m, i) => [m.slug, i]));
  const grupos = dividirPorGrupo(filtrarMaterias(materias, termo));
  const m = aberta != null ? materias.find((x) => x.slug === aberta) : null;

  const lista = mostrar.flatMap((g) => grupos[g]);
  return (
    <>
      <section className="cat-lista" aria-label="Matérias">
        <ul className="cat-grade">
          {lista.map((x, k) => {
            const I = iconeDaMateria(x.slug);
            const arte = arteDaMateria(x.slug);
            const p = x.progresso;
            // quem ainda não começou (ou ainda não apuramos) vê o cartão "forte" (convite); de 1% a 49% fica sóbrio, a partir de 50% volta ao vermelho
            const forte = p === null || p === 0 || p >= 50;
            const C = 2 * Math.PI * 44;
            return (
              <li key={x.slug} style={{ ...estilo(posicao.get(x.slug) ?? 0), "--k": k } as CSSProperties}>
                <div className="cm" data-forte={forte ? "" : undefined}>
                  <button
                    type="button"
                    className="cm-corpo"
                    aria-haspopup="dialog"
                    aria-label={`${x.nome}: ${plural(x.aulas, "aula", "aulas")} em ${plural(x.assuntos.length, "assunto", "assuntos")}${p != null ? `, ${p}% concluído` : ""}. Abrir`}
                    onPointerMove={seguir}
                    onPointerLeave={soltar}
                    onClick={(e) => {
                      origem.current = e.currentTarget;
                      setAberta(x.slug);
                    }}
                  >
                    <span className="cm-luz" aria-hidden />
                    {/* eslint-disable-next-line @next/next/no-img-element -- recorte da arte do layout (WebP em public/home/catalogo) */}
                    {arte ? <img className="cm-arte" src={arte} alt="" loading="lazy" decoding="async" /> : <I className="cm-marca" aria-hidden strokeWidth={1.1} />}
                    <span className="cm-brilho" aria-hidden />
                    <span className="cm-icone" aria-hidden><I /></span>
                    <span className="cm-anel" aria-hidden>
                      <svg viewBox="0 0 100 100"><circle className="t" cx="50" cy="50" r="44" />{p ? <circle className="p" cx="50" cy="50" r="44" strokeDasharray={C} strokeDashoffset={C * (1 - Math.min(100, p) / 100)} /> : null}</svg>
                      <b>{p === null ? "–" : `${p}%`}</b>
                    </span>
                    <span className="cm-nome">{x.nome}</span>
                    <span className="cm-meta"><Play aria-hidden strokeWidth={2} />{plural(x.aulas, "aula", "aulas")}{x.minutos > 0 ? ` • ${formatarDuracao(x.minutos)}` : ""}</span>
                    <span className="cm-barra" aria-hidden><i style={{ "--p": `${p ?? 0}%` } as CSSProperties} /></span>
                    <span className="cm-cta">
                      <span className="pl" aria-hidden><Play strokeWidth={2.2} /></span>
                      <span>{p === 100 ? "Revisar matéria" : p ? "Continuar estudando" : "Começar a estudar"}</span>
                      <ChevronRight className="ch" aria-hidden />
                    </span>
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {m && createPortal(
        <div className="mc-fundo" onClick={() => setAberta(null)} data-testid="materia-fundo">
          <section className="mc-folha" role="dialog" aria-modal="true" aria-labelledby="mc-titulo" style={estilo(posicao.get(m.slug) ?? 0)} onClick={(e) => e.stopPropagation()}>
            <button ref={fechar} type="button" className="mc-fechar" onClick={() => setAberta(null)} aria-label="Fechar">
              <X aria-hidden size={20} strokeWidth={2.4} />
            </button>
            <header className="mc-cabeca">
              {/* eslint-disable-next-line @next/next/no-img-element -- recortes do layout aprovado (WebP em public/home/popup) */}
              <img className="mc-caveira" src="/home/popup/caveira.webp" alt="" decoding="async" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="mc-logo" src="/home/popup/logo.webp" alt="Aprovum" decoding="async" />
              <div className="mc-heroi">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="mc-livro" src="/home/popup/livro.webp" alt="" decoding="async" />
                <div className="mc-titulos">
                  <p className="mc-selo">Matéria</p>
                  <h2 id="mc-titulo">{m.nome}</h2>
                  <p className="mc-numeros">
                    <span><i className="mc-pino"><Play aria-hidden fill="currentColor" strokeWidth={0} /></i>{plural(m.aulas, "Aula", "Aulas")}</span>
                    <span className="mc-sep" aria-hidden />
                    <span><FileText aria-hidden strokeWidth={1.8} />{plural(m.assuntos.length, "Assunto", "Assuntos")}</span>
                  </p>
                </div>
              </div>
            </header>
            <div className="mc-conteudo">
              <p className="mc-conteudo-t"><span>Conteúdo da matéria</span><ChevronUp aria-hidden className="mc-seta" /></p>
              <ul className="mc-assuntos">
                {m.assuntos.map((a, i) => {
                  const IA = ICONES_ASSUNTO[i % ICONES_ASSUNTO.length]!;
                  return (
                    <li key={a.titulo}>
                      <span className="mc-ico" aria-hidden><IA strokeWidth={1.7} /></span>
                      <span className="mc-tit">{a.titulo}</span>
                      <b><Play aria-hidden fill="currentColor" strokeWidth={0} />{plural(a.aulas, "aula", "aulas")}</b>
                    </li>
                  );
                })}
              </ul>
            </div>
            <Link href={`/nova-trilha?modo=lista&materia=${encodeURIComponent(m.slug)}`} className="mc-estudar">
              <Play aria-hidden fill="currentColor" strokeWidth={0} className="mc-estudar-p" />
              <span>Estudar {m.nome}</span>
              <ChevronRight aria-hidden className="mc-estudar-s" strokeWidth={2.4} />
            </Link>
          </section>
        </div>,
        document.body,
      )}
    </>
  );
}
