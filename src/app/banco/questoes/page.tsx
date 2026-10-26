import Link from "next/link";
import { bankLookups, listQuestions, PAGE_SIZE, requireBankStaff, topicPath } from "@/server/services/bank";
import { BANK_STATUSES, DIFFICULTIES, DIFFICULTY_LABEL, ORIGIN_LABEL, ORIGINS, STATUS_LABEL, TYPE_LABEL, type QuestionType } from "@/domain/bank/labels";
import { DBadge, DCard, DLink, STATUS_TONE, dButton, dInput, fmtDate } from "../ui";

export const metadata = { title: "Questões — Banco" };

type SP = Record<string, string | undefined>;

export default async function BankQuestionsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const staff = await requireBankStaff();
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const [lk, list] = await Promise.all([bankLookups(), listQuestions({ ...sp, page })]);
  const pages = Math.max(1, Math.ceil(list.total / PAGE_SIZE));
  const qs = (p: number) => {
    const u = new URLSearchParams(Object.entries(sp).filter(([k, v]) => v && k !== "page") as Array<[string, string]>);
    u.set("page", String(p));
    return `?${u.toString()}`;
  };
  const subjectTopics = sp.subject ? lk.topics.filter((t) => t.subject_id === sp.subject) : [];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-[Space_Grotesk] text-[26px] font-bold">Questões</h1>
          <p className="text-[14px] text-white/60">{list.total} encontrada(s)</p>
        </div>
        {staff.roles.autor && <DLink href="/banco/importar">Enviar questões (PDF ou .txt)</DLink>}
      </div>

      <DCard>
        <form className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4" role="search">
          <input name="q" defaultValue={sp.q} placeholder="Buscar no enunciado ou código APV-…" className={`${dInput} sm:col-span-2`} aria-label="Busca textual" />
          <select name="subject" defaultValue={sp.subject ?? ""} className={dInput} aria-label="Matéria">
            <option value="">Todas as matérias</option>
            {lk.subjects.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <select name="topic" defaultValue={sp.topic ?? ""} className={dInput} aria-label="Assunto" disabled={!subjectTopics.length}>
            <option value="">{subjectTopics.length ? "Todos os assuntos" : "Assunto (escolha a matéria)"}</option>
            {subjectTopics.map((t) => (
              <option key={t.id} value={t.id}>{topicPath(lk.topics, t.id)}</option>
            ))}
          </select>
          <select name="status" defaultValue={sp.status ?? ""} className={dInput} aria-label="Status">
            <option value="">Todos (exceto arquivadas)</option>
            {BANK_STATUSES.map((s) => (
              <option key={s} value={s}>{STATUS_LABEL[s]}</option>
            ))}
          </select>
          <select name="difficulty" defaultValue={sp.difficulty ?? ""} className={dInput} aria-label="Dificuldade">
            <option value="">Todas as dificuldades</option>
            {DIFFICULTIES.map((d) => (
              <option key={d} value={d}>{DIFFICULTY_LABEL[d]}</option>
            ))}
          </select>
          <select name="origin" defaultValue={sp.origin ?? ""} className={dInput} aria-label="Origem">
            <option value="">Todas as origens</option>
            {ORIGINS.map((o) => (
              <option key={o} value={o}>{ORIGIN_LABEL[o]}</option>
            ))}
          </select>
          <select name="board" defaultValue={sp.board ?? ""} className={dInput} aria-label="Banca">
            <option value="">Todas as bancas</option>
            {lk.boards.map((b) => (
              <option key={b.slug} value={b.slug}>{b.name}</option>
            ))}
          </select>
          <select name="exam" defaultValue={sp.exam ?? ""} className={dInput} aria-label="Concurso">
            <option value="">Todos os concursos</option>
            {lk.exams.map((e) => (
              <option key={e.id} value={e.id}>{e.name}{e.year ? ` (${e.year})` : ""}</option>
            ))}
          </select>
          <input name="year" defaultValue={sp.year} inputMode="numeric" pattern="\d{4}" placeholder="Ano" className={dInput} aria-label="Ano" />
          <select name="source" defaultValue={sp.source ?? ""} className={dInput} aria-label="Fonte">
            <option value="">Todas as fontes</option>
            {lk.sources.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <label className="flex min-h-11 items-center gap-2 text-[14px] text-white/80">
            <input type="checkbox" name="flagged" value="1" defaultChecked={sp.flagged === "1"} className="size-4 accent-[#e10600]" /> Só com alerta aberto
          </label>
          <div className="flex gap-2 sm:col-span-2 lg:col-span-4">
            <button className={dButton("primario")}>Filtrar</button>
            <Link href="/banco/questoes" className={dButton("discreto")}>Limpar</Link>
          </div>
        </form>
      </DCard>

      {list.rows.length === 0 ? (
        <DCard>
          <p className="text-[15px] text-white/70">Nenhuma questão com esses filtros.</p>
        </DCard>
      ) : (
        <ul className="flex flex-col gap-2">
          {list.rows.map((q) => (
            <li key={q.id}>
              <Link href={`/banco/questoes/${q.id}`} className="block rounded-xl border border-white/10 bg-white/[0.03] p-4 transition hover:border-[#ff2a2a]/50 hover:bg-white/[0.05] active:scale-[0.995]">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[13px] font-bold text-[#ff8080]">{q.public_code}</span>
                  <DBadge tone={STATUS_TONE[q.status]}>{STATUS_LABEL[q.status]}</DBadge>
                  <DBadge>{DIFFICULTY_LABEL[q.initial_difficulty as keyof typeof DIFFICULTY_LABEL]}</DBadge>
                  <DBadge tone={q.origin === "ia_assistida" ? "azul" : "neutro"}>{ORIGIN_LABEL[q.origin as keyof typeof ORIGIN_LABEL]}</DBadge>
                  <span className="text-[12px] text-white/45">{TYPE_LABEL[q.question_type as QuestionType]}</span>
                </div>
                <p className="line-clamp-2 text-[15px] text-white/90">{q.statement}</p>
                <p className="mt-2 text-[12px] text-white/50">
                  {q.subjects?.name}
                  {q.subject_topics?.name ? ` › ${q.subject_topics.name}` : ""}
                  {q.year ? ` · ${q.board_slug?.toUpperCase() ?? ""} ${q.year}` : ""} · atualizada em {fmtDate(q.updated_at)}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {pages > 1 && (
        <nav className="flex items-center justify-center gap-2 text-[14px]" aria-label="Paginação">
          {page > 1 && <Link className={dButton("secundario")} href={qs(page - 1)}>Anterior</Link>}
          <span className="text-white/60">Página {page} de {pages}</span>
          {page < pages && <Link className={dButton("secundario")} href={qs(page + 1)}>Próxima</Link>}
        </nav>
      )}
    </div>
  );
}
