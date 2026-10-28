"use client";

import { Compass } from "lucide-react";
import type { MentorLesson, MentorResult } from "@/domain/mentor/engine";
import type { VisibleRecommendation } from "@/domain/mentor/history";
import { MentorChat } from "./mentor-chat";
import { MentorPriorities } from "./mentor-priorities";

/** Página do Mentor em tela cheia: as prioridades (com o motivo) e o assistente guiado lado a lado. */
export function MentorView({
  name,
  result,
  visible,
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
          <h2 id="mentor-prioridades" className="mb-3 text-[15px] font-bold text-[#08090B]">
            Suas prioridades
          </h2>
          <MentorPriorities result={result} visible={visible} base={base} demo={demo} />
        </section>
        <section className="pc flex min-h-[420px] flex-col p-5" aria-labelledby="mentor-chat">
          <h2 id="mentor-chat" className="mb-1 text-[15px] font-bold text-[#08090B]">
            Converse com o Mentor
          </h2>
          <MentorChat result={result} visible={visible} lessons={lessons} base={base} />
        </section>
      </div>
    </div>
  );
}
