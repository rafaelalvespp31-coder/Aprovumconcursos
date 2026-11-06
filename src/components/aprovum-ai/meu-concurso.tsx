"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { StartStudyDialog, type StartTheme } from "@/app/(app)/nova-trilha/start-dialog";
import type { PreparationTree, TreeTopic } from "@/server/services/edital-view";
import "./aprovum-ai.css";

const ST: Record<TreeTopic["status"], string> = {
  completa: "Aula disponível",
  parcial: "Cobertura parcial",
  conferencia: "Necessita de conferência",
  nao_encontrado: "Aula ainda não disponível",
  pendente: "Aguardando análise",
};

export function MeuConcurso({ tree, save }: { tree: PreparationTree; save: (f: FormData) => Promise<void> }) {
  const { prep, disciplines, totals } = tree;
  const [theme, setTheme] = useState<StartTheme | null>(null);
  const [edit, setEdit] = useState(false);
  const pend = disciplines.flatMap((d) => d.topics.filter((t) => t.status === "nao_encontrado" || t.status === "conferencia").map((t) => ({ d, t })));
  const created = new Date(prep.createdAt).toLocaleDateString("pt-BR");

  return (
    <div className="ai-root mx-auto grid w-full max-w-4xl gap-4" data-testid="meu-concurso">
      <header className="ai-head">
        <h1>{prep.title}</h1>
        <div className="ai-meta">
          {prep.roleName && <span>Cargo: <b>{prep.roleName}</b></span>}
          {prep.board && <span>Banca: <b>{prep.board}</b></span>}
          {prep.year && <span>Ano: <b>{prep.year}</b></span>}
          <span>Criada em <b>{created}</b></span>
        </div>
        <button type="button" className="ai-ghost" style={{ marginTop: 10, padding: "0 14px", minHeight: 36 }} onClick={() => setEdit((v) => !v)} aria-expanded={edit}>
          {edit ? "Fechar edição" : "Corrigir informações"}
        </button>
        {edit && (
          <form action={async (f) => { await save(f); setEdit(false); }} className="ai-fields" style={{ marginTop: 10 }}>
            <label className="ai-field"><span>Nome do concurso</span><input name="contestName" defaultValue={prep.contestName ?? ""} maxLength={160} /></label>
            <label className="ai-field"><span>Cargo</span><input name="roleName" defaultValue={prep.roleName ?? ""} maxLength={160} /></label>
            <label className="ai-field"><span>Banca</span><input name="board" defaultValue={prep.board ?? ""} maxLength={80} /></label>
            <label className="ai-field"><span>Ano</span><input name="year" defaultValue={prep.year ?? ""} inputMode="numeric" maxLength={4} /></label>
            <button className="ai-go" type="submit">SALVAR</button>
          </form>
        )}
        <div className="ai-ind">
          <div className="ai-kpi"><b>{totals.pct}%</b><span>Progresso no edital</span></div>
          <div className="ai-kpi"><b>{disciplines.length}</b><span>Disciplinas</span></div>
          <div className="ai-kpi"><b>{totals.lessonsAvailable}</b><span>Aulas disponíveis</span></div>
          <div className="ai-kpi"><b>{totals.lessonsDone}</b><span>Aulas concluídas</span></div>
          <div className="ai-kpi"><b>{totals.pending}</b><span>Tópicos pendentes</span></div>
          <div className="ai-kpi"><b>{totals.questionsAnswered}</b><span>Questões respondidas</span></div>
        </div>
      </header>

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
        <Link href="/aprovum-ai" className="ai-ghost" style={{ textAlign: "center", lineHeight: "44px" }}>Enviar outro edital</Link>
      </section>

      <StartStudyDialog theme={theme} onClose={() => setTheme(null)} />
    </div>
  );
}
