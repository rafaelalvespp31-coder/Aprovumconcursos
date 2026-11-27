"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { ChevronDown, Clock, Compass, Flag, Info, ListChecks, Loader2, Search, Target } from "lucide-react";
import { tomPrioridade, type AnaliseDisciplina } from "@/domain/edital/analise";
import { agruparTopicos, combinarComEdital, resumoDisponibilidade, type AulasCatalogadas, type TopicoVisao } from "@/domain/missao/analise-conteudo";
import type { AnaliseParaAluno } from "@/server/services/concurso-analise";
import "./analise-concurso.css";

const pct = (n: number | null) => (n == null ? "" : `${n.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`);
const hrs = (n: number) => `${n.toLocaleString("pt-BR")}h`;
const sem = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const plural = (n: number, um: string, varios: string) => `${n.toLocaleString("pt-BR")} ${n === 1 ? um : varios}`;
const reduzido = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

type FiltroAula = "todos" | "com" | "sem";
type Ordem = "prioridade" | "questoes" | "edital";
/** Uma disciplina da página: a da análise (se houver) e o conteúdo (se houver). */
interface Item {
  id: string;
  nome: string;
  bloco: string;
  analise: AnaliseDisciplina | null;
  topicos: TopicoVisao[] | null;
  extras: AulasCatalogadas[] | null;
}

/** O brilho segue o mouse dentro do cartão (variáveis CSS, sem re-renderizar). */
function mover(e: PointerEvent<HTMLElement>) {
  if (e.pointerType === "touch") return;
  const el = e.currentTarget;
  const r = el.getBoundingClientRect();
  el.style.setProperty("--mx", `${Math.round(((e.clientX - r.left) / r.width) * 100)}%`);
  el.style.setProperty("--my", `${Math.round(((e.clientY - r.top) / r.height) * 100)}%`);
}

/** Número que sobe até o valor quando a página abre (sem animação se o sistema pede menos movimento). */
function Contador({ valor }: { valor: number }) {
  const [v, setV] = useState(valor);
  useEffect(() => {
    if (reduzido()) return;
    let raf = 0;
    const ini = performance.now();
    const passo = (t: number) => {
      const k = Math.min(1, (t - ini) / 900);
      setV(Math.round(valor * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(passo);
    };
    raf = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(raf);
  }, [valor]);
  return <>{v.toLocaleString("pt-BR")}</>;
}

/** Anel de cobertura: verde = aula catalogada, vermelho = ainda não. O arco verde cresce ao aparecer. */
function Anel({ ok, total, tam = 120, esp = 12, rotulo = true }: { ok: number; total: number; tam?: number; esp?: number; rotulo?: boolean }) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const r = requestAnimationFrame(() => setOn(true));
    return () => cancelAnimationFrame(r);
  }, []);
  const raio = (tam - esp) / 2;
  const c = 2 * Math.PI * raio;
  const p = total ? ok / total : 0;
  return (
    <span className="an-anel" style={{ width: tam, height: tam }}>
      <svg width={tam} height={tam} viewBox={`0 0 ${tam} ${tam}`} role="img" aria-label={`${ok} de ${total} com aula`}>
        <circle cx={tam / 2} cy={tam / 2} r={raio} fill="none" stroke="#ef4444" strokeOpacity={total ? 0.85 : 0.2} strokeWidth={esp} />
        <circle className="an-anel-ok" cx={tam / 2} cy={tam / 2} r={raio} fill="none" stroke="#22c55e" strokeWidth={esp} strokeDasharray={c} strokeDashoffset={on ? c * (1 - p) : c} transform={`rotate(-90 ${tam / 2} ${tam / 2})`} />
      </svg>
      {rotulo && <span className="an-anel-txt"><b>{Math.round(p * 100)}%</b><small>com aula</small></span>}
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

/** Tópicos em cartões: cada tópico principal com seus subtópicos e as aulas catalogadas (verde) ou a falta delas (vermelho). */
function Cartoes({ topicos, termo, aula }: { topicos: TopicoVisao[]; termo: string; aula: FiltroAula }) {
  const [limite, setLimite] = useState(24);
  const cartoes = useMemo(() => {
    const q = sem(termo).split(/\s+/).filter(Boolean);
    const passa = (t: TopicoVisao) => (aula === "com" ? t.disponivel : aula === "sem" ? !t.disponivel : true) && q.every((w) => sem(`${t.codigo ?? ""} ${t.titulo} ${t.aulas.join(" ")}`).includes(w));
    return agruparTopicos(topicos)
      .map((c, n) => ({ ...c, n: n + 1, filhos: c.filhos.map((f, k) => ({ f, k })).filter(({ f }) => passa(f)), mostra: passa(c.raiz) }))
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
                <h5><span className="an-top-cod">{c.raiz.codigo ?? c.n}</span>{c.raiz.titulo}</h5>
                <b className="an-top-n" title="Itens com aula neste cartão">{c.disponiveis}/{c.total}</b>
              </header>
              {c.mostra && (c.raiz.disponivel || !c.filhos.length) && <div className="an-top-aulas"><Aulas t={c.raiz} /></div>}
              {c.filhos.length > 0 && (
                <ul className="an-sub">
                  {c.filhos.map(({ f, k }) => (
                    <li key={`${f.codigo ?? ""}-${k}`} data-ok={f.disponivel || undefined} style={{ "--rec": Math.max(0, f.nivel - c.raiz.nivel - 1) } as CSSProperties}>
                      <span className="an-sub-t"><span className="an-top-cod">{f.codigo ?? `${c.raiz.codigo ?? c.n}.${k + 1}`}</span>{f.titulo}</span>
                      <Aulas t={f} />
                    </li>
                  ))}
                </ul>
              )}
            </article>
          );
        })}
      </div>
      {cartoes.length > limite && <button type="button" className="an-mais" onClick={() => setLimite((l) => l + 30)}>Mostrar mais {Math.min(30, cartoes.length - limite)} de {cartoes.length - limite} restantes</button>}
    </>
  );
}

