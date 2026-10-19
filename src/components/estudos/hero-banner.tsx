import Link from "next/link";
import { ArrowRight } from "lucide-react";

/**
 * Banner principal da página de Estudos: arte dos operadores caveira (camada de imagem)
 * e, em HTML, o rótulo, o título "Evolução é questão de DISCIPLINA", o texto, o botão
 * de continuar e a placa da marca. O lema (Disciplina, Foco, Resultado, Aprovação) já faz
 * parte da arte.
 */
export function StudiesHeroBanner({ continueHref, continueLabel }: { continueHref: string; continueLabel: string }) {
  return (
    <section className="eb" aria-labelledby="eb-titulo">
      <div className="eb-arte" aria-hidden>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/jogo-hero-arte.webp"
          srcSet="/images/jogo-hero-arte-sm.webp 1000w, /images/jogo-hero-arte.webp 1664w"
          sizes="(min-width: 1024px) 1100px, 100vw"
          alt=""
          width={1664}
          height={680}
          fetchPriority="high"
        />
      </div>
      <div className="eb-sombra" aria-hidden />
      <div className="eb-texto">
        <p className="eb-kicker">
          Seus estudos
          <br />
          são uma missão
        </p>
        <h2 id="eb-titulo" className="eb-titulo">
          Evolução é <span className="whitespace-nowrap">questão de</span>
          <span className="eb-disciplina">Disciplina</span>
        </h2>
        <p className="eb-desc">Estude com foco. Conquiste seus objetivos.</p>
        <Link href={continueHref} className="eb-botao" data-testid="banner-continuar">
          {continueLabel} <ArrowRight className="size-[18px]" aria-hidden />
        </Link>
      </div>
      <div className="eb-placa">
        {/* Desktop: logo oficial (caveira no alvo); celular: logo horizontal */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icons/aprovum-logo.png" alt="APROVUM — Sua preparação. Seu próximo cargo." width={600} height={514} className="eb-placa-vertical" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/aprovum-login-logo.png" alt="" aria-hidden width={523} height={107} className="eb-placa-horizontal" />
      </div>
    </section>
  );
}
