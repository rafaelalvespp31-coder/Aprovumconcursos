"use client";
import { BookOpen, Calculator, FileText, Gavel, Hourglass, Landmark, Lightbulb, Monitor, PenLine, Scale, ShieldCheck, type LucideIcon } from "lucide-react";
import "./cartao-exemplo.css";
import type { DadosCartao } from "@/domain/mentor/cartao-exemplo";

const ICONES: Record<string, LucideIcon> = { Hourglass, Gavel, Landmark, FileText, Scale, PenLine, BookOpen, Calculator, ShieldCheck, Monitor };
const COR = { direito: "#6d4aff", portugues: "#e0457b", matematica: "#0f8f6e", informatica: "#1f7ae0", geral: "#d9822b" } as const;
const ROTULO = { direito: "Regra", portugues: "Regra", matematica: "Como calcular", informatica: "Como funciona", geral: "Ideia central" } as const;

/** Cartão de estudo ilustrado: o exemplo da aula no estilo de caderno, com o ícone e a cor da matéria. */
export function CartaoExemplo({ c }: { c: DadosCartao }) {
  const Icone = ICONES[c.icone] ?? BookOpen;
  return (
    <figure className="cx" style={{ ["--cx" as string]: COR[c.tema] }} aria-label={`Exemplo visual: ${c.titulo}`}>
      <header className="cx-topo">
        <h4 className="cx-titulo">{c.titulo}</h4>
        <span className="cx-icone" aria-hidden="true"><Icone size={44} strokeWidth={1.6} /></span>
      </header>
      {c.base && <p className="cx-base">{c.base}</p>}
      <div className="cx-corpo">
        <div className="cx-esq">
          <p className="cx-rot">{ROTULO[c.tema]}:</p>
          <p className="cx-pilula">{c.palavra}</p>
          <p className="cx-txt">{c.regra}</p>
          <div className="cx-chave">
            <Lightbulb size={34} strokeWidth={1.6} aria-hidden="true" />
            <div><span>{c.pergunta ? "Na prova perguntam:" : "Palavra-chave:"}</span><b>{c.pergunta ?? c.palavra}</b></div>
          </div>
        </div>
        <aside className="cx-bloco">
          <span className="cx-aneis" aria-hidden="true">{Array.from({ length: 7 }, (_, i) => <i key={i} />)}</span>
          <p className="cx-rot">Exemplo:</p>
          <p className="cx-txt">{c.exemplo}</p>
        </aside>
      </div>
    </figure>
  );
}
