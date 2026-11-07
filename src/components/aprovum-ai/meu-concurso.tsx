"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { StartStudyDialog, type StartTheme } from "@/app/(app)/nova-trilha/start-dialog";
import type { PreparationTree, TreeTopic } from "@/server/services/edital-view";
import { CardEdital } from "./card-edital";
import { VisaoGeral } from "./visao-geral";
import "./aprovum-ai.css";

const ST: Record<TreeTopic["status"], string> = {
  completa: "Aula disponível",
  parcial: "Cobertura parcial",
  conferencia: "Necessita de conferência",
  nao_encontrado: "Aula ainda não disponível",
  pendente: "Aguardando análise",
};

export type PrepTab = "visao" | "aulas" | "raiox" | "questoes" | "desempenho";
const TABS: Array<[PrepTab, string]> = [["visao", "VISÃO GERAL"], ["aulas", "AULAS DO EDITAL"], ["raiox", "RAIO-X DO EDITAL"], ["questoes", "QUESTÕES"], ["desempenho", "DESEMPENHO"]];

export function MeuConcurso({ tree, save, start, tab, editing = false, children }: { tree: PreparationTree; save: (f: FormData) => Promise<void>; start: (s: { error?: string }) => Promise<{ error?: string }>; tab: PrepTab; editing?: boolean; children?: React.ReactNode }) {
  const { prep, disciplines, totals } = tree;
  const [theme, setTheme] = useState<StartTheme | null>(null);
  const pend = disciplines.flatMap((d) => d.topics.filter((t) => t.status === "nao_encontrado" || t.status === "conferencia").map((t) => ({ d, t })));

  return (
    <div className="ai-root mx-auto grid w-full max-w-4xl gap-4" data-testid="meu-concurso">
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

      {tab === "aulas" && (<>
      <section className="ai-list" style={{ marginTop: 0 }} aria-label="Disciplinas">
        <h2>DISCIPLINAS DO EDITAL</h2>
        {disciplines.map((d) => (
          <details key={d.id} className="ai-disc">
            <summary>
              <div>
                <h3>{d.name}</h3>
                <small>{d.topics.length} tópicos · {d.doneCount} concluídos{d.page ? ` · p. ${d.page}` : ""}</small>
              </div>
              <span className="ai-meter" aria-label={`${d.pct}% concluído`}><i style={{ width: `${d.pct}%` }} /></span>
              <ChevronDown className="ai-chev h-4 w-4" aria-hidden />
            </summary>
            <div className="ai-topics">
              {d.topics.map((t) => (
                <div key={t.id} className="ai-topic" data-st={t.status} data-d={Math.min(t.depth, 4)}>
                  <p>{t.code && <code>{t.code}</code>}{t.title}</p>
                  <div className="ai-tl">
                    {t.lessons.length === 0 ? (
                      <span className="ai-st">{ST[t.status]}{t.page ? ` · edital p. ${t.page}` : ""}</span>
                    ) : (
                      <>
                        {t.status !== "completa" && <span className="ai-st">{ST[t.status]}</span>}
                        {t.lessons.map((l) => (
                          <button key={l.catalogId} type="button" className="ai-lesson" data-done={l.done ? 1 : undefined} onClick={() => setTheme({ id: l.catalogId, title: l.title, discipline: d.name })}>
                            {l.title}<small>{l.done ? "concluída" : l.pct > 0 ? `${l.pct}%` : "começar"}</small>
                          </button>
                        ))}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </details>
        ))}
      </section>

      <section id="relatorio" className="ai-list" style={{ marginTop: 0 }} aria-label="Relatório do edital">
        <h2>RELATÓRIO DO EDITAL</h2>
        <p className="ai-sub">
          {prep.fileName} · {prep.pageCount ?? "—"} páginas · {prep.stats.topics ?? 0} tópicos extraídos · {prep.stats.completa ?? 0} com aula completa · {prep.stats.parcial ?? 0} parciais · {prep.stats.conferencia ?? 0} para conferência · {prep.stats.pendentes ?? 0} sem aula · cobertura do catálogo {prep.stats.coveragePct ?? 0}%.
        </p>
        {pend.length > 0 && (
          <div className="grid gap-2">
            <b style={{ fontSize: 13 }}>Conteúdos pendentes</b>
            {pend.map(({ d, t }) => (
              <div key={t.id} className="ai-item" style={{ alignItems: "flex-start" }}>
                <div>
                  <b>{t.code ? `${t.code} ` : ""}{t.title}</b>
                  <small>{d.name}{t.page ? ` · edital p. ${t.page}` : ""}</small>
                </div>
                <span className="ai-pill" data-bad={t.status === "nao_encontrado" ? 1 : undefined}>{t.status === "nao_encontrado" ? "Aula ainda não disponível" : "Conferência"}</span>
              </div>
            ))}
          </div>
        )}
        <Link href={`/meu-concurso/${prep.id}/relatorio`} className="ai-go" style={{ textAlign: "center", lineHeight: "48px", display: "block" }}>VER RELATÓRIO COMPLETO DO EDITAL</Link>
        <Link href="/aprovum-ai" className="ai-ghost" style={{ textAlign: "center", lineHeight: "44px" }}>Enviar outro edital</Link>
      </section>

      </>)}

      <StartStudyDialog theme={theme} onClose={() => setTheme(null)} />
    </div>
  );
}