/** Posição e tamanho em pixels do cartaz de referência (941 × 1672), convertidos em porcentagem para escalar com a largura. */
const caixa = (x: number, y: number, w: number, h: number): CSSProperties => ({ left: `${(x / 941) * 100}%`, top: `${(y / 1672) * 100}%`, width: `${(w / 941) * 100}%`, height: `${(h / 1672) * 100}%` });
/** Tamanho da fonte (em px do cartaz) do nome do concurso: o maior que cabe na faixa do título. */
const tamNome = (nome: string) => Math.max(46, Math.min(150, Math.round(560 / Math.max(3, nome.trim().length) / 0.62)));

/** Anel do cartaz: trilho cromado + arco vermelho com brilho; o arco cresce ao aparecer. */
function AnelPoster({ ok, total }: { ok: number; total: number }) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const r = requestAnimationFrame(() => setOn(true));
    return () => cancelAnimationFrame(r);
  }, []);
  const r = 124;
  const c = 2 * Math.PI * r;
  const p = total ? Math.min(1, ok / total) : 0;
  return (
    <svg viewBox="0 0 304 304" role="img" aria-label={`${ok} de ${total} com aula`} className="ap-anel">
      <defs>
        <linearGradient id="ap-cromo" x1="0.1" y1="0" x2="0.9" y2="1"><stop offset="0" stopColor="#e9e9ec" /><stop offset="0.45" stopColor="#7d7d83" /><stop offset="1" stopColor="#2a2a2e" /></linearGradient>
        <linearGradient id="ap-verm" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ff5a4d" /><stop offset="0.5" stopColor="#f01a10" /><stop offset="1" stopColor="#b80500" /></linearGradient>
        <filter id="ap-brilho" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="5" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
      </defs>
      <circle cx="152" cy="152" r={r} fill="none" stroke="url(#ap-cromo)" strokeWidth="38" />
      <circle cx="152" cy="152" r={r + 20} fill="none" stroke="rgb(255 255 255 / .25)" strokeWidth="1.5" />
      <circle cx="152" cy="152" r={r - 20} fill="none" stroke="rgb(255 255 255 / .12)" strokeWidth="1.5" />
      {p > 0 && <circle className="ap-anel-arco" cx="152" cy="152" r={r} fill="none" stroke="url(#ap-verm)" strokeWidth="38" strokeDasharray={c} strokeDashoffset={on ? c * (1 - p) : c} transform="rotate(-90 152 152)" filter="url(#ap-brilho)" />}
    </svg>
  );
}

type Aba = "visao" | "conteudo" | "materias" | "dificuldades" | "rotina" | "conclusao";

