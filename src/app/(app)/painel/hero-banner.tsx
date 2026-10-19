/**
 * Banner principal do painel (referência visual do APROVUM): saudação com o nome real do
 * aluno, arte tática da marca ao centro e o lema à direita com a logo original.
 * É o primeiro slide do carrossel: a cada 3 segundos ele se reveza com os banners de
 * aprovação dos alunos (mesmo comportamento do banner anterior).
 */
import { BannerGate } from "@/components/banner-gate";
import { BannerRotator } from "./banner-rotator";

export function HeroBanner({ name }: { name: string | null }) {
  return (
    <BannerGate className="painel-hero mb-4 lg:mb-5" testId="painel-banner" assets={["/images/aprovum-login-logo.png"]}>
      <BannerRotator className="banner-rotator--saudacao">
        <div className="ph-palco">
          {/* Arte tática da marca (original do projeto) */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/aprovum-login-hero-mobile.webp"
            width={852}
            height={506}
            alt=""
            className="ph-arte"
            fetchPriority="high"
            decoding="async"
            data-banner-main
          />
          <div className="ph-veu" aria-hidden />
          <div className="ph-faixa ph-faixa-a" aria-hidden />
          <div className="ph-faixa ph-faixa-b" aria-hidden />
          <div className="ph-mira" aria-hidden />

          <div className="ph-conteudo">
            <div className="ph-saudacao">
              <h1 className="ph-titulo">
                Olá{name ? <>, <span className="text-[#E50914]">{name}</span></> : null}!
              </h1>
              <p className="ph-sub">Sua jornada rumo à aprovação continua.</p>
              <p className="ph-desc">
                Aqui você <strong>acompanha seu</strong> progresso, acessa suas matérias e mantém o foco no seu objetivo.
              </p>
            </div>
            <div className="ph-lema">
              <p className="ph-lema-texto">
                Conhecimento <span className="block">é a sua melhor</span>{" "}
                <span className="text-[#E50914]">arma.</span>
              </p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/aprovum-login-logo.png" width={523} height={107} alt="APROVUM — Sua preparação. Seu próximo cargo." className="ph-logo" decoding="async" />
            </div>
          </div>
        </div>
      </BannerRotator>
    </BannerGate>
  );
}
