"use client";

import { useRef, useState, useTransition } from "react";
import { Send } from "lucide-react";
import { perguntarAction } from "@/app/(app)/redacao/actions";
import { Aviso } from "./ui";

const SUGESTOES = ["Por que perdi pontos?", "Como melhorar minha introdução?", "Como desenvolver melhor meus argumentos?", "Qual a diferença entre coesão e coerência?", "Como usar repertório sociocultural?", "Como melhorar minha conclusão?", "Como alcançar uma nota maior?"];
type Msg = { role: "user" | "assistant"; content: string };

export function Professor({ avaliacaoId, titulo }: { avaliacaoId: string | null; titulo: string | null }) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [txt, setTxt] = useState("");
  const [pend, start] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const fim = useRef<HTMLDivElement>(null);

  const enviar = (t: string) => {
    const q = t.trim();
    if (!q || pend) return;
    const next = [...msgs, { role: "user" as const, content: q }];
    setMsgs(next);
    setTxt("");
    setErro(null);
    start(async () => {
      const r = await perguntarAction({ evaluationId: avaliacaoId, messages: next.slice(-10) }).catch(() => null);
      if (!r || !r.ok) setErro(r && !r.ok ? r.error : "Não foi possível responder agora.");
      else setMsgs([...next, { role: "assistant", content: r.resposta }]);
      setTimeout(() => fim.current?.scrollIntoView({ behavior: "smooth", block: "end" }), 50);
    });
  };

  return (
    <section className="pc flex min-h-[460px] flex-col p-4 sm:p-5" data-testid="redacao-professor">
      <h2 className="text-[15px] font-extrabold text-[#08090B]">Professor de redação</h2>
      <p className="mb-3 text-[12.5px] text-[#64666D]">{avaliacaoId ? `Conversando sobre a redação corrigida${titulo ? `: ${titulo}` : ""}. O professor conhece sua nota, seus erros e o diagnóstico.` : "Nenhuma redação selecionada: as respostas serão gerais. Abra o relatório de uma redação e toque em “Falar com o professor” para um acompanhamento personalizado."}</p>
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto" aria-live="polite">
        {msgs.length === 0 && (
          <div className="flex flex-wrap gap-1.5">
            {SUGESTOES.map((s) => <button key={s} type="button" onClick={() => enviar(s)} className="rounded-full border border-[#E6E7EB] px-3 py-1.5 text-[12.5px] font-semibold text-[#3A3C42] hover:border-[#E50914]">{s}</button>)}
          </div>
        )}
        {msgs.map((m, i) => (
          <div key={i} className={`max-w-[92%] whitespace-pre-wrap rounded-[14px] px-3.5 py-2.5 text-[13.5px] leading-relaxed ${m.role === "user" ? "self-end bg-[#08090B] text-white" : "self-start border border-[#E6E7EB] bg-white text-[#2B2D33]"}`}>{m.content}</div>
        ))}
        {pend && <div className="self-start text-[12.5px] text-[#64666D]">O professor está pensando…</div>}
        <div ref={fim} />
      </div>
      {erro && <div className="mt-2"><Aviso tom="erro">{erro}</Aviso></div>}
      <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); enviar(txt); }}>
        <input value={txt} maxLength={1500} onChange={(e) => setTxt(e.target.value)} placeholder="Pergunte ao professor…" aria-label="Sua pergunta" className="min-w-0 flex-1 rounded-[10px] border border-[#D9DBE0] px-3 py-2 text-[14px] outline-none focus:border-[#E50914]" />
        <button type="submit" disabled={pend || !txt.trim()} className="pc-botao" aria-label="Enviar"><Send className="h-4 w-4" aria-hidden /></button>
      </form>
    </section>
  );
}
