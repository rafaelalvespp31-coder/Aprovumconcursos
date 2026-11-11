"use client";

import Link from "next/link";
import { useState } from "react";
import { BookOpen, ChevronDown, ClipboardList, Filter } from "lucide-react";
import type { StartTheme } from "@/app/(app)/nova-trilha/start-dialog";
import { materiaOf, materiaOrder } from "@/domain/strategic/materias";
import type { PreparationTree, TreeTopic } from "@/server/services/edital-view";
import { Moldura } from "./raiox-painel";
import "./raiox-painel.css";

const ST: Record<TreeTopic["status"], string> = {
  completa: "Aula disponível",
  parcial: "Cobertura parcial",
  conferencia: "Necessita de conferência",
  nao_encontrado: "Aula ainda não disponível",
  pendente: "Aguardando análise",
};
type Sit = "todas" | "com_aula" | "sem_aula" | "concluidas" | "a_estudar";
const SIT: Array<[Sit, string]> = [["todas", "Todos os tópicos"], ["com_aula", "Com aula"], ["a_estudar", "Aula a estudar"], ["concluidas", "Concluídos"], ["sem_aula", "Sem aula ainda"]];
const keep = (t: TreeTopic, s: Sit) => s === "todas" || (s === "com_aula" && t.lessons.length > 0) || (s === "sem_aula" && t.lessons.length === 0) || (s === "concluidas" && t.done) || (s === "a_estudar" && t.lessons.length > 0 && !t.done);

