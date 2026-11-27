"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useOptimistic, useState, useTransition } from "react";
import { ArrowRight, Check, Crosshair, Plus } from "lucide-react";
import type { CentralMissoes } from "@/server/services/central-missoes";

type Props = CentralMissoes & { action: (id: string | null) => Promise<{ ok: boolean }> };

export function CentralMissoesView({ cards, selecionado, limite, action }: Props) {
  const [sel, setSel] = useOptimistic<string | null, string | null>(selecionado, (_, n) => n);
  const router = useRouter();
  const [pend, start] = useTransition();
  const [erro, setErro] = useState(false);
  const total = cards.length;
  const cheio = total >= limite;
  const atual = cards.find((c) => c.id === sel) ?? null;

  // Clicar no concurso o seleciona (salvo) e abre a página com todas as matérias do edital.
  const abrir = (c: CentralMissoes["cards"][number]) => {
    setErro(false);
    start(async () => {
      setSel(c.id);
      const r = await action(c.id);
      if (!r.ok) setErro(true);
    });
    router.push(c.href);
  };

  return (
    <section className="cm" aria-labelledby="cm-titulo" data-testid="central-missoes">
      <div className="cm-arte" aria-hidden />
      <header className="cm-topo">
        <div className="cm-intro">
          <p className="cm-kicker"><Crosshair aria-hidden /> CENTRAL DE MISSÕES</p>
          <h2 id="cm-titulo" className="cm-titulo">SELECIONE SEU <em>CONCURSO</em></h2>
          <p className="cm-desc">Escolha a carreira que vai conquistar e continue sua jornada rumo à aprovação.</p>
        </div>
        <div className="cm-ativos" aria-label={`Concursos ativos: ${total} de ${limite}`}>
          <span className="cm-ativos-k">CONCURSOS ATIVOS</span>
          <span className="cm-ativos-n"><b>{total}</b>/{limite}</span>
          <span className="cm-barra"><i style={{ width: `${Math.min(100, (total / limite) * 100)}%` }} /></span>
        </div>
      </header>

      <ul className="cm-lista">
        {cards.map((c, i) => {
          const on = sel === c.id;
          return (
            <li key={c.id} style={{ ["--i" as string]: i }}>
              <button type="button" className="cm-card" data-of={c.foto?.startsWith("/orgs/") ? 1 : undefined} data-on={on ? 1 : undefined} aria-pressed={on} onClick={() => abrir(c)} aria-label={`Abrir matérias de ${c.nome}`}>
                <span className="cm-foto" style={c.foto ? { backgroundImage: `url(${c.foto})` } : undefined} data-sem={c.foto ? undefined : 1} data-of={c.foto?.startsWith("/orgs/") ? 1 : undefined} aria-hidden />
                {on && <span className="cm-selo" aria-hidden><Check /></span>}
                <span className="cm-info">
                  <span className="cm-sigla">{c.sigla}</span>
                  <span className="cm-prog">
                    <span className="cm-prog-t">{c.pct === null ? "Em análise" : "Progresso"}</span>
                    <span className="cm-prog-v">{c.pct === null ? "—" : `${c.pct}%`}</span>
                    <span className="cm-barra"><i style={{ width: `${c.pct ?? 0}%` }} /></span>
                  </span>
                </span>
                <span className="cm-seta" aria-hidden><ArrowRight /></span>
              </button>
            </li>
          );
        })}
        <li style={{ ["--i" as string]: cards.length }}>
          {cheio ? (
            <span className="cm-novo" aria-disabled="true" title={`Limite de ${limite} concursos atingido`}>
              <Plus aria-hidden /><span>LIMITE ATINGIDO</span>
            </span>
          ) : (
            <Link href="/concursos" className="cm-novo" prefetch={false}>
              <Plus aria-hidden /><span>ADICIONAR NOVO CONCURSO</span>
            </Link>
          )}
        </li>
      </ul>

      <footer className="cm-rodape">
        <p className="cm-foco">FOCO TOTAL NA <em>SUA APROVAÇÃO</em></p>
        {atual ? (
          <Link href={atual.href} className="cm-go" aria-busy={pend}>VAMOS ESTUDAR <span aria-hidden>»</span></Link>
        ) : (
          <span className="cm-go" aria-disabled="true">VAMOS ESTUDAR <span aria-hidden>»</span></span>
        )}
      </footer>
      {erro && <p className="cm-erro" role="alert">Não foi possível salvar sua seleção agora. Tente de novo.</p>}
    </section>
  );
}

export function CentralMissoesSkeleton() {
  return (
    <section className="cm cm-sk" aria-busy="true" aria-label="Carregando Central de Missões">
      <div className="cm-topo"><div className="cm-intro"><i className="cm-sk-l" style={{ width: 160 }} /><i className="cm-sk-l" style={{ width: 300, height: 30 }} /><i className="cm-sk-l" style={{ width: 360 }} /></div></div>
      <ul className="cm-lista">{Array.from({ length: 6 }, (_, i) => <li key={i}><i className="cm-sk-c" /></li>)}</ul>
      <div className="cm-rodape"><i className="cm-sk-l" style={{ width: 280, height: 26 }} /></div>
    </section>
  );
}
