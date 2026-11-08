"use client";

import Link from "next/link";
import { useState } from "react";
import { StartStudyDialog, type StartTheme } from "@/app/(app)/nova-trilha/start-dialog";
import type { PreparationTree } from "@/server/services/edital-view";
import { AulasEdital } from "./aulas-edital";
import { CardEdital } from "./card-edital";
import { VisaoGeral } from "./visao-geral";
import "./aprovum-ai.css";

export type PrepTab = "visao" | "aulas" | "raiox" | "questoes" | "desempenho";
const TABS: Array<[PrepTab, string]> = [["visao", "VISÃO GERAL"], ["aulas", "AULAS DO EDITAL"], ["raiox", "RAIO-X DO EDITAL"], ["questoes", "QUESTÕES"], ["desempenho", "DESEMPENHO"]];

export function MeuConcurso({ tree, save, start, tab, editing = false, children }: { tree: PreparationTree; save: (f: FormData) => Promise<void>; start: (s: { error?: string }) => Promise<{ error?: string }>; tab: PrepTab; editing?: boolean; children?: React.ReactNode }) {
  const { prep, disciplines, totals } = tree;
  const [theme, setTheme] = useState<StartTheme | null>(null);

  return (
    <div className="ai-root mx-auto grid w-full gap-4" data-testid="meu-concurso">
      <CardEdital tree={tree} save={save} start={start} editing={editing} />

      <nav className="ai-tabs" aria-label="Seções da preparação">
        {TABS.map(([k, label]) => <Link key={k} href={`/meu-concurso/${prep.id}?aba=${k}`} replace aria-current={tab === k ? "page" : undefined}>{label}</Link>)}
      </nav>

      {tab === "visao" && <VisaoGeral tree={tree} />}

      {tab === "questoes" && (
        <section className="ai-rx" aria-label="Questões">
          <h3>Questões</h3>
          <p className="ai-sub">Você respondeu <b>{totals.questionsAnswered}</b> questões nas aulas desta preparação (Modo Jogo).</p>
          <Link href="/questoes" className="ai-go" style={{ textAlign: "center", lineHeight: "48px", display: "block" }}>ABRIR CADERNOS DE QUESTÕES</Link>
          <Link href="/quiz" className="ai-ghost" style={{ textAlign: "center", lineHeight: "44px" }}>Modo Jogo</Link>
        </section>
      )}

      {tab === "desempenho" && (
        <section className="ai-rx" aria-label="Desempenho">
          <h3>Desempenho nesta preparação</h3>
          <p className="ai-sub">{totals.done} de {totals.topics} tópicos concluídos ({totals.pct}%) · {totals.lessonsDone} de {totals.lessonsAvailable} aulas concluídas. Só conta o que você realmente estudou.</p>
          <div className="ai-list" style={{ marginTop: 0 }}>
            {disciplines.map((d) => (
              <div key={d.id} className="ai-item"><div><b>{d.name}</b><small>{d.doneCount} de {d.topics.length} tópicos</small></div><span className="ai-pill">{d.pct}%</span></div>
            ))}
          </div>
          <Link href="/desempenho" className="ai-ghost" style={{ textAlign: "center", lineHeight: "44px" }}>Ver desempenho geral</Link>
        </section>
      )}

      {tab === "raiox" && children}

      {tab === "aulas" && <AulasEdital tree={tree} onLesson={setTheme} />}

      <StartStudyDialog theme={theme} onClose={() => setTheme(null)} />
    </div>
  );
}
