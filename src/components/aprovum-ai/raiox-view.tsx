"use client";

import { useMemo, useState } from "react";
import { StartStudyDialog, type StartTheme } from "@/app/(app)/nova-trilha/start-dialog";
import { HEAT_LABEL, type Heat } from "@/domain/strategic/analysis";
import { titleKey } from "@/domain/edital/text";
import type { RaioX } from "@/server/services/strategic";
import "./aprovum-ai.css";

const KIND: Record<string, string> = { minima_aprovacao: "Nota mínima para aprovação", corte_primeira_fase: "Corte da 1ª fase", ultimo_classificado: "Último classificado", ultimo_convocado: "Último convocado", ultimo_dentro_vagas: "Último dentro das vagas" };
const MODALITY: Record<string, string> = { ampla: "Ampla concorrência", pcd: "PcD", negros: "Cotas raciais (pretos e pardos)", indigenas: "Indígenas", quilombolas: "Quilombolas", outra: "Outra" };
const PRIO = { maxima: "PRIORIDADE MÁXIMA", alta: "PRIORIDADE ALTA", complementar: "PRIORIDADE COMPLEMENTAR" } as const;
const fmt = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
const date = (d: string | null) => (d ? new Date(`${d}T12:00:00`).toLocaleDateString("pt-BR") : "—");

