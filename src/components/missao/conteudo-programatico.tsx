"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ChevronDown, FileText, Loader2, RefreshCw, Search, ShieldCheck, TriangleAlert } from "lucide-react";
import type { ConteudoProgramatico as Conteudo } from "@/server/services/edital";
import "./conteudo-programatico.css";

type Resultado = { ok: true; destino: string } | { ok: false; error: string };

export interface ConteudoProgramaticoProps {
  conteudo: Conteudo;
  /** A leitura deste edital está em andamento (releitura): a página acompanha até terminar. */
  lendo: boolean;
  /** O especialista (Gemini) está configurado no servidor. */
  especialista: boolean;
  montar: (nome: string, editalId: string) => Promise<Resultado>;
  refazer: (editalId: string) => Promise<{ ok: true } | { ok: false; error: string }>;
}

const sem = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const n = (v: number) => v.toLocaleString("pt-BR");

/** O conteúdo programático completo do edital, separado por matéria e tópico, antes de o plano de estudo ser montado. */
export function ConteudoProgramatico({ conteudo: c, lendo, especialista, montar, refazer }: ConteudoProgramaticoProps) {
  const router = useRouter();
  const [busca, setBusca] = useState("");
  const [fechadas, setFechadas] = useState<Set<string>>(new Set());
  const [montando, setMontando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [releitura, setReleitura] = useState(lendo);
  const [progresso, setProgresso] = useState<string | null>(null);
  const rodada = useRef(0);
  useEffect(() => () => { rodada.current++; }, []);

  const totalTopicos = useMemo(() => c.disciplinas.reduce((t, d) => t + d.topicos.length, 0), [c.disciplinas]);
  const q = sem(busca.trim());
  const visiveis = useMemo(
    () => c.disciplinas.map((d) => ({ ...d, achados: q ? d.topicos.filter((t) => sem(`${t.codigo ?? ""} ${t.titulo}`).includes(q) || sem(d.nome).includes(q)) : d.topicos })).filter((d) => !q || d.achados.length > 0),
    [c.disciplinas, q],
  );
  const alternar = (id: string) => setFechadas((a) => { const b = new Set(a); if (b.has(id)) b.delete(id); else b.add(id); return b; });

  const montarPlano = async () => {
    if (montando) return;
    setErro(null);
    setMontando(true);
    const r = await montar(c.titulo, c.id).catch((): Resultado => ({ ok: false, error: "Sem conexão. Tente de novo." }));
    if (!r.ok) { setMontando(false); setErro(r.error); return; }
    router.push(r.destino);
  };

  /** Acompanha a releitura do especialista chamada a chamada (o servidor executa uma etapa por vez). */
  const acompanhar = useCallback(async () => {
    const minha = ++rodada.current;
    setReleitura(true);
    setErro(null);
    try {
      let ultimo = 0;
      for (let i = 0; i < 150; i++) {
        const r = await fetch(`/api/edital/${c.id}/avancar?depois=${ultimo}`, { method: "POST" });
        const j = (await r.json().catch(() => ({}))) as { prep?: { status: string; error: string | null }; events?: Array<{ id: number; message: string }>; error?: string };
        if (rodada.current !== minha) return;
        if (!r.ok || !j.prep) throw new Error(j.error ?? "Falha na comunicação.");
        for (const e of j.events ?? []) { ultimo = Math.max(ultimo, e.id); setProgresso(e.message); }
        if (["recebendo", "lendo", "identificando", "mapeando", "organizando"].includes(j.prep.status)) continue;
        if (j.prep.status === "concluido") { setReleitura(false); router.refresh(); return; }
        throw new Error(j.prep.error ?? "Não foi possível ler o edital. Abra a conferência do edital.");
      }
      throw new Error("A leitura está demorando mais que o normal. Tente de novo.");
    } catch (e) {
      if (rodada.current !== minha) return;
      setReleitura(false);
      setErro((e as Error).message);
    }
  }, [c.id, router]);

  useEffect(() => {
    if (!lendo) return;
    const t = setTimeout(() => void acompanhar(), 0);
    return () => clearTimeout(t);
  }, [lendo, acompanhar]);

  const refazerLeitura = async () => {
    setErro(null);
    const r = await refazer(c.id).catch(() => ({ ok: false as const, error: "Sem conexão. Tente de novo." }));
    if (!r.ok) return setErro(r.error);
    void acompanhar();
  };

  const pct = c.cobertura !== null ? Math.round(c.cobertura * 100) : null;
  const confere = c.leitor === "gemini" && pct !== null;

  return (
    <main className="cp">
      <header className="cp-topo">
        <Link href="/painel" className="cp-voltar"><ArrowLeft size={16} aria-hidden /> Voltar</Link>
        {/* eslint-disable-next-line @next/next/no-img-element -- logo oficial, versão para fundo escuro */}
        <img className="cp-logo" src="/images/aprovum-login-logo.png" alt="Aprovum" width={523} height={107} />
      </header>

      <section className="cp-cab">
        <p className="cp-kicker">CONTEÚDO PROGRAMÁTICO</p>
        <h1 className="cp-titulo">{c.titulo}</h1>
        <p className="cp-meta">
          {[c.cargo, c.banca, c.ano ? String(c.ano) : null].filter(Boolean).join(" · ")}
          {c.secao && <span> · págs. {c.secao[0]}–{c.secao[1]} do edital</span>}
        </p>
        <dl className="cp-numeros">
          <div><dt>Matérias</dt><dd>{n(c.disciplinas.length)}</dd></div>
          <div><dt>Tópicos</dt><dd>{n(totalTopicos)}</dd></div>
          {pct !== null && <div><dt>Texto classificado</dt><dd>{pct}%</dd></div>}
        </dl>
        <p className="cp-leitor" data-nivel={confere ? (pct! >= 90 ? "ok" : "atencao") : "atencao"} role="status">
          {confere ? <ShieldCheck size={16} aria-hidden /> : <TriangleAlert size={16} aria-hidden />}
          <span>
            {confere
              ? `Lido pelo especialista Gemini; cada tópico foi conferido no texto do edital e ${pct}% do conteúdo programático virou tópico.`
              : "Leitura estrutural (por regras): pode ter deixado matérias ou tópicos de fora. Confira abaixo com o edital."}
          </span>
        </p>
        {c.leitor !== "gemini" && especialista && !releitura && (
          <button type="button" className="cp-sec" onClick={() => void refazerLeitura()}><RefreshCw size={15} aria-hidden /> Reler com o especialista</button>
        )}
        {releitura && (
          <p className="cp-progresso" role="status" aria-live="polite"><Loader2 size={15} className="cp-gira" aria-hidden /> {progresso ?? "O especialista está lendo o edital completo…"}</p>
        )}
        {c.avisos.length > 0 && (
          <ul className="cp-avisos">{c.avisos.map((a, i) => <li key={i}>{a}</li>)}</ul>
        )}
        {erro && <p className="cp-erro" role="alert">{erro}</p>}
      </section>

      <div className="cp-ferramentas">
        <label className="cp-busca">
          <Search size={16} aria-hidden />
          <span className="cp-so-leitor">Buscar matéria ou tópico</span>
          <input type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar matéria ou tópico" autoComplete="off" />
        </label>
        <div className="cp-acoes">
          <button type="button" className="cp-link" onClick={() => setFechadas(new Set())}>Abrir todas</button>
          <button type="button" className="cp-link" onClick={() => setFechadas(new Set(c.disciplinas.map((d) => d.id)))}>Recolher todas</button>
        </div>
      </div>

      <nav className="cp-indice" aria-label="Ir para a matéria">
        {visiveis.map((d, i) => <a key={d.id} href={`#m-${d.id}`} className="cp-chip" title={d.nome}>{i + 1}. {d.nome}</a>)}
      </nav>

      <div className="cp-lista" aria-busy={releitura}>
        {visiveis.length === 0 && <p className="cp-vazio">Nada encontrado para “{busca}”.</p>}
        {visiveis.map((d) => {
          const aberta = !!q || !fechadas.has(d.id);
          const indice = c.disciplinas.findIndex((x) => x.id === d.id) + 1;
          return (
            <section key={d.id} id={`m-${d.id}`} className="cp-materia" data-aberta={aberta || undefined}>
              <h2>
                <button type="button" aria-expanded={aberta} aria-controls={`t-${d.id}`} onClick={() => alternar(d.id)} disabled={!!q}>
                  <span className="cp-num" aria-hidden>{indice}</span>
                  <span className="cp-nome">{d.nome}</span>
                  <span className="cp-qtd">{q ? `${d.achados.length} de ${d.topicos.length}` : d.topicos.length} {d.topicos.length === 1 ? "tópico" : "tópicos"}</span>
                  <ChevronDown size={16} aria-hidden className="cp-seta" />
                </button>
              </h2>
              {aberta && (
                <ol id={`t-${d.id}`} className="cp-topicos">
                  {d.achados.map((t, i) => (
                    <li key={i} style={{ paddingLeft: `${(Math.min(t.nivel, 5) - 1) * 16}px` }} data-nivel={Math.min(t.nivel, 5)}>
                      {t.codigo && <b>{t.codigo}</b>}<span>{t.titulo}</span>
                    </li>
                  ))}
                  {d.achados.length === 0 && <li className="cp-vazio">Esta matéria não tem tópicos lidos.</li>}
                </ol>
              )}
            </section>
          );
        })}
      </div>

      {c.naoClassificados.length > 0 && (
        <details className="cp-nao">
          <summary><TriangleAlert size={15} aria-hidden /> {c.naoClassificados.length} {c.naoClassificados.length === 1 ? "trecho do edital ficou" : "trechos do edital ficaram"} sem classificação</summary>
          <p>O leitor não conseguiu transformar estes pedaços do conteúdo programático em tópicos. Confira no PDF se falta algo:</p>
          <ul>{c.naoClassificados.map((t, i) => <li key={i}><FileText size={13} aria-hidden /> {t}</li>)}</ul>
        </details>
      )}

      <div className="cp-barra">
        <div className="cp-barra-in">
          <Link href="/painel" className="cp-sec">Anexar outro edital</Link>
          <button type="button" className="cp-primario" onClick={() => void montarPlano()} disabled={montando || releitura || c.disciplinas.length === 0} data-testid="conteudo-montar-plano">
            {montando ? <><Loader2 size={16} className="cp-gira" aria-hidden /> Montando…</> : "Montar meu plano de estudo"}
          </button>
        </div>
      </div>
    </main>
  );
}
