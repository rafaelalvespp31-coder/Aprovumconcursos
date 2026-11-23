"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { ArrowLeft, BookOpenCheck, ChevronDown, Clock, Compass, Flag, Layers, ListChecks, Search, Target } from "lucide-react";
import { tomPrioridade, type AnaliseDisciplina } from "@/domain/edital/analise";
import { agruparTopicos, combinarComEdital, resumoDisponibilidade, type DisciplinaVisao, type TopicoVisao } from "@/domain/missao/analise-conteudo";
import type { AnaliseParaAluno } from "@/server/services/concurso-analise";
import "./analise-concurso.css";

const pct = (n: number | null) => (n == null ? "" : `${n.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`);
const hrs = (n: number) => `${n.toLocaleString("pt-BR")}h`;
const sem = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const plural = (n: number, um: string, varios: string) => `${n.toLocaleString("pt-BR")} ${n === 1 ? um : varios}`;

type FiltroAula = "todos" | "com" | "sem";
type Ordem = "prioridade" | "questoes" | "edital";
/** Uma disciplina da página: a da análise (se houver) e o conteúdo do edital (se houver). */
interface Item {
  id: string;
  nome: string;
  bloco: string;
  analise: AnaliseDisciplina | null;
  topicos: TopicoVisao[] | null;
}

/** Cobertura de aulas: verde = disponível no Aprovum, vermelho = ainda não. */
function Cobertura({ ok, total, grande = false }: { ok: number; total: number; grande?: boolean }) {
  const p = total ? (ok / total) * 100 : 0;
  return (
    <span className="an-cob" data-grande={grande || undefined} style={{ "--pv": `${p}%` } as CSSProperties}>
      <span className="an-cob-barra" aria-hidden />
      <span className="an-cob-txt"><b>{ok}</b> de {total} com aula · {Math.round(p)}%</span>
    </span>
  );
}

function Aulas({ t }: { t: TopicoVisao }) {
  if (!t.disponivel) return <span className="an-pill an-no">Sem aula ainda</span>;
  return (
    <span className="an-aulas">
      {t.aulas.slice(0, 4).map((a) => <span key={a} className="an-pill an-ok" title={a}>{a}</span>)}
      {t.aulas.length > 4 && <span className="an-pill an-ok">+{t.aulas.length - 4}</span>}
      {!t.aulas.length && <span className="an-pill an-ok">Aula disponível</span>}
    </span>
  );
}

/** Tópicos da disciplina em cartões: cada tópico principal com seus subtópicos e as aulas catalogadas (verde) ou a falta delas (vermelho). */
function Conteudo({ topicos, termo, aula }: { topicos: TopicoVisao[]; termo: string; aula: FiltroAula }) {
  const [limite, setLimite] = useState(18);
  const cartoes = useMemo(() => {
    const q = sem(termo).split(/\s+/).filter(Boolean);
    const passa = (t: TopicoVisao) => (aula === "com" ? t.disponivel : aula === "sem" ? !t.disponivel : true) && q.every((w) => sem(`${t.codigo ?? ""} ${t.titulo} ${t.aulas.join(" ")}`).includes(w));
    return agruparTopicos(topicos)
      .map((c) => ({ ...c, filhos: c.filhos.filter(passa), mostra: passa(c.raiz) }))
      .filter((c) => c.mostra || c.filhos.length);
  }, [topicos, termo, aula]);
  if (!cartoes.length) return <p className="an-vazio">Nenhum tópico com esse filtro.</p>;
  return (
    <>
      <div className="an-topicos">
        {cartoes.slice(0, limite).map((c, i) => {
          const p = c.total ? (c.disponiveis / c.total) * 100 : 0;
          return (
            <article key={`${c.raiz.codigo ?? ""}-${i}`} className="an-top" data-estado={p === 100 ? "ok" : p === 0 ? "no" : "mix"} style={{ "--pv": `${p}%` } as CSSProperties}>
              <header>
                <h5>{c.raiz.codigo && <span className="an-top-cod">{c.raiz.codigo}</span>}{c.raiz.titulo}</h5>
                <b className="an-top-n" title="Tópicos com aula neste cartão">{c.disponiveis}/{c.total}</b>
              </header>
              {c.mostra && (c.raiz.disponivel || !c.filhos.length) && <div className="an-top-aulas"><Aulas t={c.raiz} /></div>}
              {c.filhos.length > 0 && (
                <ul className="an-sub">
                  {c.filhos.map((f, k) => (
                    <li key={`${f.codigo ?? ""}-${k}`} data-ok={f.disponivel || undefined} style={{ "--rec": Math.max(0, f.nivel - c.raiz.nivel - 1) } as CSSProperties}>
                      <span className="an-sub-t">{f.codigo && <span className="an-top-cod">{f.codigo}</span>}{f.titulo}</span>
                      <Aulas t={f} />
                    </li>
                  ))}
                </ul>
              )}
            </article>
          );
        })}
      </div>
      {cartoes.length > limite && (
        <button type="button" className="an-mais" onClick={() => setLimite((l) => l + 30)}>Mostrar mais {Math.min(30, cartoes.length - limite)} de {cartoes.length - limite} restantes</button>
      )}
    </>
  );
}

