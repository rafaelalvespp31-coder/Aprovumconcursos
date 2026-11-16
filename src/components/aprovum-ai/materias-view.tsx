"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
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

  return (
    <main className="mv" data-testid="materias-edital">
      <Link href="/painel" className="mv-voltar"><ChevronLeft size={16} aria-hidden /> Voltar ao painel</Link>
      <header className="mv-topo">
        <p className="mv-kicker">MATÉRIAS DO EDITAL</p>
        <h1 className="mv-titulo">{prep.contestName ?? prep.title}</h1>
        {prep.roleName && <p className="mv-sub">{prep.roleName}</p>}
        <div className="mv-resumo">
          <div><b>{disciplines.length}</b><span>matérias</span></div>
          <div><b>{totals.topics}</b><span>tópicos</span></div>
          <div><b>{totals.lessonsAvailable}</b><span>aulas disponíveis</span></div>
          <div><b>{Math.round(totals.pct)}%</b><span>concluído</span></div>
          <span className="mv-barra" role="progressbar" aria-valuenow={Math.round(totals.pct)} aria-valuemin={0} aria-valuemax={100} aria-label="Progresso geral"><i style={{ width: `${totals.pct}%` }} /></span>
        </div>
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
          {blocos.map(({ d, hue, materias, n }) => (
            <details key={d.id} className="mv-disc" style={{ ["--h" as string]: hue }} open={!!nq || undefined}>
              <summary>
                <div>
                  <div className="mv-dn">{d.name} <ChevronRight className="mv-seta" size={16} aria-hidden /></div>
                  <div className="mv-dm">{d.doneCount}/{d.topics.length} tópicos concluídos · {n} exibidos</div>
                </div>
                <div className="mv-pct">{Math.round(d.pct)}%</div>
                <span className="mv-barra"><i style={{ width: `${d.pct}%` }} /></span>
              </summary>
              <div className="mv-grupo">
                {materias.map(([materia, ts]) => (
                  <section key={materia}>
                    {materias.length > 1 && <h3 className="mv-mat">{materia}</h3>}
                    {ts.map((t, i) => {
                      const sk = statusKey(t);
                      const filhos: TreeTopic[] = [];
                      for (let j = i + 1; j < ts.length && ts[j]!.depth > t.depth; j++) filhos.push(ts[j]!);
                      const tem = t.lessons.length > 0 || filhos.some((f) => f.lessons.length > 0);
                      return (
                        <div key={t.id} className="mv-t" data-d={Math.min(t.depth, 3)} style={{ ["--k" as string]: STATUS[sk]!.cor, ["--d" as string]: Math.min(t.depth, 3) }}>
                          <div className="mv-tt">
                            {t.code && <span className="mv-cod">{t.code}</span>}
                            {t.title}
                            <div><span className="mv-chip">{STATUS[sk]!.label}{t.lessons.length > 0 ? ` · ${t.lessons.length} aula${t.lessons.length > 1 ? "s" : ""}` : ""}</span></div>
                          </div>
                          {tem && (
                            <button type="button" className="mv-go" data-feito={t.done ? 1 : undefined} onClick={() => estudar(t, d.name, t.depth === 0 ? filhos : [])}>
                              {t.done ? "Revisar" : "Estudar"}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </section>
                ))}
              </div>
            </details>
          ))}
        </div>
      )}
      <StartStudyDialog theme={theme} onClose={() => setTheme(null)} />
    </main>
  );
}