/** Aulas do edital: mesmas matérias, cards e tecnologia do Raio-X (início e fim de cada matéria, filtros e progresso reais). */
export function AulasEdital({ tree, onLesson }: { tree: PreparationTree; onLesson: (t: StartTheme) => void }) {
  const { prep, disciplines, totals } = tree;
  const [disc, setDisc] = useState("todas");
  const [sit, setSit] = useState<Sit>("todas");

  const groups = disciplines
    .filter((d) => disc === "todas" || d.id === disc)
    .flatMap((d) => {
      const m = new Map<string, TreeTopic[]>();
      for (const t of d.topics.filter((x) => keep(x, sit))) { const k = materiaOf(d.name, t.title); m.set(k, [...(m.get(k) ?? []), t]); }
      return [...m].map(([materia, topics]) => ({ d, materia, topics })).sort((a, b) => materiaOrder(a.materia) - materiaOrder(b.materia));
    });
  const pend = disciplines.flatMap((d) => d.topics.filter((t) => t.status === "nao_encontrado" || t.status === "conferencia").map((t) => ({ d, t })));

  return (
    <div className="rxp" data-testid="aulas-edital">
      <Moldura id="rxp-aulas" label="Disciplinas do edital" icon={<BookOpen />} title="AULAS DO EDITAL" sub="Suas aulas organizadas por matéria, do início ao fim de cada uma.">
        <div className="rxp-aulas-resumo" role="group" aria-label="Resumo">
          <div><b>{totals.topics}</b><small>tópicos</small></div>
          <div><b>{totals.lessonsAvailable}</b><small>aulas</small></div>
          <div><b>{totals.done}</b><small>concluídos</small></div>
          <span className="rxp-trilha" role="progressbar" aria-label="Progresso geral" aria-valuemin={0} aria-valuemax={100} aria-valuenow={totals.pct}><i style={{ width: `${Math.max(totals.pct, 1.5)}%`, background: "var(--red)" }} /></span>
          <strong>{totals.pct}%</strong>
        </div>
        <div className="ai-rx-filters">
          <label className="ai-rx-sel"><span><Filter aria-hidden className="inline h-3 w-3" /> Disciplina</span>
            <select value={disc} onChange={(e) => setDisc(e.target.value)}><option value="todas">Todas</option>{disciplines.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></label>
          <label className="ai-rx-sel"><span><Filter aria-hidden className="inline h-3 w-3" /> Situação</span>
            <select value={sit} onChange={(e) => setSit(e.target.value as Sit)}>{SIT.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
        </div>

        <div className="rxp-mats">
          {groups.map(({ d, materia, topics }, gi) => {
            const done = topics.filter((t) => t.done).length;
            const pct = topics.length ? Math.round((done / topics.length) * 100) : 0;
            return (
              <details key={`${d.id}|${materia}`} className="rxp-mat" open data-testid="aulas-materia">
                <summary className="rxp-mat-h">
                  <span className="rxp-mat-n" aria-hidden>{String(gi + 1).padStart(2, "0")}</span>
                  <span className="rxp-mat-t"><small>INÍCIO DA MATÉRIA</small><b>{materia}</b>
                    <em>{materia !== d.name ? `${d.name} · ` : ""}{topics.length} {topics.length === 1 ? "tópico" : "tópicos"} · {done} {done === 1 ? "concluído" : "concluídos"}{d.page ? ` · p. ${d.page}` : ""}</em>
                    <span className="rxp-mat-m" role="progressbar" aria-label={`${pct}% concluído`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}><i style={{ width: `${pct}%` }} /></span>
                  </span>
                  <ChevronDown aria-hidden />
                </summary>
                <ul className="rxp-tops">
                  {topics.map((t) => (
                    <li key={t.id} className="rxp-top" data-st={t.status} data-av={t.lessons.length > 0 ? 1 : 0} data-done={t.done ? 1 : undefined} data-d={Math.min(Math.max(t.depth, 1), 4)}>
                      <p>{t.code && <code>{t.code}</code>}{t.title}</p>
                      <div className="ai-tl">
                        {t.lessons.length === 0 ? (
                          <>
                            <span className="rxp-av" data-av="0">INDISPONÍVEL</span>
                            <span className="ai-st">Aula ainda não disponível{t.page ? ` · edital p. ${t.page}` : ""}</span>
                          </>
                        ) : (
                          <>
                            <span className="rxp-av" data-av="1">{t.done ? "CONCLUÍDA" : t.status === "completa" ? "AULA DISPONÍVEL" : "DISPONÍVEL"}</span>
                            {t.status !== "completa" && <span className="ai-st">{ST[t.status]}</span>}
                            {t.lessons.map((l) => (
                              <button key={l.catalogId} type="button" className="ai-lesson" data-done={l.done ? 1 : undefined} onClick={() => onLesson({ id: l.catalogId, title: l.title, discipline: d.name })}>
                                {l.title}<small>{l.done ? "concluída" : l.pct > 0 ? `${l.pct}%` : "começar"}</small>
                              </button>
                            ))}
                          </>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
                <p className="rxp-mat-f"><i aria-hidden />FIM DA MATÉRIA · {materia}<i aria-hidden /></p>
              </details>
            );
          })}
          {groups.length === 0 && <p className="rxp-vazio">Nenhum tópico neste filtro.</p>}
        </div>
      </Moldura>

      <section id="relatorio" aria-label="Relatório do edital">
        <Moldura id="rxp-relatorio" label="Relatório do edital" icon={<ClipboardList />} title="RELATÓRIO DO EDITAL" sub="O que foi extraído do seu edital e o que ainda falta.">
          <p className="ai-sub">
            {prep.fileName} · {prep.pageCount ?? "—"} páginas · {prep.stats.topics ?? 0} tópicos extraídos · {prep.stats.completa ?? 0} com aula completa · {prep.stats.parcial ?? 0} parciais · {prep.stats.conferencia ?? 0} para conferência · {prep.stats.pendentes ?? 0} sem aula · cobertura do catálogo {prep.stats.coveragePct ?? 0}%.
          </p>
          {pend.length > 0 && (
            <div className="rxp-pend">
              <h4>Conteúdos pendentes</h4>
              <ul>
                {pend.map(({ d, t }) => (
                  <li key={t.id}>
                    <div><b>{t.code ? `${t.code} ` : ""}{t.title}</b><small>{d.name}{t.page ? ` · edital p. ${t.page}` : ""}</small></div>
                    <span data-bad={t.status === "nao_encontrado" ? 1 : undefined}>{t.status === "nao_encontrado" ? "Aula ainda não disponível" : "Conferência"}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="rxp-acoes">
            <Link href={`/meu-concurso/${prep.id}/relatorio`} className="rxp-btn-r">VER RELATÓRIO COMPLETO DO EDITAL</Link>
            <Link href="/aprovum-ai" className="rxp-btn-g">Enviar outro edital</Link>
          </div>
        </Moldura>
      </section>
    </div>
  );
}