function CartaoDisciplina({ it, n, aberta, aoAlternar, termo, aula }: { it: Item; n: number; aberta: boolean; aoAlternar: () => void; termo: string; aula: FiltroAula }) {
  const [aba, setAba] = useState<"conteudo" | "estrategia">(it.topicos ? "conteudo" : "estrategia");
  const r = it.topicos ? resumoDisponibilidade(it.topicos) : null;
  const a = it.analise;
  const tom = a ? tomPrioridade(a.prioridade) : 4;
  return (
    <article id={it.id} className="an-disc" data-aberta={aberta || undefined} data-tom={tom}>
      <button type="button" className="an-disc-cab" aria-expanded={aberta} aria-controls={`${it.id}-corpo`} onClick={aoAlternar}>
        <span className="an-disc-n" aria-hidden>{n}</span>
        <span className="an-disc-info">
          <span className="an-disc-nome">{it.nome}</span>
          <span className="an-disc-chips">
            {a?.questoes != null && <b className="an-chip">{a.questoes} questões{a.percentual != null ? ` · ${pct(a.percentual)}` : ""}</b>}
            {a?.prioridade && <b className="an-chip an-prio">{a.prioridade}</b>}
            {r && <b className="an-chip">{plural(r.total, "tópico", "tópicos")}</b>}
          </span>
          {r && <Cobertura ok={r.comAula} total={r.total} />}
        </span>
        <ChevronDown className="an-seta" size={20} aria-hidden />
      </button>
      {aberta && (
        <div id={`${it.id}-corpo`} className="an-disc-corpo">
          {a && it.topicos && (
            <div className="an-abas" role="group" aria-label="Ver">
              <button type="button" aria-pressed={aba === "conteudo"} onClick={() => setAba("conteudo")}><ListChecks size={14} aria-hidden /> Conteúdo e aulas</button>
              <button type="button" aria-pressed={aba === "estrategia"} onClick={() => setAba("estrategia")}><Target size={14} aria-hidden /> Estratégia</button>
            </div>
          )}
          {(aba === "estrategia" || !it.topicos) && a && (
            <div className="an-estr">
              {a.descricao && <p className="an-texto">{a.descricao}</p>}
              {a.focos.length > 0 && (
                <>
                  <h4>Principais focos de preparação</h4>
                  <ul className="an-focos">{a.focos.map((f) => <li key={f}>{f}</li>)}</ul>
                </>
              )}
              {a.estrategia && (
                <div className="an-estrategia"><h4>Como estudar</h4><p>{a.estrategia}</p></div>
              )}
            </div>
          )}
          {(aba === "conteudo" || !a) && it.topicos && <Conteudo topicos={it.topicos} termo={termo} aula={aula} />}
        </div>
      )}
    </article>
  );
}

