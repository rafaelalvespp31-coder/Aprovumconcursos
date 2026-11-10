"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState, useTransition } from "react";
import {
  BookOpen, Building2, Calculator, Calendar, ChartColumn, Check, ChevronDown, ChevronRight, CircleCheck, Clock, EllipsisVertical, FileText,
  Landmark, Layers, MessageCircle, Monitor, Plus, Scale, Search, ShieldCheck, Target, X,
} from "lucide-react";
import { callAction } from "@/components/safe-action";
import { isStudied, TrailRow, type BoardFolder, type BoardTrail } from "@/app/(app)/trilhas/folder-board";
import { createFolderAction, deleteFolderAction, recolorFolderAction, renameFolderAction, type FolderResult } from "@/app/(app)/trilhas/folder-actions";
import "./meu-estudo.css";

export interface EstudoTrail extends BoardTrail {
  banca: string;
  bancaLabel: string;
  updatedAt: string;
}
interface Props {
  folders: BoardFolder[];
  trails: EstudoTrail[];
  studySeconds: number;
  continueHref: string | null;
  continueLabel: string;
  archivedCount: number;
}

/** Paleta das pastas. "amarelo" (única cor livre do banco) é exibida como laranja, como na referência. */
export const PALETA: Record<string, { nome: string; main: string; dark: string; light: string; tint: string }> = {
  vermelho: { nome: "Vermelho", main: "#e10600", dark: "#8f0400", light: "#ff5a52", tint: "#fff1f0" },
  azul: { nome: "Azul", main: "#1d5fe8", dark: "#0b2f8f", light: "#5b93ff", tint: "#eff4ff" },
  verde: { nome: "Verde", main: "#15a34a", dark: "#0b5d29", light: "#4ade80", tint: "#effcf3" },
  amarelo: { nome: "Laranja", main: "#f97316", dark: "#b34a05", light: "#ffa65c", tint: "#fff5ec" },
  preto: { nome: "Preto", main: "#2b2b2b", dark: "#0a0a0a", light: "#6b6b6b", tint: "#f3f3f3" },
  cinza: { nome: "Cinza", main: "#8a8f98", dark: "#4b5058", light: "#c3c7cd", tint: "#f4f5f7" },
};
const COR = (c: string) => PALETA[c] ?? PALETA.vermelho!;

type Glifo = typeof Scale;
/** Ícone da matéria pelo nome da pasta (sem inventar dado: é só ilustração). */
function glifoDa(nome: string): Glifo {
  const n = nome.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  if (/(processo|policia|penal.*processual)/.test(n)) return ShieldCheck;
  if (/(penal|civil|direito|lei|legisl)/.test(n)) return Scale;
  if (/(mat|racioc|logic|estat)/.test(n)) return Calculator;
  if (/(portugu|redac|lingua|texto)/.test(n)) return MessageCircle;
  if (/(constitu|human)/.test(n)) return Landmark;
  if (/(administr|admin)/.test(n)) return Building2;
  if (/(inform|tecnolog)/.test(n)) return Monitor;
  return BookOpen;
}

function tempo(seg: number): string {
  const min = Math.floor(seg / 60);
  if (min < 1) return seg > 0 ? "< 1min" : "0min";
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h ? `${h}h ${String(m).padStart(2, "0")}min` : `${m}min`;
}
const plural = (n: number, s: string, p: string) => `${n} ${n === 1 ? s : p}`;