export function RaioXView({ data }: { data: RaioX }) {
  const { exam, incidence, comparison, heat, lessons } = data;
  const [theme, setTheme] = useState<StartTheme | null>(null);
  const [ed, setEd] = useState(incidence[0]?.year ?? 0);
  const [modality, setModality] = useState("todas");
  const [disc, setDisc] = useState("todas");
  const [level, setLevel] = useState<"todos" | Heat>("todos");
  const cur = incidence.find((i) => i.year === ed) ?? incidence[0];

  const cutoffs = exam.cutoffs.filter((c) => modality === "todas" || c.modality === modality);
  const latest = exam.cutoffs[0];
  const subjects = useMemo(() => [...new Set(heat.cells.map((c) => c.subject))], [heat.cells]);
  const cells = heat.cells.filter((c) => (disc === "todas" || c.subject === disc) && (level === "todos" || c.heat === level));
  const hist = (key: string) => heat.cells.find((c) => c.key === key);
  const lessonsOf = (subject: string | null, topic: string) => lessons[`${titleKey(subject ?? "")}|${titleKey(topic)}`] ?? [];
  const recurrent = heat.cells.filter((c) => heat.editionsWithData >= 2 && c.editionsPresent === heat.editionsWithData);
  const attention = comparison ? comparison.topics.filter((t) => t.presence === "so_recente" || (t.presence === "ambas" && (t.recent ?? 0) > (t.previous ?? 0))) : [];

  const Lessons = ({ subject, topic }: { subject: string | null; topic: string }) => {
    const ls = lessonsOf(subject, topic);
    if (!ls.length) return <span className="ai-st">Aula ainda não disponível</span>;
    return <>{ls.map((l) => <button key={l.catalogId} type="button" className="ai-lesson" data-done={l.done ? 1 : undefined} onClick={() => setTheme({ id: l.catalogId, title: l.title, discipline: subject ?? "Raio-X" })}>{l.title}<small>{l.done ? "concluída" : l.pct > 0 ? `${l.pct}%` : "estudar"}</small></button>)}</>;
  };

  return (
    <div className="grid gap-5" data-testid="raiox">
      <header>
        <p className="ai-kicker"><i />RAIO-X DO EDITAL</p>
        <h2 className="mt-2 font-[Chakra_Petch] text-[20px] font-bold">Diagnóstico estratégico do concurso</h2>
        <p className="ai-sub">{exam.name}. Dados cadastrados e revisados pela equipe APROVUM, com fonte. Histórico não garante o que cairá na próxima prova e nenhum conteúdo do edital deve ser abandonado.</p>
      </header>

      {/* A — notas de corte */}
      <section className="ai-rx" aria-label="Notas de corte">
        <h3>Histórico de notas de corte</h3>
        {!latest ? <p className="ai-sub">Nota de corte ainda não catalogada.</p> : (
          <>
            <div className="ai-rx-hero">
              <small>ÚLTIMA NOTA DE CORTE DISPONÍVEL</small>
              <b>{fmt(latest.score)}{latest.maxScore ? <span> / {fmt(latest.maxScore)}</span> : null}</b>
              <p>{KIND[latest.kind]} · {MODALITY[latest.modality]} · {latest.editionYear}{latest.board ? ` · ${latest.board}` : ""}{latest.position ? ` · ${latest.position}` : ""}{latest.stage ? ` · ${latest.stage}` : ""}</p>
              <p>{latest.candidates ? `${latest.candidates.toLocaleString("pt-BR")} candidatos considerados · ` : ""}{latest.criterion ?? "Critério não informado"} · Fonte: {latest.source?.name ?? "não informada"}{latest.sourcePage ? ` (p. ${latest.sourcePage})` : ""} · verificada em {date(latest.verifiedAt)}</p>
            </div>
            <label className="ai-rx-sel">Modalidade
              <select value={modality} onChange={(e) => setModality(e.target.value)}>
                <option value="todas">Todas</option>
                {[...new Set(exam.cutoffs.map((c) => c.modality))].map((m) => <option key={m} value={m}>{MODALITY[m]}</option>)}
              </select>
            </label>
            <div className="ai-rx-scroll"><table className="ai-rx-table">
              <thead><tr><th>Ano</th><th>Tipo (não são equivalentes)</th><th>Modalidade</th><th>Nota</th><th>Fonte</th></tr></thead>
              <tbody>{cutoffs.map((c) => <tr key={c.id}><td>{c.editionYear}</td><td>{KIND[c.kind]}{c.stage ? ` · ${c.stage}` : ""}</td><td>{MODALITY[c.modality]}{c.position ? ` · ${c.position}` : ""}</td><td><b>{fmt(c.score)}</b>{c.maxScore ? ` / ${fmt(c.maxScore)}` : ""}</td><td>{c.source?.name ?? "—"}{c.sourcePage ? ` p. ${c.sourcePage}` : ""}</td></tr>)}</tbody>
            </table></div>
          </>
        )}
      </section>

      {/* B — incidência por disciplina */}
      {cur && (
        <section className="ai-rx" aria-label="Incidência das matérias">
          <h3>Incidência das matérias</h3>
          <div className="ai-rx-tabs" role="tablist" aria-label="Prova">
            {incidence.map((i) => <button key={i.year} type="button" role="tab" aria-selected={i.year === cur.year} onClick={() => setEd(i.year)}>{i.year}{i.board ? ` · ${i.board}` : ""}</button>)}
          </div>
          <p className="ai-sub">Total considerado nesta prova: <b>{cur.denominator} questões</b>. {cur.countingRule ? `Regra: ${cur.countingRule}` : "Regra de contagem de anuladas não informada."}</p>
          <ul className="ai-rx-bars">
            {cur.rows.map((r) => (
              <li key={r.name} title={`${r.questions} de ${cur.denominator} questões`}>
                <span>{r.name}</span>
                <i style={{ width: `${Math.max(2, r.pct)}%` }} />
                <b>{r.questions} · {fmt(r.pct)}%{r.annulled ? ` · ${r.annulled} anul.` : ""}</b>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* D — comparativo */}
      <section className="ai-rx" aria-label="Comparativo">
        <h3>Comparativo das duas últimas provas</h3>
        {!comparison ? <p className="ai-sub">São necessárias duas provas catalogadas para comparar.</p> : (
          <>
            <p className="ai-sub">Prova anterior: {comparison.previous.year}{comparison.previous.board ? ` (${comparison.previous.board})` : ""} · mais recente: {comparison.recent.year}{comparison.recent.board ? ` (${comparison.recent.board})` : ""}. Totais diferentes entre provas: veja o denominador acima.</p>
            <div className="ai-rx-scroll"><table className="ai-rx-table">
              <thead><tr><th>Disciplina</th><th>{comparison.previous.year}</th><th>{comparison.recent.year}</th><th>Variação</th></tr></thead>
              <tbody>{comparison.subjects.map((s) => <tr key={s.name}><td>{s.name}</td><td>{s.previous ?? "—"}</td><td>{s.recent ?? "—"}</td><td><b data-d={s.delta === null ? undefined : s.delta > 0 ? "up" : s.delta < 0 ? "down" : undefined}>{s.delta === null ? "—" : s.delta > 0 ? `+${s.delta}` : s.delta}</b></td></tr>)}</tbody>
            </table></div>
            {comparison.topicDataBoth ? (
              <div className="ai-rx-groups">
                {(["ambas", "so_recente", "so_anterior"] as const).map((g) => {
                  const list = comparison.topics.filter((t) => t.presence === g);
                  return <div key={g}><h4>{g === "ambas" ? "Nas duas provas" : g === "so_recente" ? `Só na mais recente (${comparison.recent.year})` : `Só na anterior (${comparison.previous.year})`}</h4>
                    {list.length === 0 ? <p className="ai-sub">Nenhum.</p> : <ul>{list.slice(0, 40).map((t) => <li key={t.subject + t.title}><span>{t.title}<small> {t.subject}</small></span><b>{t.previous ?? "—"} → {t.recent ?? "—"}</b></li>)}</ul>}</div>;
                })}
              </div>
            ) : <p className="ai-sub">Os assuntos de uma das provas ainda não foram classificados: a comparação por assunto fica indisponível.</p>}
          </>
        )}
      </section>

      {/* E — mapa de calor + C — assuntos */}
      <section className="ai-rx" aria-label="Mapa de calor e assuntos">
        <h3>Mapa de calor e incidência de assuntos</h3>
        {heat.cells.length === 0 ? <p className="ai-sub">Assuntos ainda não classificados para este concurso.</p> : (
          <>
            <p className="ai-sub">Critério: participação média do assunto no total de questões, nas {heat.editionsWithData} provas com assuntos catalogados. Muito alta ≥ {heat.criteria.muitoAlta}% · Alta ≥ {heat.criteria.alta}% · Moderada ≥ {heat.criteria.moderada}% · Baixa abaixo disso. Com menos de {heat.criteria.minEditions} provas, nada é classificado.</p>
            <div className="ai-rx-filters">
              <label className="ai-rx-sel">Disciplina<select value={disc} onChange={(e) => setDisc(e.target.value)}><option value="todas">Todas</option>{subjects.map((s) => <option key={s}>{s}</option>)}</select></label>
              <label className="ai-rx-sel">Incidência<select value={level} onChange={(e) => setLevel(e.target.value as typeof level)}><option value="todos">Todas</option>{(Object.keys(HEAT_LABEL) as Heat[]).map((h) => <option key={h} value={h}>{HEAT_LABEL[h]}</option>)}</select></label>
            </div>
            <ul className="ai-rx-heat">
              {cells.map((c) => (
                <li key={c.key} data-h={c.heat}>
                  <div><b>{c.title}</b><small>{c.subject} · {c.editionsPresent} de {c.editionsWithData} provas · {c.questions} questões · {HEAT_LABEL[c.heat]}</small>
                    <small>{c.byEdition.map((b) => `${b.year}: ${b.questions ?? "—"}`).join("  ·  ")}</small></div>
                  <div className="ai-tl"><Lessons subject={c.subject} topic={c.title} /></div>
                </li>
              ))}
              {cells.length === 0 && <li className="ai-sub">Nenhum assunto neste filtro.</li>}
            </ul>
          </>
        )}
      </section>

      {/* F, G, H — direcionamento */}
      <section className="ai-rx" aria-label="Direcionamento estratégico">
        <h3>Direcionamento estratégico APROVUM</h3>
        {exam.recommendations.length === 0 ? <p className="ai-sub">Recomendações ainda não cadastradas para este concurso. Siga o conteúdo programático do edital por completo.</p> : (
          (["maxima", "alta", "complementar"] as const).map((p) => {
            const list = exam.recommendations.filter((r) => r.priority === p);
            if (!list.length) return null;
            return <div key={p} className="ai-rx-prio" data-p={p}><h4>{PRIO[p]}</h4>
              {list.map((r, i) => { const h = hist(`${titleKey(r.subject ?? "")}|${titleKey(r.topic)}`); return (
                <div key={i} className="ai-rx-rec"><b>{r.subject ? `${r.subject} — ` : ""}{r.topic}</b><p>{r.justification}</p>
                  {h && <small>Histórico: {h.editionsPresent} de {h.editionsWithData} provas · {h.questions} questões ({h.byEdition.map((b) => `${b.year}: ${b.questions ?? "—"}`).join(", ")})</small>}
                  <div className="ai-tl"><Lessons subject={r.subject} topic={r.topic} /></div></div>); })}
            </div>;
          })
        )}
        <p className="ai-sub">Os demais conteúdos do edital continuam fazendo parte da sua preparação (prioridade complementar).</p>
        {recurrent.length > 0 && <div className="ai-rx-chips"><h4>Assuntos recorrentes (em todas as provas catalogadas)</h4><ul>{recurrent.map((c) => <li key={c.key}>{c.title}</li>)}</ul></div>}
        {attention.length > 0 && <div className="ai-rx-chips"><h4>Assuntos que merecem atenção (novos ou em alta na prova mais recente)</h4><ul>{attention.map((t) => <li key={t.subject + t.title}>{t.title}</li>)}</ul></div>}
      </section>

      {/* Fontes */}
      <section className="ai-rx" aria-label="Fontes e limitações">
        <h3>Fontes e confiabilidade</h3>
        {exam.limitations && <p className="ai-sub"><b>Limitações da análise:</b> {exam.limitations}</p>}
        {exam.sources.length === 0 ? <p className="ai-sub">Nenhuma fonte cadastrada.</p> : (
          <ul className="ai-rx-src">{exam.sources.map((s) => <li key={s.id}><b>{s.kind === "oficial" ? "Dado oficial" : s.kind === "extraido" ? "Extraído das provas" : "Análise própria"}</b> · {s.url ? <a href={s.url} target="_blank" rel="noopener noreferrer">{s.name}</a> : s.name}{s.page ? `, p. ${s.page}` : ""}{s.organ ? ` · ${s.organ}` : ""}{s.publishedAt ? ` · publicado em ${date(s.publishedAt)}` : ""}{s.consultedAt ? ` · consultado em ${date(s.consultedAt)}` : ""}{s.reviewer ? ` · conferido por ${s.reviewer}` : ""}</li>)}</ul>
        )}
      </section>
      <StartStudyDialog theme={theme} onClose={() => setTheme(null)} />
    </div>
  );
}
