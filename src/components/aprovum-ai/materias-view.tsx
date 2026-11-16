"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Crosshair } from "lucide-react";
import { orgImageFor } from "@/domain/edital/org-images";
import { StartStudyDialog, type StartTheme } from "@/app/(app)/nova-trilha/start-dialog";
import { materiaOf, materiaOrder } from "@/domain/strategic/materias";
import { fold } from "@/domain/edital/text";
import type { PreparationTree, TreeTopic } from "@/server/services/edital-view";
import "./materias-view.css";

const HUES = [352, 24, 42, 145, 188, 214, 262, 318];
const STATUS: Record<string, { label: string; cor: string }> = {
  concluido: { label: "Concluído", cor: "#1f9d55" },
  completa: { label: "Aula disponível", cor: "#2563eb" },
  parcial: { label: "Cobertura parcial", cor: "#d97706" },
  conferencia: { label: "Em conferência", cor: "#9333ea" },
  nao_encontrado: { label: "Sem aula ainda", cor: "#9ca3af" },
  pendente: { label: "Aguardando análise", cor: "#9ca3af" },
};
const statusKey = (t: TreeTopic) => (t.done ? "concluido" : t.status);

/** Página das matérias do edital: disciplina → matéria → tópico → subtópico, com cor, status e progresso reais. */
export function MateriasView({ tree }: { tree: PreparationTree }) {
  const { prep, disciplines, totals } = tree;
  const [q, setQ] = useState("");
  const [theme, setTheme] = useState<StartTheme | null>(null);
  const nq = fold(q.trim());

  const blocos = useMemo(
    () =>
      disciplines.map((d, i) => {
        const porMateria = new Map<string, TreeTopic[]>();
        for (const t of d.topics) {
          if (nq && !fold(t.title).includes(nq) && !fold(d.name).includes(nq)) continue;
          const k = materiaOf(d.name, t.title);
          porMateria.set(k, [...(porMateria.get(k) ?? []), t]);
        }
        const materias = [...porMateria].sort((a, b) => materiaOrder(a[0]) - materiaOrder(b[0]));
        return { d, hue: HUES[i % HUES.length]!, materias, n: materias.reduce((s, [, ts]) => s + ts.length, 0) };
      }).filter((b) => b.n > 0),
    [disciplines, nq],
  );

  const estudar = (t: TreeTopic, disciplina: string, filhos: TreeTopic[]) => {
    const ids = [t, ...filhos].flatMap((x) => x.lessons.map((l) => l.catalogId));
    if (!ids.length) return;
    setTheme({ id: ids[0]!, title: t.title, discipline: disciplina, ...(ids.length > 1 ? { ids } : {}) });
  };
  const org = orgImageFor(prep.contestName, prep.roleName, prep.title);
  const nome = prep.contestName ?? prep.title;
  const cargo = prep.roleName && fold(prep.roleName) !== fold(nome) ? prep.roleName.replace(/^./, (c) => c.toUpperCase()) : null;
  const pctGeral = Math.round(totals.pct);

  return (
    <main className="mv" data-testid="materias-edital">
      <Link href="/painel" className="mv-voltar"><ChevronLeft size={16} aria-hidden /> Voltar ao painel</Link>
      <header className="mv-topo">
        <div className="mv-arte" data-of={org ? 1 : undefined} style={{ ["--arte" as string]: `url(${org?.card ?? "/missoes/soldado.webp"})` }} aria-hidden />
        <p className="mv-kicker"><Crosshair size={16} aria-hidden /> MATÉRIAS DO EDITAL</p>
        <h1 className="mv-titulo">{nome}</h1>
        {cargo && <p className="mv-sub">{cargo}</p>}
        <div className="mv-resumo">
          <div className="mv-kpi"><b>{disciplines.length}</b><span>matérias</span></div>
          <div className="mv-kpi"><b>{totals.topics}</b><span>tópicos</span></div>
          <div className="mv-kpi"><b>{totals.lessonsAvailable}</b><span>aulas</span></div>
          <div className="mv-kpi"><b>{pctGeral}%</b><span>concluído</span></div>
        </div>
        <span className="mv-barra mv-geral" role="progressbar" aria-valuenow={pctGeral} aria-valuemin={0} aria-valuemax={100} aria-label="Progresso geral"><i style={{ width: `${totals.pct}%` }} /></span>
      </header>

      <div className="mv-ferr">
        <input className="mv-busca" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar matéria ou tópico" aria-label="Buscar matéria ou tópico" />
        <div className="mv-leg" aria-label="Legenda de cores">
          {["concluido", "completa", "parcial", "conferencia", "nao_encontrado"].map((k) => (
            <span key={k}><i style={{ ["--k" as string]: STATUS[k]!.cor }} />{STATUS[k]!.label}</span>
          ))}
        </div>
      </div>

      {blocos.length === 0 ? (
        <p className="mv-vazio">Nenhum tópico encontrado para “{q}”.</p>
      ) : (
        <div className="mv-lista">
          {blocos.map(({ d, hue, materias, n }, di) => (
            <details key={d.id} className="mv-disc" style={{ ["--h" as string]: hue }} open={!!nq || undefined}>
              <summary>
                <span className="mv-num" aria-hidden>{di + 1}</span>
                <div>
                  <div className="mv-dn">{d.name} <ChevronRight className="mv-seta" size={18} aria-hidden /></div>
                  <div className="mv-dm">{d.doneCount}/{d.topics.length} tópicos concluídos · {n} exibidos</div>
                </div>
                <span className="mv-anel" style={{ ["--p" as string]: Math.round(d.pct) }} role="img" aria-label={`${Math.round(d.pct)}% concluído`}><b>{Math.round(d.pct)}%</b></span>
              </summary>
              <div className="mv-grupo">
                {materias.map(([materia, ts]) => {
                  // tópico (nível 0) e seus subtópicos ficam num bloco só; o resto da lista segue em sequência
                  const blocosT: Array<{ t: TreeTopic; subs: TreeTopic[] }> = [];
                  for (const t of ts) {
                    const last = blocosT[blocosT.length - 1];
                    if (t.depth > 0 && last) last.subs.push(t);
                    else blocosT.push({ t, subs: [] });
                  }
                  return (
                    <section key={materia}>
                      {materias.length > 1 && <h3 className="mv-mat">{materia}</h3>}
                      {blocosT.map(({ t, subs }) => {
                        const sk = statusKey(t);
                        const tem = t.lessons.length > 0 || subs.some((f) => f.lessons.length > 0);
                        return (
                          <article key={t.id} className="mv-tp" style={{ ["--k" as string]: STATUS[sk]!.cor }}>
                            <div className="mv-th">
                              <span className="mv-cod">{t.code ?? "•"}</span>
                              <div className="mv-tt">
                                {t.title}
                                <div><span className="mv-chip">{STATUS[sk]!.label}{t.lessons.length > 0 ? ` · ${t.lessons.length} aula${t.lessons.length > 1 ? "s" : ""}` : ""}</span></div>
                              </div>
                              {tem && (
                                <button type="button" className="mv-go" data-feito={t.done ? 1 : undefined} onClick={() => estudar(t, d.name, subs)}>
                                  {t.done ? "Revisar tudo" : subs.length ? "Estudar tópico" : "Estudar"}
                                </button>
                              )}
                            </div>
                            {subs.length > 0 && (
                              <ul className="mv-subs" aria-label={`Subtópicos de ${t.title}`}>
                                <li className="mv-subs-t" aria-hidden>Subtópicos · {subs.length}</li>
                                {subs.map((s) => {
                                  const ssk = statusKey(s);
                                  return (
                                    <li key={s.id} className="mv-st" style={{ ["--k" as string]: STATUS[ssk]!.cor }}>
                                      <span>{s.code && <span className="mv-stc">{s.code}</span>}{s.title}</span>
                                      {s.lessons.length > 0 && <button type="button" className="mv-go" data-sub data-feito={s.done ? 1 : undefined} onClick={() => estudar(s, d.name, [])}>{s.done ? "Revisar" : "Estudar"}</button>}
                                    </li>
                                  );
                                })}
                              </ul>
                            )}
                          </article>
                        );
                      })}
                    </section>
                  );
                })}
              </div>
            </details>
          ))}
        </div>
      )}
      <StartStudyDialog theme={theme} onClose={() => setTheme(null)} />
    </main>
  );
}