/** Pasta 3D (SVG) com o glifo da matéria no corpo. */
function PastaIcone({ cor, Glifo, className = "" }: { cor: string; Glifo: Glifo; className?: string }) {
  const id = useId().replace(/:/g, "");
  const c = COR(cor);
  return (
    <span className={`me-pasta ${className}`} aria-hidden>
      <svg viewBox="0 0 120 96" width="100%" height="100%">
        <defs>
          <linearGradient id={`${id}a`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={c.light} /><stop offset="1" stopColor={c.main} /></linearGradient>
          <linearGradient id={`${id}b`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={c.main} /><stop offset="1" stopColor={c.dark} /></linearGradient>
        </defs>
        <path d="M6 18a8 8 0 0 1 8-8h30c4 0 6 2 8.5 5 2 2.6 3.8 3.5 7 3.5H106a8 8 0 0 1 8 8v8H6z" fill={c.dark} />
        <rect x="6" y="26" width="108" height="62" rx="9" fill={`url(#${id}b)`} />
        <path d="M6 35a9 9 0 0 1 9-9h90a9 9 0 0 1 9 9v6H6z" fill={`url(#${id}a)`} opacity=".9" />
        <rect x="6.5" y="26.5" width="107" height="61" rx="8.5" fill="none" stroke="#fff" strokeOpacity=".28" />
      </svg>
      <Glifo className="me-pasta-glifo" strokeWidth={1.8} />
    </span>
  );
}

function Janela({ titulo, onClose, children, largo }: { titulo: string; onClose: () => void; children: React.ReactNode; largo?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    ref.current?.querySelector<HTMLElement>("input,button,select")?.focus();
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);
  return (
    <div className="me-fundo" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} className={`me-janela${largo ? " me-janela-larga" : ""}`} role="dialog" aria-modal="true" aria-label={titulo}>
        <div className="me-janela-topo">
          <h2>{titulo}</h2>
          <button type="button" onClick={onClose} aria-label="Fechar" className="me-x"><X size={18} aria-hidden /></button>
        </div>
        <div className="me-janela-corpo">{children}</div>
      </div>
    </div>
  );
}

function Cores({ valor, onChange }: { valor: string; onChange: (c: string) => void }) {
  return (
    <div className="me-cores" role="radiogroup" aria-label="Cor da pasta">
      {Object.entries(PALETA).map(([k, p]) => (
        <button key={k} type="button" role="radio" aria-checked={valor === k} aria-label={p.nome} title={p.nome} onClick={() => onChange(k)} className="me-cor" style={{ background: `linear-gradient(160deg,${p.light},${p.dark})` }}>
          {valor === k && <Check size={16} strokeWidth={3} aria-hidden />}
        </button>
      ))}
    </div>
  );
}

type Ordem = "recentes" | "antigas" | "nome" | "progresso";
type Situacao = "todas" | "andamento" | "concluidas" | "novas";
const SITUACAO: Record<Situacao, string> = { todas: "Todas", andamento: "Em andamento", concluidas: "Concluídas", novas: "Não iniciadas" };
const ORDEM: Record<Ordem, string> = { recentes: "Mais recentes", antigas: "Mais antigas", nome: "Nome (A–Z)", progresso: "Maior progresso" };

function Filtro({ nome, icone, rotulo, valor, onChange, opcoes, ativo, escuro }: { nome: string; icone: React.ReactNode; rotulo: string; valor: string; onChange: (v: string) => void; opcoes: Array<[string, string]>; ativo?: boolean; escuro?: boolean }) {
  return (
    <label className={`me-filtro${escuro || ativo ? " me-filtro-escuro" : ""}`}>
      {icone}
      <span className="me-filtro-txt">{rotulo}</span>
      <ChevronDown size={15} aria-hidden />
      <select value={valor} onChange={(e) => onChange(e.target.value)} aria-label={nome}>
        {opcoes.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </label>
  );
}

export function MeuEstudo({ folders, trails, studySeconds, continueHref, continueLabel, archivedCount }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [situacao, setSituacao] = useState<Situacao>("todas");
  const [materia, setMateria] = useState("");
  const [banca, setBanca] = useState("");
  const [ordem, setOrdem] = useState<Ordem>("recentes");
  const [janela, setJanela] = useState<null | { t: "nova" } | { t: "renomear" | "cor" | "excluir" | "aulas"; id: string }>(null);
  const [menu, setMenu] = useState<string | null>(null);
  const [nome, setNome] = useState("");
  const [cor, setCor] = useState("vermelho");

  const act = (fn: () => Promise<FolderResult>, after?: () => void) =>
    start(async () => {
      const r = await callAction(fn, setErro);
      if (!r) return;
      if (!r.ok) return setErro(r.error ?? "Erro.");
      setErro(null);
      after?.();
      router.refresh();
    });

  useEffect(() => {
    if (!menu) return;
    const fecha = (e: Event) => {
      if (!(e.target as HTMLElement).closest?.("[data-me-menu]")) setMenu(null);
    };
    document.addEventListener("pointerdown", fecha);
    return () => document.removeEventListener("pointerdown", fecha);
  }, [menu]);

  const pastaIds = useMemo(() => new Set(folders.map((f) => f.id)), [folders]);
  const nomeDe = useMemo(() => new Map(folders.map((f) => [f.id, f.name])), [folders]);
  const soltas = trails.filter((t) => !t.folderId || !pastaIds.has(t.folderId));

  const bancas = useMemo(() => {
    const m = new Map<string, string>();
    trails.forEach((t) => m.set(t.banca, t.bancaLabel));
    return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1], "pt-BR"));
  }, [trails]);

  const q = busca.trim().toLowerCase();
  const filtrosAtivos = !!(q || situacao !== "todas" || materia || banca);
  const casa = (t: EstudoTrail, pastaNome: string) => {
    if (banca && t.banca !== banca) return false;
    const feito = isStudied(t);
    const iniciado = t.progress.done > 0;
    if (situacao === "concluidas" && !feito) return false;
    if (situacao === "andamento" && (feito || !iniciado)) return false;
    if (situacao === "novas" && (feito || iniciado)) return false;
    if (q) {
      const palheiro = `${t.title} ${t.bancaLabel} ${pastaNome}`.toLowerCase();
      if (!palheiro.includes(q)) return false;
    }
    return true;
  };

  const cartoes = useMemo(() => {
    const lista = folders
      .filter((f) => !materia || f.id === materia)
      .map((f) => {
        const todas = trails.filter((t) => t.folderId === f.id);
        const filtradas = todas.filter((t) => casa(t, f.name));
        const nomeCasa = !!q && f.name.toLowerCase().includes(q) && !banca && situacao === "todas";
        const usadas = nomeCasa ? todas : filtradas;
        const feitas = usadas.reduce((s, t) => s + t.progress.done, 0);
        const total = usadas.reduce((s, t) => s + t.progress.total, 0);
        const recente = usadas.reduce((m, t) => (t.updatedAt > m ? t.updatedAt : m), "");
        return { f, usadas, pct: total ? Math.round((feitas / total) * 100) : 0, recente, mostrar: usadas.length > 0 || (!filtrosAtivos || nomeCasa) };
      })
      .filter((c) => c.mostrar);
    const cmp: Record<Ordem, (a: (typeof lista)[number], b: (typeof lista)[number]) => number> = {
      recentes: (a, b) => b.recente.localeCompare(a.recente) || 0,
      antigas: (a, b) => (a.recente || "~").localeCompare(b.recente || "~"),
      nome: (a, b) => a.f.name.localeCompare(b.f.name, "pt-BR"),
      progresso: (a, b) => b.pct - a.pct,
    };
    return lista.sort(cmp[ordem]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [folders, trails, q, situacao, materia, banca, ordem]);

  const soltasFiltradas = soltas.filter((t) => casa(t, "Sem pasta"));
  const mostrarSoltas = !materia && (!filtrosAtivos || soltasFiltradas.length > 0);

  const total = trails.length;
  const concluidas = trails.filter(isStudied).length;
  const pct = total ? Math.round((concluidas / total) * 100) : 0;
  const limpar = () => {
    setBusca("");
    setSituacao("todas");
    setMateria("");
    setBanca("");
  };
  const pastaAberta = janela && "id" in janela ? folders.find((f) => f.id === janela.id) : undefined;
  const fecha = () => setJanela(null);

  return (
    <div className="me" data-testid="meu-estudo">
      <section className="me-hero" aria-labelledby="me-titulo">
        <div className="me-hero-txt">
          <span className="me-hero-barra" aria-hidden />
          <div>
            <h1 id="me-titulo">Minhas <span>Pastas</span></h1>
            <p>Organize seus estudos e acompanhe seu progresso</p>
            {continueHref && <Link href={continueHref} className="me-continuar">{continueLabel} <ChevronRight size={15} aria-hidden /></Link>}
          </div>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="me-hero-arte" src="/estudo/hero-operador.webp" alt="" width={672} height={208} decoding="async" fetchPriority="high" />
        <span className="me-hero-faixa" aria-hidden />
      </section>

      <div className="me-indicadores" data-mv-grupo>
        <div className="me-kpi" data-testid="kpi-total">
          <span className="me-kpi-ico me-kpi-rosa"><BookOpen size={26} aria-hidden /></span>
          <div><b>{total}</b><small>{total === 1 ? "Aula no total" : "Aulas no total"}</small></div>
        </div>
        <div className="me-kpi" data-testid="kpi-concluidas">
          <span className="me-kpi-anel" style={{ "--p": pct } as React.CSSProperties} aria-hidden><CircleCheck size={22} /></span>
          <div className="me-kpi-meio">
            <b>{concluidas}</b><small>{concluidas === 1 ? "Concluída" : "Concluídas"}</small>
            <span className="me-kpi-barra" aria-hidden><i style={{ width: `${pct}%` }} /></span>
          </div>
          <span className="me-kpi-pct">{pct}%</span>
        </div>
        <div className="me-kpi" data-testid="kpi-tempo">
          <span className="me-kpi-ico me-kpi-cinza"><Clock size={26} aria-hidden /></span>
          <div><b>{tempo(studySeconds)}</b><small>Tempo de estudo</small></div>
        </div>
        <button type="button" className="me-nova" onClick={() => { setNome(""); setCor("vermelho"); setJanela({ t: "nova" }); }}>
          <span className="me-nova-mais"><Plus size={18} aria-hidden /></span>
          Nova Pasta <ChevronRight size={18} aria-hidden />
        </button>
      </div>

      <div className="me-ferramentas">
        <label className="me-busca">
          <Search size={18} aria-hidden />
          <input type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar pastas, matérias ou aulas…" aria-label="Buscar pastas, matérias ou aulas" />
        </label>
        <div className="me-filtros">
          <Filtro nome="Situação" escuro={situacao === "todas"} ativo={situacao !== "todas"} icone={<Layers size={16} aria-hidden />} rotulo={SITUACAO[situacao]} valor={situacao} onChange={(v) => setSituacao(v as Situacao)} opcoes={Object.entries(SITUACAO)} />
          <Filtro nome="Matéria" ativo={!!materia} icone={<BookOpen size={16} aria-hidden />} rotulo={materia ? nomeDe.get(materia) ?? "Matéria" : "Matéria"} valor={materia} onChange={setMateria} opcoes={[["", "Todas as matérias"], ...folders.map((f) => [f.id, f.name] as [string, string])]} />
          <Filtro nome="Banca" ativo={!!banca} icone={<Landmark size={16} aria-hidden />} rotulo={banca ? bancas.find(([s]) => s === banca)?.[1] ?? "Banca" : "Banca"} valor={banca} onChange={setBanca} opcoes={[["", "Todas as bancas"], ...bancas]} />
          <Filtro nome="Ordenar por" icone={<Calendar size={16} aria-hidden />} rotulo={ORDEM[ordem]} valor={ordem} onChange={(v) => setOrdem(v as Ordem)} opcoes={Object.entries(ORDEM)} />
        </div>
        {filtrosAtivos && <button type="button" onClick={limpar} className="me-limpar">Limpar filtros</button>}
      </div>

      {erro && (
        <p role="alert" className="me-erro" data-testid="erro-pastas">
          {erro} <button type="button" onClick={() => setErro(null)}>Fechar</button>
        </p>
      )}

      {folders.length === 0 && trails.length === 0 ? (
        <div className="me-vazio" data-testid="estado-vazio">
          <PastaIcone cor="cinza" Glifo={BookOpen} className="me-vazio-pasta" />
          <h2>Você ainda não tem pastas nem estudos</h2>
          <p>Crie uma pasta para cada matéria e comece seu primeiro estudo.</p>
          <div className="me-vazio-acoes">
            <button type="button" className="me-nova" onClick={() => { setNome(""); setCor("vermelho"); setJanela({ t: "nova" }); }}>Criar a primeira pasta</button>
            <Link href="/nova-trilha" className="me-ghost">Começar um estudo</Link>
          </div>
        </div>
      ) : (
        <>
          {cartoes.length === 0 && (!mostrarSoltas || soltas.length === 0) ? (
            <div className="me-vazio" data-testid="sem-resultados">
              <h2>Nada encontrado</h2>
              <p>Nenhuma pasta ou aula combina com a busca e os filtros atuais.</p>
              <button type="button" onClick={limpar} className="me-ghost">Limpar filtros</button>
            </div>
          ) : (
            <div className="me-grade" data-mv-grupo>
              {cartoes.map(({ f, usadas, pct: p }) => {
                const c = COR(f.color);
                const G = glifoDa(f.name);
                return (
                  <article key={f.id} className="me-card" id={`pasta-${f.id}`} style={{ "--c": c.main, "--cd": c.dark, "--tint": c.tint } as React.CSSProperties} aria-label={`Pasta ${f.name}`} data-testid="card-pasta">
                    <G className="me-card-marca" strokeWidth={1.2} aria-hidden />
                    <button type="button" className="me-card-area" onClick={() => setJanela({ t: "aulas", id: f.id })} aria-label={`Abrir a pasta ${f.name}`} />
                    <PastaIcone cor={f.color} Glifo={G} className="me-card-pasta" />
                    <div className="me-card-info">
                      <h3>{f.name}</h3>
                      <p><BookOpen size={15} aria-hidden /> {plural(usadas.length, "aula", "aulas")} <i aria-hidden>•</i> {p}% concluído</p>
                      <span className="me-barra" role="progressbar" aria-valuenow={p} aria-valuemin={0} aria-valuemax={100} aria-label={`${p}% concluído`}><i style={{ width: `${p}%` }} /></span>
                    </div>
                    <button type="button" className="me-ver" onClick={() => setJanela({ t: "aulas", id: f.id })}>Ver aulas <ChevronRight size={16} aria-hidden /></button>
                    <div className="me-menu" data-me-menu>
                      <button type="button" className="me-mais" aria-label={`Ações da pasta ${f.name}`} aria-haspopup="menu" aria-expanded={menu === f.id} onClick={() => setMenu(menu === f.id ? null : f.id)}>
                        <EllipsisVertical size={20} aria-hidden />
                      </button>
                      {menu === f.id && (
                        <div className="me-menu-lista" role="menu">
                          <button role="menuitem" type="button" onClick={() => { setNome(f.name); setJanela({ t: "renomear", id: f.id }); setMenu(null); }}>Renomear pasta</button>
                          <button role="menuitem" type="button" onClick={() => { setCor(f.color); setJanela({ t: "cor", id: f.id }); setMenu(null); }}>Alterar cor</button>
                          <button role="menuitem" type="button" onClick={() => { setJanela({ t: "aulas", id: f.id }); setMenu(null); }}>Organizar aulas</button>
                          <button role="menuitem" type="button" className="me-perigo" onClick={() => { setJanela({ t: "excluir", id: f.id }); setMenu(null); }}>Excluir pasta</button>
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {mostrarSoltas && (
            <section className={`me-sem${soltas.length === 0 ? " me-sem-vazia" : ""}`} aria-label="Aulas sem pasta" data-testid="sem-pasta">
              <PastaIcone cor="cinza" Glifo={FileText} className="me-sem-pasta" />
              <div className="me-sem-txt">
                <h2>Sem pasta {soltas.length > 0 && <small>{soltas.length}</small>}</h2>
                {soltas.length === 0 ? (
                  <p>Tudo organizado: nenhuma aula fora de uma pasta.</p>
                ) : (
                  <>
                    <p>Aulas que ainda não foram organizadas.</p>
                    <p className="me-sem-dica">Mantenha sua biblioteca sempre organizada para estudar com mais foco.</p>
                  </>
                )}
              </div>
              {soltas.length > 0 && <button type="button" className="me-ver me-ver-sem" onClick={() => setJanela({ t: "aulas", id: "__soltas" })}><FileText size={16} aria-hidden /> Ver aulas <ChevronRight size={16} aria-hidden /></button>}
            </section>
          )}
        </>
      )}

      {archivedCount > 0 && <Link href="/trilhas?arquivadas=1" className="me-arquivados">Ver {archivedCount} estudo(s) arquivado(s)</Link>}

      <section className="me-rodape" aria-label="APROVUM">
        <span className="me-rodape-alvo" aria-hidden><Target size={40} strokeWidth={1.6} /></span>
        <div>
          <h2>Estudo inteligente, resultados reais.</h2>
          <p>Organize suas pastas e foque no que realmente importa: a sua aprovação.</p>
        </div>
        <Link href="/desempenho" className="me-rodape-btn"><ChartColumn size={18} aria-hidden /> Ver meu desempenho <ChevronRight size={16} aria-hidden /></Link>
      </section>

      {janela?.t === "nova" && (
        <Janela titulo="Nova pasta" onClose={fecha}>
          <form onSubmit={(e) => { e.preventDefault(); act(() => createFolderAction(nome, cor), fecha); }} className="me-form">
            <label htmlFor="me-nome">Nome da pasta (ex.: a matéria)</label>
            <input id="me-nome" value={nome} onChange={(e) => setNome(e.target.value)} maxLength={80} placeholder="Direito Penal" autoComplete="off" />
            <span className="me-rotulo">Cor</span>
            <Cores valor={cor} onChange={setCor} />
            <div className="me-form-acoes">
              <button type="button" className="me-ghost" onClick={fecha}>Cancelar</button>
              <button type="submit" className="me-nova me-nova-sm" disabled={pending || !nome.trim()}>{pending ? "Criando…" : "Criar pasta"}</button>
            </div>
          </form>
        </Janela>
      )}
      {janela?.t === "renomear" && pastaAberta && (
        <Janela titulo="Renomear pasta" onClose={fecha}>
          <form onSubmit={(e) => { e.preventDefault(); act(() => renameFolderAction(pastaAberta.id, nome), fecha); }} className="me-form">
            <label htmlFor="me-nome">Novo nome</label>
            <input id="me-nome" value={nome} onChange={(e) => setNome(e.target.value)} maxLength={80} autoComplete="off" />
            <div className="me-form-acoes">
              <button type="button" className="me-ghost" onClick={fecha}>Cancelar</button>
              <button type="submit" className="me-nova me-nova-sm" disabled={pending || !nome.trim() || nome.trim() === pastaAberta.name}>{pending ? "Salvando…" : "Salvar"}</button>
            </div>
          </form>
        </Janela>
      )}
      {janela?.t === "cor" && pastaAberta && (
        <Janela titulo={`Cor da pasta ${pastaAberta.name}`} onClose={fecha}>
          <div className="me-form">
            <Cores valor={cor} onChange={setCor} />
            <div className="me-form-acoes">
              <button type="button" className="me-ghost" onClick={fecha}>Cancelar</button>
              <button type="button" className="me-nova me-nova-sm" disabled={pending || cor === pastaAberta.color} onClick={() => act(() => recolorFolderAction(pastaAberta.id, cor), fecha)}>{pending ? "Salvando…" : "Salvar cor"}</button>
            </div>
          </div>
        </Janela>
      )}
      {janela?.t === "excluir" && pastaAberta && (
        <Janela titulo="Excluir pasta" onClose={fecha}>
          <div className="me-form">
            <p className="me-aviso">Excluir a pasta “{pastaAberta.name}”? As aulas não são apagadas: voltam para “Sem pasta”.</p>
            <div className="me-form-acoes">
              <button type="button" className="me-ghost" onClick={fecha}>Cancelar</button>
              <button type="button" className="me-excluir" disabled={pending} onClick={() => act(() => deleteFolderAction(pastaAberta.id), fecha)}>{pending ? "Excluindo…" : "Excluir pasta"}</button>
            </div>
          </div>
        </Janela>
      )}
      {janela?.t === "aulas" && (pastaAberta || janela.id === "__soltas") && (
        <Janela titulo={pastaAberta ? pastaAberta.name : "Sem pasta"} onClose={fecha} largo>
          {(() => {
            const lista = pastaAberta ? trails.filter((t) => t.folderId === pastaAberta.id) : soltas;
            if (lista.length === 0)
              return <p className="me-aviso">Nenhuma aula aqui ainda. Em qualquer aula, use “Mover para…” para colocá-la nesta pasta.</p>;
            return (
              <ol className="me-lista" data-testid="lista-aulas">
                {lista.map((t, i) => (
                  <TrailRow key={t.id} trail={t} folders={folders} pending={pending} act={act} order={pastaAberta ? { i, total: lista.length } : undefined} />
                ))}
              </ol>
            );
          })()}
        </Janela>
      )}
    </div>
  );
}
