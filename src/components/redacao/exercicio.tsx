"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { enviarExercicioAction, gerarExercicioAction } from "@/app/(app)/redacao/actions";
import { categoriaLabel } from "@/domain/redacao/rubricas";
import type { ExerciseView } from "@/server/services/redacao";
import { Aviso, Secao } from "./ui";

export function GerarExercicio({ fracas }: { fracas: { category: string; n: number }[] }) {
  const router = useRouter();
  const [pend, start] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  return (
    <div className="flex flex-col gap-2">
      {erro && <Aviso tom="erro">{erro}</Aviso>}
      <div className="flex flex-wrap gap-2">
        {fracas.map((f) => (
          <button key={f.category} type="button" disabled={pend} className="pc-botao" onClick={() => start(async () => { setErro(null); const r = await gerarExercicioAction(f.category).catch(() => null); if (!r || !r.ok) return setErro(r && !r.ok ? r.error : "Não foi possível gerar."); router.push(`/redacao/exercicios/${r.id}`); })}>
            {pend ? "Gerando…" : `${categoriaLabel(f.category)} (${f.n} apontamento${f.n === 1 ? "" : "s"})`}
          </button>
        ))}
      </div>
    </div>
  );
}

export function Exercicio({ ex }: { ex: ExerciseView }) {
  const router = useRouter();
  const [resp, setResp] = useState<Record<string, string>>(ex.answers ?? {});
  const [pend, start] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const feito = ex.status === "corrigido" && ex.feedback;
  const enviar = () =>
    start(async () => {
      setErro(null);
      const r = await enviarExercicioAction(ex.id, resp).catch(() => null);
      if (!r || !r.ok) return setErro(r && !r.ok ? r.error : "Não foi possível corrigir agora.");
      router.refresh();
    });
  return (
    <div className="flex flex-col gap-4" data-testid="redacao-exercicio">
      <Secao titulo={`Exercício: ${categoriaLabel(ex.category)}`}>
        {ex.explanation && <p className="whitespace-pre-line text-[13.5px] leading-relaxed text-[#2B2D33]">{ex.explanation}</p>}
      </Secao>
      {feito && <Aviso>{ex.feedback!.resumo} Resultado registrado no seu histórico.</Aviso>}
      <ol className="flex flex-col gap-3">
        {ex.questions.map((q, n) => {
          const f = ex.feedback?.itens.find((i) => i.id === q.id);
          return (
            <li key={q.id} className="pc p-4">
              <p className="text-[11px] font-bold uppercase text-[#E50914]">Questão {n + 1}</p>
              <p className="mt-1 text-[14px] font-semibold text-[#08090B]">{q.enunciado}</p>
              {q.tipo === "multipla_escolha" ? (
                <div className="mt-2 flex flex-col gap-1.5" role="radiogroup" aria-label={`Questão ${n + 1}`}>
                  {(q.alternativas ?? []).map((a) => (
                    <label key={a} className={`flex cursor-pointer items-start gap-2 rounded-[10px] border px-3 py-2 text-[13.5px] ${resp[q.id] === a ? "border-[#08090B] bg-[#F4F4F6]" : "border-[#E6E7EB]"}`}>
                      <input type="radio" name={q.id} checked={resp[q.id] === a} disabled={!!feito} onChange={() => setResp((p) => ({ ...p, [q.id]: a }))} className="mt-1" />
                      <span>{a}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <textarea className="mt-2 min-h-[90px] w-full rounded-[10px] border border-[#D9DBE0] px-3 py-2 text-[14px] outline-none focus:border-[#E50914]" value={resp[q.id] ?? ""} disabled={!!feito} maxLength={1500} onChange={(e) => setResp((p) => ({ ...p, [q.id]: e.target.value }))} placeholder="Reescreva a frase corrigindo o problema…" />
              )}
              {f && (
                <div className="mt-2 rounded-[10px] bg-[#F7F7F9] p-3 text-[13px]">
                  <p className={`font-bold ${f.correta ? "text-[#047857]" : "text-[#B45309]"}`}>{f.correta ? "Correto" : f.pontos > 0 ? "Parcialmente correto" : "Incorreto"}</p>
                  <p className="mt-1">{f.comentario}</p>
                  <p className="mt-1"><b>Gabarito:</b> {f.gabarito}</p>
                  <p className="mt-1 text-[#3A3C42]">{f.explicacao}</p>
                </div>
              )}
            </li>
          );
        })}
      </ol>
      {erro && <Aviso tom="erro">{erro}</Aviso>}
      {!feito && <div><button type="button" onClick={enviar} disabled={pend} className="pc-botao">{pend ? "Corrigindo…" : "Enviar respostas"}</button></div>}
    </div>
  );
}
