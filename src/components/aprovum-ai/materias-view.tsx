"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Crosshair } from "lucide-react";
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
                      {blocosT.map(({ t, subs }, ti) => {
                        const sk = statusKey(t);
                        const tem = t.lessons.length > 0 || subs.some((f) => f.lessons.length > 0);
                        const st = STATUS[sk]!;
                        return (
                          <details key={t.id} className="mv-tp" open style={{ ["--k" as string]: st.cor }}>
                            <summary className="mv-th">
                              <span className="mv-tn">Tópico {ti + 1}</span>
                              <span className="mv-tl">
                                <ChevronRight className="mv-tseta" size={16} aria-hidden />
                                <span className="mv-tt">{t.code && <span className="mv-cod">{t.code}.</span>} {t.title}</span>
                              </span>
                              <span className="mv-pill">{t.done && <Check size={14} aria-hidden />}{st.label}</span>
                            </summary>
                            <ul className="mv-subs" aria-label={`Conteúdo do tópico ${ti + 1}`}>
                              {subs.length === 0 && t.lessons.map((l) => (
                                <li key={l.catalogId} className="mv-st" style={{ ["--k" as string]: l.done ? "#1f9d55" : st.cor }}>
                                  <span className="mv-ck" data-ok={l.done ? 1 : undefined} aria-hidden>{l.done && <Check size={14} />}</span>
                                  <span className="mv-sl"><span className="mv-sn">{l.title}</span><span className="mv-sm">{l.done ? "Concluída" : l.pct > 0 ? `${Math.round(l.pct)}% estudado` : "Aula disponível"}</span></span>
                                  <button type="button" className="mv-go" data-sub data-feito={l.done ? 1 : undefined} onClick={() => setTheme({ id: l.catalogId, title: l.title, discipline: d.name })}>{l.done ? "Revisar" : "Estudar"}</button>
                                </li>
                              ))}
                              {subs.map((s) => {
                                const ssk = statusKey(s);
                                return (
                                  <li key={s.id} className="mv-st" style={{ ["--k" as string]: STATUS[ssk]!.cor }}>
                                    <span className="mv-ck" data-ok={s.done ? 1 : undefined} aria-hidden>{s.done && <Check size={14} />}</span>
                                    <span className="mv-sl"><span className="mv-sn">{s.code && <span className="mv-stc">{s.code}</span>}{s.title}</span><span className="mv-sm">{STATUS[ssk]!.label}{s.lessons.length > 0 ? ` · ${s.lessons.length} aula${s.lessons.length > 1 ? "s" : ""}` : ""}</span></span>
                                    {s.lessons.length > 0 && <button type="button" className="mv-go" data-sub data-feito={s.done ? 1 : undefined} onClick={() => estudar(s, d.name, [])}>{s.done ? "Revisar" : "Estudar"}</button>}
                                  </li>
                                );
                              })}
                              {tem && subs.length > 0 && (
                                <li className="mv-tudo"><button type="button" className="mv-go" data-feito={t.done ? 1 : undefined} onClick={() => estudar(t, d.name, subs)}>{t.done ? "Revisar tópico inteiro" : "Estudar tópico inteiro"}</button></li>
                              )}
                              {subs.length === 0 && t.lessons.length === 0 && <li className="mv-vz">Sem aula disponível para este tópico ainda.</li>}
                            </ul>
                          </details>
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
