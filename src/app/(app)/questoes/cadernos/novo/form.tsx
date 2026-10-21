"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CirclePlus, NotebookTabs } from "lucide-react";
import type { NotebookInput, NotebookLookups } from "@/server/services/notebooks";
import { DEFAULT_NOTEBOOK_TITLE, NOTEBOOK_TITLE_MAX } from "@/domain/notebooks/model";
import { callAction } from "@/components/safe-action";
import { createNotebookAction, type Result } from "../../actions";

const field = "h-12 w-full rounded-[12px] border border-[#DADBE0] bg-white px-3.5 text-[14.5px] text-[#08090B] outline-none transition focus:border-[#E50914] focus:ring-2 focus:ring-[#E50914]/15";
const TYPES = [
  { v: "", label: "Todos os tipos" },
  { v: "multipla_escolha", label: "Múltipla escolha" },
  { v: "certo_errado", label: "Certo ou errado" },
] as const;

const qty = (n: number) => (n ? ` (${n})` : "");

export function NewNotebookForm({
  lookups,
  base,
  create = createNotebookAction,
}: {
  lookups: NotebookLookups;
  base: string;
  /** A galeria troca a ação do servidor por uma versão em memória. */
  create?: (input: NotebookInput) => Promise<Result<string>>;
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [subjectId, setSubject] = useState("");
  const [examId, setExam] = useState("");
  const [boardSlug, setBoard] = useState("");
  const [questionType, setType] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const matching = lookups.published.filter(
    (q) => (!subjectId || q.s === subjectId) && (!examId || q.e === examId) && (!boardSlug || q.b === boardSlug) && (!questionType || q.t === questionType),
  ).length;
  const exam = lookups.exams.find((e) => e.id === examId);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    start(async () => {
      const r = await callAction(
        () =>
          create({
            title,
            subjectId: subjectId || null,
            examId: examId || null,
            boardSlug: boardSlug || null,
            questionType: (questionType || null) as NotebookInput["questionType"],
          }),
        setError,
      );
      if (!r) return;
      if (!r.ok) return setError(r.error);
      router.push(`${base}/questoes/cadernos/${r.data}`);
    });
  };

  return (
    <form onSubmit={submit} className="pc mx-auto w-full max-w-[720px] p-5 sm:p-7" aria-labelledby="novo-caderno" data-testid="novo-caderno">
      <div className="flex items-center gap-3.5">
        <span className="cq-ico" aria-hidden>
          <NotebookTabs className="h-5 w-5" />
        </span>
        <div>
          <h1 id="novo-caderno" className="text-[20px] font-extrabold tracking-[-0.01em] text-[#08090B] sm:text-[22px]">
            Novo caderno de questões
          </h1>
          <p className="mt-0.5 text-[13px] text-[#64666D]">Escolha os filtros. O caderno mostra as questões de concurso revisadas que se encaixam neles — inclusive as que forem publicadas depois.</p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <label htmlFor="nc-nome" className="text-[13px] font-bold text-[#08090B]">Nome do caderno</label>
          <input
            id="nc-nome"
            className={field}
            value={title}
            maxLength={NOTEBOOK_TITLE_MAX}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={exam ? exam.name.split(" · ")[0]!.toUpperCase() : DEFAULT_NOTEBOOK_TITLE}
          />
          <span className="text-[12px] text-[#8A8C93]">Opcional. Sem nome, usamos o do concurso escolhido ou “{DEFAULT_NOTEBOOK_TITLE}”.</span>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="nc-materia" className="text-[13px] font-bold text-[#08090B]">Matéria</label>
          <select id="nc-materia" className={field} value={subjectId} onChange={(e) => setSubject(e.target.value)}>
            <option value="">Todas as matérias</option>
            {lookups.subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
                {qty(s.available)}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="nc-concurso" className="text-[13px] font-bold text-[#08090B]">Concurso / prova</label>
          <select id="nc-concurso" className={field} value={examId} onChange={(e) => setExam(e.target.value)}>
            <option value="">Todos os concursos</option>
            {lookups.exams.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
                {qty(x.available)}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="nc-banca" className="text-[13px] font-bold text-[#08090B]">Banca</label>
          <select id="nc-banca" className={field} value={boardSlug} onChange={(e) => setBoard(e.target.value)}>
            <option value="">Todas as bancas</option>
            {lookups.boards.map((b) => (
              <option key={b.slug} value={b.slug}>
                {b.name}
                {qty(b.available)}
              </option>
            ))}
          </select>
        </div>
        <fieldset className="flex flex-col gap-1.5">
          <legend className="mb-1.5 text-[13px] font-bold text-[#08090B]">Tipo de questão</legend>
          <div className="flex flex-wrap gap-2">
            {TYPES.map((t) => (
              <label key={t.v} className="pc-aba cursor-pointer has-[:checked]:border-[#E50914] has-[:checked]:bg-[#E50914] has-[:checked]:text-white has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-[#E50914]">
                <input type="radio" name="tipo" value={t.v} checked={questionType === t.v} onChange={() => setType(t.v)} className="sr-only" />
                {t.label}
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      <p className="mt-6 rounded-[12px] bg-[#F7F8FA] px-4 py-3 text-[13.5px] text-[#3A3C42]" aria-live="polite" data-testid="contagem-filtro">
        {matching ? (
          <>
            <strong className="text-[#08090B]">{matching}</strong> {matching === 1 ? "questão publicada se encaixa" : "questões publicadas se encaixam"} nesses filtros hoje.
          </>
        ) : (
          <>Ainda não há questões publicadas com esses filtros. Você pode criar o caderno mesmo assim: as questões aparecem nele assim que forem publicadas.</>
        )}
      </p>

      {error && (
        <p role="alert" className="mt-4 rounded-[10px] border border-[#F2C4C7] bg-[#FDECED] px-3 py-2 text-[13px] font-medium text-[#B9000B]">
          {error}
        </p>
      )}

      <button type="submit" disabled={pending} className="cq-criar mt-6 disabled:opacity-60">
        <CirclePlus className="h-5 w-5" aria-hidden /> {pending ? "Criando…" : "Criar caderno"}
      </button>
    </form>
  );
}
