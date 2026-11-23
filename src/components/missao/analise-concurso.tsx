import Link from "next/link";
import { ArrowLeft, ChevronDown } from "lucide-react";
import { tomPrioridade, type AnaliseConcurso as Analise } from "@/domain/edital/analise";
import type { AnaliseParaAluno } from "@/server/services/concurso-analise";
import "./analise-concurso.css";

const pct = (n: number | null) => (n == null ? "" : `${n.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`);
const hrs = (n: number) => `${n.toLocaleString("pt-BR")}h`;

/** Análise estratégica do concurso (modelo completo): estrutura da prova, matérias, prioridades, dificuldades, rotina e conclusão. */
export function AnaliseConcurso({ dados, voltar }: { dados: AnaliseParaAluno; voltar: string }) {
  const { concurso: c, analise: a } = dados;
  const maxQ = Math.max(1, ...a.disciplinas.map((d) => d.questoes ?? 0));
  const maxH = Math.max(1, ...a.organizacao.horas.map((h) => h.horas));
  const total = a.estrutura.total?.questoes ?? a.disciplinas.reduce((s, d) => s + (d.questoes ?? 0), 0);
  const blocos = [...new Set(a.disciplinas.map((d) => d.bloco))];
  const porPrioridade = [...a.disciplinas].sort((x, y) => tomPrioridade(x.prioridade) - tomPrioridade(y.prioridade) || (y.questoes ?? 0) - (x.questoes ?? 0));

  return (
    <main className="an">
      <header className="an-topo">
        <Link href={voltar} className="an-voltar"><ArrowLeft size={16} aria-hidden /> Voltar</Link>
        {/* eslint-disable-next-line @next/next/no-img-element -- logo oficial, versão para fundo escuro */}
        <img className="an-logo" src="/images/aprovum-login-logo.png" alt="Aprovum" width={523} height={107} />
      </header>

      <section className="an-cab">
        <p className="an-kicker">ANÁLISE DO CONCURSO</p>
        <h1 className="an-titulo">{c.nome}</h1>
        <p className="an-meta">{[c.cargo, c.orgao, c.banca].filter(Boolean).join(" · ")}</p>
        <dl className="an-numeros">
          {total > 0 && <div><dt>Questões</dt><dd>{total}</dd></div>}
          <div><dt>Disciplinas</dt><dd>{a.disciplinas.length}</dd></div>
          {a.organizacao.totalHoras != null && <div><dt>Horas/semana</dt><dd>{a.organizacao.totalHoras}</dd></div>}
        </dl>
        <nav className="an-ancoras" aria-label="Seções">
          {["estrutura", "materias", "prioridades", "dificuldades", "rotina", "conclusao"].map((id, i) => <a key={id} href={`#an-${id}`}>{["Prova", "Matérias", "Prioridades", "Dificuldades", "Rotina", "Conclusão"][i]}</a>)}
        </nav>
      </section>

      <section id="an-estrutura" className="an-secao" aria-labelledby="an-h-estrutura">
        <h2 id="an-h-estrutura">Estrutura da prova</h2>
        {a.estrutura.blocos.length > 0 && (
          <ul className="an-blocos">
            {a.estrutura.blocos.map((b) => (
              <li key={b.nome} style={{ "--w": `${b.percentual ?? (total && b.questoes ? (b.questoes / total) * 100 : 0)}%` } as React.CSSProperties}>
                <span className="an-blocos-nome">{b.nome}</span>
                <span className="an-blocos-barra" aria-hidden />
                <span className="an-blocos-info">{[b.disciplinas != null && `${b.disciplinas} disciplinas`, b.questoes != null && `${b.questoes} questões`, b.percentual != null && pct(b.percentual)].filter(Boolean).join(" · ")}</span>
              </li>
            ))}
          </ul>
        )}
        {a.estrutura.notas.filter((n) => !/^considerando\b/i.test(n)).map((n) => <p key={n} className="an-texto">{n}</p>)}
      </section>

      <section id="an-materias" className="an-secao" aria-labelledby="an-h-materias">
        <h2 id="an-h-materias">Análise por disciplina</h2>
        {blocos.map((b) => (
          <div key={b || "sem-bloco"} className="an-grupo">
            {b && <h3>{b}</h3>}
            {a.disciplinas.filter((d) => d.bloco === b).map((d) => (
              <details key={d.ordem} className="an-disc" data-tom={tomPrioridade(d.prioridade)}>
                <summary>
                  <span className="an-disc-nome">{d.nome}</span>
                  <span className="an-disc-chips">
                    {d.questoes != null && <b className="an-chip">{d.questoes} questões{d.percentual != null ? ` · ${pct(d.percentual)}` : ""}</b>}
                    {d.prioridade && <b className="an-chip an-prio">{d.prioridade}</b>}
                  </span>
                  <ChevronDown className="an-seta" size={18} aria-hidden />
                </summary>
                <div className="an-disc-corpo">
                  {d.descricao && <p className="an-texto">{d.descricao}</p>}
                  {d.focos.length > 0 && (
                    <>
                      <h4>Principais focos de preparação</h4>
                      <ul className="an-focos">{d.focos.map((f) => <li key={f}>{f}</li>)}</ul>
                    </>
                  )}
                  {d.estrategia && (
                    <div className="an-estrategia">
                      <h4>Estratégia</h4>
                      <p>{d.estrategia}</p>
                    </div>
                  )}
                </div>
              </details>
            ))}
          </div>
        ))}
      </section>

      <section id="an-prioridades" className="an-secao" aria-labelledby="an-h-prio">
        <h2 id="an-h-prio">Distribuição e prioridades</h2>
        <ul className="an-barras">
          {porPrioridade.map((d) => (
            <li key={d.ordem} data-tom={tomPrioridade(d.prioridade)} style={{ "--w": `${((d.questoes ?? 0) / maxQ) * 100}%` } as React.CSSProperties}>
              <span className="an-barras-nome">{d.nome}</span>
              <span className="an-barras-barra" aria-hidden />
              <span className="an-barras-num">{d.questoes ?? "?"}{d.percentual != null ? ` · ${pct(d.percentual)}` : ""}</span>
            </li>
          ))}
        </ul>
        {a.distribuicao.classificacao.length > 0 && (
          <div className="an-classe">
            {a.distribuicao.classificacao.map((n) => (
              <div key={n.nivel} data-tom={tomPrioridade(n.nivel)}>
                <h4>Prioridade {n.nivel.toLowerCase()}</h4>
                <ul>{n.disciplinas.map((x) => <li key={x}>{x}</li>)}</ul>
              </div>
            ))}
          </div>
        )}
        {a.distribuicao.notas.filter((n) => !/^considerando\b/i.test(n)).map((n) => <p key={n} className="an-texto">{n}</p>)}
      </section>

      {a.dificuldades.length > 0 && (
        <section id="an-dificuldades" className="an-secao" aria-labelledby="an-h-dif">
          <h2 id="an-h-dif">Onde está a maior dificuldade</h2>
          <div className="an-cartoes">
            {a.dificuldades.map((g, i) => (
              <article key={g.grupo} className="an-cartao">
                <p className="an-cartao-n">Grupo {i + 1}</p>
                <h3>{g.grupo}</h3>
                <ul className="an-tags">{g.disciplinas.map((x) => <li key={x}>{x}</li>)}</ul>
                {g.texto && <p className="an-texto">{g.texto}</p>}
              </article>
            ))}
          </div>
        </section>
      )}

      {(a.organizacao.horas.length > 0 || a.organizacao.ciclo.length > 0) && (
        <section id="an-rotina" className="an-secao" aria-labelledby="an-h-rotina">
          <h2 id="an-h-rotina">Como organizar o estudo</h2>
          {a.organizacao.notas.map((n) => <p key={n} className="an-texto">{n}</p>)}
          {a.organizacao.horas.length > 0 && (
            <ul className="an-barras an-horas">
              {a.organizacao.horas.map((h) => (
                <li key={h.disciplina} style={{ "--w": `${(h.horas / maxH) * 100}%` } as React.CSSProperties}>
                  <span className="an-barras-nome">{h.disciplina}</span>
                  <span className="an-barras-barra" aria-hidden />
                  <span className="an-barras-num">{hrs(h.horas)}</span>
                </li>
              ))}
            </ul>
          )}
          {a.organizacao.ciclo.length > 0 && (
            <ol className="an-ciclo" aria-label="Ciclo recomendado">
              {a.organizacao.ciclo.map((e) => <li key={e.etapa}><b>{e.etapa}</b><span>{e.texto}</span></li>)}
            </ol>
          )}
        </section>
      )}

      <section id="an-conclusao" className="an-secao" aria-labelledby="an-h-conc">
        <h2 id="an-h-conc">Conclusão estratégica</h2>
        {a.conclusao.notas.map((n) => <p key={n} className="an-texto">{n}</p>)}
        {a.conclusao.decisoes.length > 0 && (
          <ol className="an-decisoes">
            {a.conclusao.decisoes.map((d) => <li key={d.titulo}><b>{d.titulo}</b><span>{d.texto}</span></li>)}
          </ol>
        )}
        {a.conclusao.recomendacao.length > 0 && (
          <div className="an-estrategia">
            <h4>Recomendação final</h4>
            {a.conclusao.recomendacao.map((r) => <p key={r}>{r}</p>)}
          </div>
        )}
        {a.conclusao.observacao && <p className="an-obs">{a.conclusao.observacao}</p>}
      </section>
    </main>
  );
}

export type { Analise };
