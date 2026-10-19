import { UserRound } from "lucide-react";
import type { StudiesHome } from "@/domain/studies/home";
import { StudiesHeroBanner } from "./hero-banner";
import { OverallProgress } from "./overall-progress";
import { StudySubjectsSection } from "./subjects-section";
import { GameModeBanner } from "./game-banner";

/**
 * Página de Estudos (desktop e celular): saudação, banner, progresso geral, seus estudos,
 * Modo Jogo e rodapé. `children` recebe a organização em pastas.
 */
export function StudiesPage({ data, base = "", children }: { data: StudiesHome; base?: string; children?: React.ReactNode }) {
  const continueHref = data.current ? `${base}/aula/${data.current.lessonId}` : data.studies[0] ? `${base}/trilhas/${data.studies[0].id}` : `${base}/nova-trilha`;
  const continueLabel = data.current || data.studies[0] ? "Continuar estudos" : "Começar a estudar";
  return (
    <div className="estudos">
      {/* Saudação (celular; no desktop ela fica no cabeçalho) */}
      <div className="estudos-ola lg:hidden">
        <span className="estudos-ola-avatar" aria-hidden>
          <UserRound className="size-6" />
        </span>
        <div className="min-w-0">
          <h1 className="truncate font-[Space_Grotesk] text-[26px] font-[800] leading-tight tracking-[-0.02em]">
            {data.name ? `Olá, ${data.name}` : "Olá!"} <span aria-hidden>👋</span>
          </h1>
          <p className="estudos-ola-frase">Disciplina hoje, resultado amanhã.</p>
        </div>
      </div>

      <StudiesHeroBanner continueHref={continueHref} continueLabel={continueLabel} />
      <OverallProgress data={data} />
      <StudySubjectsSection data={data} base={base} />
      <GameModeBanner base={base} />

      {children}

      <footer className="estudos-rodape">
        <p>
          <span className="estudos-rodape-barras" aria-hidden>{"///"}</span> <strong>APROVUM</strong>
          <span className="estudos-rodape-sep">Preparação de alto desempenho</span>
        </p>
        <p className="estudos-rodape-lema">
          Disciplina <span>+</span> Foco <span>+</span> Resultado <span>=</span> Aprovação <span className="estudos-rodape-barras" aria-hidden>{"///"}</span>
        </p>
      </footer>
    </div>
  );
}
