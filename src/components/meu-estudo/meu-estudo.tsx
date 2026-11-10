"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { flushSync } from "react-dom";
import { BookOpen, Calendar, ChartColumn, ChevronDown, ChevronRight, CircleCheck, HelpCircle, Landmark, Layers, LoaderCircle, Plus, Search, SlidersHorizontal, Target, Trophy, X } from "lucide-react";
import { callAction } from "@/components/safe-action";
import { isStudied } from "@/app/(app)/trilhas/folder-board";
import { createFolderAction, deleteFolderAction, renameFolderAction, restyleFolderAction, type FolderResult } from "@/app/(app)/trilhas/folder-actions";
import { COR, glifoDa, PastaIcone, plural, type EstudoFolder, type EstudoTrail } from "./base";
import { comTransicao, useRevelar } from "./movimento";
import { EstudoHero } from "./hero";
import { EstudoIndicadores } from "./indicadores";
import { Cores, Icones, Janela } from "./janela";
import { PastaCard, type AcaoPasta } from "./pasta-card";
import { PastaAberta } from "./pasta-aberta";
import "./meu-estudo.css";

export type { EstudoTrail, EstudoFolder } from "./base";
export { PALETA } from "./base";

export interface EstudoTendencia {
  aulasSerie: number[];
  aulasPct30: number | null;
  tempoSemanas: number[];
  tempoVariacao: number | null;
}
interface Props {
  folders: EstudoFolder[];
  trails: EstudoTrail[];
  studySeconds: number;
  continueHref: string | null;
  continueLabel: string;
  archivedCount: number;
  tendencia?: EstudoTendencia;
  /** Pasta já aberta ao carregar (?pasta=…). */
  pastaInicial?: string | null;
}

type Ordem = "recentes" | "antigas" | "nome" | "progresso";
type Situacao = "todas" | "andamento" | "concluidas" | "novas";
const SITUACAO: Record<Situacao, string> = { todas: "Todas as aulas", andamento: "Em andamento", concluidas: "Concluídas", novas: "Não iniciadas" };
const ORDEM: Record<Ordem, string> = { recentes: "Mais recentes", antigas: "Mais antigas", nome: "Nome (A–Z)", progresso: "Maior progresso" };
const SOLTAS = "sem-pasta";
const CHAVE_FEITAS = "aprovum:meu-estudo:feitas";

