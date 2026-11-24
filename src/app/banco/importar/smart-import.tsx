"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { splitCommentByOption } from "@/domain/bank/option-notes";
import { useMemo, useState, useTransition } from "react";
import { estimateQuestions, matchDestino, type SmartIssue } from "@/domain/bank/smart-import";
import type { DestinoTree, SmartAnalysis, SmartHistoryRow, SmartImportResult } from "@/server/services/bank-upload";
import type { BankResult } from "../actions";
import { DBadge, DCard, DNotice, dButton, dInput, dLabel, dTextarea, fmtDate } from "../ui";

export interface SmartActions {
  analyze: (text: string) => Promise<BankResult<{ analysis: SmartAnalysis; destinos: DestinoTree }>>;
  save: (items: unknown, dest: { subjectId: string; topicId: string | null }, origem: string) => Promise<BankResult<SmartImportResult>>;
  history: () => Promise<BankResult<SmartHistoryRow[]>>;
  saveBoard: (name: string) => Promise<BankResult>;
}

type Draft = SmartAnalysis["drafts"][number];
interface Row extends Draft {
  selected: boolean;
  open: boolean;
  subjectId: string | null;
  topicId: string | null;
  confirmBoard: boolean;
  allowDuplicate: boolean;
  removed: boolean;
}

const ISSUE_LABEL: Record<SmartIssue, string> = {
  gabarito_ausente: "Gabarito ausente",
  alternativas_nao_identificadas: "Alternativas não identificadas",
  banca_desconhecida: "Banca desconhecida",
  banca_ausente: "Banca ausente",
  ano_ausente: "Ano ausente",
  concurso_ausente: "Concurso ausente",
  disciplina_pendente: "Classificação pendente",
  enunciado_curto: "Enunciado curto",
  sem_alternativas: "Sem alternativas",
};

const TYPE_LABEL = { multipla_escolha: "Múltipla escolha", certo_errado: "Certo ou Errado", discursiva: "Sem alternativas" } as const;

/** Por que esta questão ainda não pode ser importada (vazio = pronta). */
function blocker(r: Row): string | null {
  if (r.type === "discursiva") return "Sem alternativas: cadastre manualmente.";
  if (!r.board || !r.year || !r.examLine) return "Informe banca, ano e concurso.";
  if (r.issues.includes("banca_desconhecida") && !r.confirmBoard) return "Confirme a banca.";
  if (r.type === "multipla_escolha" && (r.options.length < 2 || r.options.length > 5)) return "Revise as alternativas (2 a 5).";
  if (r.type === "certo_errado" && r.answer !== "certo" && r.answer !== "errado") return "Informe o gabarito (Certo ou Errado).";
  if (r.duplicate !== "inedita" && !r.allowDuplicate) return "Possível duplicidade: libere para importar.";
  if (r.statement.trim().length < 10) return "Enunciado muito curto.";
  return null;
}