/** Análise do concurso: estrutura da prova, matérias, conteúdo completo com as aulas catalogadas, prioridades, dificuldades, rotina e conclusão. */
export function AnaliseConcurso({ dados, voltar, montar }: { dados: AnaliseParaAluno; voltar: string; montar: (contestId: string, nome: string) => Promise<{ ok: true; destino: string } | { ok: false; error: string }> }) {
  const router = useRouter();
  const { concurso: c, analise: a, conteudo, conteudoOrigem, marca } = dados;

  const { itens, extras } = useMemo(() => {
    const nomes = a?.disciplinas.map((d) => d.nome) ?? [];
    const comb = combinarComEdital(nomes, conteudo ?? []);
    const base: Item[] = (a?.disciplinas ?? []).map((d, i) => ({ id: `d-${d.ordem}`, nome: d.nome, bloco: d.bloco, analise: d, topicos: comb.pares[i]?.topicos ?? null, extras: comb.pares[i]?.extras ?? null }));
    const ex: Item[] = comb.extras.map((d, i) => ({ id: `x-${i}`, nome: d.nome, bloco: "", analise: null, topicos: d.topicos, extras: d.extras ?? null }));
    return { itens: base, extras: ex };
  }, [a, conteudo]);
  const todas = useMemo(() => [...itens, ...extras], [itens, extras]);
  const comTopicos = useMemo(() => todas.filter((i) => i.topicos?.length), [todas]);

  const geral = useMemo(() => resumoDisponibilidade(comTopicos.flatMap((i) => i.topicos ?? [])), [comTopicos]);
  const temConteudo = comTopicos.length > 0;
  const total = a ? (a.estrutura.total?.questoes ?? a.disciplinas.reduce((s, d) => s + (d.questoes ?? 0), 0)) : 0;

  const [termo, setTermo] = useState("");
  const [bloco, setBloco] = useState("");
  const [ordem, setOrdem] = useState<Ordem>("prioridade");
  const [aberta, setAberta] = useState<string | null>(null);
  const [sel, setSel] = useState<string>(comTopicos[0]?.id ?? "");
  const [aula, setAula] = useState<FiltroAula>("todos");
  const [termoTop, setTermoTop] = useState("");
  const [aba, setAba] = useState<Aba>("visao");
  const [montando, setMontando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const raiz = useRef<HTMLElement>(null);
  const marcaRef = useRef<HTMLDivElement>(null);
  const progresso = useRef<HTMLDivElement>(null);

  // Textos do cabeçalho: cargos (divididos em dois) e a banca.
  const cargos = (c.cargo ?? "").split(",").map((x) => x.trim()).filter(Boolean);
  const meio = Math.ceil(cargos.length / 2);
  const infos = [cargos.slice(0, meio).join(", "), cargos.slice(meio).join(", "), c.banca ?? ""];
  const temAnalise = !!a && itens.length > 0;
  const abas: Array<[Aba, string]> = [["visao", "Visão geral"], ["conteudo", "Conteúdo programático"]];
  if (temAnalise) abas.push(["materias", "Análise por matéria"]);
  if (a?.dificuldades.length) abas.push(["dificuldades", "Dificuldades"]);
  if (a && (a.organizacao.horas.length || a.organizacao.ciclo.length)) abas.push(["rotina", "Rotina"]);
  if (a && (a.conclusao.decisoes.length || a.conclusao.recomendacao.length || a.conclusao.notas.length)) abas.push(["conclusao", "Conclusão"]);

  // Barra de progresso, movimento suave da marca d'água, aparição dos blocos e destaque da seção atual.
  useEffect(() => {
    const el = raiz.current;
    if (!el) return;
    const calmo = reduzido();
    let raf = 0;
    const atualizar = () => {
      raf = 0;
      const max = document.documentElement.scrollHeight - innerHeight;
      const y = window.scrollY;
      if (progresso.current) progresso.current.style.transform = `scaleX(${max > 0 ? Math.min(1, y / max) : 0})`;
      if (marcaRef.current && !calmo) marcaRef.current.style.transform = `translate3d(0, ${Math.round(-y * 0.05)}px, 0)`;
    };
    const aoRolar = () => {
      if (!raf) raf = requestAnimationFrame(atualizar);
    };
    atualizar();
    window.addEventListener("scroll", aoRolar, { passive: true });

    let io1: IntersectionObserver | null = null;
    if (typeof IntersectionObserver !== "undefined") {
      el.classList.add("an-js");
      io1 = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { (e.target as HTMLElement).dataset.in = "1"; io1?.unobserve(e.target); } }), { rootMargin: "0px 0px -8% 0px", threshold: 0.05 });
      el.querySelectorAll(".an-rev").forEach((n) => io1!.observe(n));
    }
    return () => {
      window.removeEventListener("scroll", aoRolar);
      if (raf) cancelAnimationFrame(raf);
      io1?.disconnect();
      el.classList.remove("an-js");
    };
  }, [dados]);

  const montarPlano = async () => {
    if (montando) return;
    setAviso(null);
    // O plano nasce do edital oficial publicado: sem ele, avisa em vez de errar.
    if (conteudoOrigem !== "edital") {
      setAviso("O edital oficial deste concurso ainda não foi publicado. Assim que ele for publicado, este botão monta o seu plano de estudo na hora.");
      return;
    }
    setMontando(true);
    const r = await montar(c.id, c.nome).catch((): { ok: false; error: string } => ({ ok: false, error: "Sem conexão. Tente de novo." }));
    if (!r.ok) { setMontando(false); setAviso(r.error); return; }
    router.push(r.destino);
  };
  const irAba = (id: Aba, depois?: () => void) => {
    setAba(id);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      document.getElementById(`an-${id}`)?.scrollIntoView({ behavior: reduzido() ? "auto" : "smooth", block: "start" });
      depois?.();
    }));
  };
  const verConteudo = (id: string) => {
    if (!todas.find((i) => i.id === id)?.topicos?.length) return;
    setSel(id);
    setAula("todos");
    setTermoTop("");
    irAba("conteudo");
  };
  const abrirMateria = (id: string) => {
    setBloco("");
    setTermo("");
    setAberta(id);
    irAba("materias", () => document.getElementById(id)?.scrollIntoView({ behavior: reduzido() ? "auto" : "smooth", block: "center" }));
  };

  const blocos = useMemo(() => [...new Set(itens.map((i) => i.bloco).filter(Boolean))], [itens]);
  const q = sem(termo).trim();
  const visiveis = itens.filter((i) => {
    if (bloco && i.bloco !== bloco) return false;
    if (!q) return true;
    return q.split(/\s+/).every((w) => sem(`${i.nome} ${i.analise?.focos.join(" ") ?? ""} ${i.analise?.prioridade ?? ""}`).includes(w));
  });

  const maxQ = Math.max(1, ...itens.map((i) => i.analise?.questoes ?? 0));
  const maxH = Math.max(1, ...(a?.organizacao.horas.map((h) => h.horas) ?? [1]));
  const grafico = [...itens].sort((x, y) =>
    ordem === "edital" ? (x.analise?.ordem ?? 0) - (y.analise?.ordem ?? 0)
    : ordem === "questoes" ? (y.analise?.questoes ?? 0) - (x.analise?.questoes ?? 0)
    : tomPrioridade(x.analise?.prioridade ?? "") - tomPrioridade(y.analise?.prioridade ?? "") || (y.analise?.questoes ?? 0) - (x.analise?.questoes ?? 0));

  const atual = comTopicos.find((i) => i.id === sel) ?? comTopicos[0] ?? null;
  const rAtual = atual?.topicos ? resumoDisponibilidade(atual.topicos) : null;

  return (
    <main className="an" ref={raiz}>
      <div className="an-fundo" aria-hidden>
        {marca && <div className="an-marca" ref={marcaRef} style={{ backgroundImage: `url("${marca.replace(/"/g, "%22")}")` }} />}
        <div className="an-brilho" />
        <div className="an-vinheta" />
      </div>
      <div className="an-progresso" ref={progresso} aria-hidden />

      <div className="an-pagina">
        <section className="an-poster" aria-label={`Análise do concurso ${c.nome}`}>
          <div className="an-poster-in" data-busy={montando || undefined}>
            <Link href={voltar} className="ap-hit ap-voltar" style={caixa(36, 22, 160, 54)} aria-label="Voltar"><span className="ap-sr">Voltar</span></Link>
            <p className="ap-sr">ANÁLISE DO CONCURSO</p>
            <h1 className="ap-nome" style={{ ...caixa(48, 176, 580, 150), fontSize: `calc(var(--u) * ${tamNome(c.nome)})` }}><span>{c.nome}</span></h1>
            {c.orgao && <p className="ap-orgao" style={caixa(57, 322, 560, 28)}>{c.orgao}</p>}
            {infos[0] && <p className="ap-info" style={caixa(135, 398, 175, 66)}><span>{infos[0]}</span></p>}
            {infos[1] && <p className="ap-info" style={caixa(404, 398, 135, 66)}><span>{infos[1]}</span></p>}
            {infos[2] && <p className="ap-info" style={caixa(633, 398, 150, 66)}><span>{infos[2]}</span></p>}

            <button type="button" className="ap-hit ap-plano" style={caixa(108, 497, 744, 126)} onClick={() => void montarPlano()} disabled={montando} aria-busy={montando} data-testid="montar-plano">
              <span className="ap-sr">Montar meu plano de estudo</span>
              <span className="ap-plano-cobre" aria-hidden>{montando && <><Loader2 className="an-gira" aria-hidden /> Montando seu plano…</>}</span>
            </button>

            <dl className="ap-cards">
              {[
                { x: 74, y: 752, v: total > 0 ? total : null },
                { x: 518, y: 752, v: todas.length },
                { x: 74, y: 968, v: temConteudo ? geral.total : null },
                { x: 518, y: 968, v: a?.organizacao.totalHoras ?? null },
              ].map((n, i) => (
                <dd key={i} className="ap-num" style={caixa(n.x, n.y, 190, 84)}>{n.v == null ? "—" : <Contador valor={n.v} />}</dd>
              ))}
            </dl>
            <p className="ap-sr">{total > 0 ? `${total} questões. ` : ""}{todas.length} disciplinas. {temConteudo ? `${geral.total} itens de conteúdo. ` : ""}{a?.organizacao.totalHoras != null ? `${a.organizacao.totalHoras} horas por semana.` : ""}</p>

            <div className="ap-cob" data-testid="cobertura-geral" style={caixa(120, 1140, 304, 304)}>
              <AnelPoster ok={geral.comAula} total={geral.total} />
              <span className="ap-cob-txt"><b>{Math.round((geral.total ? geral.comAula / geral.total : 0) * 100)}%</b><small>com aula</small></span>
            </div>
            <p className="ap-cob-n ap-cob-ok" style={caixa(574, 1252, 80, 44)}>{geral.comAula.toLocaleString("pt-BR")}</p>
            <p className="ap-cob-n ap-cob-no" style={caixa(574, 1302, 80, 44)}>{geral.semAula.toLocaleString("pt-BR")}</p>
            <button type="button" className="ap-hit ap-cta" style={caixa(498, 1383, 394, 94)} onClick={() => irAba("conteudo")}><span className="ap-sr">Ver conteúdo programático</span></button>
          </div>
          <p className="an-plano-aviso" role="status" aria-live="polite" data-visivel={aviso ? "" : undefined}>{aviso ?? ""}</p>
        </section>

        <nav className="an-nav" role="tablist" aria-label="Seções da análise">
          {abas.map(([id, rotulo]) => (
            <button key={id} type="button" role="tab" id={`an-tab-${id}`} aria-selected={aba === id} aria-controls={`an-${id}`} onClick={() => irAba(id)}>{rotulo}</button>
          ))}
        </nav>

        <section id="an-visao" className="an-secao" role="tabpanel" hidden={aba !== "visao"} aria-labelledby="an-h-visao">
          <h2 id="an-h-visao" className="an-rev"><Compass size={15} aria-hidden /> Visão geral da prova</h2>
          {a && a.estrutura.blocos.length > 0 && (
            <ul className="an-blocos an-rev">
              {a.estrutura.blocos.map((b) => (
                <li key={b.nome} className="an-vidro" onPointerMove={mover} style={{ "--w": `${b.percentual ?? (total && b.questoes ? (b.questoes / total) * 100 : 0)}%` } as CSSProperties}>
                  <span className="an-blocos-nome">{b.nome}</span>
                  <span className="an-blocos-pct">{pct(b.percentual)}</span>
                  <span className="an-blocos-barra" aria-hidden />
                  <span className="an-blocos-info">{[b.disciplinas != null && `${b.disciplinas} disciplinas`, b.questoes != null && `${b.questoes} questões`].filter(Boolean).join(" · ")}</span>
                </li>
              ))}
            </ul>
          )}
          {a?.estrutura.notas.filter((n) => !/^considerando\b/i.test(n)).map((n) => <p key={n} className="an-texto an-rev">{n}</p>)}

          {itens.length > 0 && (
            <div className="an-peso an-vidro an-rev">
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
                    <button type="button" onClick={() => abrirMateria(i.id)} aria-label={`${i.nome}: ${i.analise?.questoes ?? "?"} questões. Abrir a análise da matéria`}>
                      <span className="an-barras-nome">{i.nome}</span>
                      <span className="an-barras-num">{i.analise?.questoes ?? "?"}{i.analise?.percentual != null ? ` · ${pct(i.analise.percentual)}` : ""}</span>
                      <span className="an-barras-barra" aria-hidden style={{ "--w": `${((i.analise?.questoes ?? 0) / maxQ) * 100}%` } as CSSProperties} />
                    </button>
                  </li>
                ))}
              </ul>
              <p className="an-dica">Toque numa barra para abrir a análise da matéria.</p>
            </div>
          )}

          {a && a.distribuicao.classificacao.length > 0 && (
            <div className="an-classe an-rev">
              {a.distribuicao.classificacao.map((n) => (
                <div key={n.nivel} className="an-vidro" data-tom={tomPrioridade(n.nivel)} onPointerMove={mover}>
                  <h4>Prioridade {n.nivel.toLowerCase()}</h4>
                  <ul>{n.disciplinas.map((x) => <li key={x}>{x}</li>)}</ul>
                </div>
              ))}
            </div>
          )}
          {a?.distribuicao.notas.filter((n) => !/^considerando\b/i.test(n)).map((n) => <p key={n} className="an-texto an-rev">{n}</p>)}
        </section>

        {temAnalise && (
          <section id="an-materias" className="an-secao" role="tabpanel" hidden={aba !== "materias"} aria-labelledby="an-h-mat">
            <h2 id="an-h-mat" className="an-rev"><Target size={15} aria-hidden /> Análise por matéria</h2>
            <div className="an-ferr an-rev">
              <label className="an-busca">
                <Search size={15} aria-hidden />
                <span className="sr-only">Buscar matéria ou foco</span>
                <input type="search" value={termo} onChange={(e) => setTermo(e.target.value)} placeholder="Buscar matéria ou foco" autoComplete="off" enterKeyHint="search" />
              </label>
              {blocos.length > 1 && (
                <div className="an-abas" role="group" aria-label="Bloco">
                  <button type="button" aria-pressed={bloco === ""} onClick={() => setBloco("")}>Todos</button>
                  {blocos.map((b) => <button key={b} type="button" aria-pressed={bloco === b} onClick={() => setBloco(b)}>{b.replace(/^conhecimentos\s+/i, "")}</button>)}
                </div>
              )}
            </div>
            <p className="an-contagem" role="status" aria-live="polite">{plural(visiveis.length, "matéria", "matérias")}{q || bloco ? " encontradas" : ""}</p>
            <div className="an-grade">
              {visiveis.map((i) => {
                const d = i.analise!;
                const abre = aberta === i.id;
                const r = i.topicos ? resumoDisponibilidade(i.topicos) : null;
                return (
                  <article key={i.id} id={i.id} className="an-disc an-vidro" data-aberta={abre || undefined} data-tom={tomPrioridade(d.prioridade)} onPointerMove={mover}>
                    <button type="button" className="an-disc-cab" aria-expanded={abre} aria-controls={`${i.id}-corpo`} onClick={() => setAberta(abre ? null : i.id)}>
                      <span className="an-disc-n" aria-hidden>{d.ordem}</span>
                      <span className="an-disc-info">
                        <span className="an-disc-nome">{i.nome}</span>
                        <span className="an-disc-chips">
                          {d.questoes != null && <b className="an-chip">{d.questoes} questões{d.percentual != null ? ` · ${pct(d.percentual)}` : ""}</b>}
                          {d.prioridade && <b className="an-chip an-prio">{d.prioridade}</b>}
                        </span>
                      </span>
                      {r ? <Anel ok={r.comAula} total={r.total} tam={46} esp={6} rotulo={false} /> : null}
                      <ChevronDown className="an-seta" size={18} aria-hidden />
                    </button>
                    {abre && (
                      <div id={`${i.id}-corpo`} className="an-disc-corpo">
                        {d.descricao && <p className="an-texto">{d.descricao}</p>}
                        {d.focos.length > 0 && (
                          <>
                            <h4>Principais focos de preparação</h4>
                            <ul className="an-focos">{d.focos.map((f) => <li key={f}>{f}</li>)}</ul>
                          </>
                        )}
                        {d.estrategia && <div className="an-estrategia"><h4>Como estudar</h4><p>{d.estrategia}</p></div>}
                        {r && (
                          <button type="button" className="an-cta an-cta-bloco" onClick={() => verConteudo(i.id)}>
                            <ListChecks size={15} aria-hidden /> Ver conteúdo e aulas · {r.comAula} de {r.total} com aula
                          </button>
                        )}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
            {!visiveis.length && <p className="an-vazio">Nenhuma matéria encontrada.</p>}
          </section>
        )}

        <section id="an-conteudo" className="an-secao" role="tabpanel" hidden={aba !== "conteudo"} aria-labelledby="an-h-cont">
          <h2 id="an-h-cont" className="an-rev"><ListChecks size={15} aria-hidden /> Conteúdo programático completo</h2>
          <ul className="an-legenda an-legenda-faixa an-rev" aria-label="Legenda">
            <li><span className="an-dot an-ok" aria-hidden /> Verde: aula catalogada no Aprovum</li>
            <li><span className="an-dot an-no" aria-hidden /> Vermelho: ainda não catalogada</li>
          </ul>

          {!temConteudo && (
            <div className="an-aviso-grande an-vidro an-rev" data-testid="sem-conteudo">
              <Info size={20} aria-hidden />
              <div>
                <b>O conteúdo programático deste concurso ainda não foi importado.</b>
                <p>Assim que a equipe importar o edital, esta aba mostra todos os tópicos de cada matéria, numerados na ordem do edital, cada um em verde (aula catalogada) ou vermelho (ainda sem aula).</p>
              </div>
            </div>
          )}

          {temConteudo && (
            <>
              {conteudoOrigem === "focos" && (
                <div className="an-aviso an-rev" role="note">
                  <Info size={16} aria-hidden />
                  <span>O <b>conteúdo programático literal do edital</b> ainda não foi importado. Por enquanto, esta aba lista os <b>principais focos da análise</b>, numerados por matéria e conferidos com as aulas catalogadas. Quando o edital for importado, todos os tópicos aparecem aqui, na ordem dele.</span>
                </div>
              )}
              <div className="an-seletor an-rev" role="tablist" aria-label="Matéria">
                {comTopicos.map((i) => {
                  const r = resumoDisponibilidade(i.topicos!);
                  return (
                    <button key={i.id} type="button" role="tab" aria-selected={atual?.id === i.id} className="an-sel" onClick={() => setSel(i.id)} onPointerMove={mover}>
                      <Anel ok={r.comAula} total={r.total} tam={44} esp={6} rotulo={false} />
                      <span className="an-sel-txt"><b>{i.nome}</b><small>{r.comAula} de {r.total} com aula</small></span>
                    </button>
                  );
                })}
              </div>

              {atual && rAtual && (
                <div className="an-painel an-vidro" role="tabpanel" aria-label={atual.nome}>
                  <div className="an-painel-cab">
                    <Anel ok={rAtual.comAula} total={rAtual.total} tam={96} esp={10} />
                    <div className="an-painel-tit">
                      <h3>{atual.nome}</h3>
                      <p>{plural(rAtual.total, conteudoOrigem === "focos" ? "item" : "tópico", conteudoOrigem === "focos" ? "itens" : "tópicos")}</p>
                      <div className="an-painel-n">
                        <button type="button" data-cor="ok" aria-pressed={aula === "com"} onClick={() => setAula(aula === "com" ? "todos" : "com")}><b>{rAtual.comAula}</b> com aula</button>
                        <button type="button" data-cor="no" aria-pressed={aula === "sem"} onClick={() => setAula(aula === "sem" ? "todos" : "sem")}><b>{rAtual.semAula}</b> sem aula</button>
                      </div>
                    </div>
                  </div>
                  <div className="an-ferr">
                    <label className="an-busca">
                      <Search size={15} aria-hidden />
                      <span className="sr-only">Buscar tópico ou aula</span>
                      <input type="search" value={termoTop} onChange={(e) => setTermoTop(e.target.value)} placeholder="Buscar tópico ou aula" autoComplete="off" enterKeyHint="search" />
                    </label>
                    <div className="an-abas" role="group" aria-label="Filtrar">
                      <button type="button" aria-pressed={aula === "todos"} onClick={() => setAula("todos")}>Todos</button>
                      <button type="button" data-cor="ok" aria-pressed={aula === "com"} onClick={() => setAula("com")}>Com aula</button>
                      <button type="button" data-cor="no" aria-pressed={aula === "sem"} onClick={() => setAula("sem")}>Sem aula</button>
                    </div>
                  </div>
                  <Cartoes key={atual.id} topicos={atual.topicos!} termo={termoTop} aula={aula} />
                  {atual.extras?.length ? (
                    <div className="an-extras" data-testid="aulas-extras">
                      <h4>Outras aulas catalogadas em {atual.nome}</h4>
                      <p>Estão no catálogo do Aprovum e não casaram com nenhum item acima.</p>
                      <div className="an-topicos">
                        {atual.extras.map((e) => (
                          <article key={e.titulo} className="an-top" data-estado="ok" style={{ "--pv": "100%" } as CSSProperties}>
                            <header><h5>{e.titulo}</h5><b className="an-top-n">{plural(e.total, "aula", "aulas")}</b></header>
                            {e.aulas.length > 0 && <div className="an-top-aulas an-aulas">{e.aulas.map((a) => <span key={a} className="an-pill an-ok" title={a}>{a}</span>)}</div>}
                          </article>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </>
          )}
        </section>

        {a && a.dificuldades.length > 0 && (
          <section id="an-dificuldades" className="an-secao" role="tabpanel" hidden={aba !== "dificuldades"} aria-labelledby="an-h-dif">
            <h2 id="an-h-dif" className="an-rev"><Flag size={15} aria-hidden /> Onde está a maior dificuldade</h2>
            <div className="an-cartoes an-rev">
              {a.dificuldades.map((g, i) => (
                <article key={g.grupo} className="an-cartao an-vidro" onPointerMove={mover}>
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
          <section id="an-rotina" className="an-secao" role="tabpanel" hidden={aba !== "rotina"} aria-labelledby="an-h-rotina">
            <h2 id="an-h-rotina" className="an-rev"><Clock size={15} aria-hidden /> Como organizar o estudo</h2>
            {a.organizacao.notas.map((n) => <p key={n} className="an-texto an-rev">{n}</p>)}
            {a.organizacao.horas.length > 0 && (
              <div className="an-peso an-vidro an-rev">
                <div className="an-barra-cab"><h3>Horas por semana</h3>{a.organizacao.totalHoras != null && <b className="an-chip">{hrs(a.organizacao.totalHoras)} no total</b>}</div>
                <ul className="an-horas">
                  {a.organizacao.horas.map((h) => (
                    <li key={h.disciplina} style={{ "--w": `${(h.horas / maxH) * 100}%` } as CSSProperties}>
                      <span className="an-barras-nome">{h.disciplina}</span>
                      <span className="an-barras-num">{hrs(h.horas)}</span>
                      <span className="an-barras-barra" aria-hidden />
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {a.organizacao.ciclo.length > 0 && (
              <ol className="an-ciclo an-rev" aria-label="Ciclo recomendado">
                {a.organizacao.ciclo.map((e) => <li key={e.etapa} className="an-vidro" onPointerMove={mover}><b>{e.etapa}</b><span>{e.texto}</span></li>)}
              </ol>
            )}
          </section>
        )}

        {a && (a.conclusao.decisoes.length > 0 || a.conclusao.recomendacao.length > 0 || a.conclusao.notas.length > 0) && (
          <section id="an-conclusao" className="an-secao" role="tabpanel" hidden={aba !== "conclusao"} aria-labelledby="an-h-conc">
            <h2 id="an-h-conc" className="an-rev"><Target size={15} aria-hidden /> Conclusão estratégica</h2>
            {a.conclusao.notas.map((n) => <p key={n} className="an-texto an-rev">{n}</p>)}
            {a.conclusao.decisoes.length > 0 && (
              <ol className="an-decisoes an-rev">
                {a.conclusao.decisoes.map((d) => <li key={d.titulo} className="an-vidro" onPointerMove={mover}><b>{d.titulo}</b><span>{d.texto}</span></li>)}
              </ol>
            )}
            {a.conclusao.recomendacao.length > 0 && (
              <div className="an-estrategia an-vidro an-rev">
                <h4>Recomendação final</h4>
                {a.conclusao.recomendacao.map((r) => <p key={r}>{r}</p>)}
              </div>
            )}
            {a.conclusao.observacao && <p className="an-obs an-rev">{a.conclusao.observacao}</p>}
          </section>
        )}
      </div>
    </main>
  );
}