function Filtro({ nome, icone, rotulo, valor, onChange, opcoes, ativo }: { nome: string; icone: React.ReactNode; rotulo: string; valor: string; onChange: (v: string) => void; opcoes: Array<[string, string]>; ativo?: boolean }) {
  return (
    <label className={`me-filtro${ativo ? " me-filtro-ativo" : ""}`}>
      {icone}
      <span className="me-filtro-txt">{rotulo}</span>
      <ChevronDown size={15} aria-hidden />
      <select value={valor} onChange={(e) => onChange(e.target.value)} aria-label={nome}>
        {opcoes.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </label>
  );
}

const pastaDaUrl = () => new URLSearchParams(window.location.search).get("pasta");

export function MeuEstudo({ folders, trails, studySeconds, continueHref, continueLabel, archivedCount, tendencia, pastaInicial = null }: Props) {
  const router = useRouter();
  const raiz = useRef<HTMLDivElement>(null);
  const [pending, start] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<{ txt: string; conquista?: boolean } | null>(null);
  const [busca, setBusca] = useState("");
  const [situacao, setSituacao] = useState<Situacao>("todas");
  const [materia, setMateria] = useState("");
  const [banca, setBanca] = useState("");
  const [ordem, setOrdem] = useState<Ordem>("recentes");
  const [painel, setPainel] = useState(false);
  const [janela, setJanela] = useState<null | { t: "nova" } | { t: "renomear" | "aparencia" | "excluir"; id: string }>(null);
  const [menu, setMenu] = useState<string | null>(null);
  const [nome, setNome] = useState("");
  const [cor, setCor] = useState("vermelho");
  const [icone, setIcone] = useState<string | null>(null);
  const [aberta, setAberta] = useState<null | { id: string; organizar?: boolean }>(pastaInicial ? { id: pastaInicial } : null);
  const [vt, setVt] = useState<string | null>(null);
  const [ganhou, setGanhou] = useState<ReadonlySet<string>>(new Set());
  const q = useDeferredValue(busca.trim().toLowerCase());
  const buscando = q !== busca.trim().toLowerCase();

  const act = useCallback(
    (fn: () => Promise<FolderResult>, after?: () => void, ok?: string) =>
      start(async () => {
        const r = await callAction(fn, setErro);
        if (!r) return;
        if (!r.ok) return setErro(r.error ?? "Erro.");
        setErro(null);
        after?.();
        if (ok) setAviso({ txt: ok });
        router.refresh();
      }),
    [router],
  );

  // Fecha o menu de três pontos ao tocar fora.
  useEffect(() => {
    if (!menu) return;
    const fecha = (e: Event) => {
      if (!(e.target as HTMLElement).closest?.("[data-me-menu]")) setMenu(null);
    };
    document.addEventListener("pointerdown", fecha);
    return () => document.removeEventListener("pointerdown", fecha);
  }, [menu]);

  // Aviso some sozinho.
  useEffect(() => {
    if (!aviso) return;
    const id = window.setTimeout(() => setAviso(null), 4200);
    return () => window.clearTimeout(id);
  }, [aviso]);

  // Botão "voltar" do aparelho fecha a pasta aberta (a pasta fica na URL: ?pasta=…).
  useEffect(() => {
    const aoVoltar = () => {
      const id = pastaDaUrl();
      comTransicao(() => flushSync(() => setAberta(id ? { id } : null)), () => setVt(null));
    };
    window.addEventListener("popstate", aoVoltar);
    return () => window.removeEventListener("popstate", aoVoltar);
  }, []);

  // Conquista: aulas concluídas desde a última visita a esta página (comparação local, por aparelho).
  useEffect(() => {
    let antes: Record<string, number> | null = null;
    try {
      antes = JSON.parse(window.localStorage.getItem(CHAVE_FEITAS) ?? "null") as Record<string, number> | null;
    } catch {
      antes = null;
    }
    const agora = Object.fromEntries(trails.map((t) => [t.id, t.progress.done]));
    try {
      window.localStorage.setItem(CHAVE_FEITAS, JSON.stringify(agora));
    } catch {
      /* armazenamento indisponível: só não há o efeito de conquista */
    }
    if (!antes) return;
    let novas = 0;
    const pastas = new Set<string>();
    for (const t of trails) {
      const d = t.progress.done - (antes[t.id] ?? t.progress.done);
      if (d > 0) {
        novas += d;
        pastas.add(t.folderId ?? SOLTAS);
      }
    }
    if (!novas) return;
    const raf = requestAnimationFrame(() => {
      setGanhou(pastas);
      setAviso({ txt: `${plural(novas, "aula concluída", "aulas concluídas")} desde a sua última visita. Progresso atualizado!`, conquista: true });
    });
    return () => cancelAnimationFrame(raf);
  }, [trails]);

  const pastaIds = useMemo(() => new Set(folders.map((f) => f.id)), [folders]);
  const nomeDe = useMemo(() => new Map(folders.map((f) => [f.id, f.name])), [folders]);
  const soltas = useMemo(() => trails.filter((t) => !t.folderId || !pastaIds.has(t.folderId)), [trails, pastaIds]);

  const bancas = useMemo(() => {
    const m = new Map<string, string>();
    trails.forEach((t) => m.set(t.banca, t.bancaLabel));
    return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1], "pt-BR"));
  }, [trails]);

  const nFiltros = (situacao !== "todas" ? 1 : 0) + (materia ? 1 : 0) + (banca ? 1 : 0);
  const filtrosAtivos = !!q || nFiltros > 0;
  const casa = useCallback(
    (t: EstudoTrail, pastaNome: string) => {
      if (banca && t.banca !== banca) return false;
      const feito = isStudied(t);
      const iniciado = t.progress.done > 0;
      if (situacao === "concluidas" && !feito) return false;
      if (situacao === "andamento" && (feito || !iniciado)) return false;
      if (situacao === "novas" && (feito || iniciado)) return false;
      if (q && !`${t.title} ${t.bancaLabel} ${pastaNome}`.toLowerCase().includes(q)) return false;
      return true;
    },
    [banca, situacao, q],
  );

  const cartoes = useMemo(() => {
    const lista = folders
      .filter((f) => !materia || f.id === materia)
      .map((f) => {
        const todas = trails.filter((t) => t.folderId === f.id);
        const nomeCasa = !!q && f.name.toLowerCase().includes(q) && !banca && situacao === "todas";
        const usadas = nomeCasa ? todas : todas.filter((t) => casa(t, f.name));
        const feitas = usadas.reduce((s, t) => s + t.progress.done, 0);
        const total = usadas.reduce((s, t) => s + t.progress.total, 0);
        const recente = usadas.reduce((m, t) => (t.updatedAt > m ? t.updatedAt : m), "");
        return { f, aulas: usadas.length, pct: total ? Math.round((feitas / total) * 100) : 0, recente, mostrar: usadas.length > 0 || !filtrosAtivos || nomeCasa };
      })
      .filter((c) => c.mostrar);
    const cmp: Record<Ordem, (a: (typeof lista)[number], b: (typeof lista)[number]) => number> = {
      recentes: (a, b) => b.recente.localeCompare(a.recente),
      antigas: (a, b) => (a.recente || "~").localeCompare(b.recente || "~"),
      nome: (a, b) => a.f.name.localeCompare(b.f.name, "pt-BR"),
      progresso: (a, b) => b.pct - a.pct,
    };
    return lista.sort(cmp[ordem]);
  }, [folders, trails, q, situacao, materia, banca, ordem, casa, filtrosAtivos]);

  const soltasFiltradas = soltas.filter((t) => casa(t, "Sem pasta"));
  const mostrarSoltas = !materia && (!filtrosAtivos || soltasFiltradas.length > 0);
  const total = trails.length;
  const concluidas = trails.filter(isStudied).length;
  const limpar = () => {
    setBusca("");
    setSituacao("todas");
    setMateria("");
    setBanca("");
  };

  const abrir = useCallback((id: string, organizar?: boolean) => {
    flushSync(() => setVt(id));
    comTransicao(() => flushSync(() => setAberta({ id, organizar })));
    window.history.pushState(null, "", `?pasta=${encodeURIComponent(id)}`);
    raiz.current?.scrollIntoView({ block: "start" });
  }, []);
  const voltar = useCallback(() => {
    if (pastaDaUrl() && window.history.length > 1) return window.history.back();
    comTransicao(() => flushSync(() => setAberta(null)), () => setVt(null));
  }, []);

  const novaPasta = () => {
    setNome("");
    setCor("vermelho");
    setIcone(null);
    setJanela({ t: "nova" });
  };
  const aoAgir = useCallback(
    (acao: AcaoPasta, f: EstudoFolder) => {
      setMenu(null);
      if (acao === "abrir") return abrir(f.id);
      if (acao === "organizar") return abrir(f.id, true);
      setNome(f.name);
      setCor(f.color);
      setIcone(f.icon ?? null);
      setJanela({ t: acao, id: f.id });
    },
    [abrir],
  );

  const pastaJanela = janela && "id" in janela ? folders.find((f) => f.id === janela.id) : undefined;
  const fecha = useCallback(() => setJanela(null), []);
  const pastaAberta = aberta && aberta.id !== SOLTAS ? folders.find((f) => f.id === aberta.id) : undefined;
  const mostrandoPasta = !!aberta && (aberta.id === SOLTAS || !!pastaAberta);
  useRevelar(raiz, `${mostrandoPasta}|${cartoes.length}`);

  const avisos = (
    <>
      {erro && (
        <p role="alert" className="me-erro" data-testid="erro-pastas">
          {erro} <button type="button" onClick={() => setErro(null)}>Fechar</button>
        </p>
      )}
      {aviso && (
        <p role="status" className={`me-toast${aviso.conquista ? " me-toast-conquista" : ""}`} data-testid="aviso-pastas">
          {aviso.conquista ? <Trophy size={18} aria-hidden /> : <CircleCheck size={18} aria-hidden />} <span>{aviso.txt}</span>
          <button type="button" onClick={() => setAviso(null)} aria-label="Fechar aviso"><X size={16} aria-hidden /></button>
        </p>
      )}
    </>
  );

  if (mostrandoPasta && aberta)
    return (
      <div ref={raiz} className="me" data-testid="meu-estudo">
        {avisos}
        <PastaAberta
          key={aberta.id}
          pasta={pastaAberta ?? null}
          aulas={pastaAberta ? trails.filter((t) => t.folderId === pastaAberta.id) : soltas}
          folders={folders}
          pending={pending}
          modoInicial={aberta.organizar ? "organizar" : "ver"}
          act={act}
          onVoltar={voltar}
        />
      </div>
    );

  return (
    <div ref={raiz} className="me" data-testid="meu-estudo">
      <EstudoHero continueHref={continueHref} continueLabel={continueLabel} />

      <EstudoIndicadores total={total} concluidas={concluidas} studySeconds={studySeconds} aulasSerie={tendencia?.aulasSerie} aulasPct30={tendencia?.aulasPct30} tempoSemanas={tendencia?.tempoSemanas} tempoVariacao={tendencia?.tempoVariacao} />

      <div className="me-ferramentas">
        <button type="button" className="me-nova" onClick={novaPasta}>
          <span className="me-nova-mais"><Plus size={18} strokeWidth={3} aria-hidden /></span>
          Nova Pasta <ChevronRight size={18} aria-hidden />
        </button>
        <label className="me-busca">
          {buscando ? <LoaderCircle size={18} className="me-gira" aria-hidden /> : <Search size={18} aria-hidden />}
          <input type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar pastas, matérias ou aulas…" aria-label="Buscar pastas, matérias ou aulas" />
        </label>
        <button type="button" className="me-ajustes" aria-label={`Filtros${nFiltros ? ` (${nFiltros} aplicados)` : ""}`} aria-expanded={painel} aria-controls="me-filtros" onClick={() => setPainel(!painel)}>
          <SlidersHorizontal size={20} aria-hidden />
          {nFiltros > 0 && <b>{nFiltros}</b>}
        </button>
        <div id="me-filtros" className="me-filtros" hidden={!painel}>
          <Filtro nome="Situação" ativo={situacao !== "todas"} icone={<Layers size={16} aria-hidden />} rotulo={SITUACAO[situacao]} valor={situacao} onChange={(v) => setSituacao(v as Situacao)} opcoes={Object.entries(SITUACAO)} />
          <Filtro nome="Matéria" ativo={!!materia} icone={<BookOpen size={16} aria-hidden />} rotulo={materia ? nomeDe.get(materia) ?? "Matéria" : "Todas as pastas"} valor={materia} onChange={setMateria} opcoes={[["", "Todas as pastas"], ...folders.map((f) => [f.id, f.name] as [string, string])]} />
          <Filtro nome="Banca" ativo={!!banca} icone={<Landmark size={16} aria-hidden />} rotulo={banca ? bancas.find(([s]) => s === banca)?.[1] ?? "Banca" : "Todas as bancas"} valor={banca} onChange={setBanca} opcoes={[["", "Todas as bancas"], ...bancas]} />
          <Filtro nome="Ordenar por" icone={<Calendar size={16} aria-hidden />} rotulo={ORDEM[ordem]} valor={ordem} onChange={(v) => setOrdem(v as Ordem)} opcoes={Object.entries(ORDEM)} />
        </div>
        {filtrosAtivos && (
          <p className="me-aplicados" data-testid="filtros-aplicados">
            {plural(cartoes.length, "pasta", "pastas")} {q ? `para “${busca.trim()}”` : "com os filtros"}
            <button type="button" onClick={limpar} className="me-limpar">Limpar filtros</button>
          </p>
        )}
      </div>

      {avisos}

      {folders.length === 0 && trails.length === 0 ? (
        <div className="me-vazio" data-testid="estado-vazio">
          <PastaIcone cor="cinza" Glifo={BookOpen} className="me-vazio-pasta" />
          <h2>Você ainda não tem pastas nem estudos</h2>
          <p>Crie uma pasta para cada matéria e comece seu primeiro estudo.</p>
          <div className="me-vazio-acoes">
            <button type="button" className="me-nova me-nova-sm" onClick={novaPasta}>Criar a primeira pasta</button>
            <Link href="/nova-trilha" className="me-ghost">Começar um estudo</Link>
          </div>
        </div>
      ) : (
        <>
          {cartoes.length === 0 && (!mostrarSoltas || soltas.length === 0) ? (
            <div className="me-vazio" data-testid="sem-resultados">
              <Search size={30} aria-hidden />
              <h2>Nada encontrado</h2>
              <p>Nenhuma pasta ou aula combina com a busca e os filtros atuais.</p>
              <button type="button" onClick={limpar} className="me-ghost">Limpar filtros</button>
            </div>
          ) : (
            <div className={`me-grade${buscando ? " me-grade-buscando" : ""}`}>
              {cartoes.map(({ f, aulas, pct }, i) => (
                <PastaCard key={f.id} pasta={f} aulas={aulas} pct={pct} indice={i} menuAberto={menu === f.id} ganhou={ganhou.has(f.id)} emTransicao={vt === f.id} onMenu={setMenu} onAcao={aoAgir} />
              ))}
            </div>
          )}

          {mostrarSoltas && (
            <section
              className={`me-sem${soltas.length === 0 ? " me-sem-vazia" : ""}${ganhou.has(SOLTAS) ? " me-card-ganhou" : ""}`}
              aria-label="Aulas sem pasta"
              data-testid="sem-pasta"
              data-rev
              style={{ viewTransitionName: vt === SOLTAS ? "me-pasta-vt" : undefined } as React.CSSProperties}
            >
              <PastaIcone cor="cinza" Glifo={soltas.length === 0 ? CircleCheck : HelpCircle} className="me-sem-pasta" />
              <div className="me-sem-txt">
                <h2>Sem pasta {soltas.length > 0 && <small>{soltas.length}</small>}</h2>
                {soltas.length === 0 ? (
                  <p>Tudo organizado: nenhuma aula fora de uma pasta. Missão cumprida.</p>
                ) : (
                  <>
                    <p>Aulas que ainda não foram organizadas.</p>
                    <p className="me-sem-dica">Mantenha sua biblioteca sempre organizada.</p>
                  </>
                )}
              </div>
              {soltas.length > 0 && <button type="button" className="me-ver me-ver-sem" onClick={() => abrir(SOLTAS)}>Ver aulas <ChevronRight size={16} aria-hidden /></button>}
            </section>
          )}
        </>
      )}

      {archivedCount > 0 && <Link href="/trilhas?arquivadas=1" className="me-arquivados">Ver {archivedCount} estudo(s) arquivado(s)</Link>}

      <section className="me-rodape" aria-label="APROVUM" data-rev>
        <span className="me-rodape-alvo" aria-hidden><Target size={38} strokeWidth={1.7} /></span>
        <div className="me-rodape-txt">
          <h2>Estudo inteligente, resultados reais.</h2>
          <p>Organize suas pastas e foque no que realmente importa: a sua aprovação.</p>
        </div>
        <Link href="/desempenho" className="me-rodape-btn"><ChartColumn size={18} aria-hidden /> Ver meu desempenho <ChevronRight size={16} aria-hidden /></Link>
        <Image className="me-rodape-caveira" src="/icons/caveira-bicolor.png" alt="" width={120} height={120} loading="lazy" aria-hidden />
      </section>

      {janela?.t === "nova" && (
        <Janela titulo="Nova pasta" onClose={fecha}>
          {(fechar) => (
            <form onSubmit={(e) => { e.preventDefault(); act(() => createFolderAction(nome, cor, icone), fechar, `Pasta “${nome.trim()}” criada.`); }} className="me-form">
              <div className="me-previa" style={{ "--c": COR(cor).main, "--cd": COR(cor).dark, "--tint": COR(cor).tint } as React.CSSProperties} aria-label="Pré-visualização da pasta" data-testid="previa-pasta">
                <PastaIcone key={`${cor}${icone}`} cor={cor} Glifo={glifoDa(nome, icone)} className="me-previa-pasta" />
                <div>
                  <b>{nome.trim() || "Nome da pasta"}</b>
                  <small>0 aulas • 0% concluído</small>
                  <span className="me-barra" aria-hidden><i style={{ width: "0%" }} /></span>
                </div>
              </div>
              <label htmlFor="me-nome">Nome da pasta (ex.: a matéria)</label>
              <input id="me-nome" value={nome} onChange={(e) => setNome(e.target.value)} maxLength={80} placeholder="Direito Penal" autoComplete="off" required />
              <span className="me-rotulo">Cor</span>
              <Cores valor={cor} onChange={setCor} />
              <span className="me-rotulo">Ícone</span>
              <Icones valor={icone} onChange={setIcone} />
              <div className="me-form-acoes">
                <button type="button" className="me-ghost" onClick={fechar}>Cancelar</button>
                <button type="submit" className="me-nova me-nova-sm" disabled={pending || !nome.trim()}>{pending ? "Criando…" : "Criar Pasta"}</button>
              </div>
            </form>
          )}
        </Janela>
      )}
      {janela?.t === "renomear" && pastaJanela && (
        <Janela titulo="Renomear pasta" onClose={fecha}>
          {(fechar) => (
            <form onSubmit={(e) => { e.preventDefault(); act(() => renameFolderAction(pastaJanela.id, nome), fechar, "Pasta renomeada."); }} className="me-form">
              <label htmlFor="me-nome">Novo nome</label>
              <input id="me-nome" value={nome} onChange={(e) => setNome(e.target.value)} maxLength={80} autoComplete="off" />
              <div className="me-form-acoes">
                <button type="button" className="me-ghost" onClick={fechar}>Cancelar</button>
                <button type="submit" className="me-nova me-nova-sm" disabled={pending || !nome.trim() || nome.trim() === pastaJanela.name}>{pending ? "Salvando…" : "Salvar"}</button>
              </div>
            </form>
          )}
        </Janela>
      )}
      {janela?.t === "aparencia" && pastaJanela && (
        <Janela titulo={`Cor e ícone — ${pastaJanela.name}`} onClose={fecha}>
          {(fechar) => (
            <div className="me-form">
              <div className="me-previa" style={{ "--c": COR(cor).main, "--cd": COR(cor).dark, "--tint": COR(cor).tint } as React.CSSProperties} data-testid="previa-pasta">
                <PastaIcone key={`${cor}${icone}`} cor={cor} Glifo={glifoDa(pastaJanela.name, icone)} className="me-previa-pasta" />
                <div><b>{pastaJanela.name}</b><small>Pré-visualização</small></div>
              </div>
              <span className="me-rotulo">Cor</span>
              <Cores valor={cor} onChange={setCor} />
              <span className="me-rotulo">Ícone</span>
              <Icones valor={icone} onChange={setIcone} />
              <div className="me-form-acoes">
                <button type="button" className="me-ghost" onClick={fechar}>Cancelar</button>
                <button type="button" className="me-nova me-nova-sm" disabled={pending || (cor === pastaJanela.color && icone === (pastaJanela.icon ?? null))} onClick={() => act(() => restyleFolderAction(pastaJanela.id, cor, icone), fechar, "Aparência da pasta atualizada.")}>{pending ? "Salvando…" : "Salvar"}</button>
              </div>
            </div>
          )}
        </Janela>
      )}
      {janela?.t === "excluir" && pastaJanela && (
        <Janela titulo="Excluir pasta" onClose={fecha}>
          {(fechar) => (
            <div className="me-form">
              <p className="me-aviso">Excluir a pasta “{pastaJanela.name}”? As aulas não são apagadas: voltam para “Sem pasta”.</p>
              <div className="me-form-acoes">
                <button type="button" className="me-ghost" onClick={fechar}>Cancelar</button>
                <button type="button" className="me-excluir" disabled={pending} onClick={() => act(() => deleteFolderAction(pastaJanela.id), fechar, "Pasta excluída. As aulas foram para “Sem pasta”.")}>{pending ? "Excluindo…" : "Excluir pasta"}</button>
              </div>
            </div>
          )}
        </Janela>
      )}
    </div>
  );
}
