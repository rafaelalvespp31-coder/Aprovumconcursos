import Link from "next/link";
import { bankLookups, findSimilar, getQuestion, requireBankStaff, staffNames, topicPath } from "@/server/services/bank";
import { EDITABLE_STATUSES } from "@/domain/bank/workflow";
import {
  DIFFICULTY_LABEL,
  FLAG_LABEL,
  ORIGIN_LABEL,
  RIGHTS_LABEL,
  SOURCE_KIND_LABEL,
  STATUS_LABEL,
  TYPE_LABEL,
  type BankStatus,
  type Difficulty,
  type Origin,
  type QuestionType,
  type SourceKind,
  type UsageRights,
} from "@/domain/bank/labels";
import { DBadge, DCard, DNotice, STATUS_TONE, dButton, fmtDate } from "../../ui";
import { DecisionPanel } from "./decision-panel";
import { FlagActions } from "./flag-actions";

export const metadata = { title: "Questão — Banco" };

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(110px,30%)_1fr] gap-3 border-b border-white/[0.07] py-2 text-[14px] last:border-0">
      <dt className="text-white/50">{label}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </div>
  );
}

export default async function BankQuestionPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ duplicidade?: string; salvo?: string }> }) {
  const staff = await requireBankStaff();
  const { id } = await params;
  const sp = await searchParams;
  const [q, lk] = await Promise.all([getQuestion(id), bankLookups()]);
  const [names, similar] = await Promise.all([
    staffNames([q.created_by, q.approved_by, ...q.reviews.map((r) => r.reviewer_id), ...q.versions.map((v) => v.changed_by)]),
    findSimilar(q.statement, q.subject_id, q.id, 0.45),
  ]);
  const subject = lk.subjects.find((s) => s.id === q.subject_id)?.name ?? "—";
  const board = (slug: string | null) => lk.boards.find((b) => b.slug === slug)?.name ?? slug ?? "—";
  const isCreator = q.created_by === staff.id;
  const openFlags = q.flags.filter((f) => f.status === "aberto" || f.status === "em_analise");
  const who = (uid: string | null) => (uid ? (names[uid] ?? "membro da equipe") : "—");

  return (
    <div className="flex flex-col gap-5">
      {sp.salvo && <DNotice tone="ok">Questão salva. Ela só será publicada depois da revisão por outra pessoa.</DNotice>}
      {sp.duplicidade && <DNotice tone="alerta">Salvo, mas encontramos {sp.duplicidade} questão(ões) parecida(s). Um alerta de duplicidade foi aberto para revisão.</DNotice>}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-mono text-[24px] font-bold text-[#ff8080]">{q.public_code}</h1>
            <DBadge tone={STATUS_TONE[q.status]}>{STATUS_LABEL[q.status]}</DBadge>
            {q.current_version > 0 && <DBadge tone="azul">versão {q.current_version}</DBadge>}
            {openFlags.length > 0 && <DBadge tone="vermelho">{openFlags.length} alerta(s)</DBadge>}
          </div>
          <p className="mt-1 text-[14px] text-white/60">
            {subject}
            {q.topic_id ? ` › ${topicPath(lk.topics, q.topic_id)}` : ""} · {TYPE_LABEL[q.question_type as QuestionType]} · {DIFFICULTY_LABEL[q.initial_difficulty as Difficulty]}
          </p>
        </div>
        <div className="flex gap-2">
          {EDITABLE_STATUSES.has(q.status) && (staff.roles.autor || staff.roles.revisor) && (
            <Link href={`/banco/questoes/${q.id}/editar`} className={dButton("secundario")}>Editar</Link>
          )}
          <Link href="/banco/questoes" className={dButton("discreto")}>Voltar</Link>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-5">
          <DCard title="Questão">
            {q.case_context && (
              <div className="mb-3 whitespace-pre-wrap rounded-md border-l-4 border-white/20 bg-white/[0.04] p-3 text-[15px] text-white/80">{q.case_context}</div>
            )}
            <p className="whitespace-pre-wrap text-[16px] leading-relaxed">{q.statement}</p>
            {q.question_type === "multipla_escolha" ? (
              <ol className="mt-4 flex flex-col gap-2">
                {q.options.map((o) => (
                  <li key={o.label} className={`rounded-lg border p-3 ${o.is_correct ? "border-emerald-400/60 bg-emerald-400/[0.08]" : "border-white/10"}`}>
                    <div className="flex gap-3">
                      <span className={`flex size-7 shrink-0 items-center justify-center rounded-full text-[13px] font-bold ${o.is_correct ? "bg-emerald-500 text-black" : "bg-white/10"}`}>{o.label}</span>
                      <div className="min-w-0">
                        <p className="whitespace-pre-wrap text-[15px]">{o.text}</p>
                        {o.explanation && <p className={`mt-1 text-[13px] ${o.is_correct ? "text-emerald-200/90" : "text-white/55"}`}>{o.explanation}</p>}
                      </div>
                    </div>
                  </li>
                ))}
                {q.options.length === 0 && <DNotice tone="erro">Sem alternativas cadastradas.</DNotice>}
              </ol>
            ) : (
              <p className="mt-4 inline-flex rounded-md border border-emerald-400/60 bg-emerald-400/[0.1] px-3 py-1.5 font-semibold text-emerald-200">
                Gabarito: {q.correct_answer_true ? "Certo" : "Errado"}
              </p>
            )}
            <div className="mt-4">
              <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-white/50">Justificativa do gabarito</p>
              {q.justification ? <p className="mt-1 whitespace-pre-wrap text-[15px] text-white/85">{q.justification}</p> : <p className="mt-1 text-[14px] text-amber-200">Ainda não informada (obrigatória para aprovar).</p>}
            </div>
          </DCard>

          <DCard title="Fonte e direitos de uso">
            <dl>
              <Row label="Origem">{ORIGIN_LABEL[q.origin as Origin]}</Row>
              {q.origin === "prova_anterior" && (
                <>
                  <Row label="Concurso">{q.exam ? `${q.exam.name}${q.exam.year ? ` (${q.exam.year})` : ""}` : "—"}</Row>
                  <Row label="Banca / ano / nº">
                    {board(q.board_slug)} · {q.year ?? "—"} · {q.original_number ?? "—"}
                  </Row>
                </>
              )}
              <Row label="Estilo de cobrança">{q.board_style ? board(q.board_style) : "—"}</Row>
              <Row label="Fonte">
                {q.source ? (
                  <>
                    {q.source.name} <span className="text-white/50">({SOURCE_KIND_LABEL[q.source.kind as SourceKind]})</span>
                    {q.source.url && (
                      <a href={q.source.url} target="_blank" rel="noreferrer noopener" className="ml-1 text-[#ff8080] underline">link</a>
                    )}
                    <div className="mt-1">
                      {q.source.reuse_verified ? <DBadge tone="verde">Autorização de reutilização verificada</DBadge> : <DBadge tone="ambar">Autorização não verificada</DBadge>}
                    </div>
                  </>
                ) : (
                  "—"
                )}
              </Row>
              <Row label="Direito de uso">{RIGHTS_LABEL[q.usage_rights as UsageRights]}</Row>
              <Row label="Referência">{q.legal_basis ?? "—"}</Row>
              <Row label="Verificação das fontes">{fmtDate(q.verified_at)}</Row>
              <Row label="Última revisão">{fmtDate(q.reviewed_at, true)}</Row>
            </dl>
            {q.legal_refs.length > 0 && (
              <div className="mt-4">
                <p className="mb-2 text-[13px] font-semibold uppercase tracking-[0.08em] text-white/50">Referências legais</p>
                <ul className="flex flex-col gap-2">
                  {q.legal_refs.map((r, i) => (
                    <li key={i} className="rounded-md border border-white/10 p-3 text-[14px]">
                      <p className="font-semibold">
                        {String(r.norm_name)}
                        {r.norm_number ? ` — ${r.norm_number}` : ""}
                        {r.article ? `, art. ${r.article}` : ""}
                        {r.paragraph ? `, § ${r.paragraph}` : ""}
                        {r.item ? `, inc. ${r.item}` : ""}
                        {r.letter ? `, al. ${r.letter}` : ""}
                      </p>
                      <p className="text-white/55">
                        Consultada em {fmtDate(String(r.consulted_on))}
                        {r.norm_version ? ` · ${r.norm_version}` : ""}
                      </p>
                      {r.official_url && (
                        <a href={String(r.official_url)} target="_blank" rel="noreferrer noopener" className="text-[13px] text-[#ff8080] underline">Fonte oficial</a>
                      )}
                      {r.amendment_note && <p className="mt-1 text-amber-200/90">Alteração: {String(r.amendment_note)}</p>}
                      {r.case_law_id && (
                        <p className="mt-1 text-white/75">
                          Jurisprudência: {String(r.case_law_court)} — {String(r.case_law_id)}
                          {r.case_law_thesis ? `: ${r.case_law_thesis}` : ""}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </DCard>

          <DCard title="Análise por IA">
            {q.ai_reviews.length === 0 ? (
              <p className="text-[14px] text-white/55">Nenhuma análise por IA registrada. A confiança declarada por um modelo nunca substitui a revisão humana.</p>
            ) : (
              <ul className="flex flex-col gap-2 text-[14px]">
                {q.ai_reviews.map((a) => (
                  <li key={a.id} className="rounded-md border border-white/10 p-3">
                    <p className="font-semibold">
                      {a.provider} / {a.model} · prompt {a.prompt_version} · {fmtDate(a.created_at, true)}
                    </p>
                    <p className="text-white/60">
                      Confiança declarada: {a.declared_confidence ?? "—"} (não é prova de correção) · revisão humana: {a.human_status}
                    </p>
                    <pre className="mt-2 max-h-48 overflow-auto rounded bg-black/40 p-2 text-[12px] text-white/70">{JSON.stringify(a.alerts, null, 2)}</pre>
                  </li>
                ))}
              </ul>
            )}
          </DCard>

          <DCard title="Histórico de versões">
            {q.versions.length === 0 ? (
              <p className="text-[14px] text-white/55">Nenhuma versão congelada ainda. A versão 1 é criada na primeira aprovação.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {q.versions.map((v) => (
                  <li key={v.version}>
                    <details className="rounded-md border border-white/10 p-3">
                      <summary className="cursor-pointer text-[14px]">
                        <span className="font-semibold">Versão {v.version}</span> · {fmtDate(v.created_at, true)} · aprovada por {who(v.changed_by)}
                        {v.reason ? <span className="text-white/60"> — {v.reason}</span> : null}
                      </summary>
                      <p className="mt-2 whitespace-pre-wrap text-[14px] text-white/80">{String(v.snapshot.statement ?? "")}</p>
                      <pre className="mt-2 max-h-64 overflow-auto rounded bg-black/40 p-2 text-[12px] text-white/60">{JSON.stringify(v.snapshot.options ?? v.snapshot.correct_answer_true, null, 2)}</pre>
                    </details>
                  </li>
                ))}
              </ul>
            )}
          </DCard>
        </div>

        <div className="flex flex-col gap-5">
          <DCard title="Decisão">
            <DecisionPanel
              id={q.id}
              status={q.status as BankStatus}
              roles={staff.roles}
              isCreator={isCreator}
              rightsOk={q.usage_rights === "autorizado" || q.usage_rights === "proprio"}
              checklist={{ content: q.content_checked, answer: q.answer_checked, source: q.source_checked, rights: q.rights_checked }}
            />
            <dl className="mt-4">
              <Row label="Criada por">{who(q.created_by)}{isCreator ? " (você)" : ""}</Row>
              <Row label="Criada em">{fmtDate(q.created_at, true)}</Row>
              <Row label="Aprovada por">{q.approved_by ? `${who(q.approved_by)} em ${fmtDate(q.approved_at, true)}` : "—"}</Row>
              <Row label="Publicada em">{fmtDate(q.published_at, true)}</Row>
            </dl>
          </DCard>

          <DCard title="Alertas e duplicidade">
            {q.flags.length === 0 && similar.length === 0 && <p className="text-[14px] text-white/55">Nenhum alerta.</p>}
            <ul className="flex flex-col gap-3">
              {q.flags.map((f) => (
                <li key={f.id} className="rounded-md border border-white/10 p-3 text-[14px]">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <DBadge tone={f.status === "aberto" || f.status === "em_analise" ? "vermelho" : "neutro"}>{FLAG_LABEL[f.kind] ?? f.kind}</DBadge>
                    <span className="text-[12px] text-white/50">{f.status} · {fmtDate(f.created_at)}</span>
                  </div>
                  {f.details && <p className="text-white/75">{f.details}</p>}
                  {f.similar_question_id && (
                    <Link href={`/banco/questoes/${f.similar_question_id}`} className="text-[13px] text-[#ff8080] underline">Ver a questão parecida</Link>
                  )}
                  {(f.status === "aberto" || f.status === "em_analise") && staff.roles.revisor && (
                    <div className="mt-2">
                      <FlagActions flagId={f.id} questionId={q.id} status={f.status} />
                    </div>
                  )}
                </li>
              ))}
            </ul>
            {similar.length > 0 && (
              <div className="mt-3">
                <p className="mb-1 text-[13px] font-semibold text-white/60">Semelhança textual agora (alerta, não conclusão):</p>
                <ul className="flex flex-col gap-1 text-[13px]">
                  {similar.map((h) => (
                    <li key={h.question_id}>
                      <Link href={`/banco/questoes/${h.question_id}`} className="font-mono text-[#ff8080] underline">{h.public_code}</Link> — {Math.round(h.similarity * 100)}%
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </DCard>

          <DCard title="Registro de decisões">
            {q.reviews.length === 0 ? (
              <p className="text-[14px] text-white/55">Nenhuma decisão ainda.</p>
            ) : (
              <ol className="flex flex-col gap-2 text-[13px]">
                {q.reviews.map((r) => (
                  <li key={r.id} className="border-l-2 border-[#ff2a2a]/50 pl-3">
                    <p>
                      <span className="text-white/50">{r.from_status ? STATUS_LABEL[r.from_status as BankStatus] : "—"}</span> →{" "}
                      <span className="font-semibold">{STATUS_LABEL[r.to_status as BankStatus] ?? r.to_status}</span>
                    </p>
                    <p className="text-white/50">
                      {who(r.reviewer_id)} · {fmtDate(r.created_at, true)}
                    </p>
                    {r.notes && <p className="text-white/75">“{r.notes}”</p>}
                  </li>
                ))}
              </ol>
            )}
          </DCard>
        </div>
      </div>
    </div>
  );
}
