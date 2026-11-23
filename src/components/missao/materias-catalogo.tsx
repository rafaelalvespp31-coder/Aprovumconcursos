"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { createPortal } from "react-dom";
import { BookMarked, BookOpen, Brain, Calculator, Car, Gavel, Globe, HeartHandshake, Landmark, Laptop, Scale, Shield, X, type LucideIcon } from "lucide-react";
import { ROTULO_GRUPO, dividirPorGrupo, fatiasDeAssuntos, filtrarMaterias, grupoDaMateria, type GrupoMateria, type MateriaCatalogo } from "@/domain/missao/materias";
import "./materias-catalogo.css";

const ICONES: Record<string, LucideIcon> = {
  lingua_portuguesa: BookOpen,
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

const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;
export const estilo = (i: number): CSSProperties => ({ "--c1": CORES[i % CORES.length]![0], "--c2": CORES[i % CORES.length]![1], "--i": i }) as CSSProperties;
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

  return (
    <>
      {mostrar.map((g) => {
        const lista = grupos[g];
        if (!lista.length) return null;
        const aulas = lista.reduce((s, x) => s + x.aulas, 0);
        return (
          <section key={g} id={`mc-sec-${g}`} className="mc-grupo" aria-labelledby={`mc-h-${g}`}>
            <header className="mc-grupo-cab">
              <h2 id={`mc-h-${g}`}>{ROTULO_GRUPO[g]}</h2>
              <p>{plural(lista.length, "matéria", "matérias")} · {plural(aulas, "aula", "aulas")}</p>
            </header>
            <ul className="mc-grade">
              {lista.map((x, k) => {
                const I = iconeDaMateria(x.slug);
                const fatias = fatiasDeAssuntos(x.assuntos);
                return (
                  <li key={x.slug} style={{ ...estilo(posicao.get(x.slug) ?? 0), "--k": k } as CSSProperties}>
                    <button
                      type="button"
                      className="mc-quadrado"
                      aria-haspopup="dialog"
                      aria-label={`${x.nome}: ${plural(x.aulas, "aula", "aulas")} em ${plural(x.assuntos.length, "assunto", "assuntos")}. Abrir`}
                      onPointerMove={seguir}
                      onPointerLeave={soltar}
                      onClick={(e) => {
                        origem.current = e.currentTarget;
                        setAberta(x.slug);
                      }}
                    >
                      <I className="mc-marca" aria-hidden strokeWidth={1.3} />
                      <span className="mc-topo">
                        <span className="mc-icone"><I aria-hidden strokeWidth={2.2} /></span>
                        <span className="mc-chip">{plural(x.assuntos.length, "assunto", "assuntos")}</span>
                      </span>
                      <span className="mc-nome">{x.nome}</span>
                      <span className="mc-num"><b>{x.aulas}</b> {x.aulas === 1 ? "aula" : "aulas"}</span>
                      <span className="mc-fatias" aria-hidden>
                        {fatias.map((f, n) => <i key={n} style={{ flexGrow: f, animationDelay: `${n * 40}ms` }} />)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}

      {m && createPortal(
        <div className="mc-fundo" onClick={() => setAberta(null)} data-testid="materia-fundo">
          <section className="mc-folha" role="dialog" aria-modal="true" aria-labelledby="mc-titulo" style={estilo(posicao.get(m.slug) ?? 0)} onClick={(e) => e.stopPropagation()}>
            <header className="mc-cabeca">
              <span className="mc-icone mc-icone-g">{(() => { const I = iconeDaMateria(m.slug); return <I aria-hidden strokeWidth={2.2} />; })()}</span>
              <div>
                <p className="mc-cabeca-grupo">{ROTULO_GRUPO[grupoDaMateria(m.slug)]}</p>
                <h2 id="mc-titulo">{m.nome}</h2>
                <p>{plural(m.aulas, "aula pronta", "aulas prontas")} · {plural(m.assuntos.length, "assunto", "assuntos")}</p>
              </div>
              <button ref={fechar} type="button" className="mc-fechar" onClick={() => setAberta(null)} aria-label="Fechar">
                <X aria-hidden size={18} />
              </button>
            </header>
            <ul className="mc-assuntos">
              {m.assuntos.map((a) => (
                <li key={a.titulo} style={{ "--p": `${Math.max(6, Math.round((a.aulas / m.assuntos[0]!.aulas) * 100))}%` } as CSSProperties}>
                  <span>{a.titulo}</span>
                  <b>{plural(a.aulas, "aula", "aulas")}</b>
                </li>
              ))}
            </ul>
            <Link href={`/nova-trilha?modo=lista&materia=${encodeURIComponent(m.slug)}`} className="mc-estudar">
              Estudar {m.nome}
            </Link>
          </section>
        </div>,
        document.body,
      )}
    </>
  );
}
