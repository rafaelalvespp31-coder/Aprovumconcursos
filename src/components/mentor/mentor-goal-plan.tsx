"use client";

import { MentorPlanoHoje } from "./mentor-plano-hoje";
import { useState, useTransition } from "react";
import { Send, Target, Pencil } from "lucide-react";
import type { BlockKind, StudyPlan } from "@/domain/mentor/plan";
import { setMentorGoalAction } from "@/app/(app)/mentor/actions";

const KIND: Record<BlockKind, string> = { aula: "Aula", questoes: "Questões", revisao: "Revisão", simulado: "Simulado" };
const KIND_COLOR: Record<BlockKind, string> = { aula: "#1f5fbf", questoes: "#b3261e", revisao: "#2e7d32", simulado: "#8a5a00" };
const DIAS = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
const rotuloHoje = (d: Date) => `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")} - ${DIAS[d.getDay()]}`;
const fmt = (m: number) => (m >= 60 ? `${Math.floor(m / 60)}h${m % 60 ? String(m % 60).padStart(2, "0") : ""}` : `${m} min`);

/**
 * Mensagem principal do Mentor: "Já sabe qual concurso você quer ser aprovado?". O aluno responde por
 * escrito e, a partir daí, o Mentor monta o plano (dias, horas, questões, revisões) para esse concurso.
 */
export function MentorGoalPlan({ goal, plan, name, onChange, base = "", onNavigate }: { base?: string; onNavigate?: () => void; goal: { contest: string } | null; plan: StudyPlan | null; name?: string | null; onChange: (goal: { contest: string } | null, plan: StudyPlan | null) => void }) {
  const [text, setText] = useState("");
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const agora = new Date();

  const send = () => {
    setError(null);
    start(async () => {
      const r = await setMentorGoalAction(text);
      if (!r.ok) return setError(r.error);
      onChange(r.goal, r.plan);
      setText("");
      setEditing(false);
    });
  };

  const diaHoje = plan?.days.find((d) => d.weekday === agora.getDay()) ?? null;
  const ask = !goal || editing;
  return (
    <div className="flex flex-col gap-3" data-testid="mentor-objetivo">
      <div className="rounded-2xl rounded-tl-sm bg-[#111] p-3.5 text-white">
        <p className="text-[14px] font-bold leading-snug">
          {ask ? <>{name ? `${name}, já` : "Já"} sabe qual concurso você quer ser aprovado?</> : <>Seu plano está pronto. Foco total!</>}
        </p>
        {ask && <p className="mt-1 text-[12px] text-white/70">Me diga o concurso e o cargo (ex.: Polícia Penal MG, PRF, PF). Eu monto o seu plano: o que estudar, quais dias, quantas horas e questões.</p>}
      </div>

      {ask ? (
        <form onSubmit={(e) => { e.preventDefault(); if (text.trim() && !pending) send(); }} className="flex items-center gap-2">
          <input value={text} onChange={(e) => setText(e.target.value)} maxLength={120} placeholder="Escreva o concurso que você quer passar…" aria-label="Concurso que você quer passar" data-testid="mentor-objetivo-input"
            className="min-h-11 min-w-0 flex-1 rounded-xl border border-[#D4D4D4] bg-white px-3 text-[16px] text-[#08090B] caret-[#08090B] outline-none focus:border-[#E10600]" style={{ color: "#08090B", WebkitTextFillColor: "#08090B" }} />
          <button type="submit" disabled={pending || !text.trim()} className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-[#E10600] px-3.5 text-[13px] font-bold text-white disabled:opacity-50" data-testid="mentor-objetivo-enviar">
            <Send className="h-4 w-4" aria-hidden /> {pending ? "Montando…" : "Enviar"}
          </button>
        </form>
      ) : (
        <button type="button" onClick={() => { setEditing(true); setText(goal!.contest); }} className="inline-flex w-fit items-center gap-1.5 text-[12px] font-semibold text-[#64666D] underline-offset-2 hover:underline">
          <Pencil className="h-3.5 w-3.5" aria-hidden /> Trocar de concurso
        </button>
      )}
      {editing && <button type="button" onClick={() => setEditing(false)} className="w-fit text-[12px] font-semibold text-[#64666D] underline">Cancelar</button>}
      {error && <p role="alert" className="text-[12.5px] font-semibold text-[#b3261e]">{error}</p>}

      {!ask && plan && (
        <MentorPlanoHoje plan={plan} base={base} onNavigate={onNavigate} />
      )}
      {!ask && !plan && <p className="text-[12.5px] text-[#64666D]">Não consegui montar o plano agora. Tente de novo em instantes.</p>}
    </div>
  );
}
