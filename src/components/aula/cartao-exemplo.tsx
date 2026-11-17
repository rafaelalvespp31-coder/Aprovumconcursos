"use client";
import { ILUSTRACAO, Lampada, Livro } from "./ilustracoes";
import "./cartao-exemplo.css";
import type { DadosCartao } from "@/domain/mentor/cartao-exemplo";

const COR = { direito: "#6d4aff", portugues: "#e0457b", matematica: "#0f8f6e", informatica: "#1f7ae0", geral: "#d9822b" } as const;
const ROTULO = { direito: "Regra", portugues: "Regra", matematica: "Como calcular", informatica: "Como funciona", geral: "Ideia central" } as const;

/** Cartão de estudo ilustrado: o exemplo da aula no estilo de caderno, com o ícone e a cor da matéria. */
export function CartaoExemplo({ c, indice, total }: { c: DadosCartao; indice?: number; total?: number }) {
  const Ilustra = ILUSTRACAO[c.icone] ?? Livro;
  return (
    <figure className="cx" style={{ ["--cx" as string]: COR[c.tema] }} aria-label={`Exemplo visual: ${c.titulo}`}>
      <header className="cx-topo">
        {total && total > 1 ? <span className="cx-num"><b>{indice}</b>/{total}</span> : null}
        <h4 className="cx-titulo">{c.titulo}</h4>
        <span className="cx-ilu" aria-hidden="true"><Ilustra size={96} /></span>
      </header>
      {c.base && <p className="cx-base">{c.base}</p>}
      <div className="cx-corpo">
        <div className="cx-esq">
          <p className="cx-rot">{ROTULO[c.tema]}:</p>
          <p className="cx-pilula"><i aria-hidden="true" className="cx-raio cx-raio-e" />{c.palavra}<i aria-hidden="true" className="cx-raio cx-raio-d" /></p>
          <p className="cx-txt">{c.regra}</p>
          <div className="cx-chave">
            <Lampada size={56} />
            <div><span>{c.pergunta ? "Na prova perguntam:" : "Palavra-chave:"}</span><b>{c.pergunta ?? c.palavra}</b></div>
          </div>
        </div>
        <aside className="cx-bloco">
          <span className="cx-aneis" aria-hidden="true">{Array.from({ length: 7 }, (_, i) => <i key={i} />)}</span>
          <p className="cx-rot">Exemplo:</p>
          <p className="cx-txt">{c.exemplo}</p>
        </aside>
      </div>
      <footer className="cx-rodape"><span>APROVUM · estude, evolua, conquiste</span>{total && total > 1 && indice! < total ? <em>Arraste para o lado →</em> : null}</footer>
    </figure>
  );
}
