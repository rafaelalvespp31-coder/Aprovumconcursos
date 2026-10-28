"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Compass, RotateCcw, SendHorizontal, X } from "lucide-react";
import { answer, QUICK_QUESTIONS, type MentorReply } from "@/domain/mentor/chat";
import type { MentorLesson, MentorResult } from "@/domain/mentor/engine";
import type { VisibleRecommendation } from "@/domain/mentor/history";
import { mentorStatusAction } from "@/app/(app)/mentor/actions";

type Msg = { id: number; from: "aluno" | "mentor"; text: string; reply?: MentorReply };
const MAX_MESSAGES = 30;

/**
 * Página do Mentor: as prioridades (com o motivo de cada uma) e o assistente guiado. As respostas
 * saem do mesmo resultado do motor que montou a página (sem IA e sem nova consulta por pergunta).
 */
export function MentorView({
  name,
  result,
  visible: initialVisible,
  lessons,
  base = "",
  demo = false,
}: {
  name: string | null;
  result: MentorResult;
  visible: VisibleRecommendation[];
  lessons: MentorLesson[];
  base?: string;
  demo?: boolean;
}) {
  const [visible, setVisible] = useState(initialVisible);
  const [notice, setNotice] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const nextId = useRef(1);
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => endRef.current?.scrollIntoView({ block: "nearest" }), [msgs.length]);

  const ask = (q: string) => {
    const question = q.trim().slice(0, 300);
    if (!question) return;
    const reply = answer(question, { result, visible, lessons });
    setMsgs((m) => [...m, { id: nextId.current++, from: "aluno" as const, text: question }, { id: nextId.current++, from: "mentor" as const, text: reply.text.join("\n"), reply }].slice(-MAX_MESSAGES));
    setText("");
  };

  const dismiss = async (r: VisibleRecommendation) => {
    if (!r.storedId) return;
    setVisible((v) => v.filter((x) => x.key !== r.key));
    if (demo) return setNotice("Recomendação dispensada (demonstração).");
    const res = await mentorStatusAction(r.storedId, "dispensada").catch(() => ({ ok: false as const, error: "Não foi possível salvar agora." }));
    if (!res.ok) {
      setVisible(initialVisible);
      setNotice(res.error);
    } else setNotice("Recomendação dispensada. Ela volta se a pendência continuar.");
  };
  const opened = (r: VisibleRecommendation) => {
    if (!demo && r.storedId && r.status === "nova") void mentorStatusAction(r.storedId, "visualizada").catch(() => undefined);
  };

  const others = result.all.filter((r) => r.kind !== "manutencao" && !visible.some((v) => v.key === r.key)).slice(0, 8);
  const href = (h: string) => `${base}${h}`;

  return (
    <div className="flex flex-col gap-5" data-testid="mentor-pagina">
      <header className="pc p-5">
        <h1 className="flex items-center gap-2.5 text-[22px] font-extrabold tracking-[-0.02em] text-[#08090B]">
          <span className="pc-ico" aria-hidden>
            <Compass className="h-4 w-4" />
          </span>
          Seu Mentor APROVUM
        </h1>
        <p className="mt-1 text-[13.5px] text-[#64666D]">
          {name ? `${name}, eu` : "Eu"} acompanho o seu progresso real (aulas, questões, revisões e cadernos) e digo o que fazer a seguir, sempre com o motivo.
        </p>
      </header>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <section className="pc p-5" aria-labelledby="mentor-prioridades">
          <h2 id="mentor-prioridades" className="text-[15px] font-bold text-[#08090B]">
            Suas prioridades
          </h2>
          {result.insufficientData ? (
            <p className="mt-3 text-[13.5px] text-[#64666D]">Ainda não tenho dados seus suficientes. Comece um estudo ou resolva algumas questões e eu passo a recomendar.</p>
          ) : !visible.length ? (
            <p className="mt-3 text-[13.5px] text-[#64666D]">Você está em dia: nenhuma pendência encontrada nos seus dados.</p>
          ) : (
            <ol className="mt-3 flex flex-col gap-3" data-testid="mentor-lista">
              {visible.map((r, i) => (
                <li key={r.key} className="rounded-[12px] border border-[#E6E7EB] p-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-[#E50914]">
                    {i + 1}. {r.title}
                  </p>
                  <p className="mt-1 text-[15px] font-bold leading-snug text-[#08090B]">{r.explanation}</p>
                  <p className="mt-1 text-[13px] text-[#64666D]">
                    <span className="font-semibold text-[#3A3C42]">Por quê: </span>
                    {r.reason}
                  </p>
                  {r.progress && (
                    <div className="mt-2">
                      <span className="pc-barra" role="img" aria-label={r.progress.label}>
                        <span style={{ width: `${r.progress.pct}%` }} />
                      </span>
                    </div>
                  )}
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Link href={href(r.href)} onClick={() => opened(r)} className="pc-botao">
                      {r.actionLabel} <ArrowRight className="h-4 w-4" aria-hidden />
                    </Link>
                    {r.storedId && (
                      <button type="button" onClick={() => void dismiss(r)} className="mentor-dispensar" aria-label={`Dispensar: ${r.explanation}`}>
                        <X className="h-3.5 w-3.5" aria-hidden /> Dispensar
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          )}
          {notice && (
            <p role="status" className="mt-3 text-[12px] text-[#64666D]">
              {notice}
            </p>
          )}
          {others.length > 0 && (
            <>
              <h3 className="mt-5 text-[13px] font-bold text-[#08090B]">Outras pendências</h3>
              <ul className="mt-2 divide-y divide-[#ECEDF0]">
                {others.map((r) => (
                  <li key={r.key} className="flex items-center justify-between gap-3 py-2.5">
                    <span className="min-w-0">
                      <span className="block text-[13px] font-semibold text-[#08090B]">{r.explanation}</span>
                      <span className="block text-[12px] text-[#64666D]">{r.reason}</span>
                    </span>
                    <Link href={href(r.href)} className="pc-vertodas shrink-0">
                      {r.actionLabel}
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        <section className="pc flex min-h-[420px] flex-col p-5" aria-labelledby="mentor-chat">
          <div className="flex items-center justify-between gap-3">
            <h2 id="mentor-chat" className="text-[15px] font-bold text-[#08090B]">
              Converse com o Mentor
            </h2>
            {msgs.length > 0 && (
              <button type="button" onClick={() => setMsgs([])} className="mentor-dispensar">
                <RotateCcw className="h-3.5 w-3.5" aria-hidden /> Limpar
              </button>
            )}
          </div>
          <p className="mt-1 text-[12px] text-[#64666D]">Respostas guiadas pelos seus dados reais. Não uso IA externa nem envio seus dados para fora.</p>

          <div className="mt-3 max-h-[520px] flex-1 space-y-3 overflow-y-auto" aria-live="polite" data-testid="mentor-conversa">
            {!msgs.length && <p className="text-[13px] text-[#64666D]">Escolha uma pergunta abaixo ou escreva a sua.</p>}
            {msgs.map((m) =>
              m.from === "aluno" ? (
                <p key={m.id} className="ml-auto w-fit max-w-[85%] rounded-[12px] bg-[#08090B] px-3 py-2 text-[13.5px] text-white">
                  {m.text}
                </p>
              ) : (
                <div key={m.id} className="max-w-[95%] rounded-[12px] border border-[#E6E7EB] bg-[#F7F8FA] px-3 py-2.5" data-testid="mentor-resposta" data-intencao={m.reply?.intent}>
                  {m.reply?.text.map((t, k) => (
                    <p key={k} className="text-[13.5px] text-[#08090B]">
                      {t}
                    </p>
                  ))}
                  {m.reply && m.reply.items.length > 0 && (
                    <ul className="mt-2 space-y-2">
                      {m.reply.items.map((it, k) => (
                        <li key={k} className="rounded-[10px] bg-white p-2.5">
                          <p className="text-[13px] font-semibold text-[#08090B]">{it.title}</p>
                          <p className="text-[12px] text-[#64666D]">{it.detail}</p>
                          {it.href && (
                            <Link href={href(it.href)} className="pc-vertodas mt-1">
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
            <div ref={endRef} />
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5" aria-label="Perguntas rápidas">
            {QUICK_QUESTIONS.map((q) => (
              <button key={q.label} type="button" onClick={() => ask(q.text)} className="pc-aba">
                {q.label}
              </button>
            ))}
          </div>
          <form
            className="mt-3 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              ask(text);
            }}
          >
            <label htmlFor="mentor-pergunta" className="sr-only">
              Sua pergunta para o Mentor
            </label>
            <input
              id="mentor-pergunta"
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={300}
              placeholder="Ex.: O que devo estudar hoje?"
              className="h-11 min-w-0 flex-1 rounded-[10px] border border-[#E6E7EB] px-3 text-[14px] text-[#08090B] focus:border-[#E50914] focus:outline-none"
            />
            <button type="submit" className="pc-botao" disabled={!text.trim()} aria-label="Enviar pergunta">
              <SendHorizontal className="h-4 w-4" aria-hidden />
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