/** Análise do concurso: estrutura da prova, matérias com conteúdo e aulas, prioridades, dificuldades, rotina e conclusão. Navegação por abas fixas, filtros e cartões. */
export function AnaliseConcurso({ dados, voltar }: { dados: AnaliseParaAluno; voltar: string }) {
  const { concurso: c, analise: a, conteudo } = dados;

  const { itens, extras } = useMemo(() => {
    const nomes = a?.disciplinas.map((d) => d.nome) ?? [];
    const comb = combinarComEdital(nomes, conteudo ?? []);
    const base: Item[] = (a?.disciplinas ?? []).map((d, i) => ({ id: `d-${d.ordem}`, nome: d.nome, bloco: d.bloco, analise: d, topicos: comb.pares[i]?.topicos ?? null }));
    const ex: Item[] = comb.extras.map((d, i) => ({ id: `x-${i}`, nome: d.nome, bloco: "", analise: null, topicos: d.topicos }));
    return { itens: base, extras: ex };
  }, [a, conteudo]);
  const todas = useMemo(() => [...itens, ...extras], [itens, extras]);

  const geral = useMemo(() => resumoDisponibilidade(todas.flatMap((i) => i.topicos ?? [])), [todas]);
  const temConteudo = !!conteudo && geral.total > 0;
  const total = a ? (a.estrutura.total?.questoes ?? a.disciplinas.reduce((s, d) => s + (d.questoes ?? 0), 0)) : 0;

  const [termo, setTermo] = useState("");
  const [aula, setAula] = useState<FiltroAula>("todos");
  const [bloco, setBloco] = useState("");
  const [ordem, setOrdem] = useState<Ordem>("prioridade");
  const [abertas, setAbertas] = useState<Set<string>>(new Set());
  const [ativa, setAtiva] = useState("visao");
  const [destaque, setDestaque] = useState<string | null>(null);
  const secoes = useRef<Record<string, HTMLElement | null>>({});

  const blocos = useMemo(() => [...new Set(itens.map((i) => i.bloco).filter(Boolean))], [itens]);
  const q = sem(termo).trim();
  const visiveis = todas.filter((i) => {
    if (bloco && i.bloco !== bloco) return false;
    if (!q) return true;
    const palavras = q.split(/\s+/);
    return palavras.every((w) => sem(i.nome).includes(w)) || (i.topicos ?? []).some((t) => palavras.every((w) => sem(t.titulo).includes(w)));
  });

  const abas: Array<[string, string]> = [["visao", "Visão geral"], ["materias", "Matérias e aulas"]];
  if (a?.dificuldades.length) abas.push(["dificuldades", "Dificuldades"]);
  if (a && (a.organizacao.horas.length || a.organizacao.ciclo.length)) abas.push(["rotina", "Rotina"]);
  if (a && (a.conclusao.decisoes.length || a.conclusao.recomendacao.length || a.conclusao.notas.length)) abas.push(["conclusao", "Conclusão"]);

  // Destaca na barra fixa a seção que está na tela.
  useEffect(() => {
    const els = abas.map(([id]) => secoes.current[id]).filter((e): e is HTMLElement => !!e);
    if (!els.length || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (es) => {
        const v = es.filter((e) => e.isIntersecting).sort((x, y) => x.boundingClientRect.top - y.boundingClientRect.top)[0];
        if (v) setAtiva(v.target.id.replace("an-", ""));
      },
      { rootMargin: "-25% 0px -65% 0px" },
    );
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- as seções só mudam com os dados
  }, [dados]);

  const rolar = (id: string) => {
    const el = secoes.current[id];
    if (!el) return;
    const reduzido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ behavior: reduzido ? "auto" : "smooth", block: "start" });
  };
  const alternar = (id: string) =>
    setAbertas((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const irParaDisciplina = (id: string) => {
    setBloco("");
    setTermo("");
    setAbertas((s) => new Set(s).add(id));
    setDestaque(id);
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "center" });
      }),
    );
    window.setTimeout(() => setDestaque((d) => (d === id ? null : d)), 1800);
  };

  const maxQ = Math.max(1, ...itens.map((i) => i.analise?.questoes ?? 0));
  const maxH = Math.max(1, ...(a?.organizacao.horas.map((h) => h.horas) ?? [1]));
  const grafico = [...itens].sort((x, y) =>
    ordem === "edital" ? (x.analise?.ordem ?? 0) - (y.analise?.ordem ?? 0)
    : ordem === "questoes" ? (y.analise?.questoes ?? 0) - (x.analise?.questoes ?? 0)
    : tomPrioridade(x.analise?.prioridade ?? "") - tomPrioridade(y.analise?.prioridade ?? "") || (y.analise?.questoes ?? 0) - (x.analise?.questoes ?? 0));

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
        <ul className="an-meta">{[c.cargo, c.orgao, c.banca].filter(Boolean).map((m) => <li key={m}>{m}</li>)}</ul>
        <dl className="an-numeros">
          {total > 0 && <div><dt><Flag size={13} aria-hidden /> Questões</dt><dd>{total}</dd></div>}
          <div><dt><Layers size={13} aria-hidden /> Disciplinas</dt><dd>{todas.length}</dd></div>
          {temConteudo && <div><dt><ListChecks size={13} aria-hidden /> Tópicos</dt><dd>{geral.total.toLocaleString("pt-BR")}</dd></div>}
          {a?.organizacao.totalHoras != null && <div><dt><Clock size={13} aria-hidden /> Horas/semana</dt><dd>{a.organizacao.totalHoras}</dd></div>}
        </dl>
        {temConteudo && (
          <div className="an-geral" data-testid="cobertura-geral">
            <div className="an-geral-cab"><BookOpenCheck size={16} aria-hidden /> <b>Aulas catalogadas neste concurso</b></div>
            <Cobertura ok={geral.comAula} total={geral.total} grande />
            <ul className="an-legenda" aria-label="Legenda">
              <li><span className="an-dot an-ok" aria-hidden /> Verde: aula disponível no Aprovum ({geral.comAula.toLocaleString("pt-BR")})</li>
              <li><span className="an-dot an-no" aria-hidden /> Vermelho: aula ainda não disponível ({geral.semAula.toLocaleString("pt-BR")})</li>
            </ul>
          </div>
        )}
      </section>

      <nav className="an-nav" aria-label="Seções da análise">
        {abas.map(([id, rotulo]) => (
          <button key={id} type="button" aria-current={ativa === id ? "true" : undefined} onClick={() => rolar(id)}>{rotulo}</button>
        ))}
      </nav>

      <section id="an-visao" ref={(e) => { secoes.current.visao = e; }} className="an-secao" aria-labelledby="an-h-visao">
        <h2 id="an-h-visao"><Compass size={15} aria-hidden /> Visão geral da prova</h2>
        {a && a.estrutura.blocos.length > 0 && (
          <ul className="an-blocos">
            {a.estrutura.blocos.map((b) => (
              <li key={b.nome} style={{ "--w": `${b.percentual ?? (total && b.questoes ? (b.questoes / total) * 100 : 0)}%` } as CSSProperties}>
                <span className="an-blocos-nome">{b.nome}</span>
                <span className="an-blocos-pct">{pct(b.percentual)}</span>
                <span className="an-blocos-barra" aria-hidden />
                <span className="an-blocos-info">{[b.disciplinas != null && `${b.disciplinas} disciplinas`, b.questoes != null && `${b.questoes} questões`].filter(Boolean).join(" · ")}</span>
              </li>
            ))}
          </ul>
        )}
        {a?.estrutura.notas.filter((n) => !/^considerando\b/i.test(n)).map((n) => <p key={n} className="an-texto">{n}</p>)}

        {itens.length > 0 && (
          <>
            <div className="an-barra-cab">
              <h3>Peso de cada matéria</h3>
              <div className="an-abas" role="group" aria-label="Ordenar por">
                {([["prioridade", "Prioridade"], ["questoes", "Questões"], ["edital", "Ordem do edital"]] as Array<[Ordem, string]>).map(([id, r]) => (
                  <button key={id} type="button" aria-pressed={ordem === id} onClick={() => setOrdem(id)}>{r}</button>
                ))}
              </div>
            </div>
            <ul className="an-barras">
              {grafico.map((i) => (
                <li key={i.id} data-tom={tomPrioridade(i.analise?.prioridade ?? "")}>
                  <button type="button" onClick={() => irParaDisciplina(i.id)} aria-label={`${i.nome}: ${i.analise?.questoes ?? "?"} questões. Ver a matéria`}>
                    <span className="an-barras-nome">{i.nome}</span>
                    <span className="an-barras-num">{i.analise?.questoes ?? "?"}{i.analise?.percentual != null ? ` · ${pct(i.analise.percentual)}` : ""}</span>
                    <span className="an-barras-barra" aria-hidden style={{ "--w": `${((i.analise?.questoes ?? 0) / maxQ) * 100}%` } as CSSProperties} />
                  </button>
                </li>
              ))}
            </ul>
            <p className="an-dica">Toque numa barra para abrir a matéria.</p>
          </>
        )}

        {a && a.distribuicao.classificacao.length > 0 && (
          <div className="an-classe">
            {a.distribuicao.classificacao.map((n) => (
              <div key={n.nivel} data-tom={tomPrioridade(n.nivel)}>
                <h4>Prioridade {n.nivel.toLowerCase()}</h4>
                <ul>{n.disciplinas.map((x) => <li key={x}>{x}</li>)}</ul>
              </div>
            ))}
          </div>
        )}
        {a?.distribuicao.notas.filter((n) => !/^considerando\b/i.test(n)).map((n) => <p key={n} className="an-texto">{n}</p>)}
      </section>

      <section id="an-materias" ref={(e) => { secoes.current.materias = e; }} className="an-secao" aria-labelledby="an-h-mat">
        <h2 id="an-h-mat"><Layers size={15} aria-hidden /> Matérias, tópicos e aulas</h2>
        <div className="an-ferr">
          <label className="an-busca">
            <Search size={15} aria-hidden />
            <span className="sr-only">Buscar matéria ou tópico</span>
            <input type="search" value={termo} onChange={(e) => setTermo(e.target.value)} placeholder="Buscar matéria ou tópico" autoComplete="off" enterKeyHint="search" />
          </label>
          {temConteudo && (
            <div className="an-abas an-filtro-aula" role="group" aria-label="Filtrar tópicos">
              <button type="button" aria-pressed={aula === "todos"} onClick={() => setAula("todos")}>Todos</button>
              <button type="button" data-cor="ok" aria-pressed={aula === "com"} onClick={() => setAula("com")}>Com aula</button>
              <button type="button" data-cor="no" aria-pressed={aula === "sem"} onClick={() => setAula("sem")}>Sem aula</button>
            </div>
          )}
          {blocos.length > 1 && (
            <div className="an-abas" role="group" aria-label="Bloco">
              <button type="button" aria-pressed={bloco === ""} onClick={() => setBloco("")}>Todos os blocos</button>
              {blocos.map((b) => <button key={b} type="button" aria-pressed={bloco === b} onClick={() => setBloco(b)}>{b.replace(/^conhecimentos\s+/i, "")}</button>)}
            </div>
          )}
        </div>
        <p className="an-contagem" role="status" aria-live="polite">{plural(visiveis.length, "matéria", "matérias")}{q || bloco ? " encontradas" : ""}</p>
        <div className="an-lista">
          {visiveis.map((i) => (
            <div key={i.id} data-destaque={destaque === i.id || undefined}>
              {i === extras[0] && !bloco && !q && <h3 className="an-outras">Outras matérias do edital</h3>}
              <CartaoDisciplina it={i} n={todas.indexOf(i) + 1} aberta={abertas.has(i.id) || (q.length > 1 && !!i.topicos?.some((t) => sem(t.titulo).includes(q)))} aoAlternar={() => alternar(i.id)} termo={termo} aula={aula} />
            </div>
          ))}
          {!visiveis.length && <p className="an-vazio">Nenhuma matéria encontrada.</p>}
        </div>
      </section>

      {a && a.dificuldades.length > 0 && (
        <section id="an-dificuldades" ref={(e) => { secoes.current.dificuldades = e; }} className="an-secao" aria-labelledby="an-h-dif">
          <h2 id="an-h-dif"><Flag size={15} aria-hidden /> Onde está a maior dificuldade</h2>
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

      {a && (a.organizacao.horas.length > 0 || a.organizacao.ciclo.length > 0) && (
        <section id="an-rotina" ref={(e) => { secoes.current.rotina = e; }} className="an-secao" aria-labelledby="an-h-rotina">
          <h2 id="an-h-rotina"><Clock size={15} aria-hidden /> Como organizar o estudo</h2>
          {a.organizacao.notas.map((n) => <p key={n} className="an-texto">{n}</p>)}
          {a.organizacao.horas.length > 0 && (
            <ul className="an-horas">
              {a.organizacao.horas.map((h) => (
                <li key={h.disciplina} style={{ "--w": `${(h.horas / maxH) * 100}%` } as CSSProperties}>
                  <span className="an-barras-nome">{h.disciplina}</span>
                  <span className="an-barras-num">{hrs(h.horas)}</span>
                  <span className="an-barras-barra" aria-hidden />
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

      {a && (a.conclusao.decisoes.length > 0 || a.conclusao.recomendacao.length > 0 || a.conclusao.notas.length > 0) && (
        <section id="an-conclusao" ref={(e) => { secoes.current.conclusao = e; }} className="an-secao" aria-labelledby="an-h-conc">
          <h2 id="an-h-conc"><Target size={15} aria-hidden /> Conclusão estratégica</h2>
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
      )}
    </main>
  );
}

export type { DisciplinaVisao };
