"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { RotateCcw, SendHorizontal } from "lucide-react";
import { answer, QUICK_QUESTIONS, type MentorReply } from "@/domain/mentor/chat";
import type { MentorLesson, MentorResult } from "@/domain/mentor/engine";
import type { VisibleRecommendation } from "@/domain/mentor/history";

type Msg = { id: number; from: "aluno" | "mentor"; text: string; reply?: MentorReply };
const MAX_MESSAGES = 30;

/**
 * Assistente guiado: as respostas saem do resultado do motor já carregado (sem IA, sem rede por
 * pergunta e sem enviar dados para fora). O histórico vale para a sessão aberta.
 */
export function MentorChat({
  result,
  visible,
  lessons,
  base = "",
  compact = false,
  onNavigate,
}: {
  result: MentorResult;
  visible: VisibleRecommendation[];
  lessons: MentorLesson[];
  base?: string;
  compact?: boolean;
  onNavigate?: () => void;
}) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const nextId = useRef(1);
  const boxRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = boxRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [msgs.length]);

  const ask = (q: string) => {
    const question = q.trim().slice(0, 300);
    if (!question) return;
    const reply = answer(question, { result, visible, lessons });
    setMsgs((m) => [...m, { id: nextId.current++, from: "aluno" as const, text: question }, { id: nextId.current++, from: "mentor" as const, text: reply.text.join("\n"), reply }].slice(-MAX_MESSAGES));
    setText("");
  };
  const href = (h: string) => `${base}${h}`;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11.5px] text-[#64666D]">Respostas guiadas pelos seus dados reais. Sem IA externa.</p>
        {msgs.length > 0 && (
          <button type="button" onClick={() => setMsgs([])} className="mentor-dispensar shrink-0">
            <RotateCcw className="h-3.5 w-3.5" aria-hidden /> Limpar
          </button>
        )}
      </div>

      <div ref={boxRef} className={`mt-2 min-h-0 flex-1 space-y-2.5 overflow-y-auto overscroll-contain ${compact ? "" : "max-h-[520px]"}`} aria-live="polite" data-testid="mentor-conversa">
        {!msgs.length && <p className="text-[13px] text-[#64666D]">Escolha uma pergunta abaixo ou escreva a sua.</p>}
        {msgs.map((m) =>
          m.from === "aluno" ? (
            <p key={m.id} className="ml-auto w-fit max-w-[85%] rounded-[12px] bg-[#08090B] px-3 py-2 text-[13px] text-white">
              {m.text}
            </p>
          ) : (
            <div key={m.id} className="max-w-[96%] rounded-[12px] border border-[#E6E7EB] bg-[#F7F8FA] px-3 py-2.5" data-testid="mentor-resposta" data-intencao={m.reply?.intent}>
              {m.reply?.text.map((t, k) => (
                <p key={k} className="text-[13px] text-[#08090B]">
                  {t}
                </p>
              ))}
              {m.reply && m.reply.items.length > 0 && (
                <ul className="mt-2 space-y-1.5">
                  {m.reply.items.map((it, k) => (
                    <li key={k} className="rounded-[10px] bg-white p-2.5">
                      <p className="text-[12.5px] font-semibold text-[#08090B]">{it.title}</p>
                      <p className="text-[12px] text-[#64666D]">{it.detail}</p>
                      {it.href && (
                        <Link href={href(it.href)} onClick={onNavigate} className="pc-vertodas mt-1">
                          {it.actionLabel ?? "Abrir"}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ),
        )}
      </div>

      <div className={`mt-2.5 flex gap-1.5 ${compact ? "mentor-chips" : "flex-wrap"}`} aria-label="Perguntas rápidas">
        {QUICK_QUESTIONS.map((q) => (
          <button key={q.label} type="button" onClick={() => ask(q.text)} className="pc-aba shrink-0">
            {q.label}
          </button>
        ))}
      </div>
      <form
        className="mt-2.5 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          ask(text);
        }}
      >
        <label htmlFor={compact ? "mentor-pergunta-flutuante" : "mentor-pergunta"} className="sr-only">
          Sua pergunta para o Mentor
        </label>
        <input
          id={compact ? "mentor-pergunta-flutuante" : "mentor-pergunta"}
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={300}
          autoComplete="off"
          placeholder="Ex.: O que devo estudar hoje?"
          className="h-11 min-w-0 flex-1 rounded-[10px] border border-[#E6E7EB] bg-white px-3 text-[16px] text-[#08090B] focus:border-[#E50914] focus:outline-none sm:text-[14px]"
        />
        <button type="submit" className="pc-botao" disabled={!text.trim()} aria-label="Enviar pergunta">
          <SendHorizontal className="h-4 w-4" aria-hidden />
        </button>
      </form>
    </div>
  );
}