export function SmartImporter({ actions }: { actions: SmartActions }) {
  const [text, setText] = useState("");
  const [origem, setOrigem] = useState("");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [destinos, setDestinos] = useState<DestinoTree | null>(null);
  const [subjectId, setSubjectId] = useState("");
  const [topicId, setTopicId] = useState("");
  const [result, setResult] = useState<SmartImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<SmartHistoryRow[] | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  const estimate = useMemo(() => estimateQuestions(text), [text]);
  const subject = destinos?.subjects.find((s) => s.id === subjectId) ?? null;
  const topicOptions = useMemo(() => {
    if (!subject) return [] as Array<{ id: string; label: string }>;
    const out: Array<{ id: string; label: string }> = [];
    const walk = (parent: string | null, depth: number) => {
      for (const t of subject.topics.filter((x) => x.parentId === parent)) {
        out.push({ id: t.id, label: `${"— ".repeat(depth)}${t.name}` });
        walk(t.id, depth + 1);
      }
    };
    walk(null, 0);
    return out;
  }, [subject]);

  const analyze = () => {
    setError(null);
    setResult(null);
    start(async () => {
      const r = await actions.analyze(text);
      if (!r.ok || !r.data) return setError(r.error ?? "Não foi possível analisar.");
      const { analysis, destinos: d } = r.data;
      setDestinos(d);
      const matched = analysis.drafts.map((x) => matchDestino(d.subjects, x.discipline, x.topic));
      setRows(analysis.drafts.map((x, i) => ({ ...x, selected: x.duplicate === "inedita", open: false, subjectId: matched[i]!.subjectId, topicId: matched[i]!.topicId, confirmBoard: false, allowDuplicate: false, removed: false })));
      const sug = matched.find((m) => m.subjectId)?.subjectId ?? analysis.drafts.find((x) => x.suggestedSubjectId)?.suggestedSubjectId;
      if (sug) {
        setSubjectId(sug);
        const first = matched.find((m) => m.subjectId === sug && m.topicId);
        setTopicId(first?.topicId ?? "");
      }
    });
  };
  // Ao confirmar uma banca nova, ela é gravada na hora (vale para todas as questões do lote com a mesma banca).
  const confirmBoard = (board: string, on: boolean) => {
    const same = (b: string | null) => (b ?? "").trim().toLowerCase() === board.trim().toLowerCase();
    setRows((cur) => cur && cur.map((r) => (same(r.board) ? { ...r, confirmBoard: on } : r)));
    if (!on) return;
    void actions.saveBoard(board).then((res) => {
      if (!res.ok) {
        setError(res.error ?? "Não foi possível gravar a banca.");
        setRows((cur) => cur && cur.map((r) => (same(r.board) ? { ...r, confirmBoard: false } : r)));
      }
    });
  };
  const patch = (key: string, p: Partial<Row>) => setRows((cur) => cur && cur.map((r) => (r.key === key ? { ...r, ...p } : r)));
  const visible = rows?.filter((r) => !r.removed) ?? [];
  const chosen = visible.filter((r) => r.selected);
  const ready = chosen.filter((r) => !blocker(r));
  const dupes = visible.filter((r) => r.duplicate !== "inedita").length;

  const importNow = () => {
    if (!subjectId) return setError("Escolha a matéria de destino.");
    setError(null);
    const items = ready.map((r) => ({
      key: r.key,
      type: r.type,
      board: r.board,
      year: r.year,
      examLine: r.examLine,
      organ: r.organ,
      role: r.role,
      baseTextCode: r.baseTextCode,
      baseText: r.baseText,
      statement: r.statement,
      options: r.type === "multipla_escolha" ? r.options : [],
      answer: r.answer,
      answerSource: r.answer ? r.answerSource : null,
      comment: r.comment,
      raw: r.raw,
      subjectId: r.subjectId,
      topicId: r.subjectId ? r.topicId : null,
      newTopicName: r.topic && !r.topicId && (r.subjectId || subjectId) ? r.topic.slice(0, 200) : null,
      confirmBoard: r.confirmBoard,
      allowDuplicate: r.allowDuplicate,
      duplicate: r.duplicate,
    }));
    start(async () => {
      const res = await actions.save(items, { subjectId, topicId: topicId || null }, origem);
      if (!res.ok || !res.data) return setError(res.error ?? "Não foi possível importar.");
      setResult(res.data);
      const done = new Set(res.data.results.filter((x) => x.status === "importada" || x.status === "publicada").map((x) => x.key));
      const gone = rows?.filter((x) => done.has(x.key)) ?? [];
      const left = (rows?.filter((x) => !done.has(x.key) && !x.removed) ?? []).length;
      // Some da caixa de texto o que acabou de ser importado; se não sobrou nenhuma questão, limpa tudo.
      setText((cur) => {
        if (left === 0) return "";
        let t = cur;
        for (const g of gone) if (g.raw && t.includes(g.raw)) t = t.replace(g.raw, "");
        return t.replace(/\n{3,}/g, "\n\n").trim();
      });
      setRows((cur) => cur && cur.filter((x) => !done.has(x.key)));
      if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
      router.refresh();
    });
  };
  const loadHistory = () => start(async () => { const r = await actions.history(); if (r.ok && r.data) setHistory(r.data); else setError(r.error ?? "Não foi possível carregar o histórico."); });
  const readFile = async (f: File | undefined) => {
    if (!f) return;
    if (f.size > 2_000_000) return setError("Arquivo grande demais (máximo 2 MB).");
    setText(await f.text());
    setOrigem((o) => o || f.name);
  };

  return (
    <div className="flex flex-col gap-4">
      <DCard>
        <h2 className="font-[Space_Grotesk] text-[20px] font-bold uppercase tracking-wide">Importador inteligente de questões</h2>
        <p className="mt-1 max-w-3xl text-[14px] text-white/65">Copie questões de uma fonte autorizada (TEC Concursos, Gran Cursos ou texto simples), cole o conteúdo e deixe o APROVUM organizar tudo. Nada é salvo antes da sua revisão.</p>
        <label htmlFor="smart-text" className="sr-only">Questões copiadas</label>
        <textarea id="smart-text" value={text} onChange={(e) => setText(e.target.value)} rows={12} spellCheck={false} className={`${dTextarea} mt-3 font-mono text-[13px]`} placeholder="Cole aqui as questões copiadas, incluindo banca, concurso, enunciado, texto-base, alternativas e informações disponíveis..." />
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-white/60">
          <span>{text.length.toLocaleString("pt-BR")} caracteres</span>
          <span>≈ {estimate} questão(ões) detectada(s)</span>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto]">
          <div>
            <label htmlFor="smart-origem" className={dLabel}>Origem (opcional, só para o histórico)</label>
            <input id="smart-origem" value={origem} onChange={(e) => setOrigem(e.target.value)} maxLength={200} className={dInput} placeholder="Ex.: lista de Língua Portuguesa, novembro" />
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={analyze} disabled={pending || !text.trim()} className={dButton("primario")}>{pending && !rows ? "Analisando…" : "ANALISAR QUESTÕES"}</button>
          <button type="button" onClick={() => { setText(""); setRows(null); setResult(null); setError(null); }} className={dButton("secundario")}>Limpar campo</button>
          <label className={`${dButton("secundario")} cursor-pointer`}>
            Importar arquivo (.txt)
            <input type="file" accept=".txt,text/plain" className="sr-only" onChange={(e) => void readFile(e.target.files?.[0])} />
          </label>
          <button type="button" onClick={loadHistory} className={dButton("discreto")}>Histórico de importações</button>
        </div>
      </DCard>

      {error && <DNotice tone="erro">{error}</DNotice>}

      {history && (
        <DCard title="Histórico de importações" action={<button type="button" className={dButton("discreto")} onClick={() => setHistory(null)}>Fechar</button>}>
          {history.length === 0 ? <p className="text-[14px] text-white/60">Nenhuma importação ainda.</p> : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-[13px]">
                <thead className="text-white/55"><tr><th className="py-1 pr-3">Data</th><th className="pr-3">Responsável</th><th className="pr-3">Analisadas</th><th className="pr-3">Importadas</th><th className="pr-3">Ignoradas</th><th className="pr-3">Erros</th><th className="pr-3">Matéria</th><th className="pr-3">Origem</th><th>Situação</th></tr></thead>
                <tbody>
                  {history.map((h) => (
                    <tr key={h.id} className="border-t border-white/10">
                      <td className="py-1.5 pr-3 whitespace-nowrap">{fmtDate(h.createdAt, true)}</td>
                      <td className="pr-3">{h.by}</td>
                      <td className="pr-3">{String(h.stats.total ?? "—")}</td>
                      <td className="pr-3">{String(h.stats.importadas ?? "—")}</td>
                      <td className="pr-3">{String(h.stats.ignoradas ?? "—")}</td>
                      <td className="pr-3">{String(h.stats.erros ?? "—")}</td>
                      <td className="pr-3">{h.destino}</td>
                      <td className="pr-3">{String(h.stats.origem ?? "—") || "—"}</td>
                      <td><DBadge tone={h.status === "concluido" ? "verde" : h.status === "falhou" ? "vermelho" : "ambar"}>{h.status}</DBadge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DCard>
      )}

      {result && (
        <DCard title="Resumo da importação">
          <div className="flex flex-wrap gap-2 text-[14px]">
            <DBadge tone="verde">Importadas: {result.imported}</DBadge>
            <DBadge tone="azul">Publicadas: {result.published}</DBadge>
            <DBadge tone="ambar">Ignoradas: {result.ignored}</DBadge>
            <DBadge tone={result.errors ? "vermelho" : "neutro"}>Com erro: {result.errors}</DBadge>
          </div>
          <ul className="mt-3 flex flex-col gap-1 text-[13px]">
            {result.results.map((x) => (
              <li key={x.key} className="flex flex-wrap items-center gap-2 border-t border-white/10 pt-1">
                <span className="font-semibold">{x.key.replace("q", "Questão ")}</span>
                <DBadge tone={x.status === "erro" ? "vermelho" : x.status === "ignorada" ? "ambar" : "verde"}>{x.status}</DBadge>
                {x.code && <Link href={`/banco/questoes?q=${encodeURIComponent(x.code)}`} className="text-[#ff8a8a] underline">{x.code}</Link>}
                <span className="text-white/70">{x.message}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3"><Link href="/banco/questoes" className={dButton("secundario")}>Ver questões cadastradas</Link></div>
        </DCard>
      )}

      {rows && visible.length > 0 && (
        <>
          <DCard title={`Revisão (${visible.length} questão${visible.length > 1 ? "ões" : ""})`}>
            <div className="flex flex-wrap items-center gap-2 text-[13px]">
              <DBadge tone="neutro">Identificadas: {visible.length}</DBadge>
              <DBadge tone="azul">Selecionadas: {chosen.length}</DBadge>
              <DBadge tone="verde">Prontas: {ready.length}</DBadge>
              {dupes > 0 && <DBadge tone="ambar">Possíveis duplicidades: {dupes}</DBadge>}
              <span className="flex-1" />
              <button type="button" className={dButton("discreto")} onClick={() => setRows((c) => c && c.map((r) => (r.removed ? r : { ...r, selected: true })))}>Selecionar todas</button>
              <button type="button" className={dButton("discreto")} onClick={() => setRows((c) => c && c.map((r) => ({ ...r, selected: false })))}>Desmarcar todas</button>
            </div>
          </DCard>

          {visible.map((r) => (
            <QuestionCard key={r.key} r={r} destinos={destinos} patch={(p) => patch(r.key, p)} confirmBoard={confirmBoard} />
          ))}

          <DCard title="Pasta de destino">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="dest-subject" className={dLabel}>Matéria</label>
                <select id="dest-subject" value={subjectId} onChange={(e) => { setSubjectId(e.target.value); setTopicId(""); }} className={dInput}>
                  <option value="">Escolha…</option>
                  {destinos?.subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="dest-topic" className={dLabel}>Assunto / subassunto (opcional)</label>
                <select id="dest-topic" value={topicId} onChange={(e) => setTopicId(e.target.value)} disabled={!subject} className={dInput}>
                  <option value="">Sem assunto específico</option>
                  {topicOptions.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
              </div>
            </div>
            <p className="mt-2 text-[13px] text-white/60">Matéria: só pastas já existentes. O assunto lido do texto é criado automaticamente se ainda não existir.</p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button type="button" onClick={importNow} disabled={pending || ready.length === 0} className={dButton("primario")}>{pending ? "Importando…" : `IMPORTAR ${ready.length} QUESTÃO(ÕES)`}</button>
              {chosen.length > ready.length && <span className="text-[13px] text-amber-200">{chosen.length - ready.length} selecionada(s) ainda com pendência e não serão importadas.</span>}
            </div>
          </DCard>
        </>
      )}
    </div>
  );
}

function QuestionCard({ r, destinos, patch, confirmBoard }: { r: Row; destinos: DestinoTree | null; patch: (p: Partial<Row>) => void; confirmBoard: (board: string, on: boolean) => void }) {
  const block = blocker(r);
  const own = destinos?.subjects.find((s) => s.id === r.subjectId) ?? null;
  const setOption = (i: number, text: string) => patch({ options: r.options.map((o, k) => (k === i ? { ...o, text } : o)) });
  const answerValue = r.answer ?? "";
  const pendingIssues = r.issues.filter((i) => i !== "gabarito_ausente" || !r.answer);
  return (
    <section className={`rounded-xl border p-3 sm:p-4 ${block ? "border-white/10 bg-white/[0.03]" : "border-emerald-400/25 bg-emerald-400/[0.04]"}`}>
      <div className="flex flex-wrap items-center gap-2">
        <input type="checkbox" checked={r.selected} onChange={(e) => patch({ selected: e.target.checked })} aria-label={`Importar ${r.key}`} className="h-5 w-5 accent-[#e10600]" />
        <h3 className="font-[Space_Grotesk] text-[15px] font-bold uppercase tracking-wide">{r.key.replace("q", "Questão ").padEnd(11, " ")}</h3>
        <DBadge tone="neutro">{TYPE_LABEL[r.type]}</DBadge>
        {r.type === "multipla_escolha" && <DBadge tone="neutro">{r.options.length} alternativas</DBadge>}
        {r.board && <DBadge tone={r.boardKnown || r.confirmBoard ? "azul" : "ambar"}>{r.board}</DBadge>}
        {r.year && <DBadge tone="neutro">{r.year}</DBadge>}
        {r.baseTextCode && <DBadge tone="azul">{r.baseTextCode}</DBadge>}
        {r.answer ? <DBadge tone="verde">Gabarito {r.answer === "certo" ? "Certo" : r.answer === "errado" ? "Errado" : r.answer} · {r.answerSource === "oficial" ? "oficial da fonte" : "informado por você"}</DBadge> : <DBadge tone="ambar">Sem gabarito informado</DBadge>}
        {r.duplicate === "ja_cadastrada" && <DBadge tone="vermelho">Questão já cadastrada{r.duplicateCode ? ` (${r.duplicateCode})` : ""}</DBadge>}
        {r.duplicate === "repetida_no_lote" && <DBadge tone="ambar">Possível duplicidade no lote</DBadge>}
        {!block ? <DBadge tone="verde">Pronta para importar</DBadge> : <DBadge tone="ambar">Revisão necessária</DBadge>}
        <span className="flex-1" />
        <button type="button" className={dButton("discreto")} onClick={() => patch({ open: !r.open })} aria-expanded={r.open}>{r.open ? "Recolher" : "Expandir e editar"}</button>
        <button type="button" className={dButton("perigo")} onClick={() => patch({ removed: true, selected: false })}>Excluir</button>
      </div>
      {!r.open && <p className="mt-2 line-clamp-2 text-[14px] text-white/75">{r.statement}</p>}
      {block && <p className="mt-1 text-[13px] text-amber-200">{block}</p>}
      {!r.open && pendingIssues.length > 0 && <p className="mt-1 text-[12px] text-white/50">{pendingIssues.map((i) => ISSUE_LABEL[i]).join(" · ")}</p>}
      <div className="mt-3 grid gap-3 border-t border-white/10 pt-3 sm:grid-cols-[220px_1fr]">
        <Field label="Gabarito">
          <select className={dInput} value={answerValue} onChange={(e) => patch({ answer: e.target.value || null, answerSource: e.target.value ? (e.target.value === r.answer ? r.answerSource : "administrador") : null })}>
            <option value="">Sem gabarito informado</option>
            {r.type === "multipla_escolha" ? r.options.map((o) => <option key={o.label} value={o.label}>{o.label}</option>) : <><option value="certo">Certo</option><option value="errado">Errado</option></>}
          </select>
        </Field>
        <Field label="Comentário da questão (o que veio no material, ou o seu)"><textarea className={`${dTextarea} min-h-20`} value={r.comment ?? ""} onChange={(e) => { const v = e.target.value; const n = r.type === "multipla_escolha" ? splitCommentByOption(v) : null; patch(!r.answer && n?.answer && r.options.some((o) => o.label === n.answer) ? { comment: v || null, answer: n.answer, answerSource: "administrador" } : { comment: v || null }); }} placeholder="Cole o comentário: Gabarito: A) … e depois B) …, C) … para as erradas" /></Field>
      </div>

      {r.open && (
        <div className="mt-3 flex flex-col gap-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Banca"><input className={dInput} value={r.board ?? ""} onChange={(e) => patch({ board: e.target.value || null })} /></Field>
            <Field label="Ano"><input className={dInput} inputMode="numeric" value={r.year ?? ""} onChange={(e) => patch({ year: Number(e.target.value.replace(/\D/g, "").slice(0, 4)) || null })} /></Field>
            <Field label="Tipo">
              <select className={dInput} value={r.type} onChange={(e) => patch({ type: e.target.value as Row["type"], answer: null, answerSource: null })}>
                <option value="multipla_escolha">Múltipla escolha</option>
                <option value="certo_errado">Certo ou Errado</option>
                <option value="discursiva">Sem alternativas</option>
              </select>
            </Field>
            <Field label="Concurso (cargo e órgão, como na origem)"><input className={dInput} value={r.examLine ?? ""} onChange={(e) => patch({ examLine: e.target.value || null })} /></Field>
            <Field label="Cargo"><input className={dInput} value={r.role ?? ""} onChange={(e) => patch({ role: e.target.value || null })} /></Field>
            <Field label="Órgão"><input className={dInput} value={r.organ ?? ""} onChange={(e) => patch({ organ: e.target.value || null })} /></Field>
          </div>
          {r.issues.includes("banca_desconhecida") && (
            <label className="flex items-center gap-2 text-[14px]"><input type="checkbox" className="h-4 w-4 accent-[#e10600]" checked={r.confirmBoard} onChange={(e) => confirmBoard(r.board!, e.target.checked)} /> Confirmo a banca “{r.board}” (fica gravada: não pergunto de novo)</label>
          )}
          {r.duplicate !== "inedita" && (
            <label className="flex items-center gap-2 text-[14px]"><input type="checkbox" className="h-4 w-4 accent-[#e10600]" checked={r.allowDuplicate} onChange={(e) => patch({ allowDuplicate: e.target.checked })} /> Importar mesmo assim (não é duplicada)</label>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Matéria desta questão (opcional)">
              <select className={dInput} value={r.subjectId ?? ""} onChange={(e) => patch({ subjectId: e.target.value || null, topicId: null })}>
                <option value="">Usar a pasta de destino do lote</option>
                {destinos?.subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </Field>
            <Field label="Assunto desta questão">
              <select className={dInput} disabled={!own} value={r.topicId ?? ""} onChange={(e) => patch({ topicId: e.target.value || null })}>
                <option value="">Sem assunto específico</option>
                {own?.topics.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              {r.topic && !r.topicId && (
                <p className="mt-2 text-[13px] text-[#6ee7b7]">Assunto “{r.topic}” será criado automaticamente na matéria ao importar.</p>
              )}
            </Field>
          </div>
          {(r.baseTextCode || r.baseText) && (
            <div className="grid gap-2">
              <Field label="Identificação do texto-base"><input className={dInput} value={r.baseTextCode ?? ""} maxLength={60} onChange={(e) => patch({ baseTextCode: e.target.value || null })} /></Field>
              <Field label="Texto-base (preservado integralmente)"><textarea className={`${dTextarea} min-h-40`} value={r.baseText ?? ""} onChange={(e) => patch({ baseText: e.target.value || null })} /></Field>
            </div>
          )}
          {!r.baseText && (
            <button type="button" className={`${dButton("discreto")} self-start`} onClick={() => patch({ baseTextCode: r.baseTextCode ?? "Texto 1", baseText: "" })}>Associar texto-base</button>
          )}
          <Field label="Enunciado"><textarea className={`${dTextarea} min-h-28`} value={r.statement} onChange={(e) => patch({ statement: e.target.value })} /></Field>
          {r.type === "multipla_escolha" && (
            <div className="flex flex-col gap-2">
              <span className={dLabel}>Alternativas</span>
              {r.options.map((o, i) => (
                <div key={o.label + i} className="flex items-start gap-2">
                  <span className="mt-2 w-6 font-bold">{o.label})</span>
                  <textarea className={`${dTextarea} min-h-12`} value={o.text} onChange={(e) => setOption(i, e.target.value)} aria-label={`Alternativa ${o.label}`} />
                  <button type="button" className={dButton("perigo")} onClick={() => patch({ options: r.options.filter((_, k) => k !== i).map((x, k) => ({ ...x, label: "ABCDE"[k]! })), answer: null, answerSource: null })} aria-label={`Remover alternativa ${o.label}`}>×</button>
                </div>
              ))}
              {r.options.length < 5 && <button type="button" className={`${dButton("discreto")} self-start`} onClick={() => patch({ options: [...r.options, { label: "ABCDE"[r.options.length]!, text: "" }].filter((o) => o.text || true) })}>+ Alternativa</button>}
            </div>
          )}
          <details className="text-[13px] text-white/60"><summary className="cursor-pointer">Conteúdo bruto original</summary><pre className="mt-2 max-h-60 overflow-auto whitespace-pre-wrap rounded-md bg-black/40 p-2 text-white/70">{r.raw}</pre></details>
        </div>
      )}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <span className={dLabel}>{label}</span>
      {children}
    </div>
  );
}
