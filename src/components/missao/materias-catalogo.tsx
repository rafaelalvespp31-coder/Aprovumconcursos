"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { createPortal } from "react-dom";
import { BookMarked, BookOpen, Brain, Calculator, Car, Gavel, Globe, HeartHandshake, Landmark, Laptop, Scale, Shield, X, type LucideIcon } from "lucide-react";
import type { MateriaCatalogo } from "@/domain/missao/materias";
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
const estilo = (i: number): CSSProperties => ({ "--c1": CORES[i % CORES.length]![0], "--c2": CORES[i % CORES.length]![1], "--i": i }) as CSSProperties;

/** Quadrados das matérias catalogadas no Aprovum: tocar abre os assuntos e leva ao estudo da matéria. */
export function MateriasCatalogo({ materias, desabilitado }: { materias: MateriaCatalogo[]; desabilitado?: boolean }) {
  const [aberta, setAberta] = useState<number | null>(null);
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
  const m = aberta != null ? materias[aberta] : null;
  const Ico = (slug: string) => ICONES[slug] ?? BookMarked;

  // O brilho segue o dedo/mouse dentro do quadrado (variáveis CSS, sem re-renderizar).
  const seguir = (e: PointerEvent<HTMLButtonElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    e.currentTarget.style.setProperty("--mx", `${Math.round(x * 100)}%`);
    e.currentTarget.style.setProperty("--my", `${Math.round(y * 100)}%`);
    e.currentTarget.style.setProperty("--rx", `${((0.5 - y) * 10).toFixed(1)}deg`);
    e.currentTarget.style.setProperty("--ry", `${((x - 0.5) * 12).toFixed(1)}deg`);
  };
  const soltar = (e: PointerEvent<HTMLButtonElement>) => {
    for (const v of ["--rx", "--ry"]) e.currentTarget.style.setProperty(v, "0deg");
  };

  return (
    <>
      <ul className="mc-grade" aria-label="Matérias disponíveis na plataforma">
        {materias.map((x, i) => {
          const I = Ico(x.slug);
          return (
            <li key={x.slug} style={estilo(i)}>
              <button
                type="button"
                className="mc-quadrado"
                disabled={desabilitado}
                aria-haspopup="dialog"
                aria-label={`${x.nome}: ${plural(x.aulas, "aula", "aulas")} em ${plural(x.assuntos.length, "assunto", "assuntos")}. Abrir`}
                onPointerMove={seguir}
                onPointerLeave={soltar}
                onClick={(e) => {
                  origem.current = e.currentTarget;
                  setAberta(i);
                }}
              >
                <I className="mc-marca" aria-hidden strokeWidth={1.4} />
                <span className="mc-icone"><I aria-hidden strokeWidth={2.2} /></span>
                <span className="mc-nome">{x.nome}</span>
                <span className="mc-aulas"><b>{x.aulas}</b> {x.aulas === 1 ? "aula" : "aulas"}</span>
              </button>
            </li>
          );
        })}
      </ul>

      {m && aberta != null && createPortal(
        <div className="mc-fundo" onClick={() => setAberta(null)} data-testid="materia-fundo">
          <section className="mc-folha" role="dialog" aria-modal="true" aria-labelledby="mc-titulo" style={estilo(aberta)} onClick={(e) => e.stopPropagation()}>
            <header className="mc-cabeca">
              <span className="mc-icone mc-icone-g">{(() => { const I = Ico(m.slug); return <I aria-hidden strokeWidth={2.2} />; })()}</span>
              <div>
                <h2 id="mc-titulo">{m.nome}</h2>
                <p>{plural(m.aulas, "aula pronta", "aulas prontas")} · {plural(m.assuntos.length, "assunto", "assuntos")}</p>
              </div>
              <button ref={fechar} type="button" className="mc-fechar" onClick={() => setAberta(null)} aria-label="Fechar">
                <X aria-hidden size={18} />
              </button>
            </header>
            <ul className="mc-assuntos">
              {m.assuntos.map((a) => (
                <li key={a.titulo}>
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
