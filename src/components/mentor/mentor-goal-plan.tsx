"use client";

import { MentorPlanoMini } from "./mentor-plano-mini";
import { ExcluirPlano } from "./excluir-plano";
import { useEffect, useState, useTransition } from "react";
import { Check, Pencil, Send } from "lucide-react";
import type { StudyPlan } from "@/domain/mentor/plan";
import { listMentorContestsAction, setMentorGoalAction } from "@/app/(app)/mentor/actions";
import type { ContestOption } from "@/server/services/mentor-goal";

const STATUS: Record<string, string> = { previsto: "Previsto", autorizado: "Autorizado", edital_publicado: "Edital publicado", inscricoes_abertas: "Inscrições abertas", inscricoes_encerradas: "Inscrições encerradas", prova_realizada: "Prova realizada", encerrado: "Encerrado" };
const BRANCO = { color: "#fff", WebkitTextFillColor: "#fff" } as const;
const DIM = { color: "rgba(255,255,255,.7)", WebkitTextFillColor: "rgba(255,255,255,.7)" } as const;

/**
 * Mensagem principal do Mentor: "Já sabe qual concurso você quer ser aprovado?". O aluno escolhe, entre os
 * concursos cadastrados na plataforma, o dele e aperta Ok; o Mentor monta o plano (pelo edital, quando houver).
 */
export function MentorGoalPlan({ goal, plan, name, onChange, base = "", onNavigate }: { base?: string; onNavigate?: () => void; goal: { contest: string } | null; plan: StudyPlan | null; name?: string | null; onChange: (goal: { contest: string } | null, plan: StudyPlan | null) => void }) {
  const [editing, setEditing] = useState(false);
  const [options, setOptions] = useState<ContestOption[] | null>(null);
  const [sel, setSel] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const ask = !goal || editing;

  useEffect(() => {
    if (!ask || options) return;
    let vivo = true;
    listMentorContestsAction().then((o) => { if (vivo) setOptions(o); }).catch(() => { if (vivo) setOptions([]); });
    return () => { vivo = false; };
  }, [ask, options]);

  const send = () => {
    setError(null);
    const opt = options?.find((o) => o.id === sel) ?? null;
    start(async () => {
      const r = await setMentorGoalAction(opt ? opt.name : text, opt?.id);
      if (!r.ok) return setError(r.error);
      onChange(r.goal, r.plan);
      setText("");
      setSel(null);
      setEditing(false);
    });
  };
  const semLista = options !== null && options.length === 0;
  const podeOk = !pending && (sel !== null || (semLista && text.trim().length > 0));

  return (
    <div className="flex flex-col gap-3" data-testid="mentor-objetivo">
      <div className="rounded-2xl rounded-tl-sm bg-[#111] p-3.5 text-white">
        <p className="text-[14px] font-bold leading-snug">
          {ask ? <>{name ? `${name}, já` : "Já"} sabe qual concurso você quer ser aprovado?</> : <>Seu plano está pronto. Foco total!</>}
        </p>
        {ask && <p className="mt-1 text-[12px] text-white/70">Escolha o seu concurso e aperte Ok. Eu monto o seu plano: o que estudar, quais dias, quantas horas e questões, seguindo o edital.</p>}
      </div>

      {ask && (
        <form onSubmit={(e) => { e.preventDefault(); if (podeOk) send(); }} className="flex flex-col gap-2.5">
          {options === null && <p className="text-[12.5px]" style={DIM}>Carregando concursos…</p>}
          {options && options.length > 0 && (
            <div role="radiogroup" aria-label="Concursos cadastrados na plataforma" className="flex flex-col gap-2" data-testid="mentor-objetivo-lista">
              {options.map((o) => {
                const on = sel === o.id;
                return (
                  <button key={o.id} type="button" role="radio" aria-checked={on} onClick={() => setSel(o.id)} data-testid="mentor-objetivo-opcao"
                    className={`flex min-h-14 items-center gap-3 rounded-xl border-2 p-3 text-left transition active:scale-[0.98] ${on ? "border-[#E10600] bg-[#E10600]/15" : "border-white/15 bg-white/5 hover:border-white/40"}`}>
                    <span className={`grid size-6 shrink-0 place-items-center rounded-full border-2 ${on ? "border-[#E10600] bg-[#E10600]" : "border-white/40"}`}>{on && <Check className="h-3.5 w-3.5" style={BRANCO} aria-hidden />}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[14px] font-extrabold leading-tight" style={BRANCO}>{o.name}</span>
                      <span className="block truncate text-[12px]" style={DIM}>{[o.institution !== o.name ? o.institution : null, o.role].filter(Boolean).join(" · ")}</span>
                    </span>
                    <span className="shrink-0 rounded-full bg-white/12 px-2 py-0.5 text-[10.5px] font-bold" style={BRANCO}>{o.uf ? `${o.uf} · ` : ""}{STATUS[o.status] ?? o.status}</span>
                  </button>
                );
              })}
            </div>
          )}
          {semLista && (
            <input value={text} onChange={(e) => setText(e.target.value)} maxLength={120} placeholder="Escreva o concurso que você quer passar…" aria-label="Concurso que você quer passar" data-testid="mentor-objetivo-input"
              className="min-h-11 min-w-0 rounded-xl border border-[#D4D4D4] bg-white px-3 text-[16px] text-[#08090B] caret-[#08090B] outline-none focus:border-[#E10600]" style={{ color: "#08090B", WebkitTextFillColor: "#08090B" }} />
          )}
          <div className="flex items-center gap-2">
            <button type="submit" disabled={!podeOk} className="inline-flex min-h-12 flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#E10600] px-4 text-[15px] font-extrabold disabled:opacity-45" style={BRANCO} data-testid="mentor-objetivo-enviar">
              <Send className="h-4 w-4" aria-hidden /> {pending ? "Montando o plano…" : "Ok"}
            </button>
            {editing && <button type="button" onClick={() => setEditing(false)} className="min-h-12 rounded-xl border border-white/25 px-4 text-[13px] font-bold" style={BRANCO}>Cancelar</button>}
          </div>
        </form>
      )}
      {error && <p role="alert" className="text-[12.5px] font-semibold text-[#ff8a84]">{error}</p>}

      {!ask && plan && <MentorPlanoMini plan={plan} base={base} onNavigate={onNavigate} />}
      {!ask && !plan && <p className="text-[12.5px]" style={DIM}>Não consegui montar o plano agora. Tente de novo em instantes.</p>}
      {!ask && (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
          <button type="button" onClick={() => { setEditing(true); setSel(null); }} className="inline-flex min-h-9 w-fit items-center gap-1.5 text-[12px] font-semibold underline-offset-2 hover:underline" style={DIM}>
            <Pencil className="h-3.5 w-3.5" aria-hidden /> Trocar de concurso
          </button>
          <ExcluirPlano tema="escuro" onDone={() => onChange(null, null)} />
        </div>
      )}
    </div>
  );
}
